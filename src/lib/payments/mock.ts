import { randomBytes } from "node:crypto";
import { base58 } from "@scure/base";
import { floorTo } from "@/lib/format";
import { toChecksumAddress } from "@/lib/validation";
import type { Currency, Network, Token } from "@/lib/constants";
import type {
  Bank,
  OfframpInput,
  OfframpStarted,
  OnrampInput,
  OnrampOrder,
  OrderSnapshot,
  PaymentsProvider,
  ProviderEvent,
  Rates,
} from "./types";

/**
 * Simulated provider for local development and demos. No money moves.
 * Rates, spreads and fees are made-up demo numbers, not market prices.
 */
const MID: Record<Currency, number> = { KES: 129.2, NGN: 1535 };
const SPREAD = 0.01;
const FEE = 0.005;

const BANKS: Record<Currency, Bank[]> = {
  KES: [
    { code: "mpesa", name: "M-Pesa", type: "mobile_money" },
    ...["Equity Bank", "KCB Bank", "Co-operative Bank", "NCBA Bank", "Absa Bank Kenya", "Stanbic Bank Kenya", "I&M Bank", "Diamond Trust Bank", "Family Bank", "Standard Chartered Kenya"].map(
      (name) => ({ code: slug(name), name, type: "bank" as const }),
    ),
  ],
  NGN: ["Access Bank", "GTBank", "Zenith Bank", "First Bank", "UBA", "Fidelity Bank", "Stanbic IBTC", "Wema Bank", "Kuda", "Moniepoint", "OPay", "PalmPay"].map(
    (name) => ({ code: slug(name), name, type: "bank" as const }),
  ),
};

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

const ref = (prefix: string) => `${prefix}_${randomBytes(8).toString("hex")}`;
const now = () => new Date().toISOString();

function fakeAddress(network: Network) {
  return network === "solana"
    ? base58.encode(randomBytes(32))
    : toChecksumAddress(`0x${randomBytes(20).toString("hex")}`);
}

function fakeTxHash(network: Network) {
  return network === "solana" ? base58.encode(randomBytes(64)) : `0x${randomBytes(32).toString("hex")}`;
}

export const mockProvider = {
  mode: "mock" as const,

  async getRates(): Promise<Rates> {
    return { ...MID, updatedAt: now() };
  },

  async listBanks(currency: Currency) {
    return BANKS[currency];
  },

  async createBeneficiary() {
    return { ref: ref("mock_ba") };
  },

  async removeBeneficiary() {},

  async createDepositAddress(input: { network: Network }) {
    return { ref: ref("mock_wal"), address: fakeAddress(input.network) };
  },

  async archiveDepositAddress() {},

  async offrampDeposit(input: OfframpInput): Promise<OfframpStarted> {
    const rate = floorTo(MID[input.currency] * (1 - SPREAD), 4);
    const feeCrypto = floorTo(input.amount * FEE, 6);
    return {
      orderRef: ref("mock_ord"),
      rate,
      feeCrypto,
      fiatAmount: floorTo((input.amount - feeCrypto) * rate, 2),
    };
  },

  async createOnramp(input: OnrampInput): Promise<OnrampOrder> {
    const rate = floorTo(MID[input.currency] * (1 + SPREAD), 4);
    const gross = input.fiatAmount / rate;
    const feeCrypto = floorTo(gross * FEE, 6);
    return {
      ref: ref("mock_ord"),
      rate,
      feeCrypto,
      fiatAmount: input.fiatAmount,
      cryptoAmount: floorTo(gross - feeCrypto, 2),
      expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
      instructions:
        input.currency === "KES"
          ? { kind: "mpesa_prompt", phone: input.payerPhone ?? "", amount: input.fiatAmount, currency: "KES" }
          : {
              kind: "transfer",
              institution: "Demo Bank",
              accountNumber: "0123456789",
              accountName: "KidogoPay Checkout",
              amount: input.fiatAmount,
              currency: input.currency,
              reference: `KP${randomBytes(3).toString("hex").toUpperCase()}`,
            },
    };
  },

  async getOrder() {
    return null;
  },

  async verifyWebhook() {
    // The mock never receives real webhooks; simulations call the event handler directly.
    return false;
  },

  parseWebhook() {
    return [];
  },

  /** What Qadi sends when USDC/USDT lands on an address. */
  depositEvent(input: { address: string; network: Network; token: Token; amount: number }): Extract<
    ProviderEvent,
    { type: "deposit.received" }
  > {
    const depositRef = ref("mock_dep");
    return {
      id: `deposit:${depositRef}`,
      type: "deposit.received",
      occurredAt: now(),
      depositRef,
      address: input.address,
      chain: input.network,
      token: input.token,
      cryptoAmount: input.amount,
      txHash: fakeTxHash(input.network),
    };
  },

  /** What Qadi sends when a fiat order changes state. */
  orderEvent(orderRef: string, snapshot: OrderSnapshot): ProviderEvent {
    return { id: `mock:${orderRef}:${snapshot.status}`, type: "order.updated", occurredAt: now(), orderRef, ...snapshot };
  },

  fakeTxHash,
} satisfies PaymentsProvider & Record<string, unknown>;
