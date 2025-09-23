# 05 — Development Rules & Best Practices (EN/中文)

Scope
- zmemory-mcp service: tools, aliases, docs, and integration practices

Guiding principles
- Stability first: keep canonical tool names stable; add aliases non-destructively
- Security: never commit secrets; use env vars; keep examples with {{PLACEHOLDER}}
- Bilingual UX: descriptions are bilingual; responses follow user language
- Incremental i18n: localize high-traffic handlers first; add tests for new i18n

Versioning
- Minor release when adding new tools or aliases
- Patch release for doc-only changes or bug fixes

Aliases (CN→EN)
- Maintain alias map in src/server.ts::normalizeToolName
- When adding a tool, add 2–4 meaningful Chinese aliases
- Prefer concise, commonly used Chinese phrases

Response language
- Default: auto-detect from tool args
- Global override: ZMEMORY_MCP_LOCALE
- Runtime override: set_locale tool
- Add new strings via src/i18n.ts; avoid hardcoding texts in handlers long-term

Testing
- Unit tests for normalizeToolName
- Smoke tests for set_locale and auth flows
- Optional: snapshot tests for key handler outputs (EN/中文)

Scenarios (examples)
- Daily planning (EN):
  "Create a high-priority task to prepare release notes, due Friday, then list today’s updates."
  Tools: create_task → get_task_updates_for_today
- 日常规划（中文）:
  "创建一个高优先级任务，周五前完成发布说明，然后列出今天的任务更新。"
  工具: create_task → get_task_updates_for_today
- Review week (EN/中文):
  EN: "Show my timeline this week and insights"
  中文: "查看本周时间线与洞察"
  Tools: get_timeline_items → get_timeline_insights

Code conventions
- TypeScript strict; schemas in types.ts with zod describe() for clarity
- Keep server.ts handlers thin; business logic in modules/*
- Error handling: throw OAuthError/ZMemoryError; format via i18n.t
- Do not use interactive commands; MCP communications via stdio only

Docs
- Primary docs live in apps/zmemory-mcp/guidance/*.md
- If updating legacy docs, add a banner pointing to guidance
- Keep Tools.md aliases in sync with normalizeToolName
