import { NETWORK_INFO, networkNames } from "@/lib/constants";
import type { PayoutAccount, Wallet } from "@/lib/db/schema";
import { AddressText, NetworkNames, TokenChips } from "@/components/crypto";
import { CopyButton } from "@/components/copy-button";
import { PayoutSummary } from "@/components/payout-summary";
import { QrCode } from "@/components/qr-code";
import { RampLine } from "@/components/ramp";
import { Alert } from "@/components/ui";
import { WalletActions } from "./wallet-actions";

type Props = {
  wallet: Wallet & { payoutAccount: PayoutAccount };
  accounts: { id: string; label: string }[];
  isNew?: boolean;
  demo: boolean;
};

export async function WalletCard({ wallet: w, accounts, isNew = false, demo }: Props) {
  const nets = networkNames(w.networks);
  const standards = w.networks.map((n) => `${NETWORK_INFO[n].tokenStandard} on ${NETWORK_INFO[n].short}`).join(", ");
  const paused = w.status !== "active";
  const coins = w.tokens.join(" or ");
  const ramp = paused ? "#dcdeec" : "#ffb61d";
  return (
    <article
      id={`w-${w.id}`}
      className={`scroll-mt-24 rounded-2xl border bg-white p-5 sm:p-6 ${isNew ? "border-marigold ring-4 ring-marigold/25" : "border-mist"}`}
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex flex-wrap items-center gap-2 text-lg">
            <NetworkNames networks={w.networks} />
            <TokenChips tokens={w.tokens} />
          </h2>
          {w.label ? <p className="mt-1 text-sm text-muted">{w.label}</p> : null}
        </div>
        {paused ? (
          <span className="inline-flex h-6 items-center rounded-full bg-sun-soft px-2.5 text-xs font-semibold">
            {w.pausedReason === "limit" ? "Paused at limit" : "Paused"}
          </span>
        ) : (
          <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-leaf-soft px-2.5 text-xs font-semibold text-leaf">
            <span className="size-1.5 rounded-full bg-leaf" aria-hidden />
            Active
          </span>
        )}
      </header>

      {isNew ? (
        <div className="mt-4">
          <Alert tone="success">Your wallet is ready. Share the address below, or send to it yourself.</Alert>
        </div>
      ) : null}

      <div className="mt-5 grid items-center gap-2 lg:grid-cols-[minmax(0,1.25fr)_88px_minmax(0,1fr)] lg:gap-3">
        <div className={`rounded-xl p-4 ${paused ? "bg-haze" : "bg-chalk"}`}>
          <p className="text-sm font-semibold text-muted">
            Send {coins} on {nets} to
          </p>
          <AddressText address={w.address} className={`mt-2 block ${paused ? "text-muted" : ""}`} />
          {paused ? (
            <p className="mt-3 text-sm font-semibold text-ember">Paused. Deposits sent now are held, not paid out.</p>
          ) : null}
          <div className="mt-3 flex flex-wrap items-start gap-2">
            <CopyButton value={w.address} label="Copy address" />
            {!paused ? (
              <details className="group">
                <summary className="inline-flex h-8 cursor-pointer list-none items-center rounded-lg border border-mist bg-white px-2.5 text-[13px] font-semibold hover:border-ink/30 [&::-webkit-details-marker]:hidden">
                  <span className="group-open:hidden">Show QR code</span>
                  <span className="hidden group-open:inline">Hide QR code</span>
                </summary>
                <div className="mt-3">
                  <QrCode value={w.address} />
                </div>
              </details>
            ) : null}
          </div>
        </div>
        <RampLine direction="offramp" color={ramp} className="hidden h-10 w-full lg:block" />
        <RampLine direction="offramp" vertical color={ramp} className="mx-auto h-9 w-8 lg:hidden" />
        <div className="rounded-xl border border-mist p-4">
          <p className="mb-3 text-sm font-semibold text-muted">Pays out to</p>
          <PayoutSummary account={w.payoutAccount} />
        </div>
      </div>

      <p className="mt-4 text-sm text-muted">
        Only send {coins} on {nets} ({standards}). Coins sent on other networks may not be recoverable.
      </p>

      <WalletActions id={w.id} active={!paused} payoutAccountId={w.payoutAccountId} accounts={accounts} demo={demo} />
    </article>
  );
}
