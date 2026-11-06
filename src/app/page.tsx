import Link from "next/link";
import { redirect } from "next/navigation";
import { count } from "drizzle-orm";
import {
  Server,
  Users,
  History,
  ShieldCheck,
  Terminal,
  ArrowUpRight,
  CheckCircle2,
  Database,
} from "lucide-react";
import { getDb } from "@/db";
import { caddyInstances, configRevisions, users } from "@/db/schema";
import { getCurrentUser, hasAdminAccount } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const initialized = await hasAdminAccount();
  if (!initialized) {
    redirect("/setup");
  }

  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const db = getDb();
  const [{ value: totalUsers }] = db
    .select({ value: count() })
    .from(users)
    .all();
  const [{ value: totalInstances }] = db
    .select({ value: count() })
    .from(caddyInstances)
    .all();
  const [{ value: totalRevisions }] = db
    .select({ value: count() })
    .from(configRevisions)
    .all();

  return (
    <AppShell user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 mb-1">
              <span>CONTROL_PLANE // OVERVIEW</span>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">
              Infrastructure Telemetry
            </h1>
            <p className="text-sm text-zinc-400 mt-0.5">
              Centralized Caddy Admin API gateway, configuration state, and
              operator access control.
            </p>
          </div>

          {user.role === "admin" && (
            <Link
              href="/users"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-xs font-mono text-zinc-200 transition"
            >
              <Users className="w-3.5 h-3.5 text-cyan-400" />
              <span>MANAGE_OPERATORS</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-zinc-500" />
            </Link>
          )}
        </div>

        {/* Telemetry Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-4 backdrop-blur-md">
            <div className="flex items-center justify-between text-xs font-mono text-zinc-400 mb-2">
              <span>REGISTERED_NODES</span>
              <Server className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-mono font-semibold text-zinc-100">
              {totalInstances}
            </div>
            <div className="mt-2 text-[11px] font-mono text-zinc-500 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              <span>Admin API endpoints (:2019)</span>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-4 backdrop-blur-md">
            <div className="flex items-center justify-between text-xs font-mono text-zinc-400 mb-2">
              <span>CONFIG_REVISIONS</span>
              <History className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-mono font-semibold text-zinc-100">
              #{String(totalRevisions).padStart(4, "0")}
            </div>
            <div className="mt-2 text-[11px] font-mono text-zinc-500 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Immutable JSON snapshots</span>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-4 backdrop-blur-md">
            <div className="flex items-center justify-between text-xs font-mono text-zinc-400 mb-2">
              <span>OPERATORS</span>
              <Users className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-mono font-semibold text-zinc-100">
              {totalUsers}
            </div>
            <div className="mt-2 text-[11px] font-mono text-zinc-500 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span>1 admin · {Math.max(0, totalUsers - 1)} managed</span>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-4 backdrop-blur-md">
            <div className="flex items-center justify-between text-xs font-mono text-zinc-400 mb-2">
              <span>SECURITY_POSTURE</span>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-lg font-mono font-semibold text-emerald-400">
              AES-256-GCM
            </div>
            <div className="mt-2 text-[11px] font-mono text-zinc-500 flex items-center gap-1.5">
              <Database className="w-3 h-3 text-zinc-500" />
              <span>Role: {user.role.toUpperCase()}</span>
            </div>
          </div>
        </div>

        {/* Dev Test Environment & System Readiness Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/50 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-zinc-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono font-medium text-zinc-200">
                <Terminal className="w-4 h-4 text-cyan-400" />
                <span>LOCAL_DEV_CADDY_CLUSTER</span>
              </div>
              <span className="text-[11px] font-mono text-zinc-500">
                docker-compose.dev.yml
              </span>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <p className="text-zinc-400 leading-relaxed">
                Two local Caddy instances and upstream echo services are
                configured in{" "}
                <code className="font-mono text-cyan-300">
                  docker-compose.dev.yml
                </code>{" "}
                for testing live configuration reloads and rollbacks:
              </p>
              <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 font-mono space-y-2 text-[11px]">
                <div className="flex items-center justify-between text-zinc-300">
                  <span className="text-emerald-400">caddy-primary</span>
                  <span>Admin API: http://localhost:2019</span>
                  <span className="text-zinc-500">HTTP :8080</span>
                </div>
                <div className="flex items-center justify-between text-zinc-300">
                  <span className="text-cyan-400">caddy-secondary</span>
                  <span>Admin API: http://localhost:2020</span>
                  <span className="text-zinc-500">HTTP :8081</span>
                </div>
              </div>
              <pre className="rounded-lg border border-zinc-800/90 bg-zinc-950/90 p-3 font-mono text-[11px] text-zinc-300 overflow-x-auto">
                docker compose -f docker-compose.dev.yml up -d
              </pre>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/50 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-zinc-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono font-medium text-zinc-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>CONTROL_PLANE_SUBSYSTEMS</span>
              </div>
              <span className="text-[11px] font-mono text-emerald-400">
                M1_ACTIVE
              </span>
            </div>
            <div className="p-5 space-y-2.5 text-xs font-mono">
              <div className="flex items-center justify-between py-1.5 border-b border-zinc-800/60">
                <span className="text-zinc-400">SQLite WAL Persistence</span>
                <span className="text-emerald-400">ONLINE</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-zinc-800/60">
                <span className="text-zinc-400">
                  Single-Admin + Operator RBAC
                </span>
                <span className="text-emerald-400">ENFORCED</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-zinc-800/60">
                <span className="text-zinc-400">
                  AES-256-GCM Secret Vault
                </span>
                <span className="text-emerald-400">READY</span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-zinc-400">Session Identity</span>
                <span className="text-cyan-300">
                  {user.username} ({user.role})
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
