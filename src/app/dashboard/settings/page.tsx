import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { account } from "@/lib/db/schema";
import { limitSummary } from "@/lib/limits";
import { formatUsd } from "@/lib/format";
import { Chip, PageHeader, Panel } from "@/components/ui";
import { LimitMeter } from "@/components/dashboard/shared";
import { LogOutButton, NameForm, RequestVerificationButton, ResendVerification } from "@/components/dashboard/settings-client";

export const metadata: Metadata = { title: "Settings" };

const KYB_COPY = {
  not_started: { label: "Not verified", body: "Verification takes a few documents, like your certificate of incorporation and a director's ID." },
  pending: { label: "In review", body: "We'll email you about the documents we need. You can keep going up to your limit meanwhile." },
  approved: { label: "Verified", body: "There's no volume limit on your account." },
  rejected: { label: "Not approved", body: "Reply to our email for details, or request verification again." },
} as const;

export default async function SettingsPage() {
  const me = await requireUser();
  const [limit, logins] = await Promise.all([
    limitSummary(me.id),
    db.select({ providerId: account.providerId }).from(account).where(eq(account.userId, me.id)),
  ]);
  const hasPassword = logins.some((l) => l.providerId === "credential");
  const hasGoogle = logins.some((l) => l.providerId === "google");
  const kyb = KYB_COPY[limit.kyb];

  return (
    <>
      <PageHeader title="Settings" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel className="p-6 sm:p-7">
          <h2 className="text-lg font-bold">Business verification</h2>
          <p className="mt-1 flex items-center gap-2 text-sm">
            <Chip className={limit.kyb === "approved" ? "bg-leaf-soft text-leaf" : ""}>{kyb.label}</Chip>
          </p>
          <div className="mt-5">
            <LimitMeter limit={limit} />
          </div>
          <p className="mt-4 text-[15px] text-muted">
            {limit.kyb === "approved"
              ? kyb.body
              : `You can move up to ${formatUsd(limit.threshold)} in total before you need to verify your business. ${kyb.body}`}
          </p>
          {limit.kyb === "not_started" || limit.kyb === "rejected" ? (
            <div className="mt-5">
              <RequestVerificationButton />
            </div>
          ) : null}
        </Panel>

        <Panel className="space-y-6 p-6 sm:p-7">
          <h2 className="text-lg font-bold">Profile</h2>
          <NameForm initialName={me.name} />
          <div>
            <p className="text-sm font-semibold">Email</p>
            <p className="mt-1 flex flex-wrap items-center gap-2">
              {me.email}
              {me.emailVerified ? <Chip className="bg-leaf-soft text-leaf">Confirmed</Chip> : <Chip>Not confirmed</Chip>}
            </p>
            {!me.emailVerified ? (
              <div className="mt-3">
                <ResendVerification email={me.email} />
              </div>
            ) : null}
          </div>
        </Panel>

        <Panel className="p-6 sm:p-7">
          <h2 className="text-lg font-bold">Signing in</h2>
          <dl className="mt-4 divide-y divide-mist border-y border-mist">
            <div className="flex justify-between py-3">
              <dt>Password</dt>
              <dd className="text-muted">{hasPassword ? "Set" : "Not set"}</dd>
            </div>
            <div className="flex justify-between py-3">
              <dt>Google</dt>
              <dd className="text-muted">{hasGoogle ? "Connected" : "Not connected"}</dd>
            </div>
          </dl>
          <div className="mt-5">
            <LogOutButton />
          </div>
        </Panel>
      </div>
    </>
  );
}
