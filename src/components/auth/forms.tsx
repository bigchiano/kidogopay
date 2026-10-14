"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";
import { authErrorMessage } from "@/lib/auth-errors";
import { Alert, Button, Field, inputClasses } from "@/components/ui";

export function GoogleButton({ next }: { next: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function go() {
    setPending(true);
    setError(null);
    const { error } = await authClient.signIn.social({
      provider: "google",
      callbackURL: next,
      errorCallbackURL: "/login?error=google",
    });
    if (error) {
      setError(authErrorMessage(error));
      setPending(false);
    }
  }
  return (
    <div className="space-y-5">
      <Button type="button" variant="secondary" className="w-full" disabled={pending} onClick={go}>
        {pending ? "Opening Google…" : "Continue with Google"}
      </Button>
      {error ? <Alert>{error}</Alert> : null}
      <div className="flex items-center gap-3 text-sm text-muted">
        <span className="h-px flex-1 bg-mist" />
        or with email
        <span className="h-px flex-1 bg-mist" />
      </div>
    </div>
  );
}

export function LoginForm({ next, notice, initialError }: { next: string; notice?: string; initialError?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const { error } = await authClient.signIn.email({ email, password });
    if (error) {
      setError(authErrorMessage(error));
      setPending(false);
      return;
    }
    router.replace(next);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {notice ? <Alert tone="success">{notice}</Alert> : null}
      <Field label="Email" htmlFor="email">
        <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClasses} />
      </Field>
      <Field label="Password" htmlFor="password">
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClasses}
        />
      </Field>
      <p className="text-right text-sm">
        <Link href="/forgot-password" className="font-semibold underline underline-offset-4 hover:text-adire">
          Forgot your password?
        </Link>
      </p>
      {error ? <Alert>{error}</Alert> : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Logging in…" : "Log in"}
      </Button>
    </form>
  );
}

export function SignupForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (password.length < 10) {
      setError("Use at least 10 characters for your password.");
      return;
    }
    setPending(true);
    setError(null);
    const { error } = await authClient.signUp.email({ name: name.trim(), email, password });
    if (error) {
      setError(authErrorMessage(error));
      setPending(false);
      return;
    }
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="Your name" htmlFor="name">
        <input id="name" autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} className={inputClasses} />
      </Field>
      <Field label="Email" htmlFor="email" hint="Payout receipts and security alerts go here.">
        <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClasses} />
      </Field>
      <Field label="Password" htmlFor="password" hint="At least 10 characters.">
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClasses}
        />
      </Field>
      {error ? <Alert>{error}</Alert> : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const { error } = await authClient.requestPasswordReset({ email, redirectTo: "/reset-password" });
    setPending(false);
    if (error) setError(authErrorMessage(error));
    else setSentTo(email);
  }

  if (sentTo) {
    return (
      <Alert tone="success">
        If there&apos;s an account for {sentTo}, a reset link is on its way. It works for one hour.
      </Alert>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="Email" htmlFor="email">
        <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClasses} />
      </Field>
      {error ? <Alert>{error}</Alert> : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Sending link…" : "Send reset link"}
      </Button>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (password.length < 10) return setError("Use at least 10 characters.");
    if (password !== confirm) return setError("The two passwords don't match.");
    setPending(true);
    setError(null);
    const { error } = await authClient.resetPassword({ newPassword: password, token });
    if (error) {
      setError(authErrorMessage(error));
      setPending(false);
      return;
    }
    router.replace("/login?reset=1");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="New password" htmlFor="password" hint="At least 10 characters.">
        <input id="password" type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} className={inputClasses} />
      </Field>
      <Field label="Type it again" htmlFor="confirm">
        <input id="confirm" type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputClasses} />
      </Field>
      {error ? <Alert>{error}</Alert> : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Saving…" : "Save new password"}
      </Button>
    </form>
  );
}
