import type { MemberStatus } from "@/lib/types";
import { Avatar } from "@/components/ui/Avatar";

export interface CoverageMatrixMember {
  slot: number;
  name: string;
  covers: string[];
  status?: MemberStatus;
}

const TOTAL_SLOTS = 6;

export function CoverageMatrix({
  subjects,
  members,
}: {
  subjects: { id: number; name: string }[];
  members: CoverageMatrixMember[];
}) {
  const bySlot = new Map(members.map((m) => [m.slot, m]));
  const slots = Array.from({ length: TOTAL_SLOTS }, (_, i) => i + 1);

  return (
    <div className="card-flat overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className="w-40 shrink-0 border-r border-border-soft px-4 py-3.5 text-left">
                <span className="eyebrow">Subject</span>
              </th>
              {slots.map((slot) => {
                const member = bySlot.get(slot);
                return (
                  <th
                    key={slot}
                    className={
                      "border-r border-border-soft px-3 py-3.5 text-center last:border-r-0 " +
                      (member ? "" : "bg-bg-raised/40")
                    }
                  >
                    <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.08em] text-text-faint">
                      Slot {slot}
                    </span>
                    {member ? (
                      <div className="flex flex-col items-center gap-1.5">
                        <Avatar name={member.name} size="sm" />
                        <span className="font-display text-[13px] font-semibold text-text">
                          {member.name.split(" ")[0]}
                        </span>
                        <span
                          className={
                            "block text-[9px] font-bold uppercase tracking-[0.06em] " +
                            (member.status === "confirmed" ? "text-emerald" : "text-cyan")
                          }
                        >
                          {member.status === "confirmed" ? "Confirmed" : "Pending"}
                        </span>
                      </div>
                    ) : (
                      <span className="block font-display text-sm italic text-text-faint">Open</span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {subjects.map((subject, i) => (
              <tr
                key={subject.id}
                className={
                  "transition-colors hover:bg-surface-hover/40 " +
                  (i !== subjects.length - 1 ? "border-b border-border-soft" : "")
                }
              >
                <td className="border-r border-border-soft px-4 py-3 font-sans text-sm text-text">
                  {subject.name}
                </td>
                {slots.map((slot) => {
                  const member = bySlot.get(slot);
                  const covered = member?.covers.includes(subject.name) ?? false;
                  return (
                    <td
                      key={slot}
                      className={
                        "border-r border-border-soft px-3 py-3 text-center last:border-r-0 " +
                        (member ? "" : "bg-bg-raised/40")
                      }
                    >
                      {covered && (
                        <span
                          aria-label={`${member?.name} covers ${subject.name}`}
                          className="inline-block h-2.5 w-2.5 rounded-full bg-gradient-to-br from-indigo to-cyan shadow-[0_0_10px_rgba(34,211,238,0.6)]"
                        />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
