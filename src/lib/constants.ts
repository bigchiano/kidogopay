export const NETWORKS = ["base", "bsc"] as const;
export const TOKENS = ["USDC", "USDT"] as const;
export const CURRENCIES = ["KES", "NGN"] as const;
export const PAYOUT_METHODS = ["mobile_money", "bank"] as const;

export type Network = (typeof NETWORKS)[number];
export type Token = (typeof TOKENS)[number];
export type Currency = (typeof CURRENCIES)[number];
export type PayoutMethod = (typeof PAYOUT_METHODS)[number];
export type Direction = "offramp" | "onramp";

type NetworkInfo = {
  name: string;
  short: string;
  /** Small identifying dot, never the only signal (the name is always shown). */
  dot: string;
  tokenStandard: string;
  explorerTx: (hash: string) => string;
  explorerAddress: (address: string) => string;
};

export const NETWORK_INFO: Record<Network, NetworkInfo> = {
  base: {
    name: "Base",
    short: "Base",
    dot: "#0052FF",
    tokenStandard: "ERC-20",
    explorerTx: (h) => `https://basescan.org/tx/${h}`,
    explorerAddress: (a) => `https://basescan.org/address/${a}`,
  },
  bsc: {
    name: "BNB Smart Chain",
    short: "BSC",
    dot: "#E8A300",
    tokenStandard: "BEP-20",
    explorerTx: (h) => `https://bscscan.com/tx/${h}`,
    explorerAddress: (a) => `https://bscscan.com/address/${a}`,
  },
};

/** "Base", "Base or BNB Smart Chain" */
export function networkNames(networks: readonly Network[], join = "or") {
  const names = networks.map((n) => NETWORK_INFO[n].name);
  return names.length > 1 ? `${names.slice(0, -1).join(", ")} ${join} ${names.at(-1)}` : (names[0] ?? "");
}

type CurrencyInfo = {
  name: string;
  country: string;
  methods: readonly PayoutMethod[];
  /** How people pay for an on-ramp in this currency. */
  payWith: string;
};

export const CURRENCY_INFO: Record<Currency, CurrencyInfo> = {
  KES: {
    name: "Kenyan shilling",
    country: "Kenya",
    methods: ["mobile_money", "bank"],
    payWith: "M-Pesa",
  },
  NGN: {
    name: "Nigerian naira",
    country: "Nigeria",
    methods: ["bank"],
    payWith: "bank transfer",
  },
};

export const METHOD_LABEL: Record<PayoutMethod, string> = {
  mobile_money: "M-Pesa",
  bank: "Bank account",
};

/** Per-transaction bounds in USD, applied before calling the provider. */
export const MIN_USD = 5;
export const MAX_USD = 10_000;

export function kybThresholdUsd(): number {
  const raw = Number(process.env.KYB_THRESHOLD_USD ?? 5000);
  return Number.isFinite(raw) && raw > 0 ? raw : 5000;
}
