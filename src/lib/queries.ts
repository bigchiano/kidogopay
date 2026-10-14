import "server-only";
import { and, desc, eq, gte, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { payoutAccount, transaction, wallet } from "@/lib/db/schema";
import type { Currency, Direction } from "@/lib/constants";

export async function listPayoutAccounts(userId: string) {
  const [accounts, counts] = await Promise.all([
    db
      .select()
      .from(payoutAccount)
      .where(and(eq(payoutAccount.userId, userId), isNull(payoutAccount.archivedAt)))
      .orderBy(desc(payoutAccount.createdAt)),
    db
      .select({ id: wallet.payoutAccountId, n: sql<number>`count(*)::int` })
      .from(wallet)
      .where(and(eq(wallet.userId, userId), isNull(wallet.archivedAt)))
      .groupBy(wallet.payoutAccountId),
  ]);
  const byId = new Map(counts.map((c) => [c.id, c.n]));
  return accounts.map((a) => ({ ...a, walletCount: byId.get(a.id) ?? 0 }));
}

export async function listWallets(userId: string) {
  return db.query.wallet.findMany({
    where: and(eq(wallet.userId, userId), isNull(wallet.archivedAt)),
    with: { payoutAccount: true },
    orderBy: [desc(wallet.createdAt)],
  });
}

export async function listTransactions(userId: string, opts: { direction?: Direction; limit?: number } = {}) {
  return db.query.transaction.findMany({
    where: and(eq(transaction.userId, userId), opts.direction ? eq(transaction.direction, opts.direction) : undefined),
    with: { payoutAccount: true, wallet: true },
    orderBy: [desc(transaction.createdAt)],
    limit: opts.limit ?? 100,
  });
}

export async function getTransaction(userId: string, id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return undefined;
  return db.query.transaction.findFirst({
    where: and(eq(transaction.id, id), eq(transaction.userId, userId)),
    with: { payoutAccount: true, wallet: true },
  });
}

export type TxWithRelations = NonNullable<Awaited<ReturnType<typeof getTransaction>>>;

/** Completed volume since the 1st of this month (UTC). */
export async function monthTotals(userId: string) {
  const start = new Date();
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);
  const rows = await db
    .select({
      direction: transaction.direction,
      currency: transaction.fiatCurrency,
      fiat: sql<string>`coalesce(sum(${transaction.fiatAmount}), 0)`,
      usd: sql<string>`coalesce(sum(${transaction.usdValue}), 0)`,
    })
    .from(transaction)
    .where(and(eq(transaction.userId, userId), eq(transaction.status, "completed"), gte(transaction.completedAt, start)))
    .groupBy(transaction.direction, transaction.fiatCurrency);

  const paidOut: Record<Currency, number> = { KES: 0, NGN: 0 };
  let boughtUsd = 0;
  for (const r of rows) {
    if (r.direction === "offramp") paidOut[r.currency] += Number(r.fiat);
    else boughtUsd += Number(r.usd);
  }
  return { paidOut, boughtUsd };
}
