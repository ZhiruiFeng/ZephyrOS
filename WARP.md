# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

Monorepo overview
- Tooling: Turborepo + npm workspaces, Node 20.x
- Apps:
  - apps/zflow: Next.js frontend (port 3000)
  - apps/zmemory: Next.js API backend (port 3001)
  - apps/zmemory-mcp: MCP server (stdio) for AI agents
  - apps/zflow-ios: React Native (Expo) client
- Shared: packages/shared for types/utils

Common commands
- Install (root):
  ```bash path=null start=null
  npm install
  ```
- Run all apps in dev (Turbo):
  ```bash path=null start=null
  npm run dev
  ```
- Run a single workspace in dev:
  ```bash path=null start=null
  npm run dev -w @zephyros/zflow           # Frontend (:3000)
  npm run dev -w @zephyros/zmemory-api     # API (:3001)
  npm run dev -w @zephyros/zmemory-mcp     # MCP server (stdio)
  npm run dev -w @zephyros/zflow-ios       # Expo dev server
  ```
- Build (all) and start (per app):
  ```bash path=null start=null
  npm run build
  npm run build -w @zephyros/zflow
  npm run build -w @zephyros/zmemory-api
  npm run build -w @zephyros/zmemory-mcp
  npm run build -w @zephyros/shared
  # start production servers
  npm start -w @zephyros/zflow
  npm start -w @zephyros/zmemory-api
  npm start -w @zephyros/zflow-ios         # Expo export runs separately; see app README
  ```
- Lint and type-check:
  ```bash path=null start=null
  npm run lint
  npm run type-check
  # per workspace
  npm run lint -w @zephyros/zflow
  npm run lint -w @zephyros/zmemory-api
  npm run lint -w @zephyros/zflow-ios
  npm run type-check -w @zephyros/zflow
  npm run type-check -w @zephyros/zmemory-api
  npm run type-check -w @zephyros/zmemory-mcp
  npm run type-check -w @zephyros/shared
  ```
- Tests
  - API (apps/zmemory) uses Jest; Postman collection via Newman:
    ```bash path=null start=null
    npm test -w @zephyros/zmemory-api            # Jest
    npm run test:watch -w @zephyros/zmemory-api
    npm run test:coverage -w @zephyros/zmemory-api
    npm run test:api -w @zephyros/zmemory-api    # Newman collection
    ```
  - MCP (apps/zmemory-mcp) tests and utilities:
    ```bash path=null start=null
    npm test -w @zephyros/zmemory-mcp
    npm run test:oauth -w @zephyros/zmemory-mcp
    npm run test:mcp -w @zephyros/zmemory-mcp
    ```
  - Run a single Jest test (examples):
    ```bash path=null start=null
    # by file
    npm test -w @zephyros/zmemory-api -- apps/zmemory/__tests__/health.test.ts
    # by name pattern
    npm test -w @zephyros/zmemory-api -- -t "health"
    ```
- API docs generation (apps/zmemory):
  ```bash path=null start=null
  npm run docs:generate -w @zephyros/zmemory-api
  ```
- iOS app (Expo) helpers from repo root:
  ```bash path=null start=null
  npm run ios:dev      # Start Expo dev server
  npm run ios          # Launch iOS simulator
  ```

Environment notes
- Minimum for local dev (see README for details):
  - NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
  - NEXT_PUBLIC_API_URL (frontend -> API): default http://localhost:3001
- MCP server env (dev): ZMEMORY_API_URL; optional: ZMEMORY_API_KEY, ZMEMORY_TIMEOUT
- Agents SSE in production requires Redis: set REDIS_URL (local dev uses in-memory fallback)
- Turbo propagates env per task (see turbo.json) for dev pipelines

High-level architecture
- Flow of data and responsibilities
  - zflow (Next.js app) is a pure frontend that calls zmemory over HTTP. Authentication flows via Supabase; the browser client includes an Authorization: Bearer <token> header.
  - zmemory (Next.js API routes) implements REST endpoints under apps/zmemory/app/api. It constructs a Supabase server client from the incoming bearer token and relies on database RLS for per-user isolation.
  - zmemory-mcp bridges AI agents via MCP (JSON-RPC over stdio or serverless handler) to the same zmemory API, exposing tools for memory/task CRUD and stats.
  - Database is Supabase (PostgreSQL). Schemas and SQL live under supabase/ (see repository tree in README); APIs validate input with Zod.
- Monorepo boundaries and shared code
  - Shared types/utilities are in packages/shared (built with tsc). Web and API consume them via TS path aliases (e.g., @zephyros/shared mapped to ../../packages/shared/src in app tsconfig).
  - Turbo orchestrates dev/build/lint/type-check across workspaces. Outputs are .next/** for Next.js apps and dist/** for libraries/MCP.
- Runtime endpoints and ports
  - Frontend: http://localhost:3000
  - API: http://localhost:3001 (e.g., /api/health, /api/tasks, /api/memories)
  - MCP: Node process (dev via tsx) or serverless function (api/mcp.js) in production
- Notable subsystems in zflow
  - Component groups (auth, ui, modals, editors, navigation, selectors, views) with index-barrel exports for clean imports
  - Profile dashboard is module-driven (components/profile with hooks/useProfileModules) allowing user-configurable layout
  - EnergySpectrum is fully modularized (components/ui/EnergySpectrumPackage) with desktop/mobile split and custom hooks
  - Work Mode page is refactored to smaller components + hooks for smooth task switching

Pointers to project docs (read selectively when needed)
- Root README: architecture diagram, quick start, API examples, auth flow notes, and production SSE requirements
- guidance/: system architecture, API reference, MCP integration guide, deployment checklists, and contribution standards
- apps/zmemory/README.md: REST endpoints, examples, and environment specifics
- apps/zmemory-mcp/README.md: MCP tools, OAuth setup scripts, and Vercel deployment notes
- apps/zflow/README.md and nested module READMEs: front-end architecture and refactoring summaries

Conventions and versions
- Node 20.x across workspaces; React 19 across apps
- Linting via next lint (web/API) and eslint config for Expo app
- Typescript strict mode; type-check via tsc --noEmit per workspace
