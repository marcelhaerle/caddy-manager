"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Terminal,
  LayoutDashboard,
  Users,
  LogOut,
  Shield,
  Server,
  History,
  Activity,
} from "lucide-react";
import type { SafeUser } from "@/db/schema";
import { cn } from "@/lib/utils";

interface AppShellProps {
  user: SafeUser;
  children: React.ReactNode;
}

export function AppShell({ user, children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const navItems = [
    {
      href: "/",
      label: "Control Plane",
      icon: LayoutDashboard,
      exact: true,
    },
    ...(user.role === "admin"
      ? [
          {
            href: "/users",
            label: "Operator Access",
            icon: Users,
            exact: false,
          },
        ]
      : []),
  ];

  const roleBadgeColor =
    user.role === "admin"
      ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-300"
      : user.role === "editor"
        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
        : "border-zinc-700 bg-zinc-800/80 text-zinc-300";

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#090a0f] text-zinc-100">
      {/* Sidebar */}
      <aside className="w-full md:w-64 shrink-0 border-b md:border-b-0 md:border-r border-zinc-800/80 bg-zinc-950/80 backdrop-blur-xl flex flex-col justify-between">
        <div>
          {/* Brand Header */}
          <div className="h-14 px-4 border-b border-zinc-800/80 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/40 flex items-center justify-center text-cyan-400 group-hover:border-cyan-400 transition">
                <Terminal className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-semibold tracking-tight flex items-center gap-1.5">
                  <span>Caddy Manager</span>
                </div>
                <div className="text-[10px] font-mono text-zinc-500 tracking-wider uppercase">
                  Admin API Plane
                </div>
              </div>
            </Link>
            <span className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              LIVE
            </span>
          </div>

          {/* Primary Navigation */}
          <div className="p-3 space-y-1">
            <div className="px-2 py-1.5 text-[10px] font-mono uppercase tracking-widest text-zinc-500">
              Navigation
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition border",
                    isActive
                      ? "bg-cyan-500/10 text-cyan-300 border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.08)]"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/70 border-transparent"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Upcoming Modules Telemetry */}
          <div className="p-3 pt-1 space-y-1">
            <div className="px-2 py-1.5 text-[10px] font-mono uppercase tracking-widest text-zinc-500">
              Telemetry Modules
            </div>
            <div className="px-3 py-2 rounded-lg border border-zinc-900 bg-zinc-900/30 text-xs text-zinc-500 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Server className="w-3.5 h-3.5 text-zinc-600" />
                <span>Caddy Nodes</span>
              </span>
              <span className="font-mono text-[10px] text-cyan-400">
                :2019
              </span>
            </div>
            <div className="px-3 py-2 rounded-lg border border-zinc-900 bg-zinc-900/30 text-xs text-zinc-500 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <History className="w-3.5 h-3.5 text-zinc-600" />
                <span>Audit Revisions</span>
              </span>
              <span className="font-mono text-[10px] text-emerald-400">
                WAL
              </span>
            </div>
          </div>
        </div>

        {/* Operator Footer */}
        <div className="p-3 border-t border-zinc-800/80 bg-zinc-950/90 space-y-2.5">
          <div className="flex items-center justify-between px-2">
            <div className="min-w-0">
              <div className="text-xs font-mono font-medium text-zinc-200 truncate">
                {user.username}
              </div>
              <div className="text-[11px] font-mono text-zinc-500 truncate">
                {user.email}
              </div>
            </div>
            <span
              className={cn(
                "px-2 py-0.5 text-[10px] font-mono uppercase rounded border flex items-center gap-1 shrink-0",
                roleBadgeColor
              )}
            >
              <Shield className="w-2.5 h-2.5" />
              {user.role}
            </span>
          </div>

          <button
            onClick={handleLogout}
            className="w-full px-3 py-1.5 rounded-lg border border-zinc-800 hover:border-rose-500/40 hover:bg-rose-950/20 text-zinc-400 hover:text-rose-300 text-xs font-mono flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>TERMINATE_SESSION</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Status Bar */}
        <header className="h-14 px-6 border-b border-zinc-800/80 bg-zinc-950/50 backdrop-blur-md flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs font-mono text-zinc-400">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span>SESSION_ACTIVE</span>
            <span className="text-zinc-700">/</span>
            <span className="text-zinc-200">{pathname}</span>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="hidden sm:inline-flex items-center gap-1.5 text-zinc-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              DB: SQLite (Drizzle)
            </span>
            <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
              operator:{user.username}
            </span>
          </div>
        </header>

        <main className="flex-1 p-6 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
