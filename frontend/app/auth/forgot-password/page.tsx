"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { ApiError, requestPasswordReset } from "@/lib/api";
import { DossierCard, FormError, SubmitButton } from "@/components/auth/DossierCard";
import { TextField } from "@/components/auth/FormFields";
import { LandingBackground } from "@/components/layout/LandingBackground";

function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const role = searchParams.get("role") === "mentor" ? "mentor" : "student";
  const [identifier, setIdentifier] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const loginHref = role === "mentor" ? "/auth/mentor/login" : "/auth/student/login";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await requestPasswordReset(identifier, role);
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't send the link. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative z-10 flex flex-1 items-center justify-center px-6 py-16">
      <LandingBackground />
      <DossierCard eyebrow={role === "mentor" ? "Mentor account" : "Student account"} title="Reset your password">
        {sent ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-text">
              If an account matches, we&apos;ve emailed it a reset link. It can take a minute to arrive —
              check your spam folder too. The link works for about an hour.
            </p>
            <Link href={loginHref} className="btn btn-primary btn-block min-h-[48px]">
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <p className="text-sm text-text-dim">
              {role === "mentor"
                ? "Enter the email you registered with and we'll send you a link to choose a new password."
                : "Enter your email or phone number and we'll email you a link to choose a new password."}
            </p>
            <TextField
              label={role === "mentor" ? "Email" : "Email or Phone Number"}
              htmlFor="identifier"
              type={role === "mentor" ? "email" : "text"}
              autoComplete="username"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
            />
            <FormError message={error} />
            <SubmitButton loading={loading}>Send reset link</SubmitButton>
            {role === "student" && (
              <p className="text-xs text-text-faint">
                Signed up with only a phone number? We can&apos;t email you — message Study Squad support
                and we&apos;ll send you a reset link.
              </p>
            )}
            <p className="text-center text-sm text-text-dim">
              <Link href={loginHref} className="underline underline-offset-2">
                Back to sign in
              </Link>
            </p>
          </form>
        )}
      </DossierCard>
    </main>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="flex flex-1 items-center justify-center">
          <p className="text-sm text-text-dim">Loading…</p>
        </main>
      }
    >
      <ForgotPasswordForm />
    </Suspense>
  );
}
