"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BarChart2, LayoutDashboard, LayoutList, Plus, LogOut, Users, UserCircle2, UsersRound, FolderOpen, ScrollText } from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import type { Client, Project, TeamMember, TeamRole } from "@/types";
import { StatusIcon, statusMeta } from "@/components/ui/StatusIcon";
import type { Status } from "@/types";

const ROLE_BADGE: Record<TeamRole, string> = {
  Admin:     "bg-accent/10 text-accent",
  Developer: "bg-green-50 text-green-700",
  Designer:  "bg-pink-50 text-pink-700",
  QA:        "bg-purple-50 text-purple-700",
};

interface SidebarProps {
  user: Client;
  projects: (Project & { ticket_count: number })[];
  poc: TeamMember | null;
}

const statuses: Status[] = ["open", "in_progress", "review", "done"];

export default function Sidebar({ user, projects, poc }: SidebarProps) {
  const pathname = usePathname();
  const router   = useRouter();

  async function handleSignOut() {
    await signOut(auth);
    await fetch("/api/session", { method: "DELETE" });
    router.push("/login");
    router.refresh();
  }

  const navLink = (href: string, Icon: React.ElementType, label: string) => {
    const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
    return (
      <Link
        href={href}
        prefetch={true}
        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
          active ? "bg-accent/10 text-accent" : "text-muted hover:bg-gray-100 hover:text-foreground"
        }`}
      >
        <Icon size={15} />
        {label}
      </Link>
    );
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-56 bg-card border-r border-border flex flex-col z-20">
      {/* Brand */}
      <div className="px-4 py-4 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-md bg-accent flex items-center justify-center">
            <span className="text-white text-xs font-bold">N</span>
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-foreground leading-tight">Nerdshouse</p>
            <p className="text-[11px] text-muted">Client Portal</p>
          </div>
          {/* Live indicator */}
          <div className="flex items-center gap-1" title="Live updates active">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] text-green-600 font-medium">Live</span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {user.is_admin ? (
          <>
            <p className="px-3 text-[10px] font-semibold text-muted uppercase tracking-wider mb-2 mt-1">Admin</p>
            <div className="space-y-0.5">
              {navLink("/dashboard", LayoutDashboard, "Dashboard")}
              {navLink("/", LayoutList, "All Requests")}
              {navLink("/admin/clients", UserCircle2, "Clients")}
              {navLink("/admin/team", Users, "Team Members")}
              {navLink("/analytics", BarChart2, "Analytics")}
            </div>

            <Link
              href="/new"
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors mt-1 ${
                pathname === "/new" ? "bg-accent/10 text-accent" : "text-muted hover:bg-gray-100 hover:text-foreground"
              }`}
            >
              <Plus size={15} />
              New Request
            </Link>

            {/* Projects */}
            {projects.length > 0 && (
              <div className="pt-4 border-t border-border mt-3">
                <p className="px-3 text-[10px] font-semibold text-muted uppercase tracking-wider mb-2">Projects</p>
                <div className="space-y-0.5">
                  {projects.map((p) => {
                    const active = pathname === `/projects/${p.id}`;
                    return (
                      <Link
                        key={p.id}
                        href={`/projects/${p.id}`}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] transition-colors ${
                          active ? "bg-accent/10 text-accent" : "text-muted hover:bg-gray-100 hover:text-foreground"
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                        <span className="flex-1 truncate">{p.name}</span>
                        <span className="text-[10px] tabular-nums opacity-60">{p.ticket_count}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Status */}
            <div className="pt-4 border-t border-border mt-3">
              <p className="px-3 text-[10px] font-semibold text-muted uppercase tracking-wider mb-2">Status</p>
              <div className="space-y-0.5">
                {statuses.map((s) => (
                  <div key={s} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] text-muted">
                    <StatusIcon status={s} />
                    <span>{statusMeta[s].label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* System Logs */}
            <div className="pt-4 border-t border-border mt-3">
              {navLink("/admin/logs", ScrollText, "System Logs")}
            </div>
          </>
        ) : (
          <>
            <p className="px-3 text-[10px] font-semibold text-muted uppercase tracking-wider mb-2 mt-1">My Work</p>
            <div className="space-y-0.5">
              {navLink("/", LayoutList, "My Requests")}
              {navLink("/projects", FolderOpen, "Projects")}
              {/* Primary clients (not contacts) can manage their own team */}
              {!user.is_contact && navLink("/my-team", UsersRound, "My Team")}
            </div>

            <Link
              href="/new"
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors mt-1 ${
                pathname === "/new" ? "bg-accent/10 text-accent" : "text-muted hover:bg-gray-100 hover:text-foreground"
              }`}
            >
              <Plus size={15} />
              New Request
            </Link>

            {/* Projects quick-links */}
            {projects.length > 0 && (
              <div className="pt-4 border-t border-border mt-3">
                <p className="px-3 text-[10px] font-semibold text-muted uppercase tracking-wider mb-2">Projects</p>
                <div className="space-y-0.5">
                  {projects.map((p) => {
                    const active = pathname === `/projects/${p.id}`;
                    return (
                      <Link
                        key={p.id}
                        href={`/projects/${p.id}`}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] transition-colors ${
                          active ? "bg-accent/10 text-accent" : "text-muted hover:bg-gray-100 hover:text-foreground"
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                        <span className="flex-1 truncate">{p.name}</span>
                        <span className="text-[10px] tabular-nums opacity-60">{p.ticket_count}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Status */}
            <div className="pt-4 border-t border-border mt-3">
              <p className="px-3 text-[10px] font-semibold text-muted uppercase tracking-wider mb-2">Status</p>
              <div className="space-y-0.5">
                {statuses.map((s) => (
                  <div key={s} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] text-muted">
                    <StatusIcon status={s} />
                    <span>{statusMeta[s].label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* POC section — client role only */}
            {poc && (
              <div className="pt-4 border-t border-border mt-3">
                <p className="px-3 text-[10px] font-semibold text-muted uppercase tracking-wider mb-2">Your POC</p>
                <div className="px-3 py-2 rounded-lg bg-gray-50/80">
                  <div className="flex items-center gap-2 mb-0.5">
                    <div className="w-6 h-6 rounded-full bg-accent/15 flex items-center justify-center text-[10px] font-semibold text-accent flex-shrink-0">
                      {poc.avatar_initials}
                    </div>
                    <span className="text-[12px] font-medium text-foreground truncate">{poc.name}</span>
                  </div>
                  <p className="text-[11px] text-muted truncate pl-8">{poc.email}</p>
                </div>
              </div>
            )}
          </>
        )}
      </nav>

      {/* User */}
      <div className="px-3 py-3 border-t border-border flex-shrink-0">
        <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg">
          <div className="w-7 h-7 rounded-full bg-accent/15 flex items-center justify-center flex-shrink-0">
            <span className="text-accent text-xs font-semibold">{user.name?.[0]?.toUpperCase() ?? "?"}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-medium text-foreground truncate">{user.name}</p>
            <p className="text-[11px] text-muted truncate">{user.company || user.email}</p>
            {user.team_role && user.team_role !== "Admin" && (
              <span className={`inline-block mt-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded ${ROLE_BADGE[user.team_role]}`}>
                {user.team_role}
              </span>
            )}
          </div>
          <button onClick={handleSignOut} className="text-muted hover:text-foreground transition-colors" title="Sign out">
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}
