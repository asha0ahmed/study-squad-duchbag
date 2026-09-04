import Link from "next/link";
import { SUBJECTS_BY_GROUP } from "@/lib/subjects";
import type { AcademicGroup } from "@/lib/types";
import { HomeRedirect } from "@/components/layout/HomeRedirect";
import { RunningSquadsSection } from "@/components/landing/RunningSquadsSection";

const MEMBERS = ["Rafi", "Anika", "Tanvir", "Nusrat", "Farhan", "Mim"];

// Canonical list of academic groups the platform matches on -- pulled from
// the same source of truth the Profiler and matching logic use, so this
// never drifts from what's actually offered.
const ACADEMIC_GROUPS = Object.keys(SUBJECTS_BY_GROUP) as AcademicGroup[];

const GROUP_META: Record<
  AcademicGroup,
  { icon: string; blurb: string; accent: string; gateImage?: string }
> = {
  Science: {
    icon: "🧪",
    blurb: "Physics, Chemistry, Higher Math and more — squads built so your gaps get covered.",
    accent: "from-indigo to-cyan",
    gateImage: "/images/gates/science-buet.webp",
  },
  Arts: {
    icon: "📚",
    blurb: "History, Economics, Civics and more — matched with scholars who balance out your strengths.",
    accent: "from-violet to-coral",
    gateImage: "/images/gates/arts-jahangirnagar.webp",
  },
  Commerce: {
    icon: "📈",
    blurb: "Commerce matching is being set up on the platform right now — check back soon.",
    accent: "from-emerald to-cyan",
    // Deliberately no gate art -- there's no real Commerce track live yet,
    // so nothing here should imply an institution or activity that isn't
    // true. Matches the "coming soon" badge below.
  },
};

export default function Home() {
  return (
    <main className="flex-1">
      <HomeRedirect />
      <section className="relative mx-auto max-w-7xl overflow-hidden px-6 pb-24 pt-16 sm:pt-24 lg:px-8">
        <div className="glow-orb h-[28rem] w-[28rem] bg-indigo/25" style={{ top: "-6rem", left: "-8rem" }} />
        <div className="glow-orb h-96 w-96 bg-cyan/15" style={{ top: "2rem", right: "-6rem" }} />

        {/* Faint campus-gate line art, screen-blended so only the glowing
            outline reads against Midnight Navy -- a one-time "trust" moment,
            not a persistent background, so signage stays legible-but-quiet
            rather than something a reader has to fight for attention. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-16 top-0 z-0 h-[46rem] w-[30rem] opacity-[0.68] mix-blend-screen sm:-left-6"
          style={{
           backgroundImage: "url(/images/gates/collage-hero.webp)",
            backgroundSize: "cover",
            backgroundPosition: "top center",
          }}
        />

        <div className="relative z-10 grid items-center gap-16 lg:grid-cols-2">
          <div className="animate-fade-in-up">
            <span className="badge badge-indigo">✦ Peer-matched squads, not random chats</span>
            <h1 className="mt-5 font-display text-5xl font-extrabold leading-[1.05] tracking-tight text-text sm:text-6xl">
              Your squad is <span className="text-gradient-brand">waiting</span> for you.
            </h1>
            <p className="mt-5 max-w-lg text-lg text-text-dim">
              Study Squad matches you with five other ambitious students —
              chosen so your strengths and gaps balance each other out.
              Real accountability. Real progress. Every day.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/auth/student/login" className="btn btn-primary min-h-[52px] px-7 text-base">
                I&apos;m a Scholar
              </Link>
              <Link href="/auth/mentor/login" className="btn btn-secondary min-h-[52px] px-7 text-base">
                I&apos;m a Mentor
              </Link>
            </div>
            <div className="mt-10 flex items-center gap-4">
              <div className="flex -space-x-3">
                {MEMBERS.slice(0, 5).map((n) => (
                  <span
                    key={n}
                    className="avatar h-9 w-9 border-2 border-bg bg-gradient-to-br from-indigo to-violet text-xs"
                  >
                    {n[0]}
                  </span>
                ))}
              </div>
              <p className="text-sm text-text-dim">
                Six-member squads across Science &amp; Arts, HSC to admission tests.
              </p>
            </div>
          </div>

          {/* Squad preview card */}
          <div className="relative">
            <div className="card animate-fade-in-up relative overflow-hidden p-6 sm:p-7" style={{ animationDelay: "0.1s" }}>
              <div className="glow-orb h-40 w-40 bg-violet/25" style={{ top: "-2rem", right: "-2rem" }} />
              <div className="relative z-10 flex items-center justify-between">
                <div>
                  <p className="eyebrow text-cyan">Science · HSC 2nd Year</p>
                  <p className="mt-1 font-display text-xl font-bold text-text">Engineering Admission Squad</p>
                </div>
                <span className="badge badge-emerald">Active</span>
              </div>

              <div className="relative z-10 mt-6 grid grid-cols-3 gap-3">
                {MEMBERS.map((n, i) => (
                  <div key={n} className="card-flat flex flex-col items-center gap-2 px-2 py-4">
                    <span className="relative">
                      <span className="avatar h-11 w-11 bg-gradient-to-br from-indigo to-cyan text-sm">
                        {n[0]}
                      </span>
                      <span
                        className={
                          "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-surface " +
                          (i % 2 === 0 ? "bg-emerald" : "bg-text-faint")
                        }
                      />
                    </span>
                    <span className="text-xs font-medium text-text-dim">{n}</span>
                  </div>
                ))}
              </div>

              <div className="relative z-10 mt-6">
                <div className="flex items-center justify-between text-xs text-text-dim">
                  <span>Squad progress</span>
                  <span className="font-semibold text-text">6 / 6 members</span>
                </div>
                <div className="progress-track mt-2">
                  <div className="progress-fill" style={{ width: "100%" }} />
                </div>
              </div>

              <div className="relative z-10 mt-5 flex items-center gap-2 rounded-xl border border-coral/30 bg-coral/10 px-3.5 py-2.5">
                <span className="text-base">🔥</span>
                <span className="text-sm font-medium text-text">18-day squad streak — keep it going</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Group showcase -- horizontally scrollable so new visitors can see,
          at a glance, that squads are real and active across every group
          before they ever sign up. */}
      <section className="mx-auto max-w-7xl pb-20 pl-6 lg:pl-8">
        <div className="pr-6 lg:pr-8">
          <p className="eyebrow text-violet">Where scholars are matched</p>
          <h2 className="mt-1 font-display text-2xl font-extrabold tracking-tight text-text sm:text-3xl">
            Active groups on Study Squad
          </h2>
          <p className="mt-2 max-w-lg text-sm text-text-dim">
            Every group below is a real matching track — students rating their subjects and
            getting placed into six-person squads, not a static category page.
          </p>
        </div>

        <div className="mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3 pr-6 lg:pr-8">
          {ACADEMIC_GROUPS.map((group) => {
            const meta = GROUP_META[group];
            const subjects = SUBJECTS_BY_GROUP[group];
            const active = subjects.length > 0;
            return (
              <div
                key={group}
                className="card relative w-64 shrink-0 snap-start overflow-hidden p-5"
              >
                {meta.gateImage && (
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-6 -top-4 h-40 w-40 opacity-[0.16] mix-blend-screen"
                    style={{
                      backgroundImage: `url(${meta.gateImage})`,
                      backgroundSize: "cover",
                      backgroundPosition: "top center",
                    }}
                  />
                )}
                <div
                  className={`glow-orb h-28 w-28 bg-gradient-to-br ${meta.accent} opacity-25`}
                  style={{ top: "-1.5rem", right: "-1.5rem" }}
                />
                <div className="relative z-10">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">{meta.icon}</span>
                    <span className={"badge " + (active ? "badge-emerald" : "badge-neutral")}>
                      {active ? "Matching now" : "Coming soon"}
                    </span>
                  </div>
                  <p className="mt-3 font-display text-xl font-bold text-text">{group}</p>
                  {active && (
                    <p className="mt-1 text-xs font-medium text-text-faint">
                      {subjects.length} subjects tracked
                    </p>
                  )}
                  <p className="mt-3 text-sm leading-relaxed text-text-dim">{meta.blurb}</p>
                  {active && (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {subjects.slice(0, 3).map((s) => (
                        <span
                          key={s.id}
                          className="rounded-full border border-border-soft bg-surface-2 px-2.5 py-1 text-[11px] font-medium text-text-dim"
                        >
                          {s.name}
                        </span>
                      ))}
                      {subjects.length > 3 && (
                        <span className="rounded-full border border-border-soft bg-surface-2 px-2.5 py-1 text-[11px] font-medium text-text-faint">
                          +{subjects.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <RunningSquadsSection />

      {/* Feature strip */}
      <section className="mx-auto max-w-7xl px-6 pb-24 lg:px-8">
        <div className="grid gap-5 sm:grid-cols-3">
          {[
            {
              title: "Matched, not random",
              desc: "Your subject strengths and gaps decide who joins your six-person squad — everyone covers for everyone.",
              icon: "🎯",
              accent: "text-cyan",
            },
            {
              title: "Built-in accountability",
              desc: "Shared progress and squad-wide activity keep everyone honest — this isn't a group chat that goes quiet.",
              icon: "⚡",
              accent: "text-emerald",
            },
            {
              title: "A mentor in your corner",
              desc: "Every locked squad gets a mentor who can see your coverage matrix and guide the group's prep.",
              icon: "🧭",
              accent: "text-violet",
            },
          ].map((f) => (
            <div key={f.title} className="card-hover card p-6">
              <span className="text-2xl">{f.icon}</span>
              <h3 className={"mt-4 font-display text-lg font-bold text-text"}>{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-text-dim">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
