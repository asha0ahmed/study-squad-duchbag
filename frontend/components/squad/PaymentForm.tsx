"use client";

import { useEffect, useState } from "react";
import { FormError, SubmitButton } from "@/components/auth/DossierCard";
import { TextField } from "@/components/auth/FormFields";
import type { PaymentMethod, PaymentPlan } from "@/lib/types";

const PLANS: { value: PaymentPlan; label: string; price: string; discountedPrice: string; note: string }[] = [
  { value: "1_month", label: "1 Month", price: "৳149", discountedPrice: "৳99", note: "Try it out" },
  { value: "6_month", label: "6 Months", price: "৳799", discountedPrice: "৳499", note: "Best value" },
];

// Frontend-only promotional configuration. Replace the five placeholder codes as needed.
const VALID_PROMO_CODES = ["ANX20", "38Kh", "PLACEHOLDER1", "PLACEHOLDER2", "PLACEHOLDER3", "PLACEHOLDER4", "PLACEHOLDER5"];
const PROMO_STORAGE_KEY = "study-squad-applied-promo-code";

const METHODS: { value: PaymentMethod; label: string; number: string }[] = [
  { value: "nagad", label: "Nagad", number: "+8801937553593" },
  { value: "bkash", label: "bKash", number: "+8801724536385" },
];

export interface PaymentFormInput {
  plan: PaymentPlan;
  method: PaymentMethod;
  sender_phone: string;
  trx_id: string;
}

export function PaymentForm({
  onSubmit,
  submitting,
  error,
  setError,
  heading = "Choose your plan",
  subheading = "A small fee covers your mentor's time. Pick a plan, send the payment, and tell us the details below.",
  submitLabel = "Proceed",
}: {
  onSubmit: (input: PaymentFormInput) => void | Promise<void>;
  submitting: boolean;
  error: string | null;
  setError: (message: string | null) => void;
  heading?: string;
  subheading?: string;
  submitLabel?: string;
}) {
  const [plan, setPlan] = useState<PaymentPlan | null>(null);
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [senderPhone, setSenderPhone] = useState("");
  const [trxId, setTrxId] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [appliedPromoCode, setAppliedPromoCode] = useState<string | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);

  useEffect(() => {
    // Promo codes are no longer remembered: the student enters one fresh on
    // every visit to this form. Remove any code saved by the old behaviour.
    window.localStorage.removeItem(PROMO_STORAGE_KEY);
  }, []);

  function handleApplyPromo() {
    const normalizedCode = promoCode.trim();
    const validCode = VALID_PROMO_CODES.find((code) => code.toLowerCase() === normalizedCode.toLowerCase());

    if (!validCode) {
      setPromoError("Invalid promo code");
      return;
    }

    setAppliedPromoCode(validCode);
    setPromoCode(validCode);
    setPromoError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!plan || !method || !senderPhone.trim() || !trxId.trim()) {
      setError("Choose a plan, a payment method, and fill in both fields below.");
      return;
    }

    onSubmit({ plan, method, sender_phone: senderPhone.trim(), trx_id: trxId.trim() });
  }

  return (
    <div>
      <p className="eyebrow text-cyan">Mentor Fee</p>
      <h1 className="mt-1 font-display text-4xl font-extrabold tracking-tight text-text">{heading}</h1>
      <p className="mt-3 text-text-dim">{subheading}</p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-8">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {PLANS.map((p) => (
            <button
              type="button"
              key={p.value}
              onClick={() => setPlan(p.value)}
              className={
                "rounded-2xl border px-5 py-5 text-left transition-all " +
                (plan === p.value
                  ? "border-transparent bg-gradient-to-br from-indigo to-violet text-white shadow-[0_10px_30px_-10px_rgba(99,102,241,0.7)]"
                  : "border-border bg-surface-2 text-text hover:border-indigo/50")
              }
            >
              <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] opacity-70">
                {p.note}
              </span>
              <span className="mt-1 block font-display text-2xl font-bold">{p.label}</span>
              <span className="mt-1 block text-lg">
                {appliedPromoCode ? (
                  <>
                    <span className="mr-2 text-base text-white/60 line-through">{p.price}</span>
                    <span className="font-bold">{p.discountedPrice}</span>
                  </>
                ) : (
                  p.price
                )}
              </span>
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-border bg-surface-2/70 p-4 sm:p-5">
          <label htmlFor="promo_code" className="field-label">
            Promo Code
          </label>
          <div className="relative mt-2">
            <input
              id="promo_code"
              type="text"
              value={promoCode}
              onChange={(e) => {
                setPromoCode(e.target.value);
                if (promoError) setPromoError(null);
              }}
              placeholder="Enter promo code"
              aria-invalid={promoError ? "true" : "false"}
              aria-describedby={promoError ? "promo-code-error" : undefined}
              className="input pr-24"
            />
            <button
              type="button"
              onClick={handleApplyPromo}
              className="btn btn-primary absolute right-1 top-1 bottom-1 px-4 py-2 text-xs sm:px-5 sm:text-sm"
            >
              Apply
            </button>
          </div>
          {promoError && (
            <p id="promo-code-error" className="mt-2 text-sm text-coral">
              {promoError}
            </p>
          )}
        </div>

        <div>
          <span className="field-label">Send Money To</span>
          <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {METHODS.map((m) => (
              <button
                type="button"
                key={m.value}
                onClick={() => setMethod(m.value)}
                className={
                  "rounded-2xl border px-4 py-4 text-left transition-all " +
                  (method === m.value
                    ? "border-transparent bg-gradient-to-br from-emerald to-cyan text-[#06281c]"
                    : "border-border bg-surface-2 text-text hover:border-emerald/50")
                }
              >
                <span className="block font-display text-lg font-bold">{m.label}</span>
                <span className="mt-0.5 block text-sm">{m.number}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <TextField
            label="Phone number you sent from"
            htmlFor="sender_phone"
            required
            placeholder="01XXXXXXXXX"
            value={senderPhone}
            onChange={(e) => setSenderPhone(e.target.value)}
          />
          <TextField
            label="Transaction ID (Trx ID)"
            htmlFor="trx_id"
            required
            value={trxId}
            onChange={(e) => setTrxId(e.target.value)}
          />
        </div>

        <FormError message={error} />
        <SubmitButton loading={submitting}>{submitLabel}</SubmitButton>
      </form>
    </div>
  );
}
