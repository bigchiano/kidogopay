import { NETWORK_INFO, type Network, type Token } from "@/lib/constants";
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

export function NetworkNames({ networks }: { networks: readonly Network[] }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
      {networks.map((n) => (
        <NetworkName key={n} network={n} />
      ))}
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

/** Monospace so 0/O and l/1 stay distinct. */
export function AddressText({ address, className = "" }: { address: string; className?: string }) {
  return <span className={`font-mono text-[15px] leading-relaxed break-all ${className}`}>{address}</span>;
}
