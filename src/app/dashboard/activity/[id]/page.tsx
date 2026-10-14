import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import type { ReactNode } from "react";
import { requireUser } from "@/lib/session";
import { getTransaction } from "@/lib/queries";
import { paymentsMode } from "@/lib/payments";
import { syncOrder } from "@/lib/payments/events";
import type { PaymentInstructions as Instructions } from "@/lib/payments/types";
import { NETWORK_INFO } from "@/lib/constants";
import { formatCrypto, formatDateTime, formatFiat, formatPhone, formatRate, shortAddress } from "@/lib/format";
import { AddressText, NetworkName } from "@/components/crypto";
import { CopyButton } from "@/components/copy-button";
import { PayoutSummary } from "@/components/payout-summary";
import { RampLine } from "@/components/ramp";
import { StatusBadge, TxSteps, effectiveStatus, isFinalStatus } from "@/components/status";
import { Alert, Panel } from "@/components/ui";
import { BackLink } from "@/components/dashboard/shared";
import { AutoRefresh, Countdown, RetryPayoutButton, SimulatePaymentButton } from "@/components/dashboard/tx-client";

export const metadata: Metadata = { title: "Transaction" };

export default async function TransactionPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireUser();
  const { id } = await params;
  let tx = await getTransaction(me.id, id);
  if (!tx) notFound();

  const live = paymentsMode() === "live";
  if (live && tx.orderRef && !isFinalStatus(tx.status)) {
    await syncOrder(tx.orderRef);
    tx = (await getTransaction(me.id, id)) ?? tx;
  }

  const status = effectiveStatus(tx);
  const off = tx.direction === "offramp";
  const net = NETWORK_INFO[tx.network];
  const crypto = formatCrypto(tx.cryptoAmount, tx.token);
  const fiat = tx.fiatAmount ? formatFiat(tx.fiatAmount, tx.fiatCurrency) : "Pending";
  const instructions = tx.paymentInstructions as Instructions | null;

  return (
    <>
      <BackLink href="/dashboard/activity">Activity</BackLink>
      <div className="mb-8 flex flex-wrap items-center gap-3">
        <h1 className="font-wide text-[1.9rem] leading-tight font-bold tracking-[-0.03em] sm:text-[2.25rem]">
          {off ? "Cash-out" : "Purchase"}
        </h1>
        <StatusBadge direction={tx.direction} status={status} />
      </div>

      <Panel className="p-6 sm:p-8">
        <div className="grid items-center gap-3 sm:grid-cols-[1fr_120px_1fr]">
          <div>
            <p className="text-sm font-semibold text-muted">{off ? "Received" : "You pay"}</p>
            <p className="tnum mt-1 font-wide text-3xl font-bold tracking-[-0.03em]">{off ? crypto : fiat}</p>
          </div>
          <RampLine direction={tx.direction} className="hidden h-10 w-full sm:block" />
          <div className="sm:text-right">
            <p className="text-sm font-semibold text-muted">{off ? (status === "completed" ? "Paid out" : "Paying out") : "You get"}</p>
            <p className="tnum mt-1 font-wide text-3xl font-bold tracking-[-0.03em] text-adire">{off ? fiat : crypto}</p>
          </div>
        </div>
        <div className="mt-8">
          <TxSteps direction={tx.direction} status={status} />
        </div>
        {tx.failureReason && (status === "failed" || status === "held") ? (
          <div className="mt-6 space-y-3">
            <Alert tone={status === "held" ? "warning" : "error"}>{tx.failureReason}</Alert>
            {off && status === "failed" && !tx.orderRef ? <RetryPayoutButton id={tx.id} /> : null}
          </div>
        ) : null}
        {status === "expired" && !off ? (
          <div className="mt-6">
            <Alert tone="info">This order expired before a payment arrived. Place a new one from Buy crypto.</Alert>
          </div>
        ) : null}
      </Panel>

      {!off && status === "awaiting_payment" ? (
        <PaymentPanel instructions={instructions} expiresAt={tx.expiresAt} id={tx.id} demo={!live} />
      ) : null}

      <Panel className="mt-6">
        <dl className="divide-y divide-mist">
          <Row term="Date">{formatDateTime(tx.createdAt)}</Row>
          <Row term="Network">
            <NetworkName network={tx.network} />
          </Row>
          {off && tx.payoutAccount ? (
            <Row term="Paid to">
              <PayoutSummary account={tx.payoutAccount} />
            </Row>
          ) : null}
          {off && tx.wallet ? (
            <Row term="Received at">
              <span className="font-mono text-sm">{shortAddress(tx.wallet.address, 8, 6)}</span>
              {tx.wallet.label ? <span className="ml-2 text-sm text-muted">{tx.wallet.label}</span> : null}
            </Row>
          ) : null}
          {!off && tx.destinationAddress ? (
            <Row term="Sent to">
              <AddressText address={tx.destinationAddress} />
              <a
                href={net.explorerAddress(tx.destinationAddress)}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-sm font-semibold underline-offset-4 hover:underline"
              >
                View on explorer <ExternalLink className="size-3.5" aria-hidden />
              </a>
            </Row>
          ) : null}
          {tx.rate ? <Row term="Rate">{formatRate(tx.rate, tx.token, tx.fiatCurrency)}</Row> : null}
          {tx.feeCrypto && Number(tx.feeCrypto) > 0 ? <Row term="Fees">{formatCrypto(tx.feeCrypto, tx.token)}</Row> : null}
          {tx.txHash ? (
            <Row term={off ? "Deposit transaction" : "Transaction"}>
              <a
                href={net.explorerTx(tx.txHash)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-mono text-sm underline-offset-4 hover:underline"
              >
                {shortAddress(tx.txHash, 10, 8)} <ExternalLink className="size-3.5" aria-hidden />
              </a>
            </Row>
          ) : null}
          {tx.payoutReference ? <Row term="Payout reference">{tx.payoutReference}</Row> : null}
          <Row term="Reference">
            <span className="font-mono text-sm break-all text-muted">{tx.orderRef ?? tx.providerRef}</span>
          </Row>
        </dl>
      </Panel>

      {!isFinalStatus(status) ? <AutoRefresh /> : null}
    </>
  );
}

