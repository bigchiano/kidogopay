import { payments } from "@/lib/payments";
import { processProviderEvents, RetryLaterError } from "@/lib/payments/events";

export const dynamic = "force-dynamic";

/**
 * Qadi posts deposit.received and fiat_order.* here.
 * Set https://kidogopay.xyz/api/webhooks/qadi as the webhook URL in the Qadi dashboard.
 */
export async function POST(request: Request) {
  const provider = payments();
  const rawBody = await request.text();

  let verified = false;
  try {
    verified = await provider.verifyWebhook(rawBody, request.headers);
  } catch (err) {
    console.error("[webhook] verification error", err);
  }
  if (!verified) return Response.json({ error: "Invalid signature" }, { status: 401 });

  try {
    await processProviderEvents(provider.parseWebhook(rawBody, request.headers));
    return Response.json({ received: true });
  } catch (err) {
    console.error("[webhook] processing failed", err);
    // Non-2xx makes Qadi retry (five attempts over about half an hour).
    return Response.json({ error: "Not processed" }, { status: err instanceof RetryLaterError ? 409 : 500 });
  }
}
