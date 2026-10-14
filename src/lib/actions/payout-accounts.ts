"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { payoutAccount, wallet } from "@/lib/db/schema";
import { CURRENCIES } from "@/lib/constants";
import { requireUser } from "@/lib/session";
import { normalizeKenyanPhone } from "@/lib/validation";
import { payments } from "@/lib/payments";
import { sendEmail, appUrl } from "@/lib/mail";
import { payoutShort } from "@/lib/payout";
import { fail, ok, providerFailure, zodFieldErrors, type ActionResult } from "./result";

const common = {
  accountName: z.string().trim().min(2, "Enter the name on the account.").max(80, "Keep the name under 80 characters."),
  label: z.string().trim().max(40, "Keep the nickname under 40 characters.").optional(),
};

const schema = z.discriminatedUnion("method", [
  z.object({
    method: z.literal("mobile_money"),
    currency: z.literal("KES", { error: "M-Pesa payouts are in KES." }),
    phone: z.string().trim().min(1, "Enter the M-Pesa number."),
    ...common,
  }),
  z.object({
    method: z.literal("bank"),
    currency: z.enum(CURRENCIES, { error: "Choose a currency." }),
    bankCode: z.string().min(1, "Choose your bank."),
    accountNumber: z.string().trim().min(1, "Enter the account number."),
    ...common,
  }),
]);

export async function createPayoutAccount(input: unknown): Promise<ActionResult<{ id: string }>> {
  const me = await requireUser();
  const parsed = schema.safeParse(input);
  if (!parsed.success) return fail("Check the highlighted fields.", zodFieldErrors(parsed.error));
  const v = parsed.data;

  let banks;
  try {
    banks = await payments().listBanks(v.currency);
  } catch (err) {
    return providerFailure(err);
  }

  let accountNumber: string;
  let bankCode: string;
  let bankName: string | null = null;

  if (v.method === "mobile_money") {
    const phone = normalizeKenyanPhone(v.phone);
    if (!phone) {
      return fail("Check the highlighted fields.", { phone: "Enter a Kenyan number like 0712 345 678." });
    }
    const mpesa =
      banks.find((b) => b.type === "mobile_money" && /m-?pesa/i.test(`${b.code} ${b.name}`)) ??
      banks.find((b) => b.type === "mobile_money");
    if (!mpesa) return fail("M-Pesa payouts aren't available right now. Try a bank account instead.");
    accountNumber = phone;
    bankCode = mpesa.code;
  } else {
    accountNumber = v.accountNumber.replace(/[\s-]/g, "");
    if (v.currency === "NGN" && !/^\d{10}$/.test(accountNumber)) {
      return fail("Check the highlighted fields.", { accountNumber: "Nigerian account numbers have 10 digits." });
    }
    if (v.currency === "KES" && !/^[0-9A-Za-z]{5,20}$/.test(accountNumber)) {
      return fail("Check the highlighted fields.", {
        accountNumber: "Enter the account number exactly as it appears on your statement.",
      });
    }
    const bank = banks.find((b) => b.type === "bank" && b.code === v.bankCode);
    if (!bank) return fail("Check the highlighted fields.", { bankCode: "Choose your bank from the list." });
    bankCode = bank.code;
    bankName = bank.name;
  }

  const duplicate = await db.query.payoutAccount.findFirst({
    where: and(
      eq(payoutAccount.userId, me.id),
      eq(payoutAccount.currency, v.currency),
      eq(payoutAccount.accountNumber, accountNumber),
      isNull(payoutAccount.archivedAt),
    ),
  });
  if (duplicate) return fail("You've already added this account.");

  let providerRef: string;
  try {
    ({ ref: providerRef } = await payments().createBeneficiary({
      currency: v.currency,
      method: v.method,
      accountName: v.accountName,
      accountNumber,
      bankCode,
    }));
  } catch (err) {
    return providerFailure(err);
  }

  const [row] = await db
    .insert(payoutAccount)
    .values({
      userId: me.id,
      currency: v.currency,
      method: v.method,
      label: v.label || null,
      accountName: v.accountName,
      accountNumber,
      bankCode,
      bankName,
      providerRef,
    })
    .returning();

  await sendEmail({
    to: me.email,
    subject: "New payout account added",
    heading: "A payout account was added",
    lines: [
      `${payoutShort(row)} (${row.accountName}) can now receive payouts from your KidogoPay wallets.`,
      "If this wasn't you, change your password right away and remove the account.",
    ],
    action: { label: "Review payout accounts", url: appUrl("/dashboard/payouts") },
  });

  revalidatePath("/dashboard", "layout");
  return ok({ id: row.id });
}

export async function archivePayoutAccount(id: string): Promise<ActionResult> {
  const me = await requireUser();
  const account = await db.query.payoutAccount.findFirst({
    where: and(eq(payoutAccount.id, id), eq(payoutAccount.userId, me.id), isNull(payoutAccount.archivedAt)),
  });
  if (!account) return fail("That payout account doesn't exist.");

  const linked = await db.query.wallet.findFirst({
    where: and(eq(wallet.payoutAccountId, id), isNull(wallet.archivedAt)),
  });
  if (linked) return fail("A wallet still pays out here. Point it at another account or delete it first.");

  if (account.providerRef) {
    try {
      await payments().removeBeneficiary(account.providerRef);
    } catch (err) {
      // Removal at Qadi only stops future selection; keep going so the customer isn't stuck.
      console.error("[payments] couldn't remove bank account", err);
    }
  }
  await db.update(payoutAccount).set({ archivedAt: new Date() }).where(eq(payoutAccount.id, id));
  revalidatePath("/dashboard", "layout");
  return ok(null);
}
