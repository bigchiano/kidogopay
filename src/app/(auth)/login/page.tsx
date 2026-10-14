import type { Metadata } from "next";
import Link from "next/link";
import { GoogleButton, LoginForm } from "@/components/auth/forms";
import { googleEnabled } from "@/lib/auth";
import { safeNextPath } from "@/lib/validation";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; reset?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const next = safeNextPath(sp.next);
  return (
    <>
      <h1 className="font-wide text-[2rem] leading-tight font-bold tracking-[-0.03em]">Log in</h1>
      <p className="mt-2 text-muted">
        New to KidogoPay?{" "}
        <Link href="/signup" className="font-semibold text-ink underline underline-offset-4">
          Create an account
        </Link>
      </p>
      <div className="mt-8 space-y-5">
        {googleEnabled ? <GoogleButton next={next} /> : null}
        <LoginForm
          next={next}
          notice={sp.reset ? "Your password is updated. Log in with the new one." : undefined}
          initialError={sp.error ? "Google sign-in didn't finish. Try again, or use your email." : undefined}
        />
      </div>
    </>
  );
}
