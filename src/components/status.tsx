import type { Direction } from "@/lib/constants";
import type { TxStatus } from "@/lib/db/schema";

const LABELS: Record<Direction, Record<TxStatus, string>> = {
  offramp: {
    awaiting_payment: "Waiting",
    received: "Received",
    held: "On hold",
    processing: "Paying out",
    completed: "Paid out",
    failed: "Failed",
    expired: "Expired",
    refunded: "Refunded",
  },
  onramp: {
    awaiting_payment: "Waiting for payment",
    received: "Payment received",
    held: "On hold",
    processing: "Sending crypto",
    completed: "Sent",
    failed: "Failed",
    expired: "Expired",
    refunded: "Refunded",
  },
};

export function statusLabel(direction: Direction, status: TxStatus) {
  return LABELS[direction][status];
}

export const isFinalStatus = (s: TxStatus) =>
  s === "completed" || s === "failed" || s === "expired" || s === "refunded";

/** An unpaid order past its deadline is expired, even before the provider says so. */
export function effectiveStatus(t: { status: TxStatus; expiresAt: Date | null }): TxStatus {
  return t.status === "awaiting_payment" && t.expiresAt && t.expiresAt.getTime() < Date.now() ? "expired" : t.status;
}

export function StatusBadge({ direction, status }: { direction: Direction; status: TxStatus }) {
  const tone =
    status === "completed"
      ? "bg-leaf-soft text-leaf"
      : status === "failed"
        ? "bg-ember-soft text-ember"
        : status === "awaiting_payment" || status === "held"
          ? "bg-sun-soft text-ink"
          : status === "expired" || status === "refunded"
            ? "bg-haze text-muted"
            : "bg-haze text-ink";
  const live = status === "received" || status === "processing";
  return (
    <span className={`inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold whitespace-nowrap ${tone}`}>
      {live ? <span className="size-1.5 animate-pulse rounded-full bg-current" aria-hidden /> : null}
      {statusLabel(direction, status)}
    </span>
  );
}

const STEPS: Record<Direction, [string, string, string]> = {
  offramp: ["Received", "Converted", "Paid out"],
  onramp: ["Paid", "Converted", "Sent"],
};

const DONE: Record<TxStatus, number> = {
  awaiting_payment: 0,
  received: 1,
  held: 1,
  processing: 2,
  completed: 3,
  failed: 0,
  expired: 0,
  refunded: 0,
};

/** Three-step progress: what has happened to the money so far. */
export function TxSteps({ direction, status }: { direction: Direction; status: TxStatus }) {
  const done = DONE[status];
  const broken = status === "failed" || status === "expired" || status === "refunded";
  return (
    <ol className="grid grid-cols-3 gap-2" aria-label="Progress">
      {STEPS[direction].map((label, i) => {
        const state = broken ? "broken" : i < done ? "done" : i === done ? "current" : "todo";
        return (
          <li key={label} className="space-y-2">
            <span
              className={`block h-1.5 rounded-full ${
                state === "done" ? "bg-leaf" : state === "current" ? "bg-marigold" : state === "broken" ? "bg-ember/30" : "bg-mist"
              }`}
            />
            <span className={`block text-sm ${state === "done" || state === "current" ? "font-semibold" : "text-muted"}`}>
              {label}
              <span className="sr-only">{state === "done" ? " (done)" : state === "current" ? " (in progress)" : ""}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
