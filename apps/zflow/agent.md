# ZFlow Agent Development Guide

This guide distills the core architecture decisions and coding practices for the ZFlow application. Use it as the default playbook whenever you plan, implement, or review changes.

## Core Principles

- **Feature Isolation**: Treat each feature directory as a self-contained module with its own UI, hooks, API layer, and types.
- **Type Safety**: Write strict TypeScript everywhere; prefer explicit interfaces and return types.
- **Consistency First**: Follow established naming, file placement, and import aliases to preserve discoverability.
- **Simplicity & Maintainability**: Optimize for clarity over cleverness; shared abstractions live in dedicated libraries.
- **Backward Compatibility**: Preserve existing public APIs and barrel exports when evolving features.

## Project Structure Snapshot

```
apps/zflow/
├── app/                 # Thin Next.js routes delegating to features
├── features/            # Primary home for domain code (feature-first)
├── shared/              # Cross-feature UI and utilities (client-safe)
├── hooks/               # Cross-cutting reusable hooks
├── lib/                 # Core libraries, API base utilities
└── types/               # Domain, UI, and shared type definitions
```

- Routes under `app/` should only compose feature entry points.
- Each feature exports a clean public API via `features/<feature>/index.ts`.
- Shared code belongs in `shared/` or `hooks/` only when it is reused by multiple features.

### Feature Directory Anatomy

```
features/<feature>/
├── api/          # REST clients scoped to the feature domain
├── components/   # Feature UI (PascalCase files)
├── hooks/        # Business logic + data orchestration
├── mocks/        # Test fixtures and generators
├── types/        # Domain contracts, DTOs, enums
├── utils/        # Feature-only helpers
└── index.ts      # Curated public surface area
```

- Keep feature internals private; export only stable building blocks.
- Prefer colocated tests (e.g., `components/__tests__/MyCard.test.tsx`).
- When a feature owns a route, provide a `FeaturePage.tsx` and re-export it from the index file.

## Feature Development Workflow

1. **Plan Structure**: Scaffold `features/new-feature/{components,hooks,api,types,utils,mocks}`.
2. **Define Contracts**: Start with types and API methods; keep URLs relative to `API_BASE`.
3. **Implement Hooks**: Encapsulate feature logic and data fetching behind hooks.
4. **Build UI**: Create feature-scoped components; export only what other modules need.
5. **Expose Public API**: Re-export hooks, API clients, types, and reusable components from the feature index.
6. **Wire Routes**: Keep `app/<route>/page.tsx` minimal—import the feature page component and export it.

## API & Data Layer Guidelines

- Import `API_BASE`, `authenticatedFetch`, and related helpers from `lib/api/api-base`.
- `API_BASE` already includes the `/api` prefix—never append `/api` in endpoint strings.
- Use consistent error handling: parse JSON safely and throw `APIError` with status awareness.
- Always request auth headers via `authManager.getAuthHeaders()` before network calls outside of `authenticatedFetch`.
- Keep domain APIs in `lib/api/` or inside the relevant feature’s `api/` folder and re-export through barrel files.
- Maintain backward compatibility by updating `lib/api/index.ts` when new modules are added.
- Respect cross-origin settings: rely on `IS_CROSS_ORIGIN` and `API_ORIGIN` exports when configuring custom fetch logic or SSR.

### Standard Request Template

```typescript
import { API_BASE, authenticatedFetch, APIError } from '@/lib/api/api-base'

export async function createExample(payload: ExampleInput) {
  const response = await authenticatedFetch(`${API_BASE}/examples`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new APIError(response.status, errorData.error ?? `Failed: ${response.status}`)
  }

  return response.json() as Promise<Example>
}
```

### Hooks Consuming APIs

- Retrieve auth headers via `authManager.getAuthHeaders()` when `authenticatedFetch` is not used.
- Co-locate SWR or React Query usage inside feature hooks; expose a simple API to components.
- Normalize responses into typed models before returning them from hooks.
- Handle loading, error, and optimistic update states consistently across features.

## Shared Libraries & Utilities

- Lean on `@/shared` for cross-feature utilities, components, and formatting helpers.
- Use the barrel exports in `shared/utils/index.ts` and `shared/components/index.ts`.
- Never import `shared/utils/redis` on the client—server-only utilities stay opt-in via direct import.
- Create shared abstractions only after at least two features need the same logic; otherwise keep functionality local to the feature.
- Shared hooks in `apps/zflow/hooks/` are reserved for truly cross-cutting concerns (e.g., task operations, celebration animations, modal state).
- When promoting feature logic to `@/shared`, ensure Tailwind content globs and path aliases already include the new location.

## UI, Styling & Components

