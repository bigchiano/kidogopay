import Link from "next/link";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { Direction } from "@/lib/constants";
import type { TxWithRelations } from "@/lib/queries";
import { formatCrypto, formatDay, formatFiat, shortAddress } from "@/lib/format";
import { payoutShort } from "@/lib/payout";
import { StatusBadge, effectiveStatus } from "@/components/status";
import { Panel } from "@/components/ui";

function TypeLabel({ direction }: { direction: Direction }) {
  const off = direction === "offramp";
  const Icon = off ? ArrowDownRight : ArrowUpRight;
  return (
    <span className="inline-flex items-center gap-1.5 font-semibold">
      <Icon className="size-4 text-adire" aria-hidden />
      {off ? "Cash-out" : "Purchase"}
    </span>
  );
}

function amounts(t: TxWithRelations) {
  const off = t.direction === "offramp";
  const crypto = formatCrypto(t.cryptoAmount, t.token);
  const fiat = t.fiatAmount ? formatFiat(t.fiatAmount, t.fiatCurrency) : "–";
  return off ? { sent: crypto, got: fiat } : { sent: fiat, got: crypto };
}

function destination(t: TxWithRelations) {
  return t.direction === "offramp"
    ? t.payoutAccount
      ? payoutShort(t.payoutAccount)
      : ""
    : shortAddress(t.destinationAddress ?? "");
}

export function ActivityList({ txs }: { txs: TxWithRelations[] }) {
  return (
    <Panel className="overflow-hidden">
      <table className="hidden w-full text-left text-sm md:table">
        <thead className="border-b border-mist text-muted">
          <tr>
            <th scope="col" className="px-5 py-3 font-semibold">Date</th>
            <th scope="col" className="px-3 py-3 font-semibold">Type</th>
            <th scope="col" className="px-3 py-3 text-right font-semibold">Sent</th>
            <th scope="col" className="px-3 py-3 text-right font-semibold">Received</th>
            <th scope="col" className="px-3 py-3 font-semibold">To</th>
            <th scope="col" className="px-5 py-3 font-semibold">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-mist">
          {txs.map((t) => {
            const a = amounts(t);
            return (
              <tr key={t.id} className="relative transition-colors hover:bg-chalk/70">
                <td className="px-5 py-4 whitespace-nowrap text-muted">
                  <Link href={`/dashboard/activity/${t.id}`} className="after:absolute after:inset-0">
                    {formatDay(t.createdAt)}
                  </Link>
                </td>
                <td className="px-3 py-4">
                  <TypeLabel direction={t.direction} />
                </td>
                <td className="tnum px-3 py-4 text-right whitespace-nowrap">{a.sent}</td>
                <td className="tnum px-3 py-4 text-right font-semibold whitespace-nowrap">{a.got}</td>
                <td className="max-w-[220px] truncate px-3 py-4 text-muted">{destination(t)}</td>
                <td className="px-5 py-4">
                  <StatusBadge direction={t.direction} status={effectiveStatus(t)} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <ul className="divide-y divide-mist md:hidden">
        {txs.map((t) => {
          const a = amounts(t);
          return (
            <li key={t.id}>
              <Link href={`/dashboard/activity/${t.id}`} className="flex items-start justify-between gap-4 px-4 py-4 active:bg-chalk">
                <div className="min-w-0">
                  <TypeLabel direction={t.direction} />
                  <p className="mt-1 text-sm text-muted">{formatDay(t.createdAt)}</p>
                  <p className="truncate text-sm text-muted">{destination(t)}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="tnum font-semibold">{a.got}</p>
                  <div className="mt-1.5">
                    <StatusBadge direction={t.direction} status={effectiveStatus(t)} />
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
