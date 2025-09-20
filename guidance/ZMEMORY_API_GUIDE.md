# ZMemory API Surface Guide

This document inventories the HTTP surface exposed by `apps/zmemory` so that human and automated agents can navigate the backend quickly. It complements the deeper specs in `apps/zmemory/API_AGENTS_DOCUMENTATION.md` and the generated Swagger available at `/api/docs`.

## Architectural Overview
- **Framework**: Next.js App Router; every endpoint lives in `app/api/**/route.ts`.
- **Data layer**: Supabase (Postgres); handlers call `createClientForRequest` / `supabaseServer` for row-level secured queries. When Supabase env vars are missing, most routes fall back to rich mock payloads.
- **Auth**: `lib/auth.ts` resolves the current user via request headers (Supabase JWT) or development defaults.
- **Security & rate limiting**: `lib/security.ts` provides `jsonWithCors`, uniform CORS handling, `isRateLimited`, and `sanitizeErrorMessage` helpers.
- **Validation**: Zod schemas in `lib/validators.ts` (memories, anchors, assets, time entries, activities, relations, AI usage, etc.) and `lib/task-types.ts` (tasks, subtasks). AI agent DTOs live under `types/`.
- **Docs**: `lib/swagger.ts` builds the OpenAPI spec that powers `/api/docs` and `/api/docs/spec` using `next-swagger-doc`.

## Global Helpers & Modules
- `lib/memory-business-logic.ts`: scoring, tag suggestions, and anchor discovery used by memory intelligence endpoints.
- `lib/api-key-service.ts` & `lib/api-key-resolver.ts`: encryption, hashing, and vendor-key verification utilities for `/api/api-keys` and `/api/internal/*`.
- `lib/hybrid-session-manager.ts`, `lib/session-archival-service.ts`: conversation lifecycle helpers.
- `lib/time-utils.ts`: timezone conversions and UTC helpers reused across tasks, energy logs, and memories.
- `lib/transcription-service.ts`, `lib/openai-client.ts`: supporting services for audio/LLM integrations (referenced by AI/task endpoints when enrichment is enabled).

## Domain Index
The tables below group endpoints by domain. Each row lists the HTTP contract, handler location, and the primary validation/types involved.

### Memories
| Endpoint | Methods | Handler | Notes / Key Types |
| --- | --- | --- | --- |
| `/api/memories` | GET, POST | `app/api/memories/route.ts` | End-to-end memory CRUD with advanced filters; uses `MemoryCreateSchema`, `MemoriesQuerySchema`.
| `/api/memories/{id}` | GET, PUT, DELETE | `app/api/memories/[id]/route.ts` | Single-memory retrieval & mutation; leverages `MemoryUpdateSchema` and Supabase row-level ownership checks.
| `/api/memories/search` | GET | `app/api/memories/search/route.ts` | Hybrid/full-text/semantic search with highlight support; validates through inline `MemorySearchSchema`.
| `/api/memories/reviews/weekly` | GET | `app/api/memories/reviews/weekly/route.ts` | Generates weekly recap payloads (top memories, sentiment trends) with mock fallbacks.
| `/api/memories/analyze` | POST | `app/api/memories/analyze/route.ts` | Runs memory salience + recommendation pipeline (`MemoryAnalysisSchema`, `analyzeMemory`, `findPotentialAnchors`).
| `/api/memories/auto-enhance` | POST | `app/api/memories/auto-enhance/route.ts` | Automates enrichment (title/summary/tags) via memory business logic and optional AI calls.

#### Memory Anchors & Assets
| Endpoint | Methods | Handler | Notes / Key Types |
| --- | --- | --- | --- |
| `/api/memories/{id}/anchors` | GET, POST | `app/api/memories/[id]/anchors/route.ts` | Manage relational anchors (tasks, activities, habits); uses `MemoryAnchorsQuerySchema`, `MemoryAnchorCreateSchema`.
| `/api/memories/{id}/anchors/{anchorId}` | PUT, DELETE | `app/api/memories/[id]/anchors/[anchorId]/route.ts` | Update / remove anchors; `MemoryAnchorUpdateSchema` validation.
| `/api/memories/{id}/assets` | GET, POST | `app/api/memories/[id]/assets/route.ts` | Attach uploaded assets or external links; uses `AssetCreateSchema`.
| `/api/memories/{id}/assets/{assetId}` | PUT, DELETE | `app/api/memories/[id]/assets/[assetId]/route.ts` | Update metadata or detach assets from memories.
| `/api/memories/{id}/episode-anchors` | GET, POST | `app/api/memories/[id]/episode-anchors/route.ts` | Link memories to narrative episodes; `MemoryEpisodeAnchorsQuerySchema`, `MemoryEpisodeAnchorCreateSchema`.
| `/api/memories/{id}/episode-anchors/{episodeId}` | PUT, DELETE | `app/api/memories/[id]/episode-anchors/[episodeId]/route.ts` | Maintain episode anchor weights/notes (`MemoryEpisodeAnchorUpdateSchema`).
| `/api/episodes/{id}/anchors` | GET | `app/api/episodes/[id]/anchors/route.ts` | Reverse lookup: list memories attached to a specific episode.

