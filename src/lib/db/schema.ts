import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
};

/* ───────────────────────── Auth (Better Auth) ───────────────────────── */

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  ...timestamps,
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (t) => [index("session_user_idx").on(t.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    ...timestamps,
  },
  (t) => [index("account_user_idx").on(t.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ...timestamps,
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);

/* ───────────────────────────── KidogoPay ───────────────────────────── */

export const currencyEnum = pgEnum("currency", ["KES", "NGN"]);
export const networkEnum = pgEnum("network", ["base", "bsc"]);
export const tokenEnum = pgEnum("token", ["USDC", "USDT"]);
export const payoutMethodEnum = pgEnum("payout_method", ["bank", "mobile_money"]);
export const walletStatusEnum = pgEnum("wallet_status", ["active", "paused"]);
export const directionEnum = pgEnum("direction", ["offramp", "onramp"]);
export const txStatusEnum = pgEnum("tx_status", [
  "awaiting_payment",
  "received",
  "held",
  "processing",
  "completed",
  "failed",
  "expired",
  "refunded",
]);
export const kybStatusEnum = pgEnum("kyb_status", [
  "not_started",
  "pending",
  "approved",
  "rejected",
]);

/** Where fiat lands: a bank account (KES/NGN) or an M-Pesa number (KES). */
export const payoutAccount = pgTable(
  "payout_account",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    currency: currencyEnum("currency").notNull(),
    method: payoutMethodEnum("method").notNull(),
    label: text("label"),
    accountName: text("account_name").notNull(),
    /** Bank account number, or phone number in 2547XXXXXXXX form for M-Pesa. */
    accountNumber: text("account_number").notNull(),
    bankCode: text("bank_code"),
    bankName: text("bank_name"),
    /** Qadi bank account id (bank accounts and M-Pesa numbers both). */
    providerRef: text("provider_ref"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [index("payout_account_user_idx").on(t.userId)],
);

/** A receiving address that auto-converts USDC/USDT and pays out to a payout account. */
export const wallet = pgTable(
  "wallet",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    label: text("label"),
    network: networkEnum("network").notNull(),
    tokens: text("tokens").array().notNull(),
    address: text("address").notNull(),
    payoutAccountId: text("payout_account_id")
      .notNull()
      .references(() => payoutAccount.id),
    status: walletStatusEnum("status").default("active").notNull(),
    /** "user" when paused by the owner, "limit" when paused at the verification limit. */
    pausedReason: text("paused_reason"),
    /** Qadi wallet id; each KidogoPay wallet gets its own Qadi wallet and address. */
    providerRef: text("provider_ref").notNull(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index("wallet_user_idx").on(t.userId),
    uniqueIndex("wallet_provider_ref_idx").on(t.providerRef),
    uniqueIndex("wallet_network_address_idx").on(t.network, t.address),
  ],
);

export const transaction = pgTable(
  "transaction",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    direction: directionEnum("direction").notNull(),
    status: txStatusEnum("status").notNull(),
    network: networkEnum("network").notNull(),
    token: tokenEnum("token").notNull(),
    cryptoAmount: numeric("crypto_amount", { precision: 24, scale: 6 }).notNull(),
    fiatCurrency: currencyEnum("fiat_currency").notNull(),
    fiatAmount: numeric("fiat_amount", { precision: 24, scale: 2 }),
    /** Fiat per 1 USDC/USDT. */
    rate: numeric("rate", { precision: 24, scale: 6 }),
    /** Provider + KidogoPay fees, in the token. */
    feeCrypto: numeric("fee_crypto", { precision: 24, scale: 6 }),
    /** USD value used for the verification limit (stablecoins ≈ 1 USD). */
    usdValue: numeric("usd_value", { precision: 24, scale: 2 }).notNull(),
    walletId: text("wallet_id").references(() => wallet.id),
    payoutAccountId: text("payout_account_id").references(() => payoutAccount.id),
    /** On-ramp: the wallet that receives the crypto. */
    destinationAddress: text("destination_address"),
    /** On-ramp: how to pay (M-Pesa paybill, bank transfer…). */
    paymentInstructions: jsonb("payment_instructions"),
    /** Off-ramp: the deposit tx. On-ramp: the tx that sent crypto out. */
    txHash: text("tx_hash"),
    payoutReference: text("payout_reference"),
    failureReason: text("failure_reason"),
    /** Why an off-ramp deposit is held: "paused" | "limit" | "unsupported_chain" | "deleted". */
    holdReason: text("hold_reason"),
    /** Off-ramp: the Qadi deposit id. On-ramp: the Qadi fiat order id. */
    providerRef: text("provider_ref").notNull(),
    /** The Qadi fiat order that moves the money (both directions). */
    orderRef: text("order_ref"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index("transaction_user_created_idx").on(t.userId, t.createdAt),
    uniqueIndex("transaction_provider_ref_idx").on(t.providerRef),
    uniqueIndex("transaction_order_ref_idx").on(t.orderRef),
  ],
);

/** Every provider event we've seen, for idempotency and debugging. */
export const providerEvent = pgTable("provider_event", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  payload: jsonb("payload").notNull(),
  receivedAt: timestamp("received_at", { withTimezone: true }).defaultNow().notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
  error: text("error"),
});

/** Business verification (KYB). The provider integration comes later; status is set manually for now. */
export const kybProfile = pgTable("kyb_profile", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  status: kybStatusEnum("status").default("not_started").notNull(),
  requestedAt: timestamp("requested_at", { withTimezone: true }),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  note: text("note"),
  ...timestamps,
});

/* ───────────────────────────── Relations ───────────────────────────── */

export const walletRelations = relations(wallet, ({ one, many }) => ({
  payoutAccount: one(payoutAccount, {
    fields: [wallet.payoutAccountId],
    references: [payoutAccount.id],
  }),
  transactions: many(transaction),
}));

export const payoutAccountRelations = relations(payoutAccount, ({ many }) => ({
  wallets: many(wallet),
}));

export const transactionRelations = relations(transaction, ({ one }) => ({
  wallet: one(wallet, { fields: [transaction.walletId], references: [wallet.id] }),
  payoutAccount: one(payoutAccount, {
    fields: [transaction.payoutAccountId],
    references: [payoutAccount.id],
  }),
}));

export type PayoutAccount = typeof payoutAccount.$inferSelect;
export type Wallet = typeof wallet.$inferSelect;
export type Transaction = typeof transaction.$inferSelect;
export type KybStatus = (typeof kybStatusEnum.enumValues)[number];
export type TxStatus = (typeof txStatusEnum.enumValues)[number];
