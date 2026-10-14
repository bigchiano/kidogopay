import "server-only";
import { and, desc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { db, type Tx } from "@/lib/db";
import { providerEvent, transaction, user, wallet, type TxStatus } from "@/lib/db/schema";
import { NETWORKS, kybThresholdUsd, networkNames, type Network } from "@/lib/constants";
import { kybStatus, usedVolumeUsd } from "@/lib/limits";
import { appUrl, sendEmail } from "@/lib/mail";
import { formatUsd } from "@/lib/format";
import { payments } from "./index";
import { ProviderError, type ProviderEvent } from "./types";

const RANK: Record<TxStatus, number> = {
  awaiting_payment: 0,
  received: 1,
  held: 1,
  processing: 2,
  completed: 3,
  failed: 3,
  expired: 3,
  refunded: 3,
};

/** Thrown when an event arrives before the record it updates; returning non-2xx makes Qadi retry. */
export class RetryLaterError extends Error {}

/**
 * Applies provider events from webhooks, status syncs, or demo simulations.
 * Each event is applied once, in its own database transaction. Calls to the
 * provider happen afterwards, never inside a transaction.
 */
export async function processProviderEvents(events: ProviderEvent[]) {
  const limitHits = new Set<string>();
  const toStart = new Set<string>();

  for (const event of events) {
    let limitHit: string | null = null;
    try {
      limitHit = await db.transaction(async (tx) => {
        await tx.insert(providerEvent).values({ id: event.id, type: event.type, payload: event }).onConflictDoNothing();
        const [row] = await tx
          .select({ processedAt: providerEvent.processedAt })
          .from(providerEvent)
          .where(eq(providerEvent.id, event.id))
          .for("update");
        if (row?.processedAt) return null;

        const hit = event.type === "deposit.received" ? await applyDeposit(tx, event) : await applyOrderUpdate(tx, event);
        await tx.update(providerEvent).set({ processedAt: new Date(), error: null }).where(eq(providerEvent.id, event.id));
        return hit;
      });
    } catch (err) {
      await db
        .insert(providerEvent)
        .values({ id: event.id, type: event.type, payload: event, error: String(err) })
        .onConflictDoUpdate({ target: providerEvent.id, set: { error: String(err) } });
      throw err;
    }
    if (limitHit) limitHits.add(limitHit);

    if (event.type === "deposit.received") {
      // Also covers redeliveries where the deposit was recorded but the payout never started.
      const [t] = await db
        .select({ id: transaction.id, status: transaction.status, orderRef: transaction.orderRef })
        .from(transaction)
        .where(eq(transaction.providerRef, event.depositRef));
      if (t && t.status === "received" && !t.orderRef) toStart.add(t.id);
    }
  }

  for (const userId of limitHits) await pauseWalletsAtLimit(userId);
  for (const id of toStart) await startOfframp(id);
}

async function applyDeposit(tx: Tx, e: Extract<ProviderEvent, { type: "deposit.received" }>): Promise<string | null> {
  const w = await tx.query.wallet.findFirst({
    where: e.address.startsWith("0x")
      ? sql`lower(${wallet.address}) = ${e.address.toLowerCase()}`
      : eq(wallet.address, e.address),
    with: { payoutAccount: true },
    orderBy: [desc(wallet.createdAt)],
  });
  if (!w) {
    console.warn(`[payments] deposit to unknown address ${e.address}, ignoring`);
    return null;
  }

  const approved = (await kybStatus(tx, w.userId)) === "approved";
  const overLimit = !approved && (await usedVolumeUsd(tx, w.userId)) >= kybThresholdUsd();
  const network = (NETWORKS as readonly string[]).includes(e.chain) ? (e.chain as Network) : null;

  let status: TxStatus = "received";
  let holdReason: string | null = null;
  let note: string | null = null;
  if (!network) {
    status = "held";
    holdReason = "unsupported_chain";
    note = `This arrived on ${e.chain}, which KidogoPay doesn't pay out from. Contact support to recover it.`;
  } else if (w.archivedAt) {
    status = "held";
    holdReason = "deleted";
    note = "This wallet was deleted before the deposit arrived. Contact support to recover it.";
  } else if (overLimit) {
    status = "held";
    holdReason = "limit";
    note = "Held until your business is verified. It pays out when you turn the wallet back on.";
  } else if (w.status !== "active") {
    status = "held";
    holdReason = "paused";
    note = "Held because the wallet is paused. It pays out when you turn the wallet back on.";
  }

  await tx
    .insert(transaction)
    .values({
      userId: w.userId,
      direction: "offramp",
      status,
      holdReason,
      failureReason: note,
      network: network ?? w.networks[0],
      token: e.token,
      cryptoAmount: e.cryptoAmount.toFixed(6),
      fiatCurrency: w.payoutAccount.currency,
      usdValue: e.cryptoAmount.toFixed(2),
      walletId: w.id,
      payoutAccountId: w.payoutAccountId,
      txHash: e.txHash,
      providerRef: e.depositRef,
      createdAt: new Date(e.occurredAt),
    })
    .onConflictDoNothing({ target: transaction.providerRef });

  if (approved) return null;
  return (await usedVolumeUsd(tx, w.userId)) >= kybThresholdUsd() ? w.userId : null;
}

async function applyOrderUpdate(tx: Tx, e: Extract<ProviderEvent, { type: "order.updated" }>): Promise<null> {
  const [current] = await tx.select().from(transaction).where(eq(transaction.orderRef, e.orderRef)).for("update");
  if (!current) throw new RetryLaterError(`No transaction for order ${e.orderRef} yet`);

  const refundAfterFailure = current.status === "failed" && e.status === "refunded";
  if (!refundAfterFailure && (RANK[current.status] === 3 || RANK[e.status] < RANK[current.status])) {
    return null; // stale or out of order
  }

  await tx
    .update(transaction)
    .set({
      status: e.status,
      fiatAmount: e.fiatAmount !== undefined ? e.fiatAmount.toFixed(2) : undefined,
      cryptoAmount:
        current.direction === "onramp" && e.cryptoAmount !== undefined ? e.cryptoAmount.toFixed(6) : undefined,
      txHash: e.txHash,
      failureReason: e.failureReason,
      paymentInstructions: e.instructions,
      completedAt: e.status === "completed" ? new Date(e.occurredAt) : undefined,
    })
    .where(eq(transaction.id, current.id));
  return null;
}

/** Quotes and executes the offramp for a received deposit. Safe to call more than once. */
export async function startOfframp(transactionId: string) {
  const [claimed] = await db
    .update(transaction)
    .set({ status: "processing" })
    .where(and(eq(transaction.id, transactionId), eq(transaction.status, "received"), isNull(transaction.orderRef)))
    .returning();
  if (!claimed) return;

  const t = await db.query.transaction.findFirst({
    where: eq(transaction.id, transactionId),
    with: { wallet: true, payoutAccount: true },
  });
  if (!t?.wallet || !t.payoutAccount?.providerRef) {
    await db
      .update(transaction)
      .set({ status: "failed", failureReason: "This wallet has no payout account. Contact support." })
      .where(eq(transaction.id, transactionId));
    return;
  }

  try {
    const started = await payments().offrampDeposit({
      walletRef: t.wallet.providerRef,
      chain: t.network,
      token: t.token,
      amount: Number(t.cryptoAmount),
      currency: t.payoutAccount.currency,
      beneficiaryRef: t.payoutAccount.providerRef,
      idempotencyKey: `kidogopay-offramp-${t.id}`,
    });
    await db
      .update(transaction)
      .set({
        orderRef: started.orderRef,
        fiatAmount: started.fiatAmount.toFixed(2),
        rate: started.rate.toFixed(6),
        feeCrypto: started.feeCrypto.toFixed(6),
        failureReason: null,
      })
      .where(eq(transaction.id, t.id));
  } catch (err) {
    console.error(`[payments] offramp for ${t.id} failed to start`, err);
    const detail = err instanceof ProviderError && err.status && err.status < 500 ? ` (${err.message})` : "";
    await db
      .update(transaction)
      .set({
        status: "failed",
        failureReason: `The payout couldn't start${detail}. The funds are safe in your deposit wallet. Try again, or contact support.`,
      })
      .where(eq(transaction.id, t.id));
  }
}

/** Pays out deposits that were held while a wallet was paused or at the limit. */
export async function releaseHeldDeposits(walletId: string) {
  const released = await db
    .update(transaction)
    .set({ status: "received", holdReason: null, failureReason: null })
    .where(
      and(
        eq(transaction.walletId, walletId),
        eq(transaction.status, "held"),
        inArray(transaction.holdReason, ["paused", "limit"]),
        isNull(transaction.orderRef),
      ),
    )
    .returning({ id: transaction.id });
  for (const { id } of released) await startOfframp(id);
  return released.length;
}

/** Polls Qadi for an order's status; webhooks only report final states. */
export async function syncOrder(orderRef: string) {
  try {
    const snapshot = await payments().getOrder(orderRef);
    if (!snapshot) return;
    await processProviderEvents([
      { id: `sync:${orderRef}:${snapshot.status}`, type: "order.updated", occurredAt: new Date().toISOString(), orderRef, ...snapshot },
    ]);
  } catch (err) {
    console.error(`[payments] couldn't sync order ${orderRef}`, err);
  }
}

/** At the verification limit, new deposits are held until the business is verified. */
export async function pauseWalletsAtLimit(userId: string) {
  const paused = await db
    .update(wallet)
    .set({ status: "paused", pausedReason: "limit" })
    .where(and(eq(wallet.userId, userId), eq(wallet.status, "active"), isNull(wallet.archivedAt)))
    .returning({ networks: wallet.networks });
  if (!paused.length) return;

  const [owner] = await db.select({ email: user.email }).from(user).where(eq(user.id, userId));
  if (!owner) return;
  await sendEmail({
    to: owner.email,
    subject: "Your KidogoPay wallets are paused",
    heading: "Verify your business to keep cashing out",
    lines: [
      `Your account has reached ${formatUsd(kybThresholdUsd())} in total volume, so we've paused your ${paused.length === 1 ? networkNames(paused[0].networks) + " wallet" : "wallets"}.`,
      "Anything sent to them now is held instead of paid out. Once your business is verified, turn them back on and held deposits pay out automatically.",
    ],
    action: { label: "Open settings", url: appUrl("/dashboard/settings") },
  });
}

/** Catches deposits whose webhook never got through (app down, retries exhausted). */
export async function pollDeposits(lookbackHours = 48) {
  const events = await payments().listRecentDeposits(new Date(Date.now() - lookbackHours * 3_600_000));
  if (!events.length) return { found: 0, applied: 0 };

  const done = await db
    .select({ id: providerEvent.id })
    .from(providerEvent)
    .where(and(inArray(providerEvent.id, events.map((e) => e.id)), isNotNull(providerEvent.processedAt)));
  const seen = new Set(done.map((r) => r.id));

  let applied = 0;
  for (const event of events) {
    if (seen.has(event.id)) continue;
    try {
      await processProviderEvents([event]);
      applied++;
    } catch (err) {
      console.error(`[payments] couldn't apply polled deposit ${event.id}`, err);
    }
  }
  if (applied) console.info(`[payments] recovered ${applied} deposit(s) the webhook missed`);
  return { found: events.length, applied };
}
