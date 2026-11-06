"use client";

import { useState } from "react";
import {
  UserPlus,
  Shield,
  KeyRound,
  Trash2,
  Power,
  AlertCircle,
  CheckCircle2,
  Loader2,
  X,
} from "lucide-react";
import type { SafeUser } from "@/db/schema";
import { cn, formatTimestamp } from "@/lib/utils";

interface UsersClientProps {
  initialUsers: SafeUser[];
}

export function UsersClient({ initialUsers }: UsersClientProps) {
  const [users, setUsers] = useState<SafeUser[]>(initialUsers);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [resetTarget, setResetTarget] = useState<SafeUser | null>(null);

  // Create form state
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"editor" | "viewer">("editor");

  // Reset password state
  const [newPassword, setNewPassword] = useState("");

  // Feedback state
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBanner(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password, role }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create operator.");
        setSubmitting(false);
        return;
      }

      setUsers((prev) => [...prev, data.user]);
      setUsername("");
      setEmail("");
      setPassword("");
      setRole("editor");
      setShowCreateModal(false);
      setBanner(`Provisioned operator '${data.user.username}' (${data.user.role}).`);
    } catch {
      setError("Network error while creating operator.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRoleChange(user: SafeUser, nextRole: "editor" | "viewer") {
    setError(null);
    setBanner(null);
    setLoadingId(user.id);

    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: nextRole }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to update role.");
        return;
      }

      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? data.user : u))
      );
      setBanner(`Updated role for '${user.username}' to ${nextRole.toUpperCase()}.`);
    } catch {
      setError("Network error while updating role.");
    } finally {
      setLoadingId(null);
    }
  }

  async function handleToggleActive(user: SafeUser) {
    setError(null);
    setBanner(null);
    setLoadingId(user.id);

    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !user.isActive }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to toggle user status.");
        return;
      }

      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? data.user : u))
      );
      setBanner(
        `Operator '${user.username}' is now ${data.user.isActive ? "ACTIVE" : "SUSPENDED"}.`
      );
    } catch {
      setError("Network error while toggling user status.");
    } finally {
      setLoadingId(null);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!resetTarget) return;

    setError(null);
    setBanner(null);
    setSubmitting(true);

    try {
      const res = await fetch(`/api/users/${resetTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to reset password.");
        setSubmitting(false);
        return;
      }

      setBanner(`Rotated credentials for '${resetTarget.username}'.`);
      setResetTarget(null);
      setNewPassword("");
    } catch {
      setError("Network error while resetting password.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteUser(user: SafeUser) {
    if (
      !window.confirm(
        `Delete operator '${user.username}' (${user.email}) permanently?`
      )
    ) {
      return;
    }

    setError(null);
    setBanner(null);
    setLoadingId(user.id);

    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to delete operator.");
        return;
      }

      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      setBanner(`Deleted operator '${user.username}'.`);
    } catch {
      setError("Network error while deleting operator.");
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 mb-1">
            <span>RBAC // OPERATOR_DIRECTORY</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">
            Operator Access Management
          </h1>
          <p className="text-sm text-zinc-400 mt-0.5">
            Provision and manage non-admin operators (
            <code className="font-mono text-emerald-300">editor</code> &{" "}
            <code className="font-mono text-zinc-300">viewer</code>) with
            full audit attribution.
          </p>
        </div>

        <button
          onClick={() => {
            setError(null);
            setShowCreateModal(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-semibold text-xs font-mono transition shadow-lg shadow-cyan-500/15 cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>+ PROVISION_OPERATOR</span>
        </button>
      </div>

      {/* Feedback Banners */}
      {error && (
        <div className="rounded-lg border border-rose-500/40 bg-rose-950/30 px-4 py-3 text-xs font-mono text-rose-200 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            {error}
          </span>
          <button
            onClick={() => setError(null)}
            className="text-rose-400 hover:text-rose-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {banner && (
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-950/30 px-4 py-3 text-xs font-mono text-emerald-200 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            {banner}
          </span>
          <button
            onClick={() => setBanner(null)}
            className="text-emerald-400 hover:text-emerald-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Role Matrix Legend */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
        <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-3">
          <div className="flex items-center gap-1.5 font-mono text-cyan-300 font-semibold mb-1">
            <Shield className="w-3.5 h-3.5" />
            <span>ROLE :: ADMIN (SINGLETON)</span>
          </div>
          <p className="text-zinc-400">
            Root control plane account. Full access to Caddy instances, config
            mutations, rollbacks, and operator management.
          </p>
        </div>
        <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-3">
          <div className="flex items-center gap-1.5 font-mono text-emerald-300 font-semibold mb-1">
            <Shield className="w-3.5 h-3.5" />
            <span>ROLE :: EDITOR</span>
          </div>
          <p className="text-zinc-400">
            Can manage Caddy instances, create/edit reverse proxies, push raw
            JSON/Caddyfile configs, and execute rollbacks.
          </p>
        </div>
        <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-3">
          <div className="flex items-center gap-1.5 font-mono text-zinc-300 font-semibold mb-1">
            <Shield className="w-3.5 h-3.5" />
            <span>ROLE :: VIEWER</span>
          </div>
          <p className="text-zinc-400">
            Read-only telemetry access. Can inspect live Caddy configurations,
            routes, and side-by-side audit diffs.
          </p>
        </div>
      </div>

      {/* Operators Table */}
      <div className="rounded-xl border border-zinc-800/90 bg-zinc-900/60 overflow-hidden backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800/90 bg-zinc-950/60 text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                <th className="py-3 px-4">Operator</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Created</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-xs font-mono">
              {users.map((u) => {
                const isAdmin = u.role === "admin";
                const isBusy = loadingId === u.id;

                return (
                  <tr
                    key={u.id}
                    className="hover:bg-zinc-800/30 transition group"
                  >
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-zinc-100 flex items-center gap-2">
                        <span>{u.username}</span>
                        {isAdmin && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
                            PRIMARY
                          </span>
                        )}
                      </div>
                      <div className="text-zinc-500 text-[11px]">{u.email}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      {isAdmin ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-cyan-500/40 bg-cyan-500/10 text-cyan-300 text-[11px] uppercase">
                          <Shield className="w-3 h-3" />
                          admin
                        </span>
                      ) : (
                        <select
                          disabled={isBusy}
                          value={u.role}
                          onChange={(e) =>
                            handleRoleChange(
                              u,
                              e.target.value as "editor" | "viewer"
                            )
                          }
                          className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs font-mono text-zinc-200 focus:outline-none focus:border-cyan-500/60 cursor-pointer"
                        >
                          <option value="editor">editor</option>
                          <option value="viewer">viewer</option>
                        </select>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] border",
                          u.isActive
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                            : "border-rose-500/30 bg-rose-500/10 text-rose-300"
                        )}
                      >
                        <span
                          className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            u.isActive ? "bg-emerald-400" : "bg-rose-400"
                          )}
                        />
                        {u.isActive ? "ACTIVE" : "SUSPENDED"}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-zinc-400 text-[11px]">
                      {formatTimestamp(u.createdAt)}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setError(null);
                            setNewPassword("");
                            setResetTarget(u);
                          }}
                          title="Reset Password"
                          className="px-2.5 py-1 rounded border border-zinc-800 hover:border-cyan-500/40 bg-zinc-950/80 text-zinc-300 hover:text-cyan-300 text-[11px] inline-flex items-center gap-1 transition cursor-pointer"
                        >
                          <KeyRound className="w-3 h-3" />
                          <span>KEY</span>
                        </button>

                        {!isAdmin && (
                          <>
                            <button
                              disabled={isBusy}
                              onClick={() => handleToggleActive(u)}
                              title={
                                u.isActive
                                  ? "Suspend Operator"
                                  : "Activate Operator"
                              }
                              className="px-2.5 py-1 rounded border border-zinc-800 hover:border-amber-500/40 bg-zinc-950/80 text-zinc-300 hover:text-amber-300 text-[11px] inline-flex items-center gap-1 transition cursor-pointer"
                            >
                              <Power className="w-3 h-3" />
                              <span>{u.isActive ? "SUSPEND" : "ENABLE"}</span>
                            </button>

                            <button
                              disabled={isBusy}
                              onClick={() => handleDeleteUser(u)}
                              title="Delete Operator"
                              className="p-1.5 rounded border border-zinc-800 hover:border-rose-500/40 bg-zinc-950/80 text-zinc-400 hover:text-rose-400 transition cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Non-Admin User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-mono font-semibold text-zinc-100">
                <UserPlus className="w-4 h-4 text-cyan-400" />
                <span>PROVISION_NEW_OPERATOR</span>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-zinc-500 hover:text-zinc-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-mono uppercase text-zinc-400">
                  Username
                </label>
                <input
                  type="text"
                  required
                  minLength={3}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="devops-jane"
                  className="w-full px-3 py-2 text-sm font-mono bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 focus:outline-none focus:border-cyan-500/70"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-mono uppercase text-zinc-400">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jane@example.com"
                  className="w-full px-3 py-2 text-sm font-mono bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 focus:outline-none focus:border-cyan-500/70"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-mono uppercase text-zinc-400">
                  Initial Password (min 8 chars)
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 text-sm font-mono bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 focus:outline-none focus:border-cyan-500/70"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-mono uppercase text-zinc-400">
                  Operator Role
                </label>
                <select
                  value={role}
                  onChange={(e) =>
                    setRole(e.target.value as "editor" | "viewer")
                  }
                  className="w-full px-3 py-2 text-sm font-mono bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 focus:outline-none focus:border-cyan-500/70"
                >
                  <option value="editor">
                    editor — Modify Caddy configs, routes & rollbacks
                  </option>
                  <option value="viewer">
                    viewer — Read-only access to configs & audit logs
                  </option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3.5 py-2 rounded-lg border border-zinc-800 text-xs font-mono text-zinc-400 hover:text-zinc-200 cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-semibold text-xs font-mono inline-flex items-center gap-1.5 cursor-pointer"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>CREATE_OPERATOR</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Rotation Modal */}
      {resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-mono font-semibold text-zinc-100">
                <KeyRound className="w-4 h-4 text-cyan-400" />
                <span>ROTATE_KEY // {resetTarget.username}</span>
              </div>
              <button
                onClick={() => setResetTarget(null)}
                className="text-zinc-500 hover:text-zinc-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-mono uppercase text-zinc-400">
                  New Password for {resetTarget.username}
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  autoFocus
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 text-sm font-mono bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 focus:outline-none focus:border-cyan-500/70"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResetTarget(null)}
                  className="px-3.5 py-2 rounded-lg border border-zinc-800 text-xs font-mono text-zinc-400 hover:text-zinc-200 cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-semibold text-xs font-mono inline-flex items-center gap-1.5 cursor-pointer"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>ROTATE_PASSWORD</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
