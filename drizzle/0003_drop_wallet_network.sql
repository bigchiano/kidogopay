DROP INDEX "wallet_network_address_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "wallet_address_idx" ON "wallet" USING btree ("address");--> statement-breakpoint
ALTER TABLE "wallet" DROP COLUMN "network";