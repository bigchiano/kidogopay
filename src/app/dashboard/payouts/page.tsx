import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { requireUser } from "@/lib/session";
import { listPayoutAccounts } from "@/lib/queries";
import { Alert, ButtonLink, PageHeader, Panel } from "@/components/ui";
import { PayoutSummary } from "@/components/payout-summary";
import { EmptyState } from "@/components/dashboard/shared";
import { RemovePayoutButton } from "@/components/dashboard/remove-payout";

export const metadata: Metadata = { title: "Payout accounts" };

export default async function PayoutsPage({ searchParams }: { searchParams: Promise<{ added?: string }> }) {
  const me = await requireUser();
  const sp = await searchParams;
  const accounts = await listPayoutAccounts(me.id);

  return (
    <>
      <PageHeader
        title="Payout accounts"
        description="Where your money lands: M-Pesa or a bank account in Kenya, or a bank account in Nigeria."
        actions={
          <ButtonLink href="/dashboard/payouts/new">
            <Plus className="size-4" aria-hidden />
            Add payout account
          </ButtonLink>
        }
      />
      {sp.added ? (
        <div className="mb-6">
          <Alert tone="success">Payout account added. Link it to a wallet to start receiving.</Alert>
        </div>
      ) : null}
      {accounts.length ? (
        <Panel>
          <ul className="divide-y divide-mist">
            {accounts.map((a) => (
              <li key={a.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <PayoutSummary account={a} />
                  {a.label ? <p className="mt-2 pl-12 text-sm text-muted">{a.label}</p> : null}
                </div>
                <div className="flex items-center gap-5 pl-12 sm:pl-0">
                  <p className="text-sm text-muted">
                    {a.walletCount ? `${a.walletCount} wallet${a.walletCount === 1 ? "" : "s"} pay out here` : "No wallets yet"}
                  </p>
                  <RemovePayoutButton id={a.id} locked={a.walletCount > 0} />
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      ) : (
        <EmptyState
          title="Add where you want to get paid"
          body="Add an M-Pesa number or a bank account. You can link it to as many wallets as you like."
          action={<ButtonLink href="/dashboard/payouts/new">Add payout account</ButtonLink>}
        />
      )}
    </>
  );
}
