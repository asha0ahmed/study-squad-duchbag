import Link from "next/link";

const SECTIONS = [
  {
    href: "/admin/students",
    icon: "🎓",
    title: "Student Records",
    desc: "Search a student by email, phone number, or transaction ID.",
  },
  {
    href: "/admin/mentors",
    icon: "🧭",
    title: "Mentor Records",
    desc: "See every mentor, their institution, groups, and assigned squads.",
  },
  {
    href: "/admin/payments",
    icon: "💳",
    title: "Payment Review",
    desc: "Approve or reject submitted mentor-fee payments.",
  },
  {
    href: "/admin/squads",
    icon: "📡",
    title: "Squad Monitoring",
    desc: "Supervise squad activity and mentor coverage.",
    comingSoon: true,
  },
  {
    href: "/admin/reports",
    icon: "📊",
    title: "Reports & Analytics",
    desc: "Platform-wide trends across students, squads, and mentors.",
    comingSoon: true,
  },
];

export default function AdminHomePage() {
  return (
    <main className="flex-1 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <p className="eyebrow text-cyan">Admin</p>
        <h1 className="mt-1 font-display text-4xl font-extrabold tracking-tight text-text">
          Admin Panel
        </h1>
        <p className="mt-2 max-w-lg text-sm text-text-dim">
          Supervise students, mentors, payments, and squads from one place.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {SECTIONS.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className="card-hover card flex flex-col gap-2 p-5"
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl">{section.icon}</span>
                {section.comingSoon && <span className="badge badge-neutral">Coming soon</span>}
              </div>
              <span className="font-display text-lg font-bold text-text">{section.title}</span>
              <span className="text-sm text-text-dim">{section.desc}</span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
