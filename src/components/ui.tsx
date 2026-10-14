import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "onDark";
type Size = "md" | "sm";

export function buttonClasses(variant: Variant = "primary", size: Size = "md", extra = "") {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-[10px] font-semibold whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-55";
  const sizes: Record<Size, string> = {
    md: "h-11 px-4.5 text-[15px]",
    sm: "h-9 px-3 text-sm",
  };
  const variants: Record<Variant, string> = {
    primary: "bg-marigold text-ink hover:bg-marigold-2",
    secondary: "bg-white text-ink border border-mist hover:border-ink/30",
    ghost: "text-ink hover:bg-haze",
    danger: "bg-white text-ember border border-mist hover:border-ember/40 hover:bg-ember-soft",
    onDark: "bg-white/10 text-chalk hover:bg-white/15",
  };
  return `${base} ${sizes[size]} ${variants[variant]} ${extra}`;
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button className={buttonClasses(variant, size, className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClasses(variant, size, className)} {...props} />;
}

export const inputClasses =
  "h-11 w-full rounded-[10px] border border-mist bg-white px-3.5 text-[15px] text-ink placeholder:text-muted/70 outline-none transition focus:border-adire focus:ring-3 focus:ring-adire/12 aria-[invalid=true]:border-ember";

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-semibold text-ink">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-sm text-ember">
          {error}
        </p>
      ) : hint ? (
        <p className="text-sm text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export function Alert({
  tone = "error",
  children,
}: {
  tone?: "error" | "info" | "success" | "warning";
  children: ReactNode;
}) {
  const tones = {
    error: "bg-ember-soft text-ember",
    info: "bg-haze text-ink",
    success: "bg-leaf-soft text-leaf",
    warning: "bg-sun-soft text-ink",
  };
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`rounded-[10px] px-3.5 py-3 text-sm ${tones[tone]}`}>
      {children}
    </div>
  );
}

export function Panel({ className = "", children }: { className?: string; children: ReactNode }) {
  return <section className={`rounded-2xl border border-mist bg-white ${className}`}>{children}</section>;
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        <h1 className="font-wide text-[1.9rem] leading-tight font-bold tracking-[-0.03em] sm:text-[2.25rem]">
          {title}
        </h1>
        {description ? <p className="mt-2 text-[15px] text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 gap-2">{actions}</div> : null}
    </div>
  );
}

export function Chip({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex h-6 items-center gap-1.5 rounded-md bg-haze px-2 text-xs font-semibold text-ink ${className}`}
    >
      {children}
    </span>
  );
}
