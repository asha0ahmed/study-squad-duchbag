"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { ApiError, loginStudent } from "@/lib/api";
import { DossierCard, FormError, SubmitButton } from "@/components/auth/DossierCard";
import { TextField } from "@/components/auth/FormFields";

function StudentLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteCode = searchParams.get("inviteCode");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await loginStudent(identifier, password);
      router.push(inviteCode ? `/invite/${inviteCode}` : "/desk");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't sign you in. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex flex-1 items-center justify-center px-6 py-16">
      <DossierCard eyebrow="Scholar sign-in" title="Welcome back">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <TextField
            label="Email or Phone Number"
            htmlFor="identifier"
            type="text"
            autoComplete="username"
            required
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
          />
          <TextField
            label="Password"
            htmlFor="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <FormError message={error} />
          <SubmitButton loading={loading}>Sign In</SubmitButton>
        </form>

        <p className="mt-6 text-center text-sm text-text-dim">
          First time here?{" "}
          <Link
            href={inviteCode ? `/auth/student/signup?inviteCode=${inviteCode}` : "/auth/student/signup"}
            className="font-semibold text-cyan underline underline-offset-2"
          >
            Start your dossier
          </Link>
        </p>
        <p className="mt-2 text-center text-sm text-text-faint">
          <Link href="/auth" className="underline">
            Not a Scholar? Switch entry
          </Link>
        </p>
      </DossierCard>
    </main>
  );
}

export default function StudentLoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex flex-1 items-center justify-center">
          <p className="text-sm text-text-dim">Loading…</p>
        </main>
      }
    >
      <StudentLoginForm />
    </Suspense>
  );
}
