"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { simulateOnrampPayment } from "@/lib/actions/onramp";
import { retryPayout } from "@/lib/actions/wallets";
import type { ActionResult } from "@/lib/actions/result";
import { Alert, Button } from "@/components/ui";

/** Keeps a page fresh while money is moving. */
export function AutoRefresh({ every = 5000 }: { every?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), every);
    return () => clearInterval(t);
  }, [router, every]);
  return null;
}

export function Countdown({ to }: { to: string }) {
  const router = useRouter();
  const [left, setLeft] = useState(() => new Date(to).getTime() - Date.now());
  useEffect(() => {
    const t = setInterval(() => {
      const ms = new Date(to).getTime() - Date.now();
      setLeft(ms);
      if (ms <= 0) {
        clearInterval(t);
        router.refresh();
      }
    }, 1000);
    return () => clearInterval(t);
  }, [to, router]);
  const s = Math.max(0, Math.floor(left / 1000));
  return (
    <span className="tnum font-semibold text-ink">
      {Math.floor(s / 60)}:{String(s % 60).padStart(2, "0")}
    </span>
  );
}

function ActionButton({ label, pendingLabel, action, variant = "primary" }: {
  label: string;
  pendingLabel: string;
  action: () => Promise<ActionResult>;
  variant?: "primary" | "secondary";
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="space-y-3">
      <Button
        variant={variant}
        size="sm"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError(null);
            const res = await action();
            if (!res.ok) setError(res.error);
            else router.refresh();
          })
        }
      >
        {pending ? pendingLabel : label}
      </Button>
      {error ? <Alert>{error}</Alert> : null}
    </div>
  );
}

export function SimulatePaymentButton({ id }: { id: string }) {
  return <ActionButton label="Simulate payment" pendingLabel="Paying…" action={() => simulateOnrampPayment(id)} variant="secondary" />;
}

export function RetryPayoutButton({ id }: { id: string }) {
  return <ActionButton label="Try the payout again" pendingLabel="Retrying…" action={() => retryPayout(id)} />;
}
