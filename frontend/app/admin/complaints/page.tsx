"use client";

import { useCallback, useEffect, useState } from "react";
import { FormError } from "@/components/auth/DossierCard";
import { UiIcon } from "@/components/layout/DockIcons";
import { adminListComplaints, getAdminSecret } from "@/lib/api";
import type { AdminComplaint } from "@/lib/types";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

export default function AdminComplaintsPage() {
  const secret = getAdminSecret();
  const [complaints, setComplaints] = useState<AdminComplaint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!secret) return;
    setLoading(true);
    setError(null);

    try {
      setComplaints(await adminListComplaints(secret));
    } catch {
      setError("Couldn't load complaints. Your admin secret may be invalid.");
    } finally {
      setLoading(false);
    }
  }, [secret]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch, setState only after the request resolves
    load();
  }, [load]);

  return (
    <main className="flex-1 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <p className="eyebrow text-cyan">Admin</p>
        <h1 className="mt-1 font-display text-4xl font-extrabold tracking-tight text-text">
          Student Complaints
        </h1>
        <p className="mt-3 text-text-dim">
          Review complaints submitted by students from the app&apos;s More menu.
        </p>

        <div className="mt-8">
          <FormError message={error} />
        </div>

        {loading ? (
          <div className="mt-8 flex flex-col gap-3">
            <div className="skeleton h-32 w-full" />
            <div className="skeleton h-32 w-full" />
          </div>
        ) : complaints.length === 0 ? (
          <div className="card mt-8 flex flex-col items-center gap-2 px-6 py-12 text-center">
            <UiIcon name="inbox" className="h-7 w-7 text-text-faint" />
            <p className="text-sm text-text-dim">No complaints have been submitted.</p>
          </div>
        ) : (
          <div className="mt-6 flex flex-col gap-3">
            {complaints.map((complaint) => (
              <article key={complaint.id} className="card px-5 py-5 sm:px-6">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                  <div>
                    <h2 className="font-display text-lg font-bold text-text">
                      {complaint.student_name}
                    </h2>
                    <p className="text-xs text-text-faint">
                      {complaint.student_email || complaint.student_phone || "No contact information"}
                    </p>
                  </div>
                  <time className="text-xs text-text-faint" dateTime={complaint.created_at}>
                    {formatDate(complaint.created_at)}
                  </time>
                </div>
                <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-text-dim">
                  {complaint.complaint_text}
                </p>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