### Timeline & Narrative
| Endpoint | Methods | Handler | Notes / Key Types |
| --- | --- | --- | --- |
| `/api/timeline-items` | GET, POST | `app/api/timeline-items/route.ts` | Unified timeline of memories, tasks, activities; rich filtering and creation via Zod schemas inside the route.
| `/api/timeline-items/{id}` | GET, PUT, DELETE | `app/api/timeline-items/[id]/route.ts` | Single timeline card CRUD; includes hierarchy + anchor metadata.
| `/api/timeline-items/{id}/anchors` | GET | `app/api/timeline-items/[id]/anchors/route.ts` | Retrieve anchors tied to a timeline item (bridges to memories/tasks).
| `/api/timeline-items/{id}/time-entries` | GET, POST | `app/api/timeline-items/[id]/time-entries/route.ts` | Time tracking tied to a timeline card; reuses `TimeEntryCreateSchema`.
| `/api/timeline-items/memories` | GET | `app/api/timeline-items/memories/route.ts` | Memory-centric view of the timeline (filters by salience, highlights).
| `/api/timeline-items/highlights` | GET | `app/api/timeline-items/highlights/route.ts` | Curated highlight feed (top memories, activities).
| `/api/narrative/seasons` | GET, POST | `app/api/narrative/seasons/route.ts` | Manage narrative seasons; relies on `types/narrative.ts` for shape definitions.
| `/api/narrative/seasons/current` | GET | `app/api/narrative/seasons/current/route.ts` | Returns the active season with progress statistics.
| `/api/narrative/seasons/{id}` | GET, PATCH, DELETE | `app/api/narrative/seasons/[id]/route.ts` | Season lifecycle operations.
| `/api/narrative/seasons/{id}/recap` | POST | `app/api/narrative/seasons/[id]/recap/route.ts` | Generates AI-assisted season recaps.
| `/api/narrative/episodes` | GET, POST | `app/api/narrative/episodes/route.ts` | Episode CRUD; integrates with season timelines.
| `/api/narrative/episodes/{id}` | GET, PATCH, DELETE | `app/api/narrative/episodes/[id]/route.ts` | Episode detail management.

### Tasks & Workflows
| Endpoint | Methods | Handler | Notes / Key Types |
| --- | --- | --- | --- |
| `/api/tasks` | GET, POST | `app/api/tasks/route.ts` | Task index + creation with extensive filters; uses `CreateTaskSchema`, `TaskQuerySchema` from `lib/task-types.ts`.
| `/api/tasks/{id}` | GET, PUT, DELETE | `app/api/tasks/[id]/route.ts` | Individual task CRUD; validates via `UpdateTaskSchema` and enforces ownership.
| `/api/tasks/{id}/status` | PUT | `app/api/tasks/[id]/status/route.ts` | Status-only updates (uses inline Zod for transitions).
| `/api/tasks/{id}/tree` | GET | `app/api/tasks/[id]/tree/route.ts` | Returns full subtask hierarchy rooted at a task.
| `/api/tasks/stats` | GET | `app/api/tasks/stats/route.ts` | Aggregate metrics (velocity, completion, overdue counts).
| `/api/tasks/updated-today` | GET | `app/api/tasks/updated-today/route.ts` | Convenience feed for tasks touched in the past day.

#### Task Time Tracking & Execution
| Endpoint | Methods | Handler | Notes / Key Types |
| --- | --- | --- | --- |
| `/api/tasks/{id}/time-entries` | GET, POST | `app/api/tasks/[id]/time-entries/route.ts` | Time entry CRUD scoped to a task; `TimeEntryCreateSchema` / `TimeEntryUpdateSchema`.
| `/api/tasks/{id}/timer/start` | POST | `app/api/tasks/[id]/timer/start/route.ts` | Starts live timer entries.
| `/api/tasks/{id}/timer/stop` | POST | `app/api/tasks/[id]/timer/stop/route.ts` | Stops timers, finalizing durations.

