import Link from "next/link";
import { LandingBackground } from "@/components/layout/LandingBackground";

export default function AuthEntryPage() {
  return (
    <main className="relative flex flex-1 items-center justify-center px-6 py-16">
      <LandingBackground />
      <div className="glow-orb h-96 w-96 bg-indigo/20" style={{ top: "-4rem", left: "50%", transform: "translateX(-50%)" }} />
      <div className="relative z-10 w-full max-w-sm">
        <p className="eyebrow text-center text-cyan">Before you take a seat</p>
        <h1 className="mt-2 text-center font-display text-4xl font-extrabold tracking-tight text-text">
          Ready to find your squad?
        </h1>

        <div className="mt-10">
          <Link
            href="/auth/student/login"
            className="card card-hover group block px-6 py-8 text-center"
          >
            <span className="badge badge-indigo">Aspirant</span>
            <span className="mt-3 block font-display text-2xl font-bold text-text">
              I&apos;m a Student
            </span>
            <span className="mt-1.5 block text-sm text-text-dim">
              Find your squad and study together.
            </span>
          </Link>
        </div>

        <p className="mt-8 text-center text-sm text-text-faint">
          New here? You can sign up from the login screen.
        </p>
      </div>
    </main>
  );
}
