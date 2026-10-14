import type { Currency, Token } from "./constants";

const grouped = (n: number, min = 2, max = 2) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: min,
    maximumFractionDigits: max,
  }).format(n);

const num = (v: string | number | null | undefined) => {
  const n = typeof v === "number" ? v : Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

/** KSh 32,285.50 / ₦1,530,000.00 */
export function formatFiat(amount: string | number | null | undefined, currency: Currency) {
  const value = grouped(num(amount));
  return currency === "KES" ? `KSh\u00a0${value}` : `₦${value}`;
}

/** 250.00 USDC — keeps up to 6 decimals when they matter. */
export function formatCrypto(amount: string | number | null | undefined, token: Token) {
  return `${grouped(num(amount), 2, 6)}\u00a0${token}`;
}

export function formatUsd(amount: string | number | null | undefined, decimals = 0) {
  return `$${grouped(num(amount), decimals, decimals)}`;
}

/** 1 USDC = KSh 129.10 */
export function formatRate(rate: string | number, token: Token, currency: Currency) {
  return `1 ${token} = ${formatFiat(rate, currency)}`;
}

export function formatDateTime(date: Date | string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function formatDay(date: Date | string) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(
    new Date(date),
  );
}

export function shortAddress(address: string, head = 6, tail = 4) {
  if (address.length <= head + tail + 1) return address;
  return `${address.slice(0, head)}…${address.slice(-tail)}`;
}

/** Splits an address into groups of four so people can check it by eye. */
export function addressGroups(address: string) {
  const body = address.startsWith("0x") ? address.slice(2) : address;
  const groups = body.match(/.{1,4}/g) ?? [];
  return address.startsWith("0x") ? ["0x", ...groups] : groups;
}

/** •••• 4821 */
export function maskAccount(accountNumber: string) {
  return `••••\u00a0${accountNumber.slice(-4)}`;
}

/** 254712345678 → +254 712 •••678 */
export function maskPhone(phone: string) {
  const local = phone.replace(/^254/, "");
  return `+254\u00a0${local.slice(0, 3)}\u00a0•••${local.slice(-3)}`;
}

export function formatPhone(phone: string) {
  const local = phone.replace(/^254/, "");
  return `+254 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : (parts[0] ?? "?").slice(0, 2);
  return letters.toUpperCase();
}

/** Rounds down so we never promise more than the provider will send. */
export function floorTo(value: number, decimals: number) {
  const f = 10 ** decimals;
  return Math.floor(value * f + 1e-9) / f;
}
