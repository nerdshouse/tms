"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BarChart2, LayoutList, Plus, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Client } from "@/types";
import { StatusIcon, statusMeta } from "@/components/ui/StatusIcon";
import type { Status } from "@/types";

interface SidebarProps {
  user: Client;
}

const statuses: Status[] = ["open", "in_progress", "review", "done"];

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const navLink = (href: string, Icon: React.ElementType, label: string) => (
    <Link
      href={href}
      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
        pathname === href
          ? "bg-accent/10 text-accent"
          : "text-muted hover:bg-gray-100 hover:text-foreground"
      }`}
    >
      <Icon size={15} />
      {label}
    </Link>
  );

  return (
    <aside className="fixed left-0 top-0 h-screen w-56 bg-card border-r border-border flex flex-col z-20">
      {/* Brand */}
      <div className="px-4 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-md bg-accent flex items-center justify-center">
            <span className="text-white text-xs font-bold">N</span>
          </span>
          <div>
            <p className="text-[13px] font-semibold text-foreground leading-tight">Nerdshouse</p>
            <p className="text-[11px] text-muted">Client Portal</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {user.is_admin ? (
          <>
            <p className="px-3 text-[10px] font-semibold text-muted uppercase tracking-wider mb-2">Admin</p>
            {navLink("/", LayoutList, "All Requests")}
            {navLink("/analytics", BarChart2, "Analytics")}
          </>
        ) : (
          <>
            <p className="px-3 text-[10px] font-semibold text-muted uppercase tracking-wider mb-2">My Work</p>
            {navLink("/", LayoutList, "My Requests")}
          </>
        )}

        <Link
          href="/new"
          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors mt-1 ${
            pathname === "/new"
              ? "bg-accent/10 text-accent"
              : "text-muted hover:bg-gray-100 hover:text-foreground"
          }`}
        >
          <Plus size={15} />
          New Request
        </Link>

        {/* Status filters (visual reference) */}
        <div className="pt-4">
          <p className="px-3 text-[10px] font-semibold text-muted uppercase tracking-wider mb-2">Status</p>
          <div className="space-y-0.5">
            {statuses.map((s) => (
              <div key={s} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[13px] text-muted">
                <StatusIcon status={s} />
                <span className="capitalize">{statusMeta[s].label}</span>
              </div>
            ))}
          </div>
        </div>
      </nav>

      {/* User */}
      <div className="px-3 py-3 border-t border-border">
        <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg">
          <div className="w-7 h-7 rounded-full bg-accent/15 flex items-center justify-center flex-shrink-0">
            <span className="text-accent text-xs font-semibold">
              {user.name?.[0]?.toUpperCase() ?? "?"}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-medium text-foreground truncate">{user.name}</p>
            <p className="text-[11px] text-muted truncate">{user.company || user.email}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="text-muted hover:text-foreground transition-colors"
            title="Sign out"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}
