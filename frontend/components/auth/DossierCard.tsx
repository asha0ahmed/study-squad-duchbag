import { ButtonHTMLAttributes } from "react";

export function DossierCard({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative mx-auto w-full max-w-md">
      <div
        className="glow-orb h-56 w-56 bg-indigo/30"
        style={{ top: "-3rem", left: "-3rem" }}
      />
      <div
        className="glow-orb h-56 w-56 bg-cyan/20"
        style={{ bottom: "-3rem", right: "-3rem" }}
      />
      <div className="card relative z-10 overflow-hidden">
        <div className="border-b border-border-soft px-7 pb-6 pt-7">
          <p className="eyebrow text-cyan">{eyebrow}</p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-text">
            {title}
          </h1>
        </div>
        <div className="px-7 py-7">{children}</div>
      </div>
    </div>
  );
}

export function SubmitButton({
  children,
  loading,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <button
      type="submit"
      className="btn btn-primary btn-block min-h-[48px]"
      disabled={loading || rest.disabled}
      {...rest}
    >
      {loading ? "Working…" : children}
    </button>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="rounded-xl border border-coral/40 bg-coral/10 px-3.5 py-2.5 text-sm text-coral">
      {message}
    </div>
  );
}
