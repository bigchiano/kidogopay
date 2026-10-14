/**
 * The ramp from the logo: ↘ cash-out (crypto → bank), ↗ buy (bank → crypto).
 * Drawn once on mount; reduced-motion users get it static.
 */
export function RampLine({
  direction,
  animate = false,
  className = "",
  color = "#ffb61d",
  vertical = false,
}: {
  direction: "offramp" | "onramp";
  animate?: boolean;
  className?: string;
  color?: string;
  vertical?: boolean;
}) {
  const down = direction === "offramp";
  if (vertical) {
    return (
      <svg viewBox="0 0 40 48" className={className} aria-hidden="true">
        <g fill="none" stroke={color} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 6 L26 40" pathLength={1} strokeDasharray={1} className={animate ? "animate-ramp" : ""} />
          <path d="M18.5 38.5 L26 40 L28.5 32.5" />
        </g>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 400 64" className={className} aria-hidden="true">
      <g fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
        <path
          d={down ? "M12 12 L384 52" : "M12 52 L384 12"}
          pathLength={1}
          strokeDasharray={1}
          className={animate ? "animate-ramp" : ""}
        />
        {down ? <path d="M370 40 L386 52 L368 59" /> : <path d="M368 5 L386 12 L370 24" />}
      </g>
    </svg>
  );
}
