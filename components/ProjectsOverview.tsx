"use client";

import Link from "next/link";
import { FolderOpen } from "lucide-react";
import type { Project, Status } from "@/types";

type ProjectWithCounts = Project & {
  statusCounts: Record<Status, number>;
};

interface Props {
  projects: ProjectWithCounts[];
  isAdmin: boolean;
}

const STATUS_CONFIG: Record<Status, { label: string; icon: string; color: string }> = {
  open:        { label: "Open",        icon: "○", color: "text-gray-500"  },
  in_progress: { label: "In Progress", icon: "◑", color: "text-blue-600"  },
  review:      { label: "In Review",   icon: "◕", color: "text-amber-600" },
  done:        { label: "Done",        icon: "●", color: "text-green-600" },
};

const STATUS_ORDER: Status[] = ["open", "in_progress", "review", "done"];

export default function ProjectsOverview({ projects, isAdmin }: Props) {
  if (projects.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-[17px] font-semibold text-foreground mb-2">Projects</h1>
        <div className="mt-24 text-center">
          <FolderOpen size={32} className="mx-auto text-muted/30 mb-3" />
          <p className="text-[13px] text-muted">No projects yet.</p>
          {!isAdmin && (
            <p className="text-[12px] text-muted/60 mt-1">
              Ask your account manager to set one up.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-[17px] font-semibold text-foreground">Projects</h1>
        <p className="text-xs text-muted mt-0.5">
          {projects.length} project{projects.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {projects.map((project) => {
          const total    = STATUS_ORDER.reduce((a, s) => a + (project.statusCounts[s] ?? 0), 0);
          const done     = project.statusCounts.done ?? 0;
          const progress = total > 0 ? Math.round((done / total) * 100) : 0;

          return (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="bg-card border border-border rounded-xl p-5 flex flex-col gap-4 hover:border-accent/40 hover:shadow-sm transition-all group"
            >
              {/* Header */}
              <div className="flex items-start gap-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${project.color}22` }}
                >
                  <span className="w-3.5 h-3.5 rounded" style={{ backgroundColor: project.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-foreground group-hover:text-accent transition-colors truncate">
                    {project.name}
                  </p>
                  {project.clients && (
                    <p className="text-[11px] text-muted truncate">
                      {project.clients.company || project.clients.name}
                    </p>
                  )}
                  {project.description && (
                    <p className="text-[11px] text-muted/80 mt-0.5 line-clamp-2">{project.description}</p>
                  )}
                </div>
              </div>

              {/* Status breakdown */}
              <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                {total === 0 ? (
                  <p className="col-span-2 text-[11px] text-muted/60 italic">No tickets yet</p>
                ) : (
                  STATUS_ORDER.map((s) => {
                    const count = project.statusCounts[s] ?? 0;
                    if (count === 0) return null;
                    const cfg = STATUS_CONFIG[s];
                    return (
                      <div key={s} className="flex items-center gap-1.5 text-[11px]">
                        <span className={`${cfg.color} text-[13px] leading-none`}>{cfg.icon}</span>
                        <span className="text-muted">{count} {cfg.label}</span>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Progress bar */}
              {total > 0 && (
                <div>
                  <div className="flex items-center justify-between text-[10px] text-muted mb-1.5">
                    <span>{progress}% complete</span>
                    <span>{total} ticket{total !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${progress}%`, backgroundColor: project.color }}
                    />
                  </div>
                </div>
              )}

              <p className="text-[12px] text-accent font-medium group-hover:translate-x-0.5 transition-transform">
                View tickets →
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
