/**
 * Structural placeholder for the "currently running / task squads"
 * section requested for the public landing page. Real squad data (and
 * final layout) will replace PLACEHOLDER_SQUADS below once provided --
 * until then this keeps the section visually consistent with the rest
 * of the landing page and responsive across breakpoints, without
 * claiming any squad activity that isn't real yet.
 */
const PLACEHOLDER_SQUADS = [
  { group: "Science", label: "HSC 2nd Year · Engineering Admission", progress: 100 },
  { group: "Arts", label: "HSC 1st Year · Varsity Admission", progress: 66 },
  { group: "Science", label: "HSC 2nd Year · Medical Admission", progress: 83 },
];

export function RunningSquadsSection() {
  return (
    <section className="mx-auto max-w-7xl px-6 pb-24 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow text-cyan">Live right now</p>
          <h2 className="mt-1 font-display text-2xl font-extrabold tracking-tight text-text sm:text-3xl">
            Squads currently running
          </h2>
          <p className="mt-2 max-w-lg text-sm text-text-dim">
            A live look at squads that are active today. Final layout and real-time data are on the way.
          </p>
        </div>
        <span className="badge badge-neutral shrink-0">Preview layout</span>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PLACEHOLDER_SQUADS.map((squad, i) => (
          <div key={i} className="card p-5">
            <div className="flex items-center justify-between">
              <span className="badge badge-indigo">{squad.group}</span>
              <span className="badge badge-emerald">Active</span>
            </div>
            <p className="mt-4 font-display text-base font-bold text-text">{squad.label}</p>
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-text-dim">
                <span>Squad progress</span>
                <span className="font-semibold text-text">{squad.progress}%</span>
              </div>
              <div className="progress-track mt-2">
                <div className="progress-fill" style={{ width: `${squad.progress}%` }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
