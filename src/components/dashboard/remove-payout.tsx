"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { archivePayoutAccount } from "@/lib/actions/payout-accounts";
import { Button } from "@/components/ui";

export function RemovePayoutButton({ id, locked }: { id: string; locked: boolean }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (locked) {
    return <p className="text-sm text-muted">Move its wallets first to remove it.</p>;
  }
  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      {confirming ? (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="danger"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await archivePayoutAccount(id);
                if (!res.ok) setError(res.error);
                else router.refresh();
              })
            }
          >
            Remove account
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
            Cancel
          </Button>
        </div>
      ) : (
        <Button size="sm" variant="ghost" className="text-ember hover:bg-ember-soft" onClick={() => setConfirming(true)}>
          Remove
        </Button>
      )}
      {error ? <p className="text-sm text-ember">{error}</p> : null}
    </div>
  );
}
