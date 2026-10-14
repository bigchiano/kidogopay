import type { Metadata } from "next";
import Link from "next/link";
import { GoogleButton, SignupForm } from "@/components/auth/forms";
import { googleEnabled } from "@/lib/auth";

export const metadata: Metadata = { title: "Create account" };

export default function SignupPage() {
  return (
    <>
      <h1 className="font-wide text-[2rem] leading-tight font-bold tracking-[-0.03em]">Create your account</h1>
      <p className="mt-2 text-muted">
        Already have one?{" "}
        <Link href="/login" className="font-semibold text-ink underline underline-offset-4">
          Log in
        </Link>
      </p>
      <div className="mt-8 space-y-5">
        {googleEnabled ? <GoogleButton next="/dashboard" /> : null}
        <SignupForm />
      </div>
    </>
  );
}
