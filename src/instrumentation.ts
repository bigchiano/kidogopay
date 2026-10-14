const INTERVAL_MS = 5 * 60_000;

// Runs inside the app server; the poll itself goes through an API route because
// server-only modules can't be imported from instrumentation.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.PAYMENTS_MODE !== "live") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  process.env.CRON_SECRET ||= crypto.randomUUID() + crypto.randomUUID();
  const url = `http://127.0.0.1:${process.env.PORT ?? 3000}/api/cron/deposits`;

  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
        signal: AbortSignal.timeout(120_000),
      });
      if (!res.ok) console.error(`[cron] deposit poll returned ${res.status}`);
    } catch (err) {
      console.error("[cron] deposit poll failed", err);
    } finally {
      running = false;
    }
  };

  setTimeout(tick, 60_000);
  setInterval(tick, INTERVAL_MS).unref();
}
