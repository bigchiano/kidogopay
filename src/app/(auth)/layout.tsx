import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { ProverbPanel } from "@/components/auth/proverb-panel";
import { getSession } from "@/lib/session";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  if (await getSession()) redirect("/dashboard");
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,0.92fr)]">
      <div className="flex flex-col px-5 py-6 sm:px-10">
        <Link href="/" className="self-start" aria-label="KidogoPay home">
          <Logo />
        </Link>
        <div className="flex flex-1 items-center py-12">
          <div className="mx-auto w-full max-w-[400px]">{children}</div>
        </div>
      </div>
      <ProverbPanel />
    </div>
  );
}
