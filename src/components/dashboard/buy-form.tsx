"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition, type FormEvent } from "react";
import {
  CURRENCIES,
  CURRENCY_INFO,
  MAX_USD,
  MIN_USD,
  NETWORKS,
  NETWORK_INFO,
  TOKENS,
  type Currency,
  type Network,
  type Token,
} from "@/lib/constants";
import { floorTo, formatCrypto, formatFiat, formatUsd } from "@/lib/format";
import { addressError, normalizeKenyanPhone } from "@/lib/validation";
import { createOnrampOrder } from "@/lib/actions/onramp";
import { AddressText, NetworkName } from "@/components/crypto";
import { RampLine } from "@/components/ramp";
import { Alert, Button, Field, inputClasses } from "@/components/ui";

const seg = (on: boolean) =>
  `h-10 rounded-lg px-3.5 text-sm font-semibold transition-colors ${on ? "bg-adire text-chalk" : "text-ink hover:bg-haze"}`;

export function BuyForm({
  remainingUsd,
  mpesaPhone,
  ngnAccounts,
}: {
  remainingUsd: number | null;
  mpesaPhone?: string;
  ngnAccounts: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [currency, setCurrency] = useState<Currency>("KES");
  const [amount, setAmount] = useState("");
  const [token, setToken] = useState<Token>("USDC");
  const [network, setNetwork] = useState<Network>("base");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState(mpesaPhone ?? "");
  const [refundId, setRefundId] = useState(ngnAccounts[0]?.id ?? "");
  const [step, setStep] = useState<"form" | "review">("form");
  const [confirmed, setConfirmed] = useState(false);
  const [rates, setRates] = useState<{ KES: number; NGN: number; mode: string } | null>(null);
  const [fe, setFe] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/rates")
      .then((r) => (r.ok ? r.json() : null))
      .then(setRates)
      .catch(() => setRates(null));
  }, []);

  const value = Number(amount);
  const rate = rates?.[currency];
  const usd = rate && value > 0 ? value / rate : 0;
  const estimate = usd ? floorTo(usd, 2) : 0;

  function validate() {
    const errs: Record<string, string> = {};
    if (!(value > 0)) errs.amount = "Enter how much you want to pay.";
    else if (usd && usd < MIN_USD) errs.amount = `The smallest purchase is about ${formatUsd(MIN_USD)}.`;
    else if (usd > MAX_USD) errs.amount = `The largest single purchase is about ${formatUsd(MAX_USD)}.`;
    else if (remainingUsd !== null && usd > remainingUsd)
      errs.amount = `You can buy about ${formatUsd(remainingUsd)} more before verifying your business.`;
    const addrErr = addressError(network, address);
    if (addrErr) errs.destinationAddress = addrErr;
    if (currency === "KES" && !normalizeKenyanPhone(phone)) errs.payerPhone = "Enter the M-Pesa number you'll pay from.";
    if (currency === "NGN" && !refundId) errs.refundPayoutAccountId = "Add a Nigerian bank account for refunds first.";
    setFe(errs);
    return Object.keys(errs).length === 0;
  }

  function review(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (validate()) {
      setConfirmed(false);
      setStep("review");
    }
  }

  function place() {
    setError(null);
    start(async () => {
      const res = await createOnrampOrder({
        currency,
        amount,
        token,
        network,
        destinationAddress: address.trim(),
        payerPhone: currency === "KES" ? phone : undefined,
        refundPayoutAccountId: currency === "NGN" ? refundId : undefined,
        confirmed,
      });
      if (!res.ok) {
        setError(res.error);
        if (res.fieldErrors && Object.keys(res.fieldErrors).length) {
          setFe(res.fieldErrors);
          setStep("form");
        }
        return;
      }
      router.push(`/dashboard/activity/${res.data.id}`);
    });
  }

  const summary = (
    <dl className="space-y-3 text-[15px]">
      <div className="flex justify-between gap-4">
        <dt className="text-chalk/70">You pay</dt>
        <dd className="tnum font-semibold">{value > 0 ? formatFiat(value, currency) : "–"}</dd>
      </div>
      <div className="flex justify-between gap-4">
        <dt className="text-chalk/70">You get about</dt>
        <dd className="tnum font-semibold text-marigold">{estimate ? formatCrypto(estimate, token) : "–"}</dd>
      </div>
      <div className="flex justify-between gap-4">
        <dt className="text-chalk/70">{rates?.mode === "mock" ? "Demo rate" : "Market rate"}</dt>
        <dd className="tnum">{rate ? `1 ${token} ≈ ${formatFiat(rate, currency)}` : "Loading…"}</dd>
      </div>
    </dl>
  );

  if (step === "review") {
    return (
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="space-y-6 rounded-2xl border border-mist bg-white p-6 sm:p-8">
          <h2 className="text-xl font-bold">Check your order</h2>
          <dl className="divide-y divide-mist rounded-xl border border-mist">
            <Row term="You pay">
              {formatFiat(value, currency)} with {currency === "KES" ? `M-Pesa (${phone})` : "a bank transfer"}
            </Row>
            <Row term="You get about">
              {formatCrypto(estimate, token)} on {NETWORK_INFO[network].name}
            </Row>
            <Row term="Sent to">
              <AddressText address={address.trim()} />
            </Row>
          </dl>
          <label className="flex items-start gap-3 text-[15px]">
            <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-1 size-4 accent-adire" />
            <span>
              I&apos;ve checked this is my {NETWORK_INFO[network].name} address. Crypto sent to a wrong address can&apos;t be
              recovered.
            </span>
          </label>
          {error ? <Alert>{error}</Alert> : null}
          <div className="flex flex-wrap gap-2">
            <Button onClick={place} disabled={!confirmed || pending}>
              {pending ? "Placing order…" : "Place order"}
            </Button>
            <Button variant="ghost" onClick={() => setStep("form")} disabled={pending}>
              Edit
            </Button>
          </div>
          <p className="text-sm text-muted">
            The exact amount is fixed when you place the order.{" "}
            {currency === "KES" ? "You'll get an M-Pesa prompt to approve." : "You'll get bank details to pay into."}
          </p>
        </div>
        <aside className="on-dark rounded-2xl bg-adire p-6 text-chalk">
          {summary}
          <RampLine direction="onramp" className="mt-5 h-10 w-full" />
        </aside>
      </div>
    );
  }

  return (
    <form onSubmit={review} noValidate className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
      <div className="space-y-8">
        <div className="space-y-2">
          <label htmlFor="amount" className="block text-sm font-semibold">
            You pay
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <input
              id="amount"
              inputMode="decimal"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1"))}
              aria-invalid={!!fe.amount}
              className={`${inputClasses} tnum h-14 max-w-[260px] font-wide text-2xl font-bold`}
            />
            <div role="group" aria-label="Currency" className="inline-flex rounded-xl border border-mist bg-white p-1">
              {CURRENCIES.map((c) => (
                <button key={c} type="button" aria-pressed={currency === c} onClick={() => setCurrency(c)} className={seg(currency === c)}>
                  {c}
                </button>
              ))}
            </div>
          </div>
          {fe.amount ? <p className="text-sm text-ember">{fe.amount}</p> : <p className="text-sm text-muted">With {CURRENCY_INFO[currency].payWith}.</p>}
        </div>

        {currency === "KES" ? (
          <Field label="M-Pesa number to pay from" htmlFor="payerPhone" hint="We send the payment prompt here." error={fe.payerPhone}>
            <input
              id="payerPhone"
              type="tel"
              placeholder="0712 345 678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              aria-invalid={!!fe.payerPhone}
              className={`${inputClasses} max-w-sm`}
            />
          </Field>
        ) : (
          <Field label="Refund account" htmlFor="refund" hint="If the order fails, your naira goes back here." error={fe.refundPayoutAccountId}>
            {ngnAccounts.length ? (
              <select id="refund" value={refundId} onChange={(e) => setRefundId(e.target.value)} className={`${inputClasses} max-w-sm`}>
                {ngnAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-sm">
                <Link href="/dashboard/payouts/new" className="font-semibold underline underline-offset-4">
                  Add a Nigerian bank account
                </Link>{" "}
                to buy with naira.
              </p>
            )}
          </Field>
        )}

        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold">You get</legend>
          <div className="flex flex-wrap gap-3">
            <div role="group" aria-label="Coin" className="inline-flex rounded-xl border border-mist bg-white p-1">
              {TOKENS.map((t) => (
                <button key={t} type="button" aria-pressed={token === t} onClick={() => setToken(t)} className={seg(token === t)}>
                  {t}
                </button>
              ))}
            </div>
            <div role="group" aria-label="Network" className="inline-flex flex-wrap rounded-xl border border-mist bg-white p-1">
              {NETWORKS.map((n) => (
                <button key={n} type="button" aria-pressed={network === n} onClick={() => setNetwork(n)} className={seg(network === n)}>
                  {NETWORK_INFO[n].name}
                </button>
              ))}
            </div>
          </div>
        </fieldset>

        <Field
          label={`Your ${NETWORK_INFO[network].name} wallet address`}
          htmlFor="destinationAddress"
          hint={<>Copy it from the wallet app that should receive the {token}. It has to be a <NetworkName network={network} /> address.</>}
          error={fe.destinationAddress}
        >
          <input
            id="destinationAddress"
            spellCheck={false}
            autoComplete="off"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            aria-invalid={!!fe.destinationAddress}
            className={`${inputClasses} font-mono text-sm`}
          />
        </Field>
      </div>

      <aside className="on-dark space-y-5 rounded-2xl bg-adire p-6 text-chalk lg:sticky lg:top-24">
        {summary}
        <RampLine direction="onramp" className="h-10 w-full" />
        {error ? <Alert>{error}</Alert> : null}
        <Button type="submit" className="w-full">
          Review order
        </Button>
      </aside>
    </form>
  );
}

function Row({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 px-4 py-3.5 sm:grid-cols-[130px_1fr] sm:gap-4">
      <dt className="text-sm text-muted">{term}</dt>
      <dd className="tnum font-semibold">{children}</dd>
    </div>
  );
}