#### Subtasks & Relations
| Endpoint | Methods | Handler | Notes / Key Types |
| --- | --- | --- | --- |
| `/api/subtasks` | GET, POST | `app/api/subtasks/route.ts` | Fetch or create subtasks; uses `CreateSubtaskRequest` from `lib/task-types.ts`.
| `/api/subtasks/reorder` | PUT | `app/api/subtasks/reorder/route.ts` | Batch reorder subtasks under a parent (Zod-validated payload).
| `/api/task-relations` | GET, POST | `app/api/task-relations/route.ts` | Manage arbitrary task relations (dependency, blocked_by, related); `CreateTaskRelationSchema`.
| `/api/task-relations/{id}` | DELETE | `app/api/task-relations/[id]/route.ts` | Remove a relation by id.

### Time Tracking & Activities
| Endpoint | Methods | Handler | Notes / Key Types |
| --- | --- | --- | --- |
| `/api/time-entries/day` | GET | `app/api/time-entries/day/route.ts` | Summaries for a specific day (task/activity rollups).
| `/api/time-entries/running` | GET | `app/api/time-entries/running/route.ts` | Returns the active time entry, if any.
| `/api/time-entries/{id}` | PUT, DELETE | `app/api/time-entries/[id]/route.ts` | Update or delete individual time entries.
| `/api/activities` | GET, POST | `app/api/activities/route.ts` | Activity CRUD (habit/routine tracking); uses `ActivityCreateSchema`.
| `/api/activities/{id}` | GET, PUT, DELETE | `app/api/activities/[id]/route.ts` | Manage a single activity; `ActivityUpdateSchema`.
| `/api/activities/{id}/time-entries` | GET, POST | `app/api/activities/[id]/time-entries/route.ts` | Track time against activities.
| `/api/activities/stats` | GET | `app/api/activities/stats/route.ts` | Aggregated activity metrics (completion streaks, energy impact).

### AI Agent Platform
| Endpoint | Methods | Handler | Notes / Key Types |
| --- | --- | --- | --- |
| `/api/ai-agents` | GET, POST, PUT, DELETE | `app/api/ai-agents/route.ts` | CRUD for agent definitions; schemas inline (`CreateAgentSchema`) backed by Supabase `ai_agents` and `agent_summary` views.
| `/api/ai-interactions` | GET, POST, PUT, DELETE | `app/api/ai-interactions/route.ts` | Log conversations and cost metrics; see `types/agents.ts` for DTOs.
| `/api/ai-tasks` | GET, POST | `app/api/ai-tasks/route.ts` | Create & list AI-executed tasks (`AITaskCreateSchema`, `AITasksQuerySchema`).
| `/api/ai-tasks/{id}` | GET, PUT, DELETE | `app/api/ai-tasks/[id]/route.ts` | Task lifecycle updates (`AITaskUpdateSchema`).
| `/api/ai-usage-stats` | GET, POST | `app/api/ai-usage-stats/route.ts` | Usage dashboards & manual ingestion; validates via inline `AIUsageStatsSchema`.
| `/api/agent-features` | GET | `app/api/agent-features/route.ts` | Lists available capabilities; supports grouping by category.
| `/api/interaction-types` | GET | `app/api/interaction-types/route.ts` | Reference data for interaction taxonomies.
| `/api/vendors` | GET | `app/api/vendors/route.ts` | Vendor catalog + optional service expansion.
| `/api/vendors/{id}/services` | GET | `app/api/vendors/[id]/services/route.ts` | Filtered list of services for a vendor.
| `/api/api-keys` | GET, POST | `app/api/api-keys/route.ts` | Secure API-key storage with hashing & metadata (`APIKeyCreateSchema`).
| `/api/api-keys/{id}` | GET, PUT, DELETE | `app/api/api-keys/[id]/route.ts` | Rotate/update/delete stored keys (`APIKeyUpdateSchema`).
| `/api/api-keys/{id}/test` | POST | `app/api/api-keys/[id]/test/route.ts` | On-demand key validation against vendor endpoints.
| `/api/internal/resolve-openai-key` | GET | `app/api/internal/resolve-openai-key/route.ts` | Server-side key retrieval for agent runtimes (controlled via service role).
| `/api/internal/resolve-elevenlabs-key` | GET | `app/api/internal/resolve-elevenlabs-key/route.ts` | Same pattern for ElevenLabs credentials.

> **Deep dive**: For full payload examples across this domain, see `apps/zmemory/API_AGENTS_DOCUMENTATION.md`.

