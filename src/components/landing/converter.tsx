"use client";

import { useEffect, useState } from "react";
import { RampLine } from "@/components/ramp";
import {
  CURRENCIES,
  CURRENCY_INFO,
  NETWORKS,
  NETWORK_INFO,
  TOKENS,
  type Currency,
  type Direction,
  type Network,
  type Token,
} from "@/lib/constants";
import { floorTo, formatCrypto, formatFiat } from "@/lib/format";

type RatesResponse = { mode: "mock" | "live"; KES: number; NGN: number };

const DEFAULT_AMOUNT: Record<Direction, Record<Currency, string>> = {
  offramp: { KES: "250", NGN: "250" },
  onramp: { KES: "10000", NGN: "150000" },
};

function Toggle<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex shrink-0 rounded-lg bg-white/10 p-0.5">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          aria-pressed={o === value}
          onClick={() => onChange(o)}
          className={`h-8 rounded-md px-2.5 text-[13px] font-semibold transition-colors ${
            o === value ? "bg-marigold text-ink" : "text-chalk/70 hover:text-chalk"
          }`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

function NetworkPicker({ value, onChange }: { value: Network; onChange: (n: Network) => void }) {
  return (
    <div role="group" aria-label="Network" className="flex flex-wrap gap-1.5">
      {NETWORKS.map((n) => (
        <button
          key={n}
          type="button"
          aria-pressed={n === value}
          onClick={() => onChange(n)}
          className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[13px] font-semibold transition-colors ${
            n === value ? "border-chalk/70 text-chalk" : "border-white/15 text-chalk/60 hover:text-chalk"
          }`}
        >
          <span className="size-2 rounded-full" style={{ background: NETWORK_INFO[n].dot }} aria-hidden />
          {NETWORK_INFO[n].name}
        </button>
      ))}
    </div>
  );
}

const bigNumber =
  "tnum block w-full min-w-0 bg-transparent font-wide text-[clamp(2rem,4.6vw,2.6rem)] leading-tight font-bold tracking-[-0.03em] outline-none";

export function Converter() {
  const [direction, setDirection] = useState<Direction>("offramp");
  const [token, setToken] = useState<Token>("USDC");
  const [network, setNetwork] = useState<Network>("base");
  const [currency, setCurrency] = useState<Currency>("KES");
  const [amount, setAmount] = useState(DEFAULT_AMOUNT.offramp.KES);
  const [rates, setRates] = useState<RatesResponse | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/rates")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: RatesResponse) => {
        if (alive) setRates(d);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  const off = direction === "offramp";
  const value = Number(amount);
  const rate = rates ? rates[currency] : null;
  const result = rate && value > 0 ? (off ? floorTo(value * rate, 2) : floorTo(value / rate, 2)) : null;

  function changeDirection(next: Direction) {
    if (next === direction) return;
    setDirection(next);
    setAmount(DEFAULT_AMOUNT[next][currency]);
  }

  function changeCurrency(next: Currency) {
    setCurrency(next);
    if (!off) setAmount(DEFAULT_AMOUNT.onramp[next]);
  }

  const coinToggle = <Toggle label="Coin" options={TOKENS} value={token} onChange={setToken} />;
  const currencyToggle = <Toggle label="Currency" options={CURRENCIES} value={currency} onChange={changeCurrency} />;

  return (
    <div className="on-dark rounded-[22px] bg-adire p-5 text-chalk sm:p-7">
      <div role="group" aria-label="What do you want to do?" className="grid grid-cols-2 rounded-xl bg-white/[0.07] p-1">
        {(["offramp", "onramp"] as const).map((d) => (
          <button
            key={d}
            type="button"
            aria-pressed={direction === d}
            onClick={() => changeDirection(d)}
            className={`h-10 rounded-lg text-sm font-semibold transition-colors ${
              direction === d ? "bg-chalk text-ink" : "text-chalk/70 hover:text-chalk"
            }`}
          >
            {d === "offramp" ? "Cash out" : "Buy crypto"}
          </button>
        ))}
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="converter-amount" className="text-sm text-chalk/70">
            {off ? "You send" : "You pay"}
          </label>
          {off ? coinToggle : currencyToggle}
        </div>
        <input
          id="converter-amount"
          inputMode="decimal"
          autoComplete="off"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1"))}
          placeholder="0"
          className={`${bigNumber} mt-1 text-chalk placeholder:text-chalk/30`}
        />
        <div className="mt-2">
          {off ? (
            <NetworkPicker value={network} onChange={setNetwork} />
          ) : (
            <p className="text-sm text-chalk/70">With {CURRENCY_INFO[currency].payWith}</p>
          )}
        </div>
      </div>

      <RampLine key={direction} direction={direction} animate className="my-4 h-12 w-full" />

      <div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-chalk/70">You get</p>
          {off ? currencyToggle : coinToggle}
        </div>
        <output htmlFor="converter-amount" aria-live="polite" className={`${bigNumber} mt-1 text-marigold`}>
          {result === null ? "–" : off ? formatFiat(result, currency) : formatCrypto(result, token)}
        </output>
        <div className="mt-2">
          {off ? (
            <p className="text-sm text-chalk/70">
              {currency === "KES" ? "In your M-Pesa or Kenyan bank account" : "In your Nigerian bank account"}
            </p>
          ) : (
            <NetworkPicker value={network} onChange={setNetwork} />
          )}
        </div>
      </div>

      <p className="mt-6 border-t border-white/10 pt-4 text-[13px] leading-relaxed text-chalk/60">
        {failed
          ? "Rates are unavailable right now."
          : !rates || rate === null
            ? "Loading rates…"
            : `${rates.mode === "mock" ? "Demo rate" : "Market rate"}: 1 ${token} ≈ ${formatFiat(rate, currency)}. ${
                off ? "Payouts use the rate when your deposit arrives, after fees." : "You see the exact amount before you pay."
              }`}
      </p>
    </div>
  );
}
