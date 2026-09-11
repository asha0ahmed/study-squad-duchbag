"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { ApiError, loginStudent, signupStudent } from "@/lib/api";
import { DossierCard, FormError, SubmitButton } from "@/components/auth/DossierCard";
import { SelectField, TextField } from "@/components/auth/FormFields";

// Fixed option sets for fields the backend stores as free-text strings but
// matches on exact equality during matching (see backend/utils/matching.js).
// Using a select instead of free text avoids two students typing "1st Year"
// vs "1st year" and never being matchable. Easy to edit if your cohort's
// real categories differ.
const YEAR_OPTIONS = [
  { value: "HSC 1st Year", label: "HSC 1st Year" },
  { value: "HSC 2nd Year", label: "HSC 2nd Year" },
  { value: "HSC Passout / Admission Candidate", label: "HSC Passout / Admission Candidate" },
];

const ASPIRANT_TYPE_OPTIONS = [
  { value: "Engineering Admission", label: "Engineering Admission" },
  { value: "Medical Admission", label: "Medical Admission" },
  { value: "University Admission (General)", label: "University Admission (General)" },
  { value: "HSC Board Exam", label: "HSC Board Exam" },
];

// Only Science and Arts have a subject list defined in schema.sql today,
// so signup is scoped to those two until Commerce subjects exist.
const ACADEMIC_GROUP_OPTIONS = [
  { value: "Science", label: "Science" },
  { value: "Arts", label: "Arts" },
];

function StudentSignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteCode = searchParams.get("inviteCode") ?? undefined;
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    institution: "",
    year: "",
    academic_group: "",
    aspirant_type: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const email = form.email.trim();
    const phone = form.phone.trim();

    if (!email && !phone) {
      setError("Provide an email address or a phone number.");
      return;
    }

    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      await signupStudent({
        name: form.name,
        email: email || undefined,
        phone: phone || undefined,
        password: form.password,
        institution: form.institution,
        year: form.year,
        academic_group: form.academic_group as "Science" | "Arts",
        aspirant_type: form.aspirant_type,
        inviteCode,
      });
      // Signup doesn't return a session token — only /login does — so we
      // log in right after with the same credentials for a one-step flow.
      // Use whichever identifier was actually provided (email may be blank
      // if the student signed up with just a phone number).
      await loginStudent(email || phone, form.password);
      // If signup came from an invite link and auto-join at signup time
      // didn't apply (e.g. slots filled in the meantime), send them to
      // accept it explicitly; otherwise straight to their desk.
      router.push(inviteCode ? `/invite/${inviteCode}` : "/desk");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't create your account. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex flex-1 items-center justify-center px-6 py-16">
      <DossierCard eyebrow="Scholar admission form" title="Open your dossier">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <TextField
            label="Full Name"
            htmlFor="name"
            required
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
          />
          <TextField
            label="Email"
            htmlFor="email"
            type="email"
            autoComplete="email"
            hint="Provide an email or a phone number below (at least one is required)."
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
          />
          <TextField
            label="Phone Number"
            htmlFor="phone"
            type="tel"
            autoComplete="tel"
            hint="Required if you didn't provide an email above."
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
          />
          <TextField
            label="Password"
            htmlFor="password"
            type="password"
            autoComplete="new-password"
            required
            hint="At least 8 characters."
            value={form.password}
            onChange={(e) => update("password", e.target.value)}
          />
          <TextField
            label="Institution"
            htmlFor="institution"
            required
            value={form.institution}
            onChange={(e) => update("institution", e.target.value)}
          />
          <SelectField
            label="Year"
            htmlFor="year"
            required
            placeholder="Select your year"
            options={YEAR_OPTIONS}
            value={form.year}
            onChange={(e) => update("year", e.target.value)}
          />
          <SelectField
            label="Academic Group"
            htmlFor="academic_group"
            required
            placeholder="Select your group"
            options={ACADEMIC_GROUP_OPTIONS}
            value={form.academic_group}
            onChange={(e) => update("academic_group", e.target.value)}
          />
          <SelectField
            label="What are you preparing for?"
            htmlFor="aspirant_type"
            required
            placeholder="Select your goal"
            options={ASPIRANT_TYPE_OPTIONS}
            value={form.aspirant_type}
            onChange={(e) => update("aspirant_type", e.target.value)}
          />

          <FormError message={error} />
          <SubmitButton loading={loading}>Open My Dossier</SubmitButton>
        </form>

        <p className="mt-6 text-center text-sm text-text-dim">
          Already have a dossier?{" "}
          <Link href="/auth/student/login" className="font-semibold text-cyan underline underline-offset-2">
            Sign in
          </Link>
        </p>
      </DossierCard>
    </main>
  );
}

export default function StudentSignupPage() {
  return (
    <Suspense
      fallback={
        <main className="flex flex-1 items-center justify-center">
          <p className="text-sm text-text-dim">Loading…</p>
        </main>
      }
    >
      <StudentSignupForm />
    </Suspense>
  );
}
