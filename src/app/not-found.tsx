import { Logo } from "@/components/logo";
import { ButtonLink } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-xl px-5 py-20">
      <Logo />
      <h1 className="mt-12 font-wide text-4xl font-bold tracking-[-0.03em]">Page not found</h1>
      <p className="mt-3 text-muted">The link may be old, or the page has moved.</p>
      <div className="mt-8 flex gap-3">
        <ButtonLink href="/dashboard">Go to dashboard</ButtonLink>
        <ButtonLink href="/" variant="secondary">
          Home
        </ButtonLink>
      </div>
    </main>
  );
}
