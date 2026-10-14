"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { payoutAccount, transaction, wallet } from "@/lib/db/schema";
import { MAX_USD, NETWORKS, NETWORK_INFO, TOKENS } from "@/lib/constants";
import { requireUser } from "@/lib/session";
import { limitError } from "@/lib/limits";
import { mockProvider, payments, paymentsMode } from "@/lib/payments";
import { processProviderEvents, releaseHeldDeposits, startOfframp } from "@/lib/payments/events";
import { appUrl, sendEmail } from "@/lib/mail";
import { payoutShort } from "@/lib/payout";
import { fail, ok, providerFailure, zodFieldErrors, type ActionResult } from "./result";

const createSchema = z.object({
  network: z.enum(NETWORKS, { error: "Choose a network." }),
  payoutAccountId: z.string().min(1, "Choose where payouts go."),
  label: z.string().trim().max(40, "Keep the name under 40 characters.").optional(),
});

async function ownedPayoutAccount(userId: string, id: string) {
  return db.query.payoutAccount.findFirst({
    where: and(eq(payoutAccount.id, id), eq(payoutAccount.userId, userId), isNull(payoutAccount.archivedAt)),
  });
}

async function ownedWallet(userId: string, id: string) {
  return db.query.wallet.findFirst({
    where: and(eq(wallet.id, id), eq(wallet.userId, userId), isNull(wallet.archivedAt)),
  });
}

export async function createWallet(input: unknown): Promise<ActionResult<{ id: string }>> {
  const me = await requireUser();
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return fail("Check the highlighted fields.", zodFieldErrors(parsed.error));
  const v = parsed.data;

  const limit = await limitError(me.id);
  if (limit) return fail(limit);

  const payout = await ownedPayoutAccount(me.id, v.payoutAccountId);
  if (!payout?.providerRef) return fail("Choose a payout account from your list.", { payoutAccountId: "Choose a payout account." });

  const id = crypto.randomUUID();
  let created: { ref: string; address: string };
  try {
    // Qadi wallet labels are unique per business, which makes this call safe to retry.
    created = await payments().createDepositAddress({ label: `kidogopay-${id}`, network: v.network });
  } catch (err) {
    return providerFailure(err);
  }

  await db.insert(wallet).values({
    id,
    userId: me.id,
    label: v.label || null,
    network: v.network,
    tokens: [...TOKENS],
    address: created.address,
    payoutAccountId: payout.id,
    providerRef: created.ref,
  });

  revalidatePath("/dashboard", "layout");
  return ok({ id });
}

export async function setWalletActive(id: string, active: boolean): Promise<ActionResult<{ released: number }>> {
  const me = await requireUser();
  const w = await ownedWallet(me.id, id);
  if (!w) return fail("That wallet doesn't exist.");

  if (active) {
    const limit = await limitError(me.id);
    if (limit) return fail(limit);
  }

  await db
    .update(wallet)
    .set({ status: active ? "active" : "paused", pausedReason: active ? null : "user" })
    .where(eq(wallet.id, id));

  const released = active ? await releaseHeldDeposits(id) : 0;
  revalidatePath("/dashboard", "layout");
  return ok({ released });
}

export async function relinkWallet(id: string, payoutAccountId: string): Promise<ActionResult> {
  const me = await requireUser();
  const w = await ownedWallet(me.id, id);
  if (!w) return fail("That wallet doesn't exist.");
  const payout = await ownedPayoutAccount(me.id, payoutAccountId);
  if (!payout?.providerRef) return fail("Choose a payout account from your list.");
  if (payout.id === w.payoutAccountId) return ok(null);

  await db.update(wallet).set({ payoutAccountId: payout.id }).where(eq(wallet.id, id));

  await sendEmail({
    to: me.email,
    subject: "A wallet now pays out somewhere new",
    heading: "Payout account changed",
    lines: [
      `Your ${NETWORK_INFO[w.network].name} wallet ending ${w.address.slice(-4)} now pays out to ${payoutShort(payout)}.`,
      "If this wasn't you, change your password right away and pause the wallet.",
    ],
    action: { label: "Review wallets", url: appUrl("/dashboard/wallets") },
  });

  revalidatePath("/dashboard", "layout");
  return ok(null);
}

export async function archiveWallet(id: string): Promise<ActionResult> {
  const me = await requireUser();
  const w = await ownedWallet(me.id, id);
  if (!w) return fail("That wallet doesn't exist.");

  try {
    await payments().archiveDepositAddress(w.providerRef);
  } catch (err) {
    return providerFailure(err);
  }

  await db
    .update(wallet)
    .set({ status: "paused", pausedReason: "user", archivedAt: new Date() })
    .where(eq(wallet.id, id));
  revalidatePath("/dashboard", "layout");
  return ok(null);
}

/** Restarts a payout that failed before Qadi created an order. */
export async function retryPayout(transactionId: string): Promise<ActionResult> {
  const me = await requireUser();
  const [t] = await db
    .update(transaction)
    .set({ status: "received", failureReason: null })
    .where(
      and(
        eq(transaction.id, transactionId),
        eq(transaction.userId, me.id),
        eq(transaction.direction, "offramp"),
        eq(transaction.status, "failed"),
        isNull(transaction.orderRef),
      ),
    )
    .returning({ id: transaction.id });
  if (!t) return fail("This payout can't be retried.");
  await startOfframp(t.id);
  revalidatePath("/dashboard", "layout");
  return ok(null);
}

const simulateSchema = z.object({
  token: z.enum(TOKENS),
  amount: z.coerce.number().positive("Enter an amount.").max(MAX_USD, `Keep it under $${MAX_USD.toLocaleString("en-US")}.`),
});

/** Demo mode only: pretend someone sent crypto to this wallet. */
export async function simulateDeposit(id: string, input: unknown): Promise<ActionResult> {
  if (paymentsMode() !== "mock") return fail("Simulations only run in demo mode.");
  const me = await requireUser();
  const w = await ownedWallet(me.id, id);
  if (!w) return fail("That wallet doesn't exist.");
  const parsed = simulateSchema.safeParse(input);
  if (!parsed.success) return fail(Object.values(zodFieldErrors(parsed.error))[0] ?? "Check the amount.");

  const deposit = mockProvider.depositEvent({
    address: w.address,
    network: w.network,
    token: parsed.data.token,
    amount: parsed.data.amount,
  });
  await processProviderEvents([deposit]);

  const t = await db.query.transaction.findFirst({ where: eq(transaction.providerRef, deposit.depositRef) });
  if (t?.orderRef) {
    await processProviderEvents([
      mockProvider.orderEvent(t.orderRef, { status: "completed", fiatAmount: Number(t.fiatAmount ?? 0) }),
    ]);
  }
  revalidatePath("/dashboard", "layout");
  return ok(null);
}
