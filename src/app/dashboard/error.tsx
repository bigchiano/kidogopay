"use client";

import { Button } from "@/components/ui";

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="max-w-xl py-10">
      <h1 className="font-wide text-3xl font-bold tracking-[-0.03em]">This page didn&apos;t load</h1>
      <p className="mt-3 text-muted">
        Something failed on our side{error.digest ? ` (reference ${error.digest})` : ""}. Try again, and contact support if it
        keeps happening.
      </p>
      <Button className="mt-6" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
