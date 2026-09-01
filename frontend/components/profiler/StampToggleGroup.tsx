export function StampToggleGroup<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (value: T) => void;
  ariaLabel: string;
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(opt.value)}
            className={
              "min-w-10 min-h-9 rounded-full border px-3 py-1.5 font-sans text-sm font-semibold transition-all " +
              (selected
                ? "border-transparent bg-gradient-to-r from-indigo to-violet text-white shadow-[0_6px_16px_-6px_rgba(99,102,241,0.7)]"
                : "border-border bg-surface-2 text-text-dim hover:border-indigo/50 hover:text-text")
            }
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
