"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";
import { authErrorMessage } from "@/lib/auth-errors";
import { requestVerification } from "@/lib/actions/account";
import { Alert, Button, Field, inputClasses } from "@/components/ui";

export function NameForm({ initialName }: { initialName: string }) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [pending, setPending] = useState(false);
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    const { error } = await authClient.updateUser({ name: name.trim() });
    setPending(false);
    setMsg(error ? { tone: "error", text: authErrorMessage(error) } : { tone: "success", text: "Name saved." });
    if (!error) router.refresh();
  }
  return (
    <form onSubmit={save} className="space-y-3">
      <Field label="Name" htmlFor="name">
        <input id="name" required value={name} onChange={(e) => setName(e.target.value)} className={inputClasses} />
      </Field>
      <Button type="submit" size="sm" variant="secondary" disabled={pending || name.trim() === initialName}>
        {pending ? "Saving…" : "Save name"}
      </Button>
      {msg ? <Alert tone={msg.tone}>{msg.text}</Alert> : null}
    </form>
  );
}

export function ResendVerification({ email }: { email: string }) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <Button
        size="sm"
        variant="secondary"
        disabled={state === "sending" || state === "sent"}
        onClick={async () => {
          setState("sending");
          const { error } = await authClient.sendVerificationEmail({ email, callbackURL: "/dashboard/settings" });
          setState(error ? "error" : "sent");
        }}
      >
        {state === "sent" ? "Email sent" : state === "sending" ? "Sending…" : "Resend confirmation email"}
      </Button>
      {state === "error" ? <span className="text-sm text-ember">That didn&apos;t send. Try again in a minute.</span> : null}
    </span>
  );
}

export function RequestVerificationButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="space-y-3">
      <Button
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await requestVerification();
            if (!res.ok) setError(res.error);
            else router.refresh();
          })
        }
      >
        {pending ? "Sending request…" : "Request verification"}
      </Button>
      {error ? <Alert>{error}</Alert> : null}
    </div>
  );
}

export function LogOutButton() {
  const router = useRouter();
  return (
    <Button
      variant="secondary"
      onClick={async () => {
        await authClient.signOut();
        router.replace("/");
        router.refresh();
      }}
    >
      Log out
    </Button>
  );
}
