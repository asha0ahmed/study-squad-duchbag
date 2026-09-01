"use client";

import { useState } from "react";
import { ApiError, switchSquad } from "@/lib/api";
import type { SquadSuggestion } from "@/lib/types";

export function BetterSquadBanner({
  studentId,
  suggestion,
  onSwitched,
}: {
  studentId: number;
  suggestion: SquadSuggestion;
  onSwitched: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  async function handleSwitch() {
    setLoading(true);
    setError(null);
    try {
      await switchSquad(studentId, suggestion.squadId);
      onSwitched();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't switch squads. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="animate-fade-in-up relative mt-6 overflow-hidden rounded-2xl border border-emerald/35 bg-emerald/[0.06] px-5 py-4">
      <div className="glow-orb h-32 w-32 bg-emerald/25" style={{ top: "-2rem", right: "-2rem" }} />
      <div className="relative z-10">
        <p className="eyebrow text-emerald">A better fit, maybe</p>
        <p className="mt-1.5 text-sm text-text">
          We found a squad that may suit your goals a little better — want to join it instead?
        </p>
        {error && <p className="mt-2 text-sm text-coral">{error}</p>}
        <div className="mt-3.5 flex items-center gap-4">
          <button onClick={handleSwitch} disabled={loading} className="btn btn-success !py-2 text-sm">
            {loading ? "Switching…" : "Switch Squads"}
          </button>
          <button onClick={() => setDismissed(true)} className="text-sm text-text-dim hover:text-text">
            No thanks
          </button>
        </div>
      </div>
    </div>
  );
}
