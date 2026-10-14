type Tone = "indigo" | "marigold";

/**
 * The mark is a "k" whose arms are the two ramps:
 * ↗ money onto the chain (buy), ↘ money off it (cash out).
 */
export function LogoMark({ size = 32, tone = "indigo" }: { size?: number; tone?: Tone }) {
  const bg = tone === "indigo" ? "#1e2466" : "#ffb61d";
  const fg = tone === "indigo" ? "#ffb61d" : "#1e2466";
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" className="shrink-0">
      <rect width="48" height="48" rx="12" fill={bg} />
      <g fill="none" stroke={fg} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 10V38" />
        <path d="M20 21L32 10M25 10H32V17" />
        <path d="M20 27L32 38M25 38H32V31" />
      </g>
    </svg>
  );
}

export function Logo({ onDark = false, size = 30 }: { onDark?: boolean; size?: number }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark size={size} tone={onDark ? "marigold" : "indigo"} />
      <span
        className={`font-wide text-[1.2rem] font-bold tracking-[-0.025em] ${onDark ? "text-chalk" : "text-ink"}`}
      >
        kidogopay
      </span>
    </span>
  );
}
