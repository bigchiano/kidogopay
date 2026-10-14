import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { payments } from "@/lib/payments";
import type { Bank } from "@/lib/payments/types";
import { safeNextPath } from "@/lib/validation";
import { Alert, PageHeader } from "@/components/ui";
import { BackLink } from "@/components/dashboard/shared";
import { PayoutForm } from "@/components/dashboard/payout-form";

export const metadata: Metadata = { title: "Add payout account" };

export default async function NewPayoutPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  await requireUser();
  const sp = await searchParams;
  let banks: { KES: Bank[]; NGN: Bank[] } | null = null;
  try {
    const [KES, NGN] = await Promise.all([payments().listBanks("KES"), payments().listBanks("NGN")]);
    banks = { KES, NGN };
  } catch (err) {
    console.error("[payouts] couldn't load banks", err);
  }

  return (
    <>
      <BackLink href="/dashboard/payouts">Payout accounts</BackLink>
      <PageHeader title="Add a payout account" description="Payouts are sent in the account's currency, KES or NGN." />
      {banks ? (
        <PayoutForm banks={banks} next={safeNextPath(sp.next, "/dashboard/payouts")} />
      ) : (
        <Alert>We couldn&apos;t load the list of banks. Refresh the page in a minute.</Alert>
      )}
    </>
  );
}
