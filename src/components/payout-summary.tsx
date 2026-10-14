import { Landmark, Smartphone } from "lucide-react";
import type { PayoutAccount } from "@/lib/db/schema";
import { payoutNumber, payoutTitle } from "@/lib/payout";
import { Chip } from "./ui";

export function PayoutIcon({ method, className = "" }: { method: PayoutAccount["method"]; className?: string }) {
  const Icon = method === "mobile_money" ? Smartphone : Landmark;
  return (
    <span className={`grid size-9 shrink-0 place-items-center rounded-lg bg-haze text-adire ${className}`}>
      <Icon className="size-4.5" aria-hidden />
    </span>
  );
}

export function PayoutSummary({ account }: { account: PayoutAccount }) {
  return (
    <div className="flex items-start gap-3">
      <PayoutIcon method={account.method} className="mt-0.5" />
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2 font-semibold">
          {payoutTitle(account)}
          <Chip>{account.currency}</Chip>
        </p>
        <p className="truncate text-sm text-muted">{account.accountName}</p>
        <p className="tnum text-sm text-muted">{payoutNumber(account)}</p>
      </div>
    </div>
  );
}
