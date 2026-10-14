import { timingSafeEqual } from "node:crypto";
import { pollDeposits } from "@/lib/payments/events";

export const dynamic = "force-dynamic";

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  const given = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  if (!secret || given.length !== secret.length) return false;
  return timingSafeEqual(Buffer.from(given), Buffer.from(secret));
}

/** Called every few minutes by src/instrumentation.ts, or by an external cron with CRON_SECRET. */
export async function POST(request: Request) {
  if (!authorized(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return Response.json(await pollDeposits());
  } catch (err) {
    console.error("[cron] deposit poll failed", err);
    return Response.json({ error: "Poll failed" }, { status: 500 });
  }
}
