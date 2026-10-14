"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import type { Currency, PayoutMethod } from "@/lib/constants";
import type { Bank } from "@/lib/payments/types";
import { createPayoutAccount } from "@/lib/actions/payout-accounts";
import { Alert, Button, Field, inputClasses } from "@/components/ui";

const choice = (selected: boolean) =>
  `flex cursor-pointer flex-col rounded-xl border bg-white p-4 transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-adire ${
    selected ? "border-adire ring-1 ring-adire" : "border-mist hover:border-ink/30"
  }`;

export function PayoutForm({ banks, next }: { banks: Record<Currency, Bank[]>; next: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [currency, setCurrency] = useState<Currency>("KES");
  const [method, setMethod] = useState<PayoutMethod>("mobile_money");
  const [phone, setPhone] = useState("");
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fe, setFe] = useState<Record<string, string>>({});

  const bankList = banks[currency].filter((b) => b.type === "bank");
  const mobile = currency === "KES" && method === "mobile_money";

  function pickCurrency(c: Currency) {
    setCurrency(c);
    setBankCode("");
    if (c === "NGN") setMethod("bank");
  }

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFe({});
    start(async () => {
      const res = await createPayoutAccount(
        mobile
          ? { method: "mobile_money", currency: "KES", phone, accountName, label }
          : { method: "bank", currency, bankCode, accountNumber, accountName, label },
      );
      if (!res.ok) {
        setError(res.error);
        setFe(res.fieldErrors ?? {});
        return;
      }
      router.push(next.startsWith("/dashboard/wallets/new") ? `/dashboard/wallets/new?payout=${res.data.id}` : "/dashboard/payouts?added=1");
    });
  }

  const err = (k: string) => fe[k];

  return (
    <form onSubmit={submit} className="max-w-xl space-y-8">
      <fieldset>
        <legend className="text-sm font-semibold">Country</legend>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {(
            [
              ["KES", "Kenya", "Paid in KES"],
              ["NGN", "Nigeria", "Paid in NGN"],
            ] as const
          ).map(([c, title, sub]) => (
            <label key={c} className={choice(currency === c)}>
              <input type="radio" name="currency" checked={currency === c} onChange={() => pickCurrency(c)} className="sr-only" />
              <span className="font-semibold">{title}</span>
              <span className="text-sm text-muted">{sub}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {currency === "KES" ? (
        <fieldset>
          <legend className="text-sm font-semibold">Pay out to</legend>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {(
              [
                ["mobile_money", "M-Pesa", "Arrives in seconds"],
                ["bank", "Bank account", "Any Kenyan bank"],
              ] as const
            ).map(([m, title, sub]) => (
              <label key={m} className={choice(method === m)}>
                <input type="radio" name="method" checked={method === m} onChange={() => setMethod(m)} className="sr-only" />
                <span className="font-semibold">{title}</span>
                <span className="text-sm text-muted">{sub}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      <div className="space-y-5">
        {mobile ? (
          <Field label="M-Pesa number" htmlFor="phone" error={err("phone")}>
            <input
              id="phone"
              type="tel"
              autoComplete="tel"
              placeholder="0712 345 678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              aria-invalid={!!err("phone")}
              className={inputClasses}
            />
          </Field>
        ) : (
          <>
            <Field label="Bank" htmlFor="bank" error={err("bankCode")}>
              <select id="bank" value={bankCode} onChange={(e) => setBankCode(e.target.value)} aria-invalid={!!err("bankCode")} className={inputClasses}>
                <option value="">Choose your bank</option>
                {bankList.map((b) => (
                  <option key={b.code} value={b.code}>
                    {b.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              label="Account number"
              htmlFor="accountNumber"
              hint={currency === "NGN" ? "10 digits (NUBAN)." : undefined}
              error={err("accountNumber")}
            >
              <input
                id="accountNumber"
                inputMode={currency === "NGN" ? "numeric" : "text"}
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                aria-invalid={!!err("accountNumber")}
                className={`${inputClasses} tnum`}
              />
            </Field>
          </>
        )}
        <Field
          label={mobile ? "Name on the M-Pesa account" : "Account holder name"}
          htmlFor="accountName"
          hint={mobile ? "As registered with Safaricom." : "Exactly as your bank has it, so payouts aren't rejected."}
          error={err("accountName")}
        >
          <input
            id="accountName"
            autoComplete="name"
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            aria-invalid={!!err("accountName")}
            className={inputClasses}
          />
        </Field>
        <Field label="Nickname (optional)" htmlFor="label" hint="For example, Business M-Pesa." error={err("label")}>
          <input id="label" maxLength={40} value={label} onChange={(e) => setLabel(e.target.value)} className={inputClasses} />
        </Field>
      </div>

      {error ? <Alert>{error}</Alert> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Adding account…" : "Add payout account"}
      </Button>
    </form>
  );
}
