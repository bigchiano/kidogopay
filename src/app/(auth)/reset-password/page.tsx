import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/auth/forms";
import { Alert, ButtonLink } from "@/components/ui";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;
  return (
    <>
      <h1 className="font-wide text-[2rem] leading-tight font-bold tracking-[-0.03em]">Choose a new password</h1>
      <div className="mt-8 space-y-5">
        {!token || error ? (
          <>
            <Alert>This reset link has expired or was already used.</Alert>
            <ButtonLink href="/forgot-password" variant="secondary">
              Send a new link
            </ButtonLink>
          </>
        ) : (
          <ResetPasswordForm token={token} />
        )}
      </div>
    </>
  );
}
