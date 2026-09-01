import Link from "next/link";

export default function AuthEntryPage() {
  return (
    <main className="relative flex flex-1 items-center justify-center px-6 py-16">
      <div className="glow-orb h-96 w-96 bg-indigo/20" style={{ top: "-4rem", left: "50%", transform: "translateX(-50%)" }} />
      <div className="relative z-10 w-full max-w-lg">
        <p className="eyebrow text-center text-cyan">Before you take a seat</p>
        <h1 className="mt-2 text-center font-display text-4xl font-extrabold tracking-tight text-text">
          Who&apos;s signing in?
        </h1>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Link
            href="/auth/student/login"
            className="card card-hover group px-6 py-8 text-center"
          >
            <span className="badge badge-indigo">Aspirant</span>
            <span className="mt-3 block font-display text-2xl font-bold text-text">
              I&apos;m a Scholar
            </span>
            <span className="mt-1.5 block text-sm text-text-dim">
              Find your squad and study together.
            </span>
          </Link>

          <Link
            href="/auth/mentor/login"
            className="card card-hover group px-6 py-8 text-center"
          >
            <span className="badge badge-emerald">Guide</span>
            <span className="mt-3 block font-display text-2xl font-bold text-text">
              I&apos;m a Mentor
            </span>
            <span className="mt-1.5 block text-sm text-text-dim">
              Guide a squad through their prep.
            </span>
          </Link>
        </div>

        <p className="mt-8 text-center text-sm text-text-faint">
          New here? Choose one above — you can sign up from the login screen.
        </p>
      </div>
    </main>
  );
}
