import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/session";
import { listTransactions } from "@/lib/queries";
import { PageHeader } from "@/components/ui";
import { ActivityList } from "@/components/dashboard/activity-list";
import { EmptyState } from "@/components/dashboard/shared";

export const metadata: Metadata = { title: "Activity" };

const TABS = [
  { key: "all", label: "All" },
  { key: "cashouts", label: "Cash-outs" },
  { key: "purchases", label: "Purchases" },
] as const;

export default async function ActivityPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const me = await requireUser();
  const { type } = await searchParams;
  const tab = TABS.find((t) => t.key === type)?.key ?? "all";
  const txs = await listTransactions(me.id, {
    direction: tab === "cashouts" ? "offramp" : tab === "purchases" ? "onramp" : undefined,
  });

  return (
    <>
      <PageHeader title="Activity" description="Every cash-out and purchase, newest first." />
      <nav aria-label="Filter activity" className="mb-5 inline-flex rounded-xl border border-mist bg-white p-1">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={t.key === "all" ? "/dashboard/activity" : `/dashboard/activity?type=${t.key}`}
            aria-current={tab === t.key ? "page" : undefined}
            className={`rounded-lg px-3.5 py-2 text-sm font-semibold ${tab === t.key ? "bg-adire text-chalk" : "text-ink hover:bg-haze"}`}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      {txs.length ? (
        <ActivityList txs={txs} />
      ) : (
        <EmptyState title="Nothing here yet" body="Cash-outs and purchases show up here the moment they start." />
      )}
    </>
  );
}
