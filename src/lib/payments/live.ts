import { createHmac, timingSafeEqual } from "node:crypto";
import { TOKENS, type Currency, type Network, type Token } from "@/lib/constants";
import type { TxStatus } from "@/lib/db/schema";
import type {
  Bank,
  OrderSnapshot,
  PaymentInstructions,
  PaymentsProvider,
  ProviderEvent,
} from "./types";
import { ProviderError } from "./types";

/**
 * Qadi adapter. API reference: https://docs.qadi.io/docs/api-reference
 *
 * How the money moves:
 *  - Each KidogoPay wallet is its own Qadi wallet (one address per wallet).
 *  - deposit.received → we quote and execute an offramp from that wallet to the
 *    linked Qadi bank account (M-Pesa numbers are bank accounts too).
 *  - Buying crypto is an onramp order to the customer's external address.
 *  - fiat_order.* webhooks (and GET /v1/fiat-orders/{id}) move orders to their final state.
 */

const BASE_URL = (process.env.QADI_API_BASE_URL || "https://api.qadi.io").replace(/\/$/, "");

type Envelope<T> = { message?: string | null; data: T; correlationId?: string };

async function qadi<T>(
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE",
  path: string,
  body?: unknown,
  query?: Record<string, string>,
): Promise<T> {
  const apiKey = process.env.QADI_API_KEY;
  if (!apiKey) throw new ProviderError("QADI_API_KEY is not set.");
  const url = new URL(`${BASE_URL}${path}`);
  for (const [k, v] of Object.entries(query ?? {})) url.searchParams.set(k, v);

  const res = await fetch(url, {
    method,
    headers: {
      Accept: "application/json",
      "x-api-key": apiKey,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
    cache: "no-store",
  });

  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  if (!res.ok) {
    const msg =
      json && typeof json === "object" && "message" in json && typeof json.message === "string"
        ? json.message
        : `Qadi request failed (${res.status})`;
    throw new ProviderError(msg, res.status);
  }
  return (json as Envelope<T> | null)?.data as T;
}

/** KidogoPay's own fee, charged through Qadi custom fees (rail-02 corridors, i.e. KES M-Pesa). */
function customFee(currency: Currency) {
  const pct = process.env.KIDOGO_FEE_PERCENT;
  return pct && Number(pct) > 0 && currency === "KES" ? { customFeePercent: String(Number(pct)) } : {};
}

const num = (v: unknown) => (v === null || v === undefined || v === "" ? undefined : Number(v));

type OfframpQuote = {
  quoteId: string;
  cryptoAmount: string;
  estimatedFiatAmount: string;
  estimatedSweepAmount?: string;
  rate: string;
  qadiFee?: string;
  customFee?: string;
};

type OnrampQuote = {
  quoteId: string;
  expiresAt: string;
  cryptoAmount: string;
  fiatAmount: string;
  rate: string;
  qadiFee?: string;
  customFee?: string;
};

type QadiInstructions = {
  institution?: string;
  accountIdentifier?: string;
  accountName?: string;
  amountToTransfer?: string;
  currency?: string;
  validUntil?: string;
  ussdCodes?: string[];
};

type FiatOrder = {
  id: string;
  type?: string;
  status?: string;
  cryptoAmount?: string;
  fiatAmount?: string;
  fiatCurrency?: string;
  sweepTxHash?: string;
  paymentInstructions?: QadiInstructions | null;
  errorMsg?: string;
};

function toInstructions(pi: QadiInstructions | null | undefined, currency: Currency): PaymentInstructions | undefined {
  if (!pi?.accountIdentifier) return undefined;
  return {
    kind: "transfer",
    institution: pi.institution ?? "",
    accountNumber: pi.accountIdentifier,
    accountName: pi.accountName ?? "",
    amount: Number(pi.amountToTransfer ?? 0),
    currency,
    validUntil: pi.validUntil,
    ussdCodes: pi.ussdCodes,
  };
}

/** Qadi order status → ours. Webhooks only fire on final states; GET fills in the middle. */
export function mapOrderStatus(status: string, type: "offramp" | "onramp"): TxStatus {
  switch (status) {
    case "fulfilled":
    case "validated":
      return "completed";
    case "failed":
      return "failed";
    case "refunded":
      return "refunded";
    case "expired":
      return "expired";
    case "created":
    case "pending_fiat":
      return type === "onramp" ? "awaiting_payment" : "processing";
    default:
      // sweeping, pending_fulfillment, pending_approval, refunding
      return "processing";
  }
}

/** HMAC-SHA256 over "{timestamp}.{raw body}", sent as "sha256=<hex>". */
export function verifyQadiSignature(rawBody: string, timestamp: string, signature: string, secret: string) {
  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  const given = signature.replace(/^sha256=/, "");
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(given, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export const liveProvider: PaymentsProvider = {
  mode: "live",

  async getRates() {
    const d = await qadi<{ base: string; rates: Record<string, string | number> }>("GET", "/v1/fiat-orders/fx-rates");
    const KES = Number(d?.rates?.KES);
    const NGN = Number(d?.rates?.NGN);
    if (!KES || !NGN) throw new ProviderError("Qadi FX rates are missing KES or NGN.");
    return { KES, NGN, updatedAt: new Date().toISOString() };
  },

  async listBanks(currency) {
    const d = await qadi<unknown>("GET", "/v1/bank-accounts/institutions", undefined, { currency });
    const rows: unknown[] = Array.isArray(d)
      ? d
      : d && typeof d === "object" && "data" in d && Array.isArray(d.data)
        ? d.data
        : [];
    return rows.flatMap((r): Bank[] => {
      if (!r || typeof r !== "object" || !("code" in r)) return [];
      const row = r as { code: unknown; name?: unknown; type?: unknown };
      return [
        {
          code: String(row.code),
          name: String(row.name ?? row.code),
          type: row.type === "mobile_money" ? "mobile_money" : "bank",
        },
      ];
    });
  },

  async createBeneficiary(input) {
    const d = await qadi<{ id: string }>("POST", "/v1/bank-accounts", {
      accountNumber: input.method === "mobile_money" ? `+${input.accountNumber}` : input.accountNumber,
      bankCode: input.bankCode,
      currency: input.currency,
      accountName: input.accountName,
      isDefault: false,
    });
    return { ref: d.id };
  },

  async removeBeneficiary(ref) {
    await qadi("DELETE", `/v1/bank-accounts/${encodeURIComponent(ref)}`);
  },

  async createDepositAddress({ label, network }) {
    const chain = "evm";
    const d = await qadi<{ id: string; addresses: { chain: string; address: string }[] }>("POST", "/v1/wallets", {
      label,
      chains: [chain],
    });
    const address = d.addresses?.find((a) => a.chain === chain)?.address;
    if (!address) throw new ProviderError("Qadi didn't return an address for this network.");
    return { ref: d.id, address };
  },

  async archiveDepositAddress(ref) {
    await qadi("PATCH", `/v1/wallets/${encodeURIComponent(ref)}`, { archived: true });
  },

  async offrampDeposit(input) {
    const quote = (amount: number) =>
      qadi<OfframpQuote>("POST", "/v1/fiat-orders/offramp/quote", {
        amount: amount.toFixed(6),
        token: input.token,
        chain: input.chain,
        fiatCurrency: input.currency,
        sourceType: "managed_wallet",
        sourceWalletId: input.walletRef,
        bankAccountId: input.beneficiaryRef,
        ...customFee(input.currency),
      });

    let q = await quote(input.amount);
    // The sweep has to fit inside what arrived. If fees push it over, quote the difference once.
    const sweep = Number(q.estimatedSweepAmount ?? q.cryptoAmount);
    if (sweep > input.amount + 1e-6) q = await quote(input.amount - (sweep - input.amount));

    const order = await qadi<FiatOrder>("POST", "/v1/fiat-orders/offramp/execute", {
      quoteId: q.quoteId,
      idempotencyKey: input.idempotencyKey,
    });
    return {
      orderRef: order.id,
      fiatAmount: Number(q.estimatedFiatAmount),
      rate: Number(q.rate),
      feeCrypto: Number(q.qadiFee ?? 0) + Number(q.customFee ?? 0),
    };
  },

  async createOnramp(input) {
    const q = await qadi<OnrampQuote>("POST", "/v1/fiat-orders/onramp/quote", {
      amount: input.fiatAmount.toFixed(2),
      amountIn: "fiat",
      token: input.token,
      chain: input.network,
      fiatCurrency: input.currency,
      destType: "external",
      destAddress: input.destinationAddress,
      ...(input.payerPhone ? { payerPhone: `+${input.payerPhone}` } : {}),
      ...(input.refundBeneficiaryRef ? { refundBankAccountId: input.refundBeneficiaryRef } : {}),
      ...customFee(input.currency),
    });
    const order = await qadi<FiatOrder>("POST", "/v1/fiat-orders/onramp/execute", {
      quoteId: q.quoteId,
      idempotencyKey: input.idempotencyKey,
    });

    const instructions: PaymentInstructions =
      toInstructions(order.paymentInstructions, input.currency) ??
      (input.currency === "KES" && input.payerPhone
        ? { kind: "mpesa_prompt", phone: input.payerPhone, amount: Number(q.fiatAmount), currency: "KES" }
        : { kind: "pending" });

    return {
      ref: order.id,
      cryptoAmount: Number(q.cryptoAmount),
      fiatAmount: Number(q.fiatAmount),
      rate: Number(q.rate),
      feeCrypto: Number(q.qadiFee ?? 0) + Number(q.customFee ?? 0),
      instructions,
      expiresAt:
        order.paymentInstructions?.validUntil ?? new Date(Date.now() + 30 * 60_000).toISOString(),
    };
  },

  async getOrder(ref) {
    const o = await qadi<FiatOrder>("GET", `/v1/fiat-orders/${encodeURIComponent(ref)}`);
    if (!o?.status) return null;
    const type = o.type === "onramp" ? "onramp" : "offramp";
    const currency = (o.fiatCurrency === "NGN" ? "NGN" : "KES") as Currency;
    const snapshot: OrderSnapshot = {
      status: mapOrderStatus(String(o.status), type),
      fiatAmount: num(o.fiatAmount),
      cryptoAmount: type === "onramp" ? num(o.cryptoAmount) : undefined,
      txHash: o.sweepTxHash || undefined,
      failureReason: o.errorMsg || undefined,
      instructions: toInstructions(o.paymentInstructions, currency),
    };
    return snapshot;
  },

  async verifyWebhook(rawBody, headers) {
    const secret = process.env.QADI_WEBHOOK_SECRET;
    const signature = headers.get("x-qadi-signature");
    const timestamp = headers.get("x-qadi-timestamp");
    if (!secret || !signature || !timestamp) return false;
    const n = Number(timestamp);
    const ms = Number.isFinite(n) ? (n > 1e12 ? n : n * 1000) : Date.parse(timestamp);
    // Reject anything older than five minutes to stop replays.
    if (!Number.isFinite(ms) || Math.abs(Date.now() - ms) > 5 * 60_000) return false;
    return verifyQadiSignature(rawBody, timestamp, signature, secret);
  },

  parseWebhook(rawBody, headers) {
    const body = JSON.parse(rawBody) as Record<string, unknown>;
    const type = String(headers.get("x-qadi-event") ?? body.event ?? body.type ?? body.eventType ?? "");
    const inner = body.data ?? body.payload;
    const p = (inner && typeof inner === "object" && !Array.isArray(inner) ? inner : body) as Record<string, unknown>;
    const occurredAt = new Date().toISOString();

    if (type === "deposit.received") {
      const token = String(p.token ?? "").toUpperCase();
      if (!(TOKENS as readonly string[]).includes(token) || !p.id || !p.toAddress) return [];
      return [
        {
          id: `deposit:${p.id}`,
          type: "deposit.received",
          occurredAt,
          depositRef: String(p.id),
          address: String(p.toAddress),
          chain: String(p.chain ?? ""),
          token: token as Token,
          cryptoAmount: Number(p.amount),
          txHash: p.txHash ? String(p.txHash) : undefined,
        },
      ];
    }

    const final: Record<string, TxStatus> = {
      "fiat_order.fulfilled": "completed",
      "fiat_order.failed": "failed",
      "fiat_order.refunded": "refunded",
      "fiat_order.expired": "expired",
    };
    if (final[type] && p.orderId) {
      const event: ProviderEvent = {
        id: `${type}:${p.orderId}`,
        type: "order.updated",
        occurredAt,
        orderRef: String(p.orderId),
        status: final[type],
        fiatAmount: num(p.fiatAmount),
        cryptoAmount: p.type === "onramp" ? num(p.cryptoAmount) : undefined,
      };
      return [event];
    }
    // transfer.*, auto_settle.*, quick_payment.*, custom_fee.* aren't used by KidogoPay.
    return [];
  },
};
