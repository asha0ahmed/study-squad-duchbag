export function StatusBadge({
  label,
  tone,
}: {
  label: string;
  tone: "confirmed" | "pending" | "locked" | "neutral";
}) {
  const toneClass =
    tone === "confirmed"
      ? "badge-emerald"
      : tone === "locked"
        ? "badge-indigo"
        : tone === "pending"
          ? "badge-cyan"
          : "badge-neutral";

  const dotClass =
    tone === "confirmed"
      ? "bg-emerald"
      : tone === "locked"
        ? "bg-indigo"
        : tone === "pending"
          ? "bg-cyan animate-pulse-dot"
          : "bg-text-faint";

  return (
    <span className={"badge " + toneClass}>
      <span className={"h-1.5 w-1.5 rounded-full " + dotClass} />
      {label}
    </span>
  );
}
