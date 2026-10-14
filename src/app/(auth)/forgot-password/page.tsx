import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "@/components/auth/forms";

export const metadata: Metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="font-wide text-[2rem] leading-tight font-bold tracking-[-0.03em]">Reset your password</h1>
      <p className="mt-2 text-muted">We&apos;ll email you a link to choose a new one.</p>
      <div className="mt-8 space-y-6">
        <ForgotPasswordForm />
        <p className="text-sm">
          <Link href="/login" className="font-semibold underline underline-offset-4">
            Back to log in
          </Link>
        </p>
      </div>
    </>
  );
}
