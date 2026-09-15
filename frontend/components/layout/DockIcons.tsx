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

export function TaskIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 3.5h6a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5H9a.5.5 0 0 1-.5-.5V4a.5.5 0 0 1 .5-.5Z" />
      <path d="m8.25 12.5 2 2 3.5-4" />
      <path d="M8.25 17h5.5" />
    </svg>
  );
}

export function StarIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 4.25 14.2 9l5.05.55-3.75 3.5 1 5.1-4.5-2.55-4.5 2.55 1-5.1-3.75-3.5L9.8 9Z" />
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

export type UiIconName =
  | "award"
  | "books"
  | "chart"
  | "check"
  | "chevron"
  | "clock"
  | "compass"
  | "credit-card"
  | "edit"
  | "file"
  | "flask"
  | "image"
  | "inbox"
  | "lightning"
  | "mic"
  | "message"
  | "paperclip"
  | "radio"
  | "search"
  | "sparkle"
  | "star"
  | "target"
  | "trend"
  | "user";

/** Shared stroke icon set for content and admin UI outside the bottom dock. */
export function UiIcon({ name, ...props }: IconProps & { name: UiIconName }) {
  const common = { ...base, ...props };
  const content: Record<UiIconName, React.ReactNode> = {
    award: <path d="M8 4.5h8v4.25a4 4 0 1 1-8 0zM8 7H5.5v3a3 3 0 0 0 3 3M16 7h2.5v3a3 3 0 0 1-3 3M9 16l-1 4 4-2 4 2-1-4" />,
    books: <><path d="M5 5.5h8.5a1.5 1.5 0 0 1 1.5 1.5v11.5H6.5A1.5 1.5 0 0 1 5 17z" /><path d="M15 7h2.5A1.5 1.5 0 0 1 19 8.5V19H7" /><path d="M8.5 9h4M8.5 12h4" /></>,
    chart: <><path d="M5 19V9M12 19V5M19 19v-7" /><path d="M3.5 19.5h17" /></>,
    check: <><circle cx="12" cy="12" r="8" /><path d="m8.5 12 2.25 2.25L15.5 9.5" /></>,
    chevron: <path d="m9 5 6 7-6 7" />,
    clock: <><circle cx="12" cy="12" r="8" /><path d="M12 7.5V12l3 2" /></>,
    compass: <><circle cx="12" cy="12" r="8" /><path d="m15.5 8.5-2 5-5 2 2-5z" /></>,
    "credit-card": <><rect x="3.5" y="6" width="17" height="12" rx="2" /><path d="M3.5 10h17M7 14h3" /></>,
    edit: <><path d="m14.5 5.5 4 4M5 19l3.5-.75L19.25 7.5a1.77 1.77 0 0 0-2.5-2.5L6 15.75z" /></>,
    file: <><path d="M6 3.75h7l5 5V20H6z" /><path d="M13 3.75V9h5M9 13h6M9 16h4" /></>,
    flask: <><path d="M9 3.5h6M10 3.5v5l-4.5 8.2A1.8 1.8 0 0 0 7.1 19.5h9.8a1.8 1.8 0 0 0 1.6-2.8L14 8.5v-5" /><path d="M8 15h8" /></>,
    image: <><rect x="4" y="5" width="16" height="14" rx="2" /><circle cx="9" cy="10" r="1.5" /><path d="m5 17 4.5-4 3 2.5 2-2 4.5 4" /></>,
    inbox: <><path d="M4 5.5h16v13H4z" /><path d="M4 14h4l1.5 2h5L16 14h4M8 9h8" /></>,
    lightning: <path d="m13.5 3.5-7 10h5l-1 7 7-10h-5z" />,
    mic: <><rect x="9" y="4" width="6" height="10" rx="3" /><path d="M6.5 11a5.5 5.5 0 0 0 11 0M12 16.5V20M9 20h6" /></>,
    message: <><path d="M5 5.5h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-7l-4.5 3v-3H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z" /><path d="M7.5 10h9M7.5 13h5" /></>,
    paperclip: <path d="m9.5 12.5 4.75-4.75a2.65 2.65 0 0 1 3.75 3.75l-6.5 6.5a4.25 4.25 0 0 1-6-6l6-6" />,
    radio: <><circle cx="12" cy="12" r="2" /><path d="M7.75 7.75a6 6 0 0 0 0 8.5M16.25 7.75a6 6 0 0 1 0 8.5M5 5a10 10 0 0 0 0 14M19 5a10 10 0 0 1 0 14" /></>,
    search: <><circle cx="10.75" cy="10.75" r="5.75" /><path d="m15 15 4.5 4.5" /></>,
    sparkle: <><path d="m12 3 1.4 5.6L19 10l-5.6 1.4L12 17l-1.4-5.6L5 10l5.6-1.4z" /><path d="m18.5 16 .5 2 .5-2 2-.5-2-.5-.5-2-.5 2-2 .5z" /></>,
    star: <path d="m12 4 2.35 4.9 5.4.65-4 3.65 1.05 5.3L12 15.9l-4.8 2.6 1.05-5.3-4-3.65 5.4-.65z" />,
    target: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" /></>,
    trend: <><path d="M4 17 10 11l4 4 6-7" /><path d="M15 8h5v5" /></>,
    user: <><circle cx="12" cy="8" r="3" /><path d="M5 19c.7-3.3 3-5 7-5s6.3 1.7 7 5" /></>,
  };
  return <svg {...common}>{content[name]}</svg>;
}
