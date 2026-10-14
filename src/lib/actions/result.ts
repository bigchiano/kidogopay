import type { z } from "zod";
import { ProviderError } from "@/lib/payments/types";

export type ActionResult<T = null> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export const ok = <T>(data: T): ActionResult<T> => ({ ok: true, data });

export const fail = (error: string, fieldErrors?: Record<string, string>) =>
  ({ ok: false, error, fieldErrors }) as const;

export function zodFieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}

/** Turns provider failures into something a customer can act on. */
export function providerFailure(err: unknown) {
  console.error("[payments]", err);
  if (err instanceof ProviderError && err.status && err.status >= 400 && err.status < 500) {
    return fail(`Our payments partner declined this: ${err.message}`);
  }
  return fail("We couldn't reach our payments partner. Try again in a minute.");
}
