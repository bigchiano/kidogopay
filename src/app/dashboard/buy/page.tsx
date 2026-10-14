import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { limitSummary } from "@/lib/limits";
import { listPayoutAccounts } from "@/lib/queries";
import { formatPhone } from "@/lib/format";
import { payoutShort } from "@/lib/payout";
import { Alert, PageHeader } from "@/components/ui";
import { BuyForm } from "@/components/dashboard/buy-form";

export const metadata: Metadata = { title: "Buy crypto" };

export default async function BuyPage() {
  const me = await requireUser();
  const [limit, accounts] = await Promise.all([limitSummary(me.id), listPayoutAccounts(me.id)]);
  const mpesa = accounts.find((a) => a.method === "mobile_money");

  return (
    <>
      <PageHeader
        title="Buy crypto"
        description="Pay in KES with M-Pesa or in NGN by bank transfer. We send USDC or USDT to the wallet you choose."
      />
      {limit.reached ? (
        <Alert>Verify your business in Settings to buy more crypto.</Alert>
      ) : (
        <BuyForm
          remainingUsd={limit.kyb === "approved" ? null : limit.remaining}
          mpesaPhone={mpesa ? formatPhone(mpesa.accountNumber) : undefined}
          ngnAccounts={accounts.filter((a) => a.currency === "NGN").map((a) => ({ id: a.id, label: payoutShort(a) }))}
        />
      )}
    </>
  );
}
