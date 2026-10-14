import "server-only";
import { liveProvider } from "./live";
import { mockProvider } from "./mock";
import type { PaymentsProvider } from "./types";

export type PaymentsMode = "mock" | "live";

export function paymentsMode(): PaymentsMode {
  return process.env.PAYMENTS_MODE === "live" ? "live" : "mock";
}

export function payments(): PaymentsProvider {
  return paymentsMode() === "live" ? liveProvider : mockProvider;
}

export { mockProvider };
export * from "./types";
