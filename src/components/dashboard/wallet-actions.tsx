"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FlaskConical, Pause, Play, Repeat, Trash } from "lucide-react";
import { TOKENS, type Token } from "@/lib/constants";
import type { ActionResult } from "@/lib/actions/result";
import { archiveWallet, relinkWallet, setWalletActive, simulateDeposit } from "@/lib/actions/wallets";
import { Alert, Button, inputClasses } from "@/components/ui";

type Mode = "idle" | "relink" | "delete" | "simulate";

export function WalletActions({
  id,
  active,
  payoutAccountId,
  accounts,
  demo,
}: {
  id: string;
  active: boolean;
  payoutAccountId: string;
  accounts: { id: string; label: string }[];
  demo: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [mode, setMode] = useState<Mode>("idle");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [target, setTarget] = useState(payoutAccountId);
  const [simToken, setSimToken] = useState<Token>("USDC");
  const [simAmount, setSimAmount] = useState("100");

  function run<T>(fn: () => Promise<ActionResult<T>>, done?: (data: T) => string | null) {
    setError(null);
    setNotice(null);
    start(async () => {
      const res = await fn();
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setMode("idle");
      setNotice(done ? done(res.data) : null);
      router.refresh();
    });
  }

  return (
    <div className="mt-5 border-t border-mist pt-4">
      {mode === "idle" ? (
        <div className="flex flex-wrap gap-2">
          {active ? (
            <Button variant="secondary" size="sm" disabled={pending} onClick={() => run(() => setWalletActive(id, false))}>
              <Pause className="size-4" aria-hidden />
              Pause
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              disabled={pending}
              onClick={() =>
                run(
                  () => setWalletActive(id, true),
                  (d) => (d.released ? `Turned on. ${d.released} held deposit${d.released === 1 ? " is" : "s are"} paying out now.` : null),
                )
              }
            >
              <Play className="size-4" aria-hidden />
              Turn on
            </Button>
          )}
          <Button variant="secondary" size="sm" disabled={pending} onClick={() => setMode("relink")}>
            <Repeat className="size-4" aria-hidden />
            Change payout account
          </Button>
          {demo && active ? (
            <Button variant="secondary" size="sm" disabled={pending} onClick={() => setMode("simulate")}>
              <FlaskConical className="size-4" aria-hidden />
              Simulate a deposit
            </Button>
          ) : null}
          <Button variant="ghost" size="sm" className="text-ember hover:bg-ember-soft sm:ml-auto" disabled={pending} onClick={() => setMode("delete")}>
            <Trash className="size-4" aria-hidden />
            Delete
          </Button>
        </div>
      ) : null}

      {mode === "relink" ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label htmlFor={`relink-${id}`} className="text-sm font-semibold sm:mr-1">
            Pay out to
          </label>
          <select id={`relink-${id}`} value={target} onChange={(e) => setTarget(e.target.value)} className={`${inputClasses} h-9 sm:max-w-sm`}>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <Button size="sm" disabled={pending} onClick={() => run(() => relinkWallet(id, target), () => "Payout account changed.")}>
              Save
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setMode("idle")}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      {mode === "delete" ? (
        <div className="space-y-3">
          <p className="text-sm">
            Delete this wallet? Its address stops paying out, and anything sent to it later has to be recovered through support.
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="danger" disabled={pending} onClick={() => run(() => archiveWallet(id))}>
              Delete wallet
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setMode("idle")}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      {mode === "simulate" ? (
        <div className="space-y-3">
          <p className="text-sm text-muted">Demo mode: pretend someone sent coins to this address and watch the payout run.</p>
          <div className="flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor={`sim-amount-${id}`}>
              Amount
            </label>
            <input
              id={`sim-amount-${id}`}
              inputMode="decimal"
              value={simAmount}
              onChange={(e) => setSimAmount(e.target.value.replace(/[^\d.]/g, ""))}
              className={`${inputClasses} tnum h-9 w-28`}
            />
            <label className="sr-only" htmlFor={`sim-token-${id}`}>
              Coin
            </label>
            <select id={`sim-token-${id}`} value={simToken} onChange={(e) => setSimToken(e.target.value as Token)} className={`${inputClasses} h-9 w-28`}>
              {TOKENS.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
            <Button
              size="sm"
              disabled={pending}
              onClick={() => run(() => simulateDeposit(id, { token: simToken, amount: simAmount }), () => "Deposit simulated. See it under Activity.")}
            >
              {pending ? "Sending…" : "Send test deposit"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setMode("idle")}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="mt-3">
          <Alert>{error}</Alert>
        </div>
      ) : null}
      {notice ? (
        <div className="mt-3">
          <Alert tone="success">{notice}</Alert>
        </div>
      ) : null}
    </div>
  );
}
