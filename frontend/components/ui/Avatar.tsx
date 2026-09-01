const PALETTES = [
  "from-indigo to-violet",
  "from-cyan to-indigo",
  "from-violet to-coral",
  "from-emerald to-cyan",
  "from-coral to-violet",
  "from-indigo to-cyan",
];

function hashString(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function Avatar({
  name,
  size = "md",
  ring = false,
}: {
  name: string;
  size?: "sm" | "md" | "lg";
  ring?: boolean;
}) {
  const palette = PALETTES[hashString(name) % PALETTES.length];
  const sizeClass =
    size === "sm" ? "h-8 w-8 text-xs" : size === "lg" ? "h-14 w-14 text-lg" : "h-11 w-11 text-sm";
  return (
    <span
      className={
        `avatar bg-gradient-to-br ${palette} ${sizeClass} ` +
        (ring ? "ring-2 ring-bg ring-offset-2 ring-offset-bg" : "")
      }
    >
      {initials(name)}
    </span>
  );
}
