CREATE TYPE "public"."currency" AS ENUM('KES', 'NGN');--> statement-breakpoint
CREATE TYPE "public"."direction" AS ENUM('offramp', 'onramp');--> statement-breakpoint
CREATE TYPE "public"."kyb_status" AS ENUM('not_started', 'pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."network" AS ENUM('solana', 'base', 'bsc');--> statement-breakpoint
CREATE TYPE "public"."payout_method" AS ENUM('bank', 'mobile_money');--> statement-breakpoint
CREATE TYPE "public"."token" AS ENUM('USDC', 'USDT');--> statement-breakpoint
CREATE TYPE "public"."tx_status" AS ENUM('awaiting_payment', 'received', 'held', 'processing', 'completed', 'failed', 'expired', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."wallet_status" AS ENUM('active', 'paused');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kyb_profile" (
	"user_id" text PRIMARY KEY NOT NULL,
	"status" "kyb_status" DEFAULT 'not_started' NOT NULL,
	"requested_at" timestamp with time zone,
	"reviewed_at" timestamp with time zone,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payout_account" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"currency" "currency" NOT NULL,
	"method" "payout_method" NOT NULL,
	"label" text,
	"account_name" text NOT NULL,
	"account_number" text NOT NULL,
	"bank_code" text,
	"bank_name" text,
	"provider_ref" text,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provider_event" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "transaction" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"direction" "direction" NOT NULL,
	"status" "tx_status" NOT NULL,
	"network" "network" NOT NULL,
	"token" "token" NOT NULL,
	"crypto_amount" numeric(24, 6) NOT NULL,
	"fiat_currency" "currency" NOT NULL,
	"fiat_amount" numeric(24, 2),
	"rate" numeric(24, 6),
	"fee_crypto" numeric(24, 6),
	"usd_value" numeric(24, 2) NOT NULL,
	"wallet_id" text,
	"payout_account_id" text,
	"destination_address" text,
	"payment_instructions" jsonb,
	"tx_hash" text,
	"payout_reference" text,
	"failure_reason" text,
	"hold_reason" text,
	"provider_ref" text NOT NULL,
	"order_ref" text,
	"expires_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wallet" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"label" text,
	"network" "network" NOT NULL,
	"tokens" text[] NOT NULL,
	"address" text NOT NULL,
	"payout_account_id" text NOT NULL,
	"status" "wallet_status" DEFAULT 'active' NOT NULL,
	"paused_reason" text,
	"provider_ref" text NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kyb_profile" ADD CONSTRAINT "kyb_profile_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout_account" ADD CONSTRAINT "payout_account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_wallet_id_wallet_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallet"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_payout_account_id_payout_account_id_fk" FOREIGN KEY ("payout_account_id") REFERENCES "public"."payout_account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet" ADD CONSTRAINT "wallet_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet" ADD CONSTRAINT "wallet_payout_account_id_payout_account_id_fk" FOREIGN KEY ("payout_account_id") REFERENCES "public"."payout_account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "payout_account_user_idx" ON "payout_account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_user_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "transaction_user_created_idx" ON "transaction" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "transaction_provider_ref_idx" ON "transaction" USING btree ("provider_ref");--> statement-breakpoint
CREATE UNIQUE INDEX "transaction_order_ref_idx" ON "transaction" USING btree ("order_ref");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "wallet_user_idx" ON "wallet" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "wallet_provider_ref_idx" ON "wallet" USING btree ("provider_ref");--> statement-breakpoint
CREATE UNIQUE INDEX "wallet_network_address_idx" ON "wallet" USING btree ("network","address");