### Conversations & Sessions
| Endpoint | Methods | Handler | Notes / Key Types |
| --- | --- | --- | --- |
| `/api/conversations` | GET, POST, DELETE | `app/api/conversations/route.ts` | Session directory; integrates with hybrid Supabase/local storage managers.
| `/api/conversations/{sessionId}` | GET, PATCH, DELETE | `app/api/conversations/[sessionId]/route.ts` | Inspect/update individual sessions (title, metadata) or archive them.
| `/api/conversations/{sessionId}/messages` | POST | `app/api/conversations/[sessionId]/messages/route.ts` | Append messages (supports streaming transcripts, attachments).
| `/api/conversations/search` | GET | `app/api/conversations/search/route.ts` | Search conversations by title, participants, or content metadata.
| `/api/conversations/stats` | GET | `app/api/conversations/stats/route.ts` | Aggregated analytics (message counts, sentiment mock data).

### Relations (Personal CRM)
| Endpoint | Methods | Handler | Notes / Key Types |
| --- | --- | --- | --- |
| `/api/relations/people` | GET, POST | `app/api/relations/people/route.ts` | People/contact CRUD; `PersonCreateSchema`, `PersonQuerySchema` inside route.
| `/api/relations/people/{id}` | GET, PUT, DELETE | `app/api/relations/people/[id]/route.ts` | Detailed person management with timeline metadata.
| `/api/relations/profiles` | GET, POST | `app/api/relations/profiles/route.ts` | Relationship profile scoring (tiers, health); schema inline.
| `/api/relations/profiles/{id}` | GET, PUT, DELETE | `app/api/relations/profiles/[id]/route.ts` | Profile updates + cleanup.
| `/api/relations/touchpoints` | GET, POST | `app/api/relations/touchpoints/route.ts` | Log interactions, meeting notes, follow-up tasks.
| `/api/relations/checkins/today` | GET | `app/api/relations/checkins/today/route.ts` | Daily queue of people to reach out to.
| `/api/relations/reconnect` | GET | `app/api/relations/reconnect/route.ts` | Dormant relationship suggestions with AI-generated context.
| `/api/relations/brokerage` | GET | `app/api/relations/brokerage/route.ts` | Broker opportunities connecting contacts across domains.

### Assets, Categories & Energy
| Endpoint | Methods | Handler | Notes / Key Types |
| --- | --- | --- | --- |
| `/api/assets` | GET, POST | `app/api/assets/route.ts` | Link external or uploaded assets (images, audio, docs); `AssetCreateSchema`.
| `/api/assets/{id}` | GET, PUT, DELETE | `app/api/assets/[id]/route.ts` | Asset metadata lifecycle.
| `/api/categories` | GET, POST | `app/api/categories/route.ts` | Category dictionary for tasks/memories; inline Zod schema.
| `/api/categories/{id}` | GET, PUT, DELETE | `app/api/categories/[id]/route.ts` | Manage category details and default colors.
| `/api/energy-days` | GET, POST | `app/api/energy-days/route.ts` | Daily energy & mood logging; `EnergyDayCreateSchema` within route.
| `/api/energy-days/{date}` | GET, PUT, PATCH, DELETE | `app/api/energy-days/[date]/route.ts` | Update granular entries (per-slot energy, activities).

### System Docs & Health
| Endpoint | Methods | Handler | Notes / Key Types |
| --- | --- | --- | --- |
| `/api/docs` | GET | `app/api/docs/route.ts` | Hosts Swagger UI (disabled in prod unless `ENABLE_API_DOCS=true`).
| `/api/docs/spec` | GET | `app/api/docs/spec/route.ts` | Serves raw OpenAPI JSON (`getApiDocs`).
| `/api/health` | GET | `app/api/health/route.ts` | Comprehensive health check: database, Supabase auth, rate-limit state.

## Quick Pointers for Implementers
- **Mock vs. live data**: Many routes detect the absence of Supabase credentials and return deterministic mock objects. When writing tests or agent scripts, verify behaviour under both modes.
- **Rate limits**: Keys are per-IP + path (see `lib/security.ts`). High-frequency automation should stagger requests or reuse aggregated endpoints (`/tasks/stats`, `/ai-usage-stats`).
- **Type discovery**: When the handler defines schemas inline, prefer reading them directly; otherwise consult `lib/validators.ts`, `lib/task-types.ts`, and `types/` exports.
- **Cross-domain links**: Anchors bridge memories ↔ tasks ↔ activities; timeline items aggregate all. Agents can usually fetch enriched context from `/api/timeline-items/*` before drilling into resource-specific endpoints.
- **Testing hooks**: Jest tests live in `apps/zmemory/__tests__` and `apps/zmemory/tests`; most rely on mock-returning behaviour. Use them as references for payload shapes.

This guide should give you a high-level map; dive into the linked handlers for implementation specifics or extend the Swagger annotations when adding new endpoints.
