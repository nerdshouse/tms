import type { Priority, TicketType } from "@/types";

const priorityStyles: Record<Priority, string> = {
  P0: "bg-red-50 text-red-700 border-red-100",
  P1: "bg-amber-50 text-amber-700 border-amber-100",
  P2: "bg-blue-50 text-blue-700 border-blue-100",
};

const typeStyles: Record<string, string> = {
  New:      "bg-green-50 text-green-700 border-green-100",
  Existing: "bg-blue-50 text-blue-700 border-blue-100",
  // legacy values
  Bug:         "bg-red-50 text-red-600 border-red-100",
  Feature:     "bg-green-50 text-green-700 border-green-100",
  Performance: "bg-orange-50 text-orange-700 border-orange-100",
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${priorityStyles[priority]}`}>
      {priority}
    </span>
  );
}

export function TypeBadge({ type }: { type: TicketType | string }) {
  const style = typeStyles[type] ?? "bg-gray-50 text-gray-600 border-gray-200";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${style}`}>
      {type}
    </span>
  );
}