- Component filenames use PascalCase; colocate feature-specific components under `features/<feature>/components`.
- Shared UI primitives live under `shared/components` and are categorized (`ui`, `layout`, `forms`, `data-display`, `feedback`, `portals`).
- Update Tailwind `content` globs whenever you add new directories to avoid purged styles.
- Favor composition over inheritance—features compose shared primitives with local styling.
- Keep server-only UI (e.g., components using `redis.ts`) in server routes or dedicated server modules.
- Use Tailwind utility classes consistently; avoid inline styles unless required for dynamic calculations.
- For animations or complex interactions, centralize motion variants in the feature’s `utils/` or shared animation helpers.

## Imports & Module Boundaries

- Use path aliases defined in `tsconfig.json` (`@/features/*`, `@/shared/*`, `@/lib/*`, etc.).
- Import from feature public APIs (`@/features/tasks`) instead of deep internal paths.
- Relative imports are acceptable only within the same feature.
- Avoid cross-feature coupling: share state through contexts or shared hooks, not direct feature imports.

## Authentication & Security

- All network requests must include auth headers from the auth manager or use `authenticatedFetch`.
- Do not expose server-only utilities to client bundles; respect the shared library’s export boundaries.
- Maintain consistent error surfaces so the UI can react predictably to authentication failures.
- Validate authentication flows in development by checking the network tab for missing headers or 401 responses.
- Keep secrets in `.env.local` files; never hardcode sensitive values in the repo.

## Performance Practices

- Apply lazy loading (`React.lazy`) for heavy feature components and ensure suspense boundaries exist where needed.
- Memoize expensive computations and wrap pure components with `React.memo` when prop churn is high.
- Monitor bundle size when introducing new dependencies; leverage existing shared components first.
- Use dynamic imports on a per-feature basis to defer non-critical code.
- Prefer derived state over duplicated state to reduce unnecessary re-renders.
- Leverage browser performance tools to confirm that lazy-loaded features resolve quickly and that suspense fallbacks are meaningful.

## Testing & Validation

- Co-locate unit tests under feature directories (`__tests__` or `*.test.ts(x)`).
- Test hooks with React Testing Library; mock API layers via feature mocks.
- Before merging, run `npm run type-check` and `npm run lint`; add targeted tests for new behavior.
- Validate network flows in the browser: confirm URLs omit duplicate `/api`, auth headers are present, and responses follow the standard shape.
- Add integration tests when features coordinate across modules (e.g., tasks interacting with timeline).
- Keep snapshot tests stable by limiting them to presentational components; prefer behavioral assertions.
- Ensure Storybook or local playgrounds load correctly when introducing new shared components (if applicable).

## Build & Tooling Checklist

- `npm run dev` – start local development across workspaces.
- `npm run build` – ensure production builds succeed.
- `npm run lint` – keep ESLint clean; fix warnings promptly.
- `npm run type-check` – enforce strict TypeScript.

## Common Pitfalls to Avoid

- **Double API Paths**: Never concatenate `/api` to `API_BASE`.
- **Missing Tailwind Paths**: Update the Tailwind `content` array when relocating components.
- **Bypassing Auth**: Always include auth headers; anonymous fetches will fail.
- **Encapsulation Leaks**: Do not import feature internals from other features or from routes.
- **Client/Server Mix-ups**: Keep `redis.ts` and other server-only helpers out of client bundles.
- **Deprecated Directories**: Avoid reintroducing removed folders such as legacy `app/utils` or old hook subfolders.
- **Alias Drift**: Whenever a new top-level directory is added, update `tsconfig.json` aliases and eslint import resolvers together.

## Refactoring & Migration Playbook

- Follow the established migration phases: extract business logic, consolidate components, update public APIs, then modernize routes.
- When moving files, update barrel exports immediately to prevent broken imports.
- Confirm Tailwind, lint, and TypeScript configs include new paths before deleting legacy directories.
- Communicate major refactors via documentation updates and feature READMEs.

## Pull Request Readiness Checklist

- [ ] Feature file structure follows the feature-first template.
- [ ] All imports use approved aliases or local relative paths.
- [ ] Tests, linting, and type checking succeed locally.
- [ ] API calls include auth, correct base URLs, and consistent error handling.
- [ ] Tailwind `content` globs cover any new folders.
- [ ] Documentation (this guide, feature docs, or READMEs) updated if behavior or architecture changed.

## Maintaining This Guide

- Update this document whenever architecture decisions or coding rules evolve.
- Cross-reference `CODING_RULES.md` and `ARCHITECTURE_GUIDE.md` after major refactors to keep guidance aligned.

For additional context, consult the latest `CODING_RULES.md`, `ARCHITECTURE_GUIDE.md`, and feature-specific docs. Keep the conversation open—surface gaps or emerging patterns so the guide stays ahead of the codebase.

Staying consistent with these practices keeps ZFlow’s feature-first architecture reliable, scalable, and friendly to future contributors.
