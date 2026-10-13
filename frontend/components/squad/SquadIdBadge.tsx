"use client";

import { useState } from "react";

/**
 * Shows the public Squad ID (random 2-3 digit number, not the internal
 * database id). Tap to copy so it can be pasted to the admin or the squad.
 */
export function SquadIdBadge({
  code,
  prefix = "Squad ID",
  className = "",
}: {
  code: number | null | undefined;
  prefix?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  if (code === null || code === undefined) return null;

  async function copy() {
    try {
      await navigator.clipboard.writeText(String(code));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      /* clipboard unavailable: the ID is still readable on screen */
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      title="Tap to copy"
      className={`font-semibold text-cyan ${className}`}
    >
      {copied ? "Copied" : `${prefix} ${code}`}
    </button>
  );
}
