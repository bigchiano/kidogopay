import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { pg?: ReturnType<typeof postgres> };

if (!process.env.DATABASE_URL && process.env.NEXT_PHASE !== "phase-production-build") {
  console.warn("[db] DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.");
}

// postgres.js connects lazily, so creating the client never blocks a build.
const client =
  globalForDb.pg ??
  postgres(process.env.DATABASE_URL ?? "", {
    max: 10,
    // Works with transaction poolers (Neon, Supabase, PgBouncer).
    prepare: false,
  });

if (process.env.NODE_ENV !== "production") globalForDb.pg = client;

export const db = drizzle(client, { schema });
export type Db = typeof db;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
