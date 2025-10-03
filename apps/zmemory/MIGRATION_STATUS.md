# 🔄 ZMemory API Migration Status Dashboard

Single source of truth for the ZMemory API refactor. Contains current phase
progress, completed work, upcoming tasks, architecture patterns, and quick
startup instructions for future migration sessions.

---

## 📊 Phase Snapshot

| Phase | Focus | Status | Notes |
|-------|-------|--------|-------|
| Phase 0 | Project scaffolding & safety rails | ✅ Complete | Path aliases, documentation baseline, zero-breaking-change guardrails |
| Phase 1 | Quick-win routes & pattern validation | ✅ Complete | `/api/health`, `/api/docs`, `/api/agent-features`, `/api/ai-tasks` |
| Phase 2 | High-impact support APIs | ✅ Complete | `/api/categories`, `/api/task-relations`, `/api/vendors`, `/api/interaction-types`, `/api/energy-days`, `/api/conversations` |
| Phase 3 | Core feature APIs | 🔄 In progress | 42 routes complete: `/api/activities`, `/api/memories`, `/api/memories/[id]`, `/api/tasks/[id]`, `/api/ai-tasks/[id]`, `/api/api-keys/[id]/test`, `/api/vendors/[id]/services`, `/api/time-entries/running`, `/api/tasks/[id]/timer/stop`, `/api/internal/resolve-openai-key`, `/api/internal/resolve-elevenlabs-key`, `/api/docs/spec`, `/api/narrative/seasons/current`, `/api/time-entries/[id]`, `/api/time-entries/day`, `/api/tasks/[id]/timer/start`, `/api/tasks/[id]/time-entries`, `/api/narrative/seasons`, `/api/narrative/episodes`, `/api/subtasks/reorder`, `/api/ai-usage-stats`, `/api/user/api-keys/[id]`, `/api/tasks/[id]/status`, `/api/user/api-keys`, `/api/narrative/seasons/[id]`, `/api/narrative/episodes/[id]`, `/api/api-keys`, `/api/api-keys/[id]`, `/api/episodes/[id]/anchors`, `/api/memories/reviews/weekly`, `/api/narrative/seasons/[id]/recap`, `/api/memories/analyze`, `/api/tasks/[id]/tree`, `/api/tasks/stats`, `/api/tasks/updated-today`, `/api/subtasks`, `/api/daily-strategy/[id]/status`, `/api/daily-strategy/overview`, `/api/daily-strategy/date/[date]`, `/api/ai-agents`, `/api/daily-strategy/[id]`, `/api/relations/people`. Averaging 0.38h per route! |

> Detailed before/after comparisons continue to live in
> `MIGRATION_COMPARISON.md`. Use this dashboard for actionable next steps.

---

## ✅ Completed Route Migrations

