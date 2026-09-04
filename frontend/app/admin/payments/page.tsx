"use client";

import { useCallback, useEffect, useState } from "react";
import {
  adminApprovePayment,
  adminListPayments,
  adminRejectPayment,
  getAdminSecret,
} from "@/lib/api";
import type { AdminPayment, PaymentStatus } from "@/lib/types";
import { FormError } from "@/components/auth/DossierCard";

type Filter = PaymentStatus | "all";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "all", label: "All" },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

export default function AdminPaymentsPage() {
  // AdminLayout has already confirmed a secret exists before this page
  // renders at all, so this is just reading it back for API calls --
  // not re-doing the auth check (that would duplicate app/admin/layout.tsx).
  const secret = getAdminSecret();
  const [filter, setFilter] = useState<Filter>("pending");
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!secret) return;
    setLoading(true);
    setError(null);
    try {
      const result = await adminListPayments(secret, filter === "all" ? undefined : filter);
      setPayments(result);
    } catch {
      setError("Couldn't load payments. Your admin secret may be invalid.");
    } finally {
      setLoading(false);
    }
  }, [secret, filter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch, setState only after the request resolves
    load();
  }, [load]);

  async function handleAction(paymentId: number, action: "approve" | "reject") {
    if (!secret) return;
    setActingId(paymentId);
    try {
      if (action === "approve") await adminApprovePayment(secret, paymentId);
      else await adminRejectPayment(secret, paymentId);
      await load();
    } catch {
      setError("That action failed. Try again.");
    } finally {
      setActingId(null);
    }
  }

  return (
    <main className="flex-1 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div>
          <p className="eyebrow text-cyan">Admin</p>
          <h1 className="mt-1 font-display text-4xl font-extrabold tracking-tight text-text">
            Payment Review
          </h1>
        </div>

        <div className="mt-8 flex flex-wrap gap-2 rounded-full border border-border bg-surface p-1">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={
                "rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.06em] transition-all " +
                (filter === f.value
                  ? "bg-gradient-to-r from-indigo to-violet text-white shadow-[0_6px_16px_-6px_rgba(99,102,241,0.7)]"
                  : "text-text-dim hover:text-text")
              }
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="mt-4">
          <FormError message={error} />
        </div>

        {loading ? (
          <div className="mt-8 flex flex-col gap-3">
            <div className="skeleton h-20 w-full" />
            <div className="skeleton h-20 w-full" />
          </div>
        ) : payments.length === 0 ? (
          <div className="card mt-8 flex flex-col items-center gap-2 px-6 py-12 text-center">
            <span className="text-2xl">📭</span>
            <p className="text-sm text-text-dim">No payments in this view.</p>
          </div>
        ) : (
          <div className="card mt-6 divide-y divide-border-soft overflow-hidden">
            {payments.map((p) => (
              <div key={p.id} className="flex flex-col gap-3 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <span className="font-display text-lg font-bold text-text">{p.student_name}</span>
                  <span className="ml-2 text-xs text-text-faint">{p.student_email}</span>
                  <div className="mt-1 text-sm text-text-dim">
                    {p.plan === "1_month" ? "1 Month" : "6 Months"} · ৳{p.amount} ·{" "}
                    {p.method === "nagad" ? "Nagad" : "bKash"}
                  </div>
                  <div className="mt-1 text-xs text-text-faint">
                    From {p.sender_phone} · Trx {p.trx_id} · {formatDate(p.created_at)}
                  </div>
                </div>
                {p.status === "pending" ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAction(p.id, "approve")}
                      disabled={actingId === p.id}
                      className="btn btn-success !py-2 text-sm"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleAction(p.id, "reject")}
                      disabled={actingId === p.id}
                      className="btn btn-danger !py-2 text-sm"
                    >
                      Reject
                    </button>
                  </div>
                ) : (
                  <span className={"badge " + (p.status === "approved" ? "badge-emerald" : "badge-coral")}>
                    {p.status}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
