import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import type { LimitSummary } from "@/lib/limits";
import { formatUsd } from "@/lib/format";
import { Alert, Panel } from "@/components/ui";

export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="mb-5 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
      <ArrowLeft className="size-4" aria-hidden />
      {children}
    </Link>
  );
}

export function SectionHeading({ title, href, linkLabel }: { title: string; href?: string; linkLabel?: string }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <h2 className="text-xl font-bold tracking-[-0.01em]">{title}</h2>
      {href && linkLabel ? (
        <Link href={href} className="text-sm font-semibold text-muted underline-offset-4 hover:text-ink hover:underline">
          {linkLabel}
        </Link>
      ) : null}
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: ReactNode; action?: ReactNode }) {
  return (
    <Panel className="px-6 py-10 sm:px-10">
      <h2 className="text-lg font-bold">{title}</h2>
      <p className="mt-2 max-w-[52ch] text-muted">{body}</p>
      {action ? <div className="mt-6 flex flex-wrap gap-2">{action}</div> : null}
    </Panel>
  );
}

export function LimitMeter({ limit }: { limit: LimitSummary }) {
  if (limit.kyb === "approved") {
    return (
      <>
        <p className="font-wide text-2xl font-bold tracking-[-0.02em]">No limit</p>
        <p className="mt-1 text-sm text-muted">Your business is verified.</p>
      </>
    );
  }
  const pct = Math.min(100, (limit.used / limit.threshold) * 100);
  const bar = limit.reached ? "bg-ember" : pct >= 80 ? "bg-marigold" : "bg-adire";
  return (
    <>
      <p className="tnum font-wide text-2xl font-bold tracking-[-0.02em]">
        {formatUsd(limit.used)} <span className="text-base font-semibold text-muted">of {formatUsd(limit.threshold)}</span>
      </p>
      <div className="mt-3 h-2 rounded-full bg-haze" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label="Volume before verification">
        <div className={`h-2 rounded-full ${bar}`} style={{ width: `${Math.max(pct, 2)}%` }} />
      </div>
      <p className="mt-2 text-sm text-muted">
        {limit.reached
          ? "Limit reached. Verify your business to keep going."
          : `${formatUsd(limit.remaining)} left before you need to verify your business.`}
      </p>
    </>
  );
}

export function LimitNotice({ limit }: { limit: LimitSummary }) {
  if (limit.kyb === "approved") return null;
  const link = (
    <Link href="/dashboard/settings" className="font-semibold underline underline-offset-4">
      Verify your business
    </Link>
  );
  if (limit.reached) {
    return (
      <div className="mb-8">
        <Alert tone="error">
          You&apos;ve reached {formatUsd(limit.threshold)} in total volume, so your wallets are paused and new deposits are held. {link} to keep going.
        </Alert>
      </div>
    );
  }
  if (limit.used / limit.threshold >= 0.8) {
    return (
      <div className="mb-8">
        <Alert tone="warning">
          You&apos;ve used {formatUsd(limit.used)} of {formatUsd(limit.threshold)}. {link} before you reach the limit so your wallets keep paying out.
        </Alert>
      </div>
    );
  }
  return null;
}
