"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { payoutAccount, transaction } from "@/lib/db/schema";
import { CURRENCIES, MAX_USD, MIN_USD, NETWORKS, TOKENS } from "@/lib/constants";
import { formatUsd } from "@/lib/format";
import { requireUser } from "@/lib/session";
import { limitError } from "@/lib/limits";
import { addressError, normalizeKenyanPhone } from "@/lib/validation";
import { mockProvider, payments, paymentsMode } from "@/lib/payments";
import { processProviderEvents } from "@/lib/payments/events";
import { fail, ok, providerFailure, zodFieldErrors, type ActionResult } from "./result";

const schema = z.object({
  currency: z.enum(CURRENCIES),
  amount: z.coerce.number({ error: "Enter an amount." }).positive("Enter an amount."),
  token: z.enum(TOKENS),
  network: z.enum(NETWORKS),
  destinationAddress: z.string().trim(),
  payerPhone: z.string().trim().optional(),
  refundPayoutAccountId: z.string().optional(),
  confirmed: z.literal(true, { error: "Confirm you've checked the address." }),
});

export async function createOnrampOrder(input: unknown): Promise<ActionResult<{ id: string }>> {
  const me = await requireUser();
  const parsed = schema.safeParse(input);
  if (!parsed.success) return fail("Check the highlighted fields.", zodFieldErrors(parsed.error));
  const v = parsed.data;

  const addrErr = addressError(v.network, v.destinationAddress);
  if (addrErr) return fail("Check the highlighted fields.", { destinationAddress: addrErr });

  let payerPhone: string | undefined;
  let refundRef: string | undefined;
  if (v.currency === "KES") {
    payerPhone = normalizeKenyanPhone(v.payerPhone ?? "") ?? undefined;
    if (!payerPhone) return fail("Check the highlighted fields.", { payerPhone: "Enter the M-Pesa number you'll pay from." });
  } else {
    const refund = v.refundPayoutAccountId
      ? await db.query.payoutAccount.findFirst({
          where: and(
            eq(payoutAccount.id, v.refundPayoutAccountId),
            eq(payoutAccount.userId, me.id),
            eq(payoutAccount.currency, "NGN"),
            isNull(payoutAccount.archivedAt),
          ),
        })
      : undefined;
    if (!refund?.providerRef) {
      return fail("Check the highlighted fields.", { refundPayoutAccountId: "Choose a Nigerian bank account for refunds." });
    }
    refundRef = refund.providerRef;
  }

  let usd: number;
  try {
    const rates = await payments().getRates();
    usd = v.amount / rates[v.currency];
  } catch (err) {
    return providerFailure(err);
  }
  if (usd < MIN_USD) return fail(`The smallest purchase is about ${formatUsd(MIN_USD)}.`, { amount: "Increase the amount." });
  if (usd > MAX_USD) return fail(`The largest single purchase is about ${formatUsd(MAX_USD)}.`, { amount: "Lower the amount." });

  const limit = await limitError(me.id, usd);
  if (limit) return fail(limit);

  const id = crypto.randomUUID();
  let order;
  try {
    order = await payments().createOnramp({
      currency: v.currency,
      fiatAmount: v.amount,
      token: v.token,
      network: v.network,
      destinationAddress: v.destinationAddress,
      payerPhone,
      refundBeneficiaryRef: refundRef,
      idempotencyKey: `kidogopay-onramp-${id}`,
    });
  } catch (err) {
    return providerFailure(err);
  }

  await db.insert(transaction).values({
    id,
    userId: me.id,
    direction: "onramp",
    status: "awaiting_payment",
    network: v.network,
    token: v.token,
    cryptoAmount: order.cryptoAmount.toFixed(6),
    fiatCurrency: v.currency,
    fiatAmount: order.fiatAmount.toFixed(2),
    rate: order.rate.toFixed(6),
    feeCrypto: order.feeCrypto.toFixed(6),
    usdValue: order.cryptoAmount.toFixed(2),
    destinationAddress: v.destinationAddress,
    paymentInstructions: order.instructions,
    providerRef: order.ref,
    orderRef: order.ref,
    expiresAt: new Date(order.expiresAt),
  });

  revalidatePath("/dashboard", "layout");
  return ok({ id });
}

/** Demo mode only: pretend the customer paid. */
export async function simulateOnrampPayment(id: string): Promise<ActionResult> {
  if (paymentsMode() !== "mock") return fail("Simulations only run in demo mode.");
  const me = await requireUser();
  const tx = await db.query.transaction.findFirst({
    where: and(eq(transaction.id, id), eq(transaction.userId, me.id)),
  });
  if (!tx || tx.direction !== "onramp" || !tx.orderRef) return fail("That order doesn't exist.");
  if (tx.status !== "awaiting_payment") return fail("This order isn't waiting for payment.");

  await processProviderEvents([
    mockProvider.orderEvent(tx.orderRef, {
      status: "completed",
      cryptoAmount: Number(tx.cryptoAmount),
      txHash: mockProvider.fakeTxHash(tx.network),
    }),
  ]);
  revalidatePath("/dashboard", "layout");
  return ok(null);
}
