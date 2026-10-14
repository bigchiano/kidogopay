import { NETWORK_INFO, type Network, type Token } from "@/lib/constants";
import { addressGroups } from "@/lib/format";
import { Chip } from "./ui";

export function NetworkName({ network, short = false }: { network: Network; short?: boolean }) {
  const info = NETWORK_INFO[network];
  return (
    <span className="inline-flex items-center gap-2 font-semibold">
      <span className="size-2.5 rounded-full" style={{ background: info.dot }} aria-hidden />
      {short ? info.short : info.name}
    </span>
  );
}

export function TokenChips({ tokens }: { tokens: readonly string[] }) {
  return (
    <span className="inline-flex gap-1">
      {tokens.map((t) => (
        <Chip key={t}>{t as Token}</Chip>
      ))}
    </span>
  );
}

/** Addresses in groups of four, in a monospace face so 0/O and l/1 stay distinct. */
export function AddressText({ address, className = "" }: { address: string; className?: string }) {
  return (
    <span
      className={`font-mono text-[15px] leading-relaxed tracking-tight break-all ${className}`}
      aria-label={address}
    >
      {addressGroups(address).map((g, i) => (
        <span key={i} className="mr-[0.45em] inline-block">
          {g}
        </span>
      ))}
    </span>
  );
}
