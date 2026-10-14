import Link from "next/link";
import { Logo } from "@/components/logo";
import { ButtonLink } from "@/components/ui";
import { Converter } from "@/components/landing/converter";
import { kybThresholdUsd } from "@/lib/constants";
import { formatUsd } from "@/lib/format";

const STEPS = [
  {
    title: "Add where you get paid",
    body: "Your M-Pesa number or bank account in Kenya, or any bank account in Nigeria.",
  },
  {
    title: "Create a wallet",
    body: "Pick Solana, Base or BNB Smart Chain. You get an address linked to that payout account.",
  },
  {
    title: "Send USDC or USDT",
    body: "It's converted at the current rate and paid out automatically. Each step shows up in your dashboard.",
  },
];

const SUPPORTED: [string, string][] = [
  ["Networks", "Solana, Base and BNB Smart Chain"],
  ["Coins", "USDC and USDT"],
  ["Payouts in Kenya", "M-Pesa and Kenyan bank accounts, in KES"],
  ["Payouts in Nigeria", "Nigerian bank accounts, in NGN"],
  ["Buying crypto", "Pay with M-Pesa in Kenya or a bank transfer in Nigeria"],
  [
    "Verification",
    `Start without paperwork. Business verification is needed once you pass ${formatUsd(kybThresholdUsd())} in total volume.`,
  ],
];

export default function Home() {
  return (
    <>
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5">
        <Link href="/" aria-label="KidogoPay home">
          <Logo />
        </Link>
        <nav className="flex items-center gap-1.5 sm:gap-2" aria-label="Account">
          <ButtonLink href="/login" variant="ghost" size="sm">
            Log in
          </ButtonLink>
          <ButtonLink href="/signup" size="sm">
            Create account
          </ButtonLink>
        </nav>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pt-8 pb-20 md:pt-14 lg:grid-cols-[1.15fr_1fr] lg:gap-16 lg:pb-28">
          <div>
            <h1 className="font-wide text-[clamp(2.3rem,6.4vw,4.1rem)] leading-[0.96] font-extrabold tracking-[-0.04em]">
              <span className="block whitespace-nowrap">Stablecoins in.</span>
              <span className="block max-w-[11ch]">Shillings and naira out.</span>
            </h1>
            <p className="mt-7 max-w-[44ch] text-lg leading-relaxed text-muted">
              Get a USDC and USDT address that pays straight into your bank account or M-Pesa. There&apos;s no
              balance to manage and nothing waits with us in between.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <ButtonLink href="/signup">Create free account</ButtonLink>
              <ButtonLink href="#how" variant="secondary">
                See how it works
              </ButtonLink>
            </div>
          </div>
          <Converter />
        </section>

        <section id="how" className="scroll-mt-8 border-t border-mist bg-white">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:py-24">
            <h2 className="font-wide text-3xl font-bold tracking-[-0.03em] sm:text-4xl">How cashing out works</h2>
            <ol className="mt-12 grid gap-10 md:grid-cols-3 md:gap-10">
              {STEPS.map((s, i) => (
                <li key={s.title}>
                  <span className="tnum block font-wide text-5xl leading-none font-extrabold text-marigold" aria-hidden>
                    {i + 1}
                  </span>
                  <h3 className="mt-5 text-xl font-bold">{s.title}</h3>
                  <p className="mt-2 max-w-[34ch] leading-relaxed text-muted">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="on-dark bg-adire text-chalk">
          <div className="mx-auto grid max-w-6xl items-center gap-8 px-5 py-20 md:grid-cols-[1fr_auto]">
            <div>
              <h2 className="font-wide text-3xl font-bold tracking-[-0.03em] sm:text-4xl">Need crypto instead?</h2>
              <p className="mt-4 max-w-[52ch] text-lg leading-relaxed text-chalk/75">
                Pay in shillings with M-Pesa or in naira by bank transfer. We send USDC or USDT to the wallet address
                you choose.
              </p>
            </div>
            <ButtonLink href="/signup">Buy crypto</ButtonLink>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-20 sm:py-24">
          <div className="grid gap-10 md:grid-cols-[1fr_1.7fr]">
            <h2 className="font-wide text-3xl font-bold tracking-[-0.03em] sm:text-4xl">What&apos;s supported</h2>
            <dl className="divide-y divide-mist border-y border-mist">
              {SUPPORTED.map(([term, detail]) => (
                <div key={term} className="grid gap-1 py-5 sm:grid-cols-[190px_1fr] sm:gap-6">
                  <dt className="font-semibold">{term}</dt>
                  <dd className="text-muted">{detail}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      </main>

      <footer className="border-t border-mist bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-10 px-5 py-12 md:flex-row md:items-end md:justify-between">
          <div>
            <Logo />
            <p className="mt-8 font-wide text-xl font-bold tracking-[-0.02em]">Haba na haba hujaza kibaba.</p>
            <p className="mt-1 text-sm text-muted">Little by little fills the measure. Kidogo means little.</p>
          </div>
          <div className="text-sm text-muted md:text-right">
            <nav className="flex gap-5 md:justify-end" aria-label="Footer">
              <Link href="/login" className="hover:text-ink">
                Log in
              </Link>
              <Link href="/signup" className="hover:text-ink">
                Create account
              </Link>
            </nav>
            <p className="mt-3">© {new Date().getFullYear()} KidogoPay</p>
          </div>
        </div>
      </footer>
    </>
  );
}
