import "server-only";
import { and, eq, gt, inArray, or, sql } from "drizzle-orm";
import { db, type Tx } from "@/lib/db";
import { kybProfile, transaction, type KybStatus } from "@/lib/db/schema";
import { kybThresholdUsd } from "@/lib/constants";
import { formatUsd } from "@/lib/format";

type Executor = typeof db | Tx;

/** Lifetime USD volume that counts toward the verification limit. */
export async function usedVolumeUsd(exec: Executor, userId: string): Promise<number> {
  const [row] = await exec
    .select({ total: sql<string>`coalesce(sum(${transaction.usdValue}), 0)` })
    .from(transaction)
    .where(
      and(
        eq(transaction.userId, userId),
        or(
          inArray(transaction.status, ["received", "processing", "completed"]),
          and(eq(transaction.status, "awaiting_payment"), gt(transaction.expiresAt, new Date())),
        ),
      ),
    );
  return Number(row?.total ?? 0);
}

export async function kybStatus(exec: Executor, userId: string): Promise<KybStatus> {
  const [row] = await exec
    .select({ status: kybProfile.status })
    .from(kybProfile)
    .where(eq(kybProfile.userId, userId));
  return row?.status ?? "not_started";
}

export type LimitSummary = {
  used: number;
  threshold: number;
  remaining: number;
  kyb: KybStatus;
  /** True when the account can't start new activity until verified. */
  reached: boolean;
};

export async function limitSummary(userId: string): Promise<LimitSummary> {
  const [used, kyb] = await Promise.all([usedVolumeUsd(db, userId), kybStatus(db, userId)]);
  const threshold = kybThresholdUsd();
  const verified = kyb === "approved";
  return {
    used,
    threshold,
    remaining: verified ? Number.POSITIVE_INFINITY : Math.max(threshold - used, 0),
    kyb,
    reached: !verified && used >= threshold,
  };
}

/** Returns an error message when `extraUsd` would take the account past its limit. */
export async function limitError(userId: string, extraUsd = 0): Promise<string | null> {
  const s = await limitSummary(userId);
  if (s.kyb === "approved") return null;
  if (s.reached) {
    return `You've reached ${formatUsd(s.threshold)} in total volume. Verify your business in Settings to continue.`;
  }
  if (s.used + extraUsd > s.threshold) {
    return `This would take you past ${formatUsd(s.threshold)} before verification. You can do up to ${formatUsd(s.remaining, 2)} more, or verify your business in Settings.`;
  }
  return null;
}