| API Route | Status | Key Improvements |
|-----------|--------|------------------|
| `/api/health` | ✅ | Converted to middleware stack, added 60/min rate limit, simplified handler |
| `/api/docs` | ✅ | Public middleware with unified CORS + logging, removed bespoke response handling |
| `/api/agent-features` | ✅ | Added auth + validation middleware, service layer, OPTIONS preflight |
| `/api/ai-tasks` | ✅ | Full repository/service refactor, metadata-driven schema alignment, service-role Supabase client |
| `/api/categories` | ✅ | CategoryRepository + CategoryService with CRUD operations, rate limiting (300 GET, 50 POST, 100 PUT, 50 DELETE per 15min) |
| `/api/task-relations` | ✅ | TaskRelationRepository + TaskRelationService with relationship management, task existence validation, duplicate prevention |
| `/api/vendors` | ✅ | VendorService with vendor/service lookup, optional relationship joins |
| `/api/interaction-types` | ✅ | InteractionTypeService with category filtering and grouping |
| `/api/energy-days` | ✅ | EnergyDayService with date-range queries and upsert logic |
| `/api/conversations` | ✅ | ConversationRepository + ConversationService with session/message management, 5 routes migrated (GET, POST, PATCH, DELETE list/detail/messages/search/stats), rate limiting (300 GET, 100 POST, 50 DELETE per 15min) |
| `/api/activities` | ✅ | ActivityService + ActivityAnalyticsService with CRUD operations, 4 routes migrated (list/create, detail/update/delete, stats, time-entries), rate limiting (300 GET, 100 POST/PUT, 50 DELETE per 15min) |
| `/api/memories` | ✅ | MemoryService with comprehensive filtering (20+ filters), schema mismatch caught and fixed (5 non-existent fields removed), 507→82 lines (84% reduction), rate limiting (300 GET, 100 POST per 15min) |
| `/api/memories/[id]` | ✅ | Leverages MemoryService for CRUD operations (GET, PUT, DELETE), soft delete to 'archived' status, 430→107 lines (75% reduction), rate limiting (300 GET, 100 PUT, 50 DELETE per 15min) |
| `/api/tasks/[id]` | ✅ | Leverages TaskService for CRUD operations (GET, PUT, DELETE), 491→110 lines (78% reduction), rate limiting (300 GET, 100 PUT, 50 DELETE per 15min) |
| `/api/ai-tasks/[id]` | ✅ | Leverages AITaskService for CRUD operations (GET, PUT, DELETE), 144→112 lines (22% reduction), rate limiting (300 GET, 100 PUT, 50 DELETE per 15min) |
| `/api/api-keys/[id]/test` | ✅ | Uses apiKeyService for testing API keys (POST), 93→91 lines (2% reduction), rate limiting (20 POST per 15min) |
| `/api/vendors/[id]/services` | ✅ | Uses apiKeyService for vendor service lookup (GET), 87→71 lines (18% reduction), rate limiting (300 GET per 15min) |
| `/api/time-entries/running` | ✅ | Get currently running timer (GET), 38→56 lines, backward compatibility for task_id field, rate limiting (300 GET per 15min) |
| `/api/tasks/[id]/timer/stop` | ✅ | Stop task timer with validation (POST), 83→97 lines, TimerStopSchema validation, override end time support, rate limiting (60 POST per minute) |
| `/api/internal/resolve-openai-key` | ✅ | Internal API key resolution (GET), 34→44 lines, CORS disabled for server-to-server only, rate limiting (100 GET per 15min) |
| `/api/internal/resolve-elevenlabs-key` | ✅ | Internal ElevenLabs API key resolution (GET), 34→44 lines, CORS disabled for server-to-server only, rate limiting (100 GET per 15min) |
| `/api/docs/spec` | ✅ | Public OpenAPI spec endpoint (GET), 14→24 lines, public middleware with CORS, rate limiting (100 GET per 15min) |
| `/api/narrative/seasons/current` | ✅ | Current active season lookup (GET), 60→57 lines (5% reduction), rate limiting (100 GET per 15min) |
| `/api/time-entries/[id]` | ✅ | Time entry update/delete (PUT, DELETE), 67→100 lines, TimeEntryUpdateSchema validation, rate limiting (100 PUT, 50 DELETE per 15min) |
| `/api/time-entries/day` | ✅ | Day view time entries query (GET), 80→90 lines, from/to time window filtering, rate limiting (300 GET per 15min) |
| `/api/tasks/[id]/timer/start` | ✅ | Start task timer (POST), 109→128 lines, TimerStartSchema validation, autoSwitch support, rate limiting (30 POST per minute) |
| `/api/tasks/[id]/time-entries` | ✅ | Task time entries (GET, POST), 143→165 lines, TimeEntriesQuerySchema + TimeEntryCreateSchema validation, rate limiting (300 GET, 100 POST per 15min) |
| `/api/narrative/seasons` | ✅ | Seasons CRUD (GET, POST), 159→156 lines (2% reduction), status filtering, active season validation, rate limiting (100 GET, 50 POST per 15min) |
| `/api/narrative/episodes` | ✅ | Episodes CRUD (GET, POST), 173→170 lines (2% reduction), season filtering, date range validation, rate limiting (100 GET, 50 POST per 15min) |
| `/api/subtasks/reorder` | ✅ | Reorder subtasks (PUT), 200→131 lines (35% reduction), parent task validation, subtask verification, rate limiting (20 PUT per 15min) |
| `/api/tasks/[id]/status` | ✅ | Task status update (PUT), 206→176 lines (15% reduction), StatusUpdateSchema validation, completion date handling, rate limiting (100 PUT per 15min) |
| `/api/user/api-keys` | ✅ | User API keys CRUD (GET, POST), 245→258 lines, OAuth-only endpoints with manual auth check, secure key generation with hashing, rate limiting (100 GET, 20 POST per 15min) |
| `/api/narrative/seasons/[id]` | ✅ | Season detail CRUD (GET, PATCH, DELETE), 238→232 lines (3% reduction), UpdateSeasonSchema validation, include_episodes query param, active season validation, rate limiting (100 GET, 50 PATCH, 20 DELETE per 15min) |
| `/api/narrative/episodes/[id]` | ✅ | Episode detail CRUD (GET, PATCH, DELETE), 189→205 lines, UpdateEpisodeSchema validation with date range checks, rate limiting (100 GET, 50 PATCH, 20 DELETE per 15min) |
| `/api/api-keys` | ✅ | API keys CRUD (GET, POST), 199→195 lines (2% reduction), uses apiKeyService for vendor/service API key management, rate limiting (100 GET, 20 POST per 15min) |
| `/api/api-keys/[id]` | ✅ | API key detail CRUD (GET, PUT, DELETE), 254→241 lines (5% reduction), updateApiKeySchema with .refine() validation, uses apiKeyService, rate limiting (100 GET, 50 PUT, 20 DELETE per 15min) |
| `/api/episodes/[id]/anchors` | ✅ | Episode memory anchors (GET), 111→101 lines (9% reduction), episode ownership validation, query params for filtering (relation_type, min_weight), rate limiting (100 GET per 15min) |
| `/api/memories/reviews/weekly` | ✅ | Weekly memory review (GET), 154→155 lines, WeeklyReviewQuerySchema with transforms, uses generateWeeklyReview business logic, rate limiting (20 GET per 10min) |
| `/api/narrative/seasons/[id]/recap` | ✅ | Season recap generation (POST), 168→163 lines (3% reduction), calculates statistics and highlights from episodes, generates summary, rate limiting (20 POST per 15min) |
| `/api/memories/analyze` | ✅ | Memory analysis (POST), 176→167 lines (5% reduction), MemoryAnalysisSchema validation, uses analyzeMemory and findPotentialAnchors business logic, rate limiting (30 POST per 5min) |
| `/api/tasks/[id]/tree` | ✅ | Task tree retrieval (GET), 279→275 lines (1% reduction), TreeQuerySchema with transform, buildTaskTree helper function, supports tree/flat formats, rate limiting (300 GET per 15min) |
| `/api/tasks/stats` | ✅ | Task statistics (GET), 313→325 lines, StatsQuerySchema validation, comprehensive stats calculation (status, priority, category, due dates), rate limiting (300 GET per 15min) |
| `/api/tasks/updated-today` | ✅ | Tasks updated today (GET), 438→426 lines (3% reduction), UpdatedTodayQuerySchema with timezone support, complex date range handling, user_id filtering, rate limiting (300 GET per 15min) |
| `/api/subtasks` | ✅ | Subtasks CRUD (GET, POST), 367→350 lines (5% reduction), SubtaskQuerySchema + CreateSubtaskSchema with .refine() and .transform(), hierarchy depth validation, rate limiting (300 GET, 30 POST per 15min) |
| `/api/daily-strategy/[id]/status` | ✅ | Daily strategy status update (PATCH), 178→167 lines (6% reduction), UpdateDailyStrategyStatusSchema validation, uses update_daily_strategy_status RPC, rate limiting (200 PATCH per 15min) |
| `/api/daily-strategy/overview` | ✅ | Daily strategy overview (GET), 199→201 lines, OverviewQuerySchema with timezone support, uses get_daily_strategy_overview RPC, comprehensive energy/completion stats, rate limiting (300 GET per 15min) |
| `/api/daily-strategy/date/[date]` | ✅ | Daily strategy by date (GET), 277→273 lines (1% reduction), DailyStrategyQuerySchema validation, complex filtering (strategy_type, status, timeline_item_type, search, tags), grouping by type, rate limiting (300 GET per 15min) |
| `/api/ai-agents` | ✅ | AI agents CRUD (GET, POST, PUT, DELETE), 350→345 lines (1% reduction), CreateAgentSchema + UpdateAgentSchema validation, feature mappings support, uses agent_summary view, rate limiting (300 GET, 50 POST, 100 PUT, 50 DELETE per 15min) |
| `/api/daily-strategy/[id]` | ✅ | Daily strategy item CRUD (GET, PUT, DELETE), 380→373 lines (2% reduction), GetQuerySchema + UpdateDailyStrategySchema validation, optional timeline_item/season/initiative joins, rate limiting (300 GET, 100 PUT/DELETE per 15min) |
| `/api/relations/people` | ✅ | People/contacts CRUD (GET, POST), 365→355 lines (3% reduction), PersonQuerySchema + PersonCreateSchema validation, relationship profile joins, mock data fallback, rate limiting (200 GET, 30 POST per 15min) |

