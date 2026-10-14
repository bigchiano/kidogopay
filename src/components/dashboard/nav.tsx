"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, ChevronDown, Landmark, LayoutGrid, LogOut, Receipt, Settings, Wallet } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { initials } from "@/lib/format";

const ITEMS = [
  { href: "/dashboard", label: "Overview", short: "Overview", icon: LayoutGrid, exact: true },
  { href: "/dashboard/wallets", label: "Wallets", short: "Wallets", icon: Wallet },
  { href: "/dashboard/payouts", label: "Payout accounts", short: "Payouts", icon: Landmark },
  { href: "/dashboard/buy", label: "Buy crypto", short: "Buy", icon: ArrowUpRight },
  { href: "/dashboard/activity", label: "Activity", short: "Activity", icon: Receipt },
];

function useIsActive() {
  const pathname = usePathname();
  return (item: (typeof ITEMS)[number]) =>
    item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function DesktopNav() {
  const isActive = useIsActive();
  return (
    <nav aria-label="Main" className="hidden h-full items-stretch md:flex">
      {ITEMS.map((item) => {
        const active = isActive(item);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`relative flex items-center px-3 text-[15px] font-semibold transition-colors lg:px-3.5 ${
              active ? "text-chalk" : "text-chalk/65 hover:text-chalk"
            }`}
          >
            {item.label}
            {active ? <span className="absolute inset-x-3 bottom-0 h-[3px] rounded-t bg-marigold" aria-hidden /> : null}
          </Link>
        );
      })}
    </nav>
  );
}

export function MobileTabs() {
  const isActive = useIsActive();
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-mist bg-white/95 backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="grid grid-cols-5">
        {ITEMS.map((item) => {
          const active = isActive(item);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`relative flex flex-col items-center gap-1 pt-2.5 pb-2 text-[11px] font-semibold ${
                  active ? "text-adire" : "text-muted"
                }`}
              >
                {active ? <span className="absolute inset-x-5 top-0 h-[3px] rounded-b bg-marigold" aria-hidden /> : null}
                <Icon className="size-5" aria-hidden />
                {item.short}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function AccountMenu({ name, email }: { name: string; email: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function logOut() {
    await authClient.signOut();
    router.replace("/");
    router.refresh();
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-full py-1 pr-2 pl-1 text-chalk/80 transition-colors hover:bg-white/10"
      >
        <span className="grid size-8 place-items-center rounded-full bg-marigold text-[13px] font-bold text-ink">{initials(name)}</span>
        <ChevronDown className="size-4" aria-hidden />
        <span className="sr-only">Account menu</span>
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-40 mt-2 w-64 overflow-hidden rounded-xl border border-mist bg-white text-ink shadow-[0_18px_40px_-20px_rgba(20,24,66,0.45)]"
        >
          <div className="border-b border-mist px-4 py-3">
            <p className="truncate font-semibold">{name}</p>
            <p className="truncate text-sm text-muted">{email}</p>
          </div>
          <Link
            role="menuitem"
            href="/dashboard/settings"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold hover:bg-chalk"
          >
            <Settings className="size-4" aria-hidden />
            Settings
          </Link>
          <button role="menuitem" type="button" onClick={logOut} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-semibold hover:bg-chalk">
            <LogOut className="size-4" aria-hidden />
            Log out
          </button>
        </div>
      ) : null}
    </div>
  );
}
