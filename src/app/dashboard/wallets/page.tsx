import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { requireUser } from "@/lib/session";
import { limitSummary } from "@/lib/limits";
import { listPayoutAccounts, listWallets } from "@/lib/queries";
import { paymentsMode } from "@/lib/payments";
import { payoutShort } from "@/lib/payout";
import { ButtonLink, PageHeader } from "@/components/ui";
import { WalletCard } from "@/components/dashboard/wallet-card";
import { EmptyState, LimitNotice } from "@/components/dashboard/shared";

export const metadata: Metadata = { title: "Wallets" };

export default async function WalletsPage({ searchParams }: { searchParams: Promise<{ new?: string }> }) {
  const me = await requireUser();
  const sp = await searchParams;
  const [wallets, accounts, limit] = await Promise.all([listWallets(me.id), listPayoutAccounts(me.id), limitSummary(me.id)]);
  const options = accounts.map((a) => ({ id: a.id, label: `${payoutShort(a)} (${a.currency})` }));
  const demo = paymentsMode() === "mock";

  return (
    <>
      <PageHeader
        title="Wallets"
        description="Each wallet is an address that turns USDC and USDT into KES or NGN and pays it to the account you link."
        actions={
          <ButtonLink href="/dashboard/wallets/new">
            <Plus className="size-4" aria-hidden />
            New wallet
          </ButtonLink>
        }
      />
      <LimitNotice limit={limit} />
      {wallets.length ? (
        <div className="space-y-6">
          {wallets.map((w) => (
            <WalletCard key={w.id} wallet={w} accounts={options} isNew={sp.new === w.id} demo={demo} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="Create your first wallet"
          body="Pick a network and a payout account. Anything sent to the address is converted and paid out automatically."
          action={<ButtonLink href="/dashboard/wallets/new">Create a wallet</ButtonLink>}
        />
      )}
    </>
  );
}