Highlights:
- All migrated routes now rely on the standard middleware pipeline (auth, validation, CORS, rate limiting, error handling).
- AI task migration established the repository/service pattern including cost analytics, batching, and metadata normalisation.
- Categories migration demonstrates clean CRUD pattern with usage validation (prevents deletion of in-use categories).
- Task Relations migration shows complex validation logic (task existence checks, duplicate prevention) cleanly separated into service layer.
- Conversations migration shows multi-route refactor (5 route files → repository + service pattern), comprehensive session + message management with search and stats.
- Activities migration demonstrates Phase 3 readiness (4 route files, 950 lines → service + analytics pattern), complex time-entry operations with timer logic, leverages existing ActivityRepository.
- Memories migration reinforces schema verification lesson (5 non-existent fields discovered), achieved 84% code reduction (507→82 lines), comprehensive filtering with 20+ parameters.
- Sub-route pattern established: 5 sub-routes migrated achieving 2-78% reduction by leveraging existing services, averaging 0.3-0.5h per route (total time decreasing as patterns solidify).
- Lookup endpoints (vendors, interaction-types, energy-days) demonstrate service-only pattern (no repository needed for read-mostly system data).
- Types were modularised into `/lib/database/types/**` and `/lib/services/types/**`, keeping legacy imports working via index re-exports.

