"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { ApiError, resetPassword, type SessionRole } from "@/lib/api";
import { DossierCard, FormError, SubmitButton } from "@/components/auth/DossierCard";
import { TextField } from "@/components/auth/FormFields";
import { LandingBackground } from "@/components/layout/LandingBackground";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [doneRole, setDoneRole] = useState<SessionRole | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("The two passwords don't match.");
      return;
    }
    setLoading(true);
    try {
      const result = await resetPassword(token, password);
      setDoneRole(result.role);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't reset your password. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative z-10 flex flex-1 items-center justify-center px-6 py-16">
      <LandingBackground />
      <DossierCard eyebrow="Account recovery" title="Choose a new password">
        {doneRole ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-text">Your password has been updated. You can sign in with it now.</p>
            <Link
              href={doneRole === "mentor" ? "/auth/mentor/login" : "/auth/student/login"}
              className="btn btn-primary btn-block min-h-[48px]"
            >
              Go to sign in
            </Link>
          </div>
        ) : !token ? (
          <div className="flex flex-col gap-4">
            <FormError message="This reset link is incomplete. Please request a new one." />
            <Link href="/auth" className="text-center text-sm underline underline-offset-2">
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <TextField
              label="New password"
              htmlFor="password"
              type="password"
              autoComplete="new-password"
              hint="At least 8 characters."
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <TextField
              label="Confirm new password"
              htmlFor="confirm"
              type="password"
              autoComplete="new-password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
            <FormError message={error} />
            <SubmitButton loading={loading}>Update password</SubmitButton>
            <p className="text-center text-sm text-text-dim">
              Link expired?{" "}
              <Link href="/auth/forgot-password" className="underline underline-offset-2">
                Request a new one
              </Link>
            </p>
          </form>
        )}
      </DossierCard>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="flex flex-1 items-center justify-center">
          <p className="text-sm text-text-dim">Loading…</p>
        </main>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
