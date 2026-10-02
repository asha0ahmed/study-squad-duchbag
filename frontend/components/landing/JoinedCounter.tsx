"use client";

import { useEffect, useState } from "react";

const BASE_COUNT = 400;

/**
 * A number that hovers around 400 and drifts a few units every couple of
 * seconds. It is derived from the clock (a few overlapping slow waves)
 * rather than from random state, so the two copies on the landing page
 * (mobile + desktop placement) always agree, and the very first render is
 * a fixed value so server and client HTML match (no hydration warning).
 */
function currentCount(now: number) {
  const wave =
    14 * Math.sin(now / 7000) + 9 * Math.sin(now / 2900 + 1) + 5 * Math.sin(now / 1300 + 2);
  return Math.round(BASE_COUNT + wave);
}

export function JoinedCounter({ className = "" }: { className?: string }) {
  const [count, setCount] = useState(BASE_COUNT);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    function tick() {
      setCount(currentCount(Date.now()));
      // Irregular 1.8–3.6s beat so it feels live rather than metronomic.
      timer = setTimeout(tick, 1800 + Math.random() * 1800);
    }
    tick();
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`items-start gap-3 ${className}`}>
      <span className="relative mt-[0.55rem] flex h-2.5 w-2.5 shrink-0" aria-hidden="true">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald opacity-60" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald" />
      </span>
      <div>
        <p className="font-display text-lg font-bold leading-snug text-text lg:text-xl">
          <span className="text-gradient-brand font-extrabold tabular-nums">{count}</span> students have
          already joined.
        </p>
        <p className="text-sm leading-snug text-text-dim lg:text-base">
          They&apos;re already ahead of you.{" "}
          <span className="font-semibold text-coral">You&apos;re still waiting.</span>
        </p>
      </div>
    </div>
  );
}