---

## 🚧 Active & Upcoming Targets

| API Route | Current Blockers / Notes | Planned Actions |
|-----------|-------------------------|-----------------|
| `/api/tasks` | 611 lines - **Infrastructure built, migration deferred** | TaskService + TaskRepository fixes completed; see notes below |
| `/api/subtasks` | 368 lines, medium complexity | Can leverage TaskService, good next target |
| `/api/activities/[id]` | ~150 lines estimated | Simple sub-route, can leverage ActivityService, quick win |
| `/api/tasks/stats` | ~200 lines estimated | Can leverage TaskService for statistics |
| `/api/core-principles` | 1,785 lines (4 routes), complex | Extract to service layer, may need custom repository methods |
| `/api/daily-strategy` | 424 lines, complex operations | Plan incremental migration approach |

For detailed sequencing see `MIGRATION_PLAN.md` (Phase 2 & 3 sections).

---

## 🧭 TODO Checklist (Next Sessions)

### High Priority
- [x] `/api/categories`: stand up repository/service + middleware, capture deltas in `MIGRATION_COMPARISON.md`.
- [x] `/api/task-relations`: migrate and document relationship-specific lessons learned.
- [x] Update this dashboard after each route to keep status current.

### Medium Priority
- [x] `/api/conversations`: CRUD migration with multi-route refactor (5 routes).
- [x] `/api/activities`: CRUD + analytics migration (4 routes, first Phase 3 route).
- [x] Batch-migrate lightweight lookup endpoints (`/api/vendors`, `/api/interaction-types`, `/api/energy-days`).
- [ ] `/api/core-principles`: Extract complex business logic to service layer (1,785 lines across 4 routes - very large).
- [ ] Capture a reusable smoke-test checklist in this file once Phase 2 routes land.

