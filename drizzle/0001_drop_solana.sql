ALTER TABLE "transaction" ALTER COLUMN "network" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "wallet" ALTER COLUMN "network" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."network";--> statement-breakpoint
CREATE TYPE "public"."network" AS ENUM('base', 'bsc');--> statement-breakpoint
ALTER TABLE "transaction" ALTER COLUMN "network" SET DATA TYPE "public"."network" USING "network"::"public"."network";--> statement-breakpoint
ALTER TABLE "wallet" ALTER COLUMN "network" SET DATA TYPE "public"."network" USING "network"::"public"."network";