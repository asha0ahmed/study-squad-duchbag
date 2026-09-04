const PLANNED = [
  "Live view of every squad's member count and lock status",
  "Flag squads stuck below 4 members for too long",
  "Surface mentor response time once a squad is claimed",
];

export default function AdminSquadsPage() {
  return (
    <main className="flex-1 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center gap-3">
          <p className="eyebrow text-cyan">Admin</p>
          <span className="badge badge-neutral">Coming soon</span>
        </div>
        <h1 className="mt-1 font-display text-4xl font-extrabold tracking-tight text-text">
          Squad & Activity Monitoring
        </h1>
        <p className="mt-2 max-w-lg text-sm text-text-dim">
          A live supervision view across every squad&apos;s status, member count, and mentor coverage.
        </p>

        <div className="card mt-8 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.06em] text-text-faint">Planned</p>
          <ul className="mt-3 flex flex-col gap-2.5">
            {PLANNED.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm text-text-dim">
                <span className="mt-0.5 text-cyan">◆</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  );
}
