import { keccak_256 } from "@noble/hashes/sha3.js";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils.js";
import type { Network } from "./constants";

/** EIP-55: mixed-case addresses carry a checksum that catches typos. */
function hasValidEvmChecksum(address: string) {
  const body = address.slice(2);
  const hash = bytesToHex(keccak_256(utf8ToBytes(body.toLowerCase())));
  for (let i = 0; i < 40; i++) {
    const char = body[i];
    if (/[a-f]/i.test(char)) {
      const upper = parseInt(hash[i], 16) >= 8;
      if ((upper && char !== char.toUpperCase()) || (!upper && char !== char.toLowerCase())) {
        return false;
      }
    }
  }
  return true;
}

export function toChecksumAddress(address: string) {
  const body = address.slice(2).toLowerCase();
  const hash = bytesToHex(keccak_256(utf8ToBytes(body)));
  let out = "0x";
  for (let i = 0; i < 40; i++) {
    out += parseInt(hash[i], 16) >= 8 ? body[i].toUpperCase() : body[i];
  }
  return out;
}

export function evmAddressError(address: string): string | null {
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
    return "Enter a 42-character address that starts with 0x.";
  }
  const body = address.slice(2);
  const mixedCase = body !== body.toLowerCase() && body !== body.toUpperCase();
  if (mixedCase && !hasValidEvmChecksum(address)) {
    return "This address has a typo. Copy it again from your wallet.";
  }
  return null;
}

export function addressError(_network: Network, address: string): string | null {
  const trimmed = address.trim();
  if (!trimmed) return "Enter the wallet address that should receive the crypto.";
  return evmAddressError(trimmed);
}

/**
 * Accepts 0712 345 678, 712345678, +254 712 345 678, 0112 345 678…
 * Returns 2547XXXXXXXX / 2541XXXXXXXX, or null.
 */
export function normalizeKenyanPhone(input: string): string | null {
  const digits = input.replace(/[\s\-()+]/g, "");
  let local: string | null = null;
  if (/^254[17]\d{8}$/.test(digits)) local = digits.slice(3);
  else if (/^0[17]\d{8}$/.test(digits)) local = digits.slice(1);
  else if (/^[17]\d{8}$/.test(digits)) local = digits;
  return local ? `254${local}` : null;
}

/** Only allow same-site relative redirects after sign-in. */
export function safeNextPath(next: string | null | undefined, fallback = "/dashboard") {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return fallback;
  }
  return next;
}
