"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { NETWORKS, NETWORK_INFO, type Network, type PayoutMethod } from "@/lib/constants";
import { createWallet } from "@/lib/actions/wallets";
import { NetworkName } from "@/components/crypto";
import { PayoutIcon } from "@/components/payout-summary";
import { RampLine } from "@/components/ramp";
import { Alert, Button, Chip, Field, inputClasses } from "@/components/ui";

export type AccountOption = { id: string; title: string; detail: string; currency: "KES" | "NGN"; method: PayoutMethod };

const card = (selected: boolean) =>
  `block cursor-pointer rounded-xl border bg-white p-4 transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-adire ${
    selected ? "border-adire ring-1 ring-adire" : "border-mist hover:border-ink/30"
  }`;

export function WalletForm({ accounts, preselect }: { accounts: AccountOption[]; preselect?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [network, setNetwork] = useState<Network>("base");
  const [payoutId, setPayoutId] = useState(accounts.some((a) => a.id === preselect) ? preselect! : accounts[0]?.id);
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const selected = accounts.find((a) => a.id === payoutId);

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await createWallet({ network, payoutAccountId: payoutId, label });
      if (!res.ok) {
        setError(res.error);
        setFieldErrors(res.fieldErrors ?? {});
        return;
      }
      router.push(`/dashboard/wallets?new=${res.data.id}#w-${res.data.id}`);
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
      <div className="space-y-9">
        <fieldset>
          <legend className="text-sm font-semibold">Network</legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {NETWORKS.map((n) => (
              <label key={n} className={card(network === n)}>
                <input type="radio" name="network" value={n} checked={network === n} onChange={() => setNetwork(n)} className="sr-only" />
                <NetworkName network={n} />
                <span className="mt-1 block text-sm text-muted">USDC and USDT ({NETWORK_INFO[n].tokenStandard})</span>
              </label>
            ))}
          </div>
          {fieldErrors.network ? <p className="mt-2 text-sm text-ember">{fieldErrors.network}</p> : null}
        </fieldset>

        <fieldset>
          <legend className="text-sm font-semibold">Pay out to</legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {accounts.map((a) => (
              <label key={a.id} className={card(payoutId === a.id)}>
                <input type="radio" name="payout" value={a.id} checked={payoutId === a.id} onChange={() => setPayoutId(a.id)} className="sr-only" />
                <span className="flex items-start gap-3">
                  <PayoutIcon method={a.method} />
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-2 font-semibold">
                      {a.title}
                      <Chip>{a.currency}</Chip>
                    </span>
                    <span className="block truncate text-sm text-muted">{a.detail}</span>
                  </span>
                </span>
              </label>
            ))}
          </div>
          {fieldErrors.payoutAccountId ? <p className="mt-2 text-sm text-ember">{fieldErrors.payoutAccountId}</p> : null}
          <p className="mt-3 text-sm">
            <Link href="/dashboard/payouts/new?next=/dashboard/wallets/new" className="font-semibold underline underline-offset-4">
              Add another payout account
            </Link>
          </p>
        </fieldset>

        <Field label="Name (optional)" htmlFor="label" hint="Only you see this. For example, Client payments." error={fieldErrors.label}>
          <input id="label" value={label} maxLength={40} onChange={(e) => setLabel(e.target.value)} className={`${inputClasses} max-w-md`} />
        </Field>
      </div>

      <aside className="on-dark rounded-2xl bg-adire p-6 text-chalk lg:sticky lg:top-24">
        <p className="text-lg leading-snug">
          USDC or USDT sent to this address on <strong>{NETWORK_INFO[network].name}</strong> is converted to{" "}
          <strong>{selected?.currency}</strong> and paid to <strong>{selected?.title}</strong> {selected?.detail}.
        </p>
        <RampLine direction="offramp" className="my-5 h-10 w-full" />
        {error ? (
          <div className="mb-4">
            <Alert>{error}</Alert>
          </div>
        ) : null}
        <Button type="submit" className="w-full" disabled={pending || !payoutId}>
          {pending ? "Creating wallet…" : "Create wallet"}
        </Button>
      </aside>
    </form>
  );
}
