import type { PayoutAccount } from "@/lib/db/schema";
import { maskAccount, maskPhone } from "@/lib/format";

type P = Pick<PayoutAccount, "method" | "bankName" | "accountNumber">;

export function payoutTitle(p: Pick<P, "method" | "bankName">) {
  return p.method === "mobile_money" ? "M-Pesa" : (p.bankName ?? "Bank account");
}

export function payoutNumber(p: Pick<P, "method" | "accountNumber">) {
  return p.method === "mobile_money" ? maskPhone(p.accountNumber) : maskAccount(p.accountNumber);
}

/** "Equity Bank •••• 4821" for tight spaces. */
export function payoutShort(p: P) {
  return `${payoutTitle(p)} ${payoutNumber(p)}`;
}
