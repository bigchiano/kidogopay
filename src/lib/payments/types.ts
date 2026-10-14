import type { Currency, Network, PayoutMethod, Token } from "@/lib/constants";
import type { TxStatus } from "@/lib/db/schema";

export type Bank = { code: string; name: string; type: "bank" | "mobile_money" };

/** Indicative mid-market rates: fiat per 1 USD stablecoin. */
export type Rates = { KES: number; NGN: number; updatedAt: string };

export type BeneficiaryInput = {
  currency: Currency;
  method: PayoutMethod;
  accountName: string;
  /** Bank account number, or 2547XXXXXXXX for M-Pesa. */
  accountNumber: string;
  bankCode: string;
};

export type OfframpInput = {
  walletRef: string;
  chain: Network;
  token: Token;
  amount: number;
  currency: Currency;
  beneficiaryRef: string;
  idempotencyKey: string;
};

export type OfframpStarted = { orderRef: string; fiatAmount: number; rate: number; feeCrypto: number };

export type PaymentInstructions =
  | { kind: "mpesa_prompt"; phone: string; amount: number; currency: "KES" }
  | {
      kind: "transfer";
      institution: string;
      accountNumber: string;
      accountName: string;
      amount: number;
      currency: Currency;
      reference?: string;
      validUntil?: string;
      ussdCodes?: string[];
    }
  | { kind: "pending" };

export type OnrampInput = {
  currency: Currency;
  fiatAmount: number;
  token: Token;
  network: Network;
  destinationAddress: string;
  /** KES: the M-Pesa number that gets the payment prompt (2547XXXXXXXX). */
  payerPhone?: string;
  /** NGN: saved bank account to refund to if the order fails. */
  refundBeneficiaryRef?: string;
  idempotencyKey: string;
};

export type OnrampOrder = {
  ref: string;
  cryptoAmount: number;
  fiatAmount: number;
  rate: number;
  feeCrypto: number;
  instructions: PaymentInstructions;
  expiresAt: string;
};

export type OrderSnapshot = {
  status: TxStatus;
  fiatAmount?: number;
  cryptoAmount?: number;
  txHash?: string;
  failureReason?: string;
  instructions?: PaymentInstructions;
};

export type ProviderEvent =
  | {
      id: string;
      type: "deposit.received";
      occurredAt: string;
      depositRef: string;
      address: string;
      /** Raw chain name from the provider (base, bsc, solana, ethereum…). */
      chain: string;
      token: Token;
      cryptoAmount: number;
      txHash?: string;
    }
  | ({ id: string; type: "order.updated"; occurredAt: string; orderRef: string } & OrderSnapshot);

/**
 * Everything KidogoPay needs from a payments provider. `mock.ts` simulates it,
 * `live.ts` talks to Qadi. Nothing else in the app calls the provider directly.
 */
export interface PaymentsProvider {
  readonly mode: "mock" | "live";
  getRates(): Promise<Rates>;
  listBanks(currency: Currency): Promise<Bank[]>;
  createBeneficiary(input: BeneficiaryInput): Promise<{ ref: string }>;
  removeBeneficiary(ref: string): Promise<void>;
  createDepositAddress(input: { label: string }): Promise<{ ref: string; address: string }>;
  /** Deposits that cleared screening since `since`; backs up the deposit.received webhook. */
  listRecentDeposits(since: Date): Promise<ProviderEvent[]>;
  archiveDepositAddress(ref: string): Promise<void>;
  offrampDeposit(input: OfframpInput): Promise<OfframpStarted>;
  createOnramp(input: OnrampInput): Promise<OnrampOrder>;
  getOrder(ref: string): Promise<OrderSnapshot | null>;
  verifyWebhook(rawBody: string, headers: Headers): Promise<boolean>;
  parseWebhook(rawBody: string, headers: Headers): ProviderEvent[];
}

export class ProviderError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}
