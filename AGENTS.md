# AGENTS.md — AI Coding Agent Guidelines for Caddy Manager

This file defines the mandatory architecture, coding standards, and Git workflow rules for AI coding agents working on **Caddy Manager**.

---

## 1. Project Context & Architecture

- **Purpose**: Web management UI to control, inspect, modify, and audit one or multiple Caddy instances via the Caddy Admin API (`:2019`).
- **Roadmap & Specification**: Always consult [implementation_plan.md](./implementation_plan.md) before starting a task or milestone.
- **Tech Stack**:
  - **Framework**: Next.js (App Router, TypeScript, `src/` directory)
  - **Database**: SQLite (`better-sqlite3`) + Drizzle ORM (`drizzle-orm`, `drizzle-kit`)
  - **Auth**: Single `admin` user + managed non-admin users (`editor`, `viewer`) using signed HTTP-only JWT cookies (`jose`) and password hashing
  - **UI**: Tailwind CSS, `shadcn/ui`, Lucide Icons, Monaco Editor (`@monaco-editor/react`)
  - **Validation**: Zod + React Hook Form

---

## 2. Mandatory Git & Feature-Branch Workflow

**NEVER commit directly to `main` for feature, bugfix, or milestone implementation work.**

### Branching Rules
1. **Before writing code**, check the current Git branch (`git status` / `git branch --show-current`).
2. If on `main`, create and switch to a appropriately named branch:
   - `feat/m1-<feature-slug>` (e.g., `feat/m1-scaffold-and-db`, `feat/m1-auth-and-users`)
   - `feat/m2-<feature-slug>` (e.g., `feat/m2-caddy-instances`)
   - `fix/<bug-slug>`
   - `docs/<doc-slug>`
   - `chore/<task-slug>`
3. Keep branches scoped to a single milestone sub-task or cohesive feature so changes are easy to review, test, and revert if needed.

### Commit Conventions
Use **Conventional Commits** for every commit message:
- `feat(<scope>): <concise summary>`
- `fix(<scope>): <concise summary>`
- `refactor(<scope>): <concise summary>`
- `test(<scope>): <concise summary>`
- `docs(<scope>): <concise summary>`
- `chore(<scope>): <concise summary>`

Common scopes: `setup`, `db`, `auth`, `users`, `instances`, `caddy`, `routes`, `editor`, `audit`, `docker`.

### Definition of Done (Pre-Merge Checklist)
Before declaring a feature branch complete or asking the user to merge to `main`:
1. **Typecheck & Lint**: Ensure `npm run lint` and TypeScript compilation pass with zero errors.
2. **Build Check**: Ensure `npm run build` succeeds (once the Next.js project is scaffolded).
3. **Tests**: Run `npm run test` (when applicable) and verify local behavior against `docker-compose.dev.yml` Caddy instances.
4. **Clean Working Tree**: Verify `git status` shows no untracked temporary files, SQLite `.db` files, or `.env` secrets.

---

## 3. Core Domain & Security Rules

1. **Caddy Admin API Safety**:
   - All requests to Caddy instances (`GET /config/`, `POST /load`, `POST /adapt`) MUST happen **server-side** in Next.js Route Handlers or Server Actions—never directly from the browser.
   - Always fetch the current live config (`GET /config/`) right before applying mutations to detect out-of-band configuration drift.
   - Use Caddy's `@id` property (e.g., `cm-route-<uuid>`) on managed routes so unmanaged Caddy config blocks remain intact.

2. **Mandatory Audit Logging**:
   - Every configuration change pushed to a Caddy instance (`create_proxy`, `update_proxy`, `delete_proxy`, `raw_edit`, `caddyfile_import`, `rollback`, `sync`) MUST create a record in `config_revisions` containing:
     - `instance_id` & `user_id`
     - `revision_number` (incrementing per instance)
     - `previous_config_json` & `new_config_json`
     - `summary` (human-readable description)
     - `status` (`applied` or `failed`) and `error_message` if rejected by Caddy.

3. **Role-Based Access Control (RBAC)**:
   - `admin`: Single administrator account. Full access to instances, configs, rollbacks, and `/users` management (creating/editing/deleting non-admin users).
   - `editor`: Can view and modify Caddy configurations and perform rollbacks, and manage instances, but **cannot** manage users.
   - `viewer`: Read-only access to dashboards, live configs, and audit logs. Must be blocked at both UI and API/Server Action levels from mutating state.

4. **Secrets & Environment**:
   - Encrypt Caddy instance credentials (`encrypted_auth_secret`) at rest in SQLite using AES-256-GCM with `process.env.ENCRYPTION_KEY`.
   - Never commit `.env`, `*.db`, `*.sqlite`, or secret keys to Git. Always keep `.env.example` updated when adding new environment variables.

---

## 4. UI / UX Design System ("Tech Nerd" Developer Aesthetic)

The UI must feel **modern, sleek, high-density, and purpose-built for infrastructure engineers and tech nerds** (inspired by Vercel, Linear, Cloudflare, and Raycast):

1. **Dark-First, High-Contrast Palette**:
   - Deep obsidian/slate backgrounds (`#090a0f` / `zinc-950`), subtle elevated surfaces (`zinc-900/70` with `backdrop-blur`), and crisp `1px` borders (`border-zinc-800/80` with subtle cyan/emerald glow on active states).
   - Semantic status indicators with glowing dot badges (`emerald` for online/applied, `amber` for drift/warning, `rose` for offline/failed, `cyan` for Caddy-managed resources).
2. **Typography & Monospace Precision**:
   - Clean geometric sans-serif (`Geist` or `Inter`) for UI chrome paired with a sharp monospace font (`JetBrains Mono` or `Geist Mono`) for **all** technical primitives: domains, upstream `ip:port` targets, ports, HTTP methods, SHA hashes, revision numbers (`rev #14`), timestamps, and JSON paths.
3. **Information Density & Telemetry Feel**:
   - Compact, scannable tables and cards showing real-time telemetry at a glance (e.g., `app.example.com → 10.0.0.5:8080`, TLS badge, latency/status, `@id` tag) without wasted whitespace.
   - Inline copy-to-clipboard buttons for URLs, `@id` tags, config hashes, and JSON snippets.
4. **Power-User Ergonomics**:
   - Keyboard-friendly workflows (e.g., `Cmd/Ctrl + K` command palette / quick instance switcher, `Cmd/Ctrl + S` in the raw editor).
   - Split-pane previews (e.g., live Caddy JSON preview while filling out the visual Reverse Proxy form) and side-by-side Monaco diff views with dark syntax highlighting.
