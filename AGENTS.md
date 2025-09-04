# Repository Guidelines

## Project Structure & Module Organization
- `apps/zflow`: Next.js frontend (port 3000).
- `apps/zmemory`: Next.js API backend with Swagger docs (port 3001).
- `apps/zmemory-mcp`: MCP server for AI agents (Node/TypeScript).
- `packages/shared`: Shared TypeScript utilities and types.
- `supabase/`: SQL, policies, and configuration; `scripts/`, `statics/`, `guidance/` for tooling and docs.

## Build, Test, and Development Commands
- Root (Turbo monorepo):
  - `npm run dev`: start all dev targets.
  - `npm run build`: build all workspaces.
  - `npm run lint`: run ESLint across apps.
  - `npm run type-check`: TypeScript checks everywhere.
- Per workspace (examples):
  - `npm run dev -w @zephyros/zflow`
  - `npm run dev -w @zephyros/zmemory-api`
  - `npm run build -w @zephyros/zmemory-mcp`
  - `npm test -w @zephyros/zmemory-api`

## Coding Style & Naming Conventions
- Language: TypeScript with `strict` enabled.
- Linting: Next.js ESLint config; fix warnings before PRs (`npm run lint`).
- Indentation: 2 spaces; prefer single quotes; no unused `any`.
- Naming: React components `PascalCase.tsx`; utility modules `kebab-case.ts`; API routes `snake-case.ts` as needed by Next.js.
- Imports: use `@/*` and `@zephyros/shared` path aliases when available.

## Testing Guidelines
- Framework: Jest.
- Test files: `__tests__/` or `*.test.ts(x)` / `*.spec.ts(x)`.
- Run:
  - API: `npm test -w @zephyros/zmemory-api`
  - Coverage: `npm run test:coverage -w @zephyros/zmemory-api`
  - MCP: `npm test -w @zephyros/zmemory-mcp`
- Coverage output: `coverage/` (no enforced threshold).

## Commit & Pull Request Guidelines
- Commits: short, imperative, scoped (e.g., `fix api url`, `refine mobile view`).
- PRs: include description, linked issues, validation steps, and screenshots/GIFs for UI changes.
- CI hygiene: ensure `npm run build`, `npm run lint`, and relevant tests pass.

## Security & Configuration Tips
- Env: copy `env.example` to `.env.local` (root) and per-app samples; do not commit secrets.
- Required keys: Supabase `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (see README for more).
- Runtime: Node ≥ 18; ensure ports 3000/3001 are free locally.