function Row({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 px-5 py-4 sm:grid-cols-[180px_1fr] sm:gap-6 sm:px-6">
      <dt className="text-sm font-semibold text-muted">{term}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}

function PaymentPanel({
  instructions: pi,
  expiresAt,
  id,
  demo,
}: {
  instructions: Instructions | null;
  expiresAt: Date | null;
  id: string;
  demo: boolean;
}) {
  return (
    <Panel className="mt-6 border-marigold p-6 ring-4 ring-marigold/20 sm:p-8">
      {pi?.kind === "mpesa_prompt" ? (
        <>
          <h2 className="text-xl font-bold">Approve the M-Pesa prompt</h2>
          <p className="mt-2 max-w-[60ch] text-muted">
            We sent a request for <strong className="text-ink">{formatFiat(pi.amount, "KES")}</strong> to{" "}
            <strong className="text-ink">{formatPhone(pi.phone)}</strong>. Enter your M-Pesa PIN on that phone to pay.
          </p>
          <p className="mt-2 text-sm text-muted">No prompt? Check the phone is on and unlocked. If it times out, place a new order.</p>
        </>
      ) : pi?.kind === "transfer" ? (
        <>
          <h2 className="text-xl font-bold">Pay by bank transfer</h2>
          <p className="mt-2 text-muted">Send exactly this amount from your bank app.</p>
          <dl className="mt-5 divide-y divide-mist rounded-xl border border-mist">
            <PayRow term="Bank">{pi.institution}</PayRow>
            <PayRow term="Account number" copy={pi.accountNumber}>
              <span className="tnum">{pi.accountNumber}</span>
            </PayRow>
            <PayRow term="Account name">{pi.accountName}</PayRow>
            <PayRow term="Amount" copy={pi.amount.toFixed(2)}>
              <span className="tnum">{formatFiat(pi.amount, pi.currency)}</span>
            </PayRow>
            {pi.reference ? (
              <PayRow term="Reference" copy={pi.reference}>
                {pi.reference}
              </PayRow>
            ) : null}
          </dl>
          {pi.ussdCodes?.length ? <p className="mt-3 text-sm text-muted">Or dial {pi.ussdCodes.join(" or ")}.</p> : null}
        </>
      ) : (
        <>
          <h2 className="text-xl font-bold">Getting your payment details</h2>
          <p className="mt-2 text-muted">This takes a few seconds. The page refreshes on its own.</p>
        </>
      )}
      {expiresAt ? (
        <p className="mt-5 text-sm text-muted">
          Pay within <Countdown to={expiresAt.toISOString()} />. After that the order expires.
        </p>
      ) : null}
      {demo ? (
        <div className="mt-6 border-t border-mist pt-5">
          <p className="mb-3 text-sm text-muted">Demo mode: pretend the payment went through.</p>
          <SimulatePaymentButton id={id} />
        </div>
      ) : null}
    </Panel>
  );
}

function PayRow({ term, copy, children }: { term: string; copy?: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <div className="min-w-0">
        <dt className="text-sm text-muted">{term}</dt>
        <dd className="font-semibold break-all">{children}</dd>
      </div>
      {copy ? <CopyButton value={copy} /> : null}
    </div>
  );
}
