import type { Status } from "@/types";

const icons: Record<Status, { symbol: string; color: string; label: string }> = {
  open:        { symbol: "○", color: "text-gray-400",   label: "Open" },
  in_progress: { symbol: "◑", color: "text-blue-500",   label: "In Progress" },
  review:      { symbol: "◕", color: "text-amber-500",  label: "In Review" },
  done:        { symbol: "●", color: "text-green-600",  label: "Done" },
};

export function StatusIcon({ status, showLabel = false }: { status: Status; showLabel?: boolean }) {
  const { symbol, color, label } = icons[status];
  return (
    <span className={`inline-flex items-center gap-1.5 ${color}`}>
      <span className="text-base leading-none">{symbol}</span>
      {showLabel && <span className="text-[13px] font-medium text-foreground">{label}</span>}
    </span>
  );
}

export { icons as statusMeta };
