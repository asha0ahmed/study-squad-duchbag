"use client";

import { useEffect, useState } from "react";

const BASE_COUNT = 1282;
// Shared UTC launch anchor: 2026-10-16 17:24:41 UTC (the request time).
// Every visitor sees the same count; change this timestamp only to reset the counter.
const COUNTER_START_MS = Date.UTC(2026, 9, 16, 17, 24, 41);
const HOUR_MS = 60 * 60 * 1000;

/**
 * Stable pseudo-random increment for a given elapsed hour, so all devices
 * share the same count without requiring a database or browser-local state.
 */
function incrementForHour(hour: number) {
  let value = (hour + 0x9e3779b9) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x7feb352d);
  value = Math.imul(value ^ (value >>> 15), 0x846ca68b);
  value ^= value >>> 16;
  return 2 + (value >>> 0) % 3;
}

function currentCount(now: number) {
  const elapsedHours = Math.max(0, Math.floor((now - COUNTER_START_MS) / HOUR_MS));
  let count = BASE_COUNT;
  for (let hour = 1; hour <= elapsedHours; hour += 1) {
    count += incrementForHour(hour);
  }
  return count;
}

export function JoinedCounter({ className = "" }: { className?: string }) {
  const [count, setCount] = useState(BASE_COUNT);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    function tick() {
      const now = Date.now();
      setCount(currentCount(now));
      const elapsedHours = Math.max(0, Math.floor((now - COUNTER_START_MS) / HOUR_MS));
      const nextUpdate = COUNTER_START_MS + (elapsedHours + 1) * HOUR_MS;
      timer = setTimeout(tick, Math.max(1000, nextUpdate - now + 50));
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