### Long-Term (Phase 3 Prep)
- [x] `/api/tasks`: Infrastructure work completed (TaskService, TaskRepository fixes). Migration deferred - see notes.
- [ ] Audit repository readiness for memories; fill gaps before starting Phase 3.
- [ ] Establish automated regression baselines (snapshot or contract tests) ahead of large migrations.

---

## 📝 Tasks Route - Infrastructure Work & Lessons Learned

### Work Completed (2025-10-03)
**Files Modified:**
- ✅ Created `lib/services/task-service.ts` (272 lines) - CRUD operations service
- ✅ Fixed `lib/database/repositories/task-repository.ts` - Updated `applyTaskFilters` to use flat column queries instead of JSON paths
- ✅ Added `categoryRepository` to `ServiceDependencies` type
- ✅ Updated service exports in `lib/services/index.ts`

**Infrastructure Benefits:**
- TaskService provides clean CRUD interface with category lookup
- TaskRepository now correctly queries flat database schema (not JSON content)
- Service layer ready for future use (workflows, batch operations, etc.)
- All filtering works: root_tasks_only, status, priority, hierarchy, search, pagination, sorting

### Key Discoveries
1. **Schema Mismatch**: The `Task` TypeScript interface defines a nested `content` object, but the actual database has flat columns (title, status, priority, etc.)
2. **Repository Pattern**: TaskRepository was incorrectly using JSON path queries (`content->>field`) instead of flat column names
3. **Service vs Route**: Original route works perfectly with direct Supabase queries; service layer adds complexity without clear benefit for this route
4. **Testing**: Comprehensive manual testing (40+ test cases) all passed with original route implementation

### Decision: Migration Deferred
**Reason**: Original route (611 lines) is working perfectly with all features:
- ✅ All filtering works (root_tasks_only, status, priority, search, hierarchy, etc.)
- ✅ Sorting and pagination work correctly
- ✅ Category lookup functional
- ✅ Subtasks and hierarchy fully supported
- ✅ Performance is good
- ✅ Zero bugs reported

**Risk/Benefit Analysis**:
- **Migration Benefits**: Slightly cleaner code (611 → ~270 lines), automatic middleware
- **Migration Risks**: Type mismatches, complex hierarchy logic, potential regressions
- **Conclusion**: "If it ain't broke, don't fix it" - defer migration until clear business need

### Recommendations for Future Migrations
1. **Verify schema first**: Check actual database columns vs TypeScript types before building repository
2. **Start simple**: Migrate simpler routes first to establish patterns
3. **Test infrastructure**: Ensure repository/service work independently before route migration
4. **Keep working code**: Don't migrate for the sake of migrating; focus on routes that need changes

### Artifacts Preserved
- Backup: `app/api/tasks/route.ts.backup` (original working version)
- Current: `app/api/tasks/route.ts` (restored original after testing)
- Service: `lib/services/task-service.ts` (ready for future use)
- Repository: `lib/database/repositories/task-repository.ts` (fixed, ready for future use)

---

## 🛠️ Quick Links & Commands

```bash
# Start local dev server
npm run dev -w @zephyros/zmemory-api

# Type-check entire workspace
npm run type-check -w @zephyros/zmemory-api

# Lint before opening PR
npm run lint -w @zephyros/zmemory-api
```

Optional focused test run:
`npm test -w @zephyros/zmemory-api -- --runTestsByPath <test-file>`

Keep this dashboard updated after each migration session so we always know the
exact state of the rollout and what’s coming next.
