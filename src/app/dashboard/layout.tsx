import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { AccountMenu, DesktopNav, MobileTabs } from "@/components/dashboard/nav";
import { getSession } from "@/lib/session";
import { paymentsMode } from "@/lib/payments";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const demo = paymentsMode() === "mock";
  return (
    <div className="min-h-dvh">
      {demo ? (
        <p className="bg-marigold px-5 py-1.5 text-center text-[13px] font-semibold text-ink">
          Demo mode. Rates, addresses and payouts are simulated, and no real money moves.
        </p>
      ) : null}
      <header className="on-dark sticky top-0 z-30 bg-adire text-chalk">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-5">
          <Link href="/dashboard" aria-label="KidogoPay overview" className="shrink-0">
            <Logo onDark size={28} />
          </Link>
          <DesktopNav />
          <div className="ml-auto">
            <AccountMenu name={session.user.name} email={session.user.email} />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 pt-8 pb-28 sm:pt-10 md:pb-16">{children}</main>
      <MobileTabs />
    </div>
  );
}
