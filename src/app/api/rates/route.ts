import { payments, paymentsMode } from "@/lib/payments";

export const dynamic = "force-dynamic";

/** Indicative mid-market rates for the calculators. */
export async function GET() {
  try {
    const rates = await payments().getRates();
    return Response.json(
      { mode: paymentsMode(), ...rates },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } },
    );
  } catch (err) {
    console.error("[rates]", err);
    return Response.json({ error: "Rates are unavailable right now." }, { status: 503 });
  }
}
