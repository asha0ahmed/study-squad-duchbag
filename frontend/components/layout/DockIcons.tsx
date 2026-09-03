import type { SVGProps } from "react";

/**
 * Hand-drawn, minimal stroke icons for the bottom navigation dock.
 *
 * Study Squad's existing UI leans on emoji for iconography (see the old
 * Navbar drawer), which renders inconsistently across platforms and can't
 * hold a uniform stroke weight/size -- exactly the consistency the dock
 * needs (equal-weight items, crisp active state). Rather than pull in an
 * icon-library dependency the project doesn't already have, these are
 * small inline SVGs sharing one visual language: 1.75 stroke, rounded
 * caps/joins, 24x24 viewBox, `currentColor` so they inherit the dock's
 * active/inactive text color automatically.
 */

type IconProps = SVGProps<SVGSVGElement>;

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function HomeIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 11.5 12 4l8 7.5" />
      <path d="M6 10v8.5a1 1 0 0 0 1 1h3.25V15a1.75 1.75 0 0 1 3.5 0v4.5H17a1 1 0 0 0 1-1V10" />
    </svg>
  );
}

export function DashboardIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="4" y="4" width="7" height="7.5" rx="1.75" />
      <rect x="13" y="4" width="7" height="4.5" rx="1.75" />
      <rect x="13" y="10.5" width="7" height="9.5" rx="1.75" />
      <rect x="4" y="13.5" width="7" height="6.5" rx="1.75" />
    </svg>
  );
}

export function SquadIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="9" cy="8" r="2.75" />
      <path d="M3.75 19c.6-2.9 2.7-4.5 5.25-4.5s4.65 1.6 5.25 4.5" />
      <circle cx="17" cy="8.5" r="2.25" />
      <path d="M15.4 14.75c2.1.25 3.7 1.7 4.2 4.25" />
    </svg>
  );
}

export function NoteIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4.5 5.5A1.5 1.5 0 0 1 6 4h10.2a1.5 1.5 0 0 1 1.06.44l2.3 2.3A1.5 1.5 0 0 1 20 7.8V18.5A1.5 1.5 0 0 1 18.5 20H6A1.5 1.5 0 0 1 4.5 18.5z" />
      <path d="M8 9.5h8M8 13h8M8 16.25h5" />
    </svg>
  );
}

export function MoreIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="5.5" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="18.5" cy="12" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M9 5.5 15 12l-6 6.5" />
    </svg>
  );
}
