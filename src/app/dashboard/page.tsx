import type { Metadata } from "next";
import Link from "next/link";
import { Check, Plus } from "lucide-react";
import type { ReactNode } from "react";
import { requireUser } from "@/lib/session";
import { limitSummary } from "@/lib/limits";
import { listPayoutAccounts, listTransactions, listWallets, monthTotals } from "@/lib/queries";
import { formatFiat, formatUsd, shortAddress } from "@/lib/format";
import { payoutShort } from "@/lib/payout";
import { CURRENCIES, type Currency } from "@/lib/constants";
import { ButtonLink, PageHeader, Panel } from "@/components/ui";
import { NetworkNames } from "@/components/crypto";
import { ActivityList } from "@/components/dashboard/activity-list";
import { EmptyState, LimitMeter, LimitNotice, SectionHeading } from "@/components/dashboard/shared";

export const metadata: Metadata = { title: "Overview" };

export default async function OverviewPage() {
  const me = await requireUser();
  const [accounts, wallets, txs, totals, limit] = await Promise.all([
    listPayoutAccounts(me.id),
    listWallets(me.id),
    listTransactions(me.id, { limit: 5 }),
    monthTotals(me.id),
    limitSummary(me.id),
  ]);
  const firstName = me.name.trim().split(/\s+/)[0] || "there";
  const held = new Set(accounts.map((a) => a.currency));
  const currencies: Currency[] = CURRENCIES.filter((c) => held.has(c) || totals.paidOut[c] > 0);
  if (!currencies.length) currencies.push("KES");

  return (
    <>
      <PageHeader
        title={`Hi, ${firstName}`}
        description="Your cash-outs and purchases at a glance."
        actions={
          <>
            <ButtonLink href="/dashboard/buy" variant="secondary">
              Buy crypto
            </ButtonLink>
            <ButtonLink href="/dashboard/wallets/new">
              <Plus className="size-4" aria-hidden />
              New wallet
            </ButtonLink>
          </>
        }
      />
      <LimitNotice limit={limit} />
      {!accounts.length || !wallets.length ? <GetStarted hasAccount={accounts.length > 0} hasWallet={wallets.length > 0} /> : null}

      <Panel className="grid divide-y divide-mist md:grid-cols-3 md:divide-x md:divide-y-0">
        <Stat label="Paid out this month">
          {currencies.map((c) => (
            <p key={c} className="tnum font-wide text-2xl font-bold tracking-[-0.02em]">
              {formatFiat(totals.paidOut[c], c)}
            </p>
          ))}
        </Stat>
        <Stat label="Bought this month">
          <p className="tnum font-wide text-2xl font-bold tracking-[-0.02em]">{formatUsd(totals.boughtUsd, 2)}</p>
          <p className="mt-1 text-sm text-muted">In USDC and USDT</p>
        </Stat>
        <Stat label="Before verification">
          <LimitMeter limit={limit} />
        </Stat>
      </Panel>

      <section className="mt-12">
        <SectionHeading title="Wallets" href="/dashboard/wallets" linkLabel="Manage wallets" />
        {wallets.length ? (
          <Panel>
            <ul className="divide-y divide-mist">
              {wallets.slice(0, 4).map((w) => (
                <li key={w.id}>
                  <Link
                    href={`/dashboard/wallets#w-${w.id}`}
                    className="grid items-center gap-1.5 px-5 py-4 transition-colors hover:bg-chalk/70 sm:grid-cols-[190px_1fr_auto] sm:gap-6"
                  >
                    <NetworkNames networks={w.networks} />
                    <p className="min-w-0 truncate text-sm text-muted">
                      <span className="font-mono text-ink">{shortAddress(w.address)}</span> pays out to {payoutShort(w.payoutAccount)}
                    </p>
                    <span className={`text-sm font-semibold ${w.status === "active" ? "text-leaf" : "text-muted"}`}>
                      {w.status === "active" ? "Active" : "Paused"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
        ) : (
          <EmptyState
            title="No wallets yet"
            body="A wallet is an address that turns USDC or USDT into shillings or naira, automatically."
            action={<ButtonLink href="/dashboard/wallets/new">Create a wallet</ButtonLink>}
          />
        )}
      </section>

      <section className="mt-12">
        <SectionHeading title="Recent activity" href="/dashboard/activity" linkLabel="See all activity" />
        {txs.length ? (
          <ActivityList txs={txs} />
        ) : (
          <EmptyState title="Nothing here yet" body="Cash-outs and purchases show up here the moment they start." />
        )}
      </section>
    </>
  );
}

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="p-5 sm:p-6">
      <p className="mb-2 text-sm font-semibold text-muted">{label}</p>
      {children}
    </div>
  );
}

function GetStarted({ hasAccount, hasWallet }: { hasAccount: boolean; hasWallet: boolean }) {
  const steps = [
    {
      done: hasAccount,
      title: "Add a payout account",
      body: "Your M-Pesa number or a bank account.",
      href: "/dashboard/payouts/new",
      cta: "Add payout account",
    },
    {
      done: hasWallet,
      title: "Create a wallet",
      body: "Get an address linked to that account.",
      href: "/dashboard/wallets/new",
      cta: "Create wallet",
    },
    { done: false, title: "Send USDC or USDT", body: "Payouts start on their own and show up below." },
  ];
  const next = steps.findIndex((s) => !s.done);
  return (
    <Panel className="mb-8 p-6 sm:p-8">
      <h2 className="text-lg font-bold">Get set up in three steps</h2>
      <ol className="mt-6 grid gap-6 md:grid-cols-3">
        {steps.map((s, i) => (
          <li key={s.title} className="flex gap-3">
            <span
              className={`grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold ${
                s.done ? "bg-leaf text-white" : i === next ? "bg-marigold text-ink" : "bg-haze text-muted"
              }`}
            >
              {s.done ? <Check className="size-4" aria-label="Done" /> : i + 1}
            </span>
            <div>
              <p className="font-semibold">{s.title}</p>
              <p className="mt-0.5 text-sm text-muted">{s.body}</p>
              {i === next && s.href ? (
                <ButtonLink href={s.href} size="sm" className="mt-3">
                  {s.cta}
                </ButtonLink>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </Panel>
  );
}
