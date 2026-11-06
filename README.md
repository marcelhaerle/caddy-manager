# Caddy Manager

A centralized web management UI for controlling, inspecting, and auditing one or multiple [Caddy](https://caddyserver.com/) instances via the Caddy Admin API.

## Overview

**Caddy Manager** provides a secure dashboard to manage Caddy web servers without manually crafting deep JSON payloads or SSHing into individual hosts. Every configuration change is versioned in an audit log with full JSON snapshots, side-by-side diffs, and one-click rollback capabilities.

## Key Features

- **Multi-Instance Management**: Connect and monitor multiple Caddy instances (`production`, `staging`, `dev`) with encrypted authentication credentials at rest.
- **Visual Reverse Proxy & Route Builder**: Create, edit, and remove reverse proxies, load-balanced upstreams, TLS policies, custom headers, redirects, and static file routes through an intuitive UI.
- **Live Config Inspector & Caddyfile Importer**: View and edit live Caddy JSON configurations or convert `Caddyfile` syntax via Caddy's `/adapt` API with a built-in Monaco Editor.
- **Full Audit Log & One-Click Rollback**: Track every change (who, when, summary, and before/after JSON diff) and revert any instance to a previous configuration snapshot atomically via `POST /load`.
- **Drift Detection**: Automatically detect out-of-band changes made directly on a Caddy instance and sync them to the audit history.
- **Role-Based Access Control**: Single primary `admin` account that can create and manage non-admin users (`editor` and `viewer` roles).
- **Sleek Developer-First UI**: Dark-mode-first, high-density interface with monospace technical telemetry, live JSON payload previews, and IDE-grade diff views designed for infrastructure nerds.

## Technology Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router, TypeScript)
- **Database & ORM**: SQLite (`better-sqlite3`) + [Drizzle ORM](https://orm.drizzle.team/)
- **Authentication**: Signed HTTP-only JWT sessions (`jose`) + password hashing
- **UI & Styling**: [Tailwind CSS](https://tailwindcss.com/), [shadcn/ui](https://ui.shadcn.com/), [Lucide Icons](https://lucide.dev/)
- **Code & Diff Editor**: [Monaco Editor](https://microsoft.github.io/monaco-editor/) (`@monaco-editor/react`)
- **Validation**: [Zod](https://zod.dev/) + React Hook Form

## Getting Started

### Prerequisites

- **Node.js** 20+ and **npm**
- **Docker & Docker Compose** (optional, for running local test Caddy instances)

### 1. Start Local Test Caddy Instances (Optional)

To spin up local Caddy instances (`caddy-primary` on `:2019` and `caddy-secondary` on `:2020`) along with sample upstream services for testing:

```bash
docker compose -f docker-compose.dev.yml up -d
```

### 2. Install Dependencies & Setup Environment

```bash
npm install
cp .env.example .env
```

### 3. Initialize the Database

```bash
npm run db:push
```

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. On first launch, you will be prompted to create the initial **Admin** account.

## Development Workflow

This project uses a **Feature-Branch Workflow** where `main` always remains in a clean, buildable, and releasable state.

### 1. Branch Naming Convention

All work must be done in dedicated short-lived branches created from `main`:

- `feat/<milestone-or-feature>` — New features or milestone implementations (e.g., `feat/m1-project-setup`, `feat/m1-auth-system`, `feat/m2-instance-crud`)
- `fix/<issue-description>` — Bug fixes (e.g., `fix/caddy-load-timeout`)
- `refactor/<scope>` — Code restructuring without behavior changes
- `docs/<scope>` — Documentation updates (e.g., `docs/workflow-and-agents`)
- `chore/<scope>` — Build, tooling, dependencies, or Docker configuration

### 2. Step-by-Step Workflow

1. **Sync `main` and create a feature branch**:
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feat/<branch-name>
   ```
2. **Develop & Commit**:
   Write focused, incremental commits following [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat(auth): implement initial admin setup and JWT session login`
   - `feat(caddy): add CaddyClient for GET /config/ and POST /load`
   - `fix(audit): handle empty config state on initial sync`
   - `test(crypto): add unit tests for AES-256-GCM secret encryption`
3. **Verify Quality Gates Before Merging**:
   ```bash
   npm run lint
   npm run test
   npm run build
   ```
4. **Merge / Pull Request**:
   Push the feature branch to `origin` and merge into `main` via Pull Request (or `--no-ff` merge after review) once all checks pass.

For AI coding assistants and automated contributors, see [AGENTS.md](./AGENTS.md) for strict repository rules and workflow instructions.

## Project Roadmap

See [implementation_plan.md](./implementation_plan.md) for the complete architecture, database schema, and development milestones:

1. **Milestone 1**: Project Initialization, Database & Authentication
2. **Milestone 2**: Multi-Instance Connection Management & Health Monitoring
3. **Milestone 3**: Live Configuration Viewer & Drift Sync
4. **Milestone 4**: Visual Reverse Proxy & Route Management
5. **Milestone 5**: Audit Log, Diff Viewer & One-Click Rollback
6. **Milestone 6**: Testing, Polish & Docker Packaging

## License

MIT
