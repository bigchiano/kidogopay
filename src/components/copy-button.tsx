"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopyButton({
  value,
  label = "Copy",
  className = "",
  onDark = false,
}: {
  value: string;
  label?: string;
  className?: string;
  onDark?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard can be blocked (http, permissions); the value stays selectable.
    }
  }

  const tone = onDark
    ? "bg-white/10 text-chalk hover:bg-white/15"
    : "bg-white text-ink border border-mist hover:border-ink/30";

  return (
    <button
      type="button"
      onClick={copy}
      className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-semibold transition-colors ${tone} ${className}`}
    >
      {copied ? <Check className="size-3.5" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
      <span aria-live="polite">{copied ? "Copied" : label}</span>
    </button>
  );
}
