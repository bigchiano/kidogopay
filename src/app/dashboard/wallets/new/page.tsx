import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { limitSummary } from "@/lib/limits";
import { listPayoutAccounts } from "@/lib/queries";
import { payoutNumber, payoutTitle } from "@/lib/payout";
import { Alert, ButtonLink, PageHeader } from "@/components/ui";
import { BackLink, EmptyState } from "@/components/dashboard/shared";
import { WalletForm } from "@/components/dashboard/wallet-form";

export const metadata: Metadata = { title: "New wallet" };

export default async function NewWalletPage({ searchParams }: { searchParams: Promise<{ payout?: string }> }) {
  const me = await requireUser();
  const sp = await searchParams;
  const [accounts, limit] = await Promise.all([listPayoutAccounts(me.id), limitSummary(me.id)]);

  return (
    <>
      <BackLink href="/dashboard/wallets">Wallets</BackLink>
      <PageHeader title="New wallet" description="Pick a network and where the money should land. You get an address to share or send to." />
      {limit.reached ? (
        <Alert>Verify your business in Settings before creating more wallets.</Alert>
      ) : accounts.length === 0 ? (
        <EmptyState
          title="Add a payout account first"
          body="Wallets pay out to an M-Pesa number or bank account, so add one of those before creating a wallet."
          action={<ButtonLink href="/dashboard/payouts/new?next=/dashboard/wallets/new">Add payout account</ButtonLink>}
        />
      ) : (
        <WalletForm
          preselect={sp.payout}
          accounts={accounts.map((a) => ({
            id: a.id,
            title: payoutTitle(a),
            detail: payoutNumber(a),
            currency: a.currency,
            method: a.method,
          }))}
        />
      )}
    </>
  );
}
