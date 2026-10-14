ALTER TABLE "wallet" ADD COLUMN "networks" "network"[];--> statement-breakpoint
UPDATE "wallet" SET "networks" = ARRAY["network"];--> statement-breakpoint
ALTER TABLE "wallet" ALTER COLUMN "networks" SET NOT NULL;
