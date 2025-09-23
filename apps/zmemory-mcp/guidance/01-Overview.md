# 01 — Overview & i18n Architecture (EN/中文)

Goal
- Understand and use zmemory-mcp tools whether the user speaks English or Chinese
- Respond in the user’s language (EN/中文)

Key mechanisms
1) Canonical tool names + Chinese aliases
   - MCP lists canonical tool names (e.g., create_task)
   - The server accepts Chinese aliases for each tool (e.g., 创建任务, 添加任务)
   - Incoming tool names are normalized to canonical names before dispatch

2) Response language selection
   - Server-level locale: env ZMEMORY_MCP_LOCALE=auto|en|zh (default: auto)
   - Call-level detection: detectLocaleFromArgs inspects tool arguments for Chinese characters
   - Tool: set_locale { locale: 'en' | 'zh' | 'auto' } to override at runtime

3) Bilingual tool descriptions
   - Tool descriptions include both English and Chinese
   - This helps LLMs reliably select correct tools regardless of prompt language

4) Minimal i18n utility
   - src/i18n.ts provides detect, desc(), and t() helpers
   - Errors and core auth texts use t(locale, key, ...args)

Why this design?
- Zero breaking changes to clients using canonical tool names
- Allows Chinese prompts to call tools with Chinese names
- Keeps code changes small, enabling incremental coverage of localized responses

Limitations & next steps
- Not all handler responses are localized yet; prioritize frequently used tools
- Add unit tests for alias normalization and locale detection
- Consider a translation table for all status/field labels if needed
