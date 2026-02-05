# ZMemory MCP Server

Model Context Protocol server for AI agent memory and task management.

## Tech Stack
- MCP SDK (`@modelcontextprotocol/sdk`)
- TypeScript (ESM — `"type": "module"`)
- Zod for input validation
- Pino for structured logging
- Axios for HTTP calls
- Jest for testing

## Conventions
- **ESM only** — use `import`/`export`, no CommonJS
- **JSON Schema** — every MCP tool must have a proper JSON schema definition
- **Zod validation** — validate all tool inputs
- **Pino logging** — structured logs with context, never `console.log`
- **OAuth auth** — authentication via OAuth flow

## Key Directories
- `src/` — source code (entry point: `src/index.ts`)
- `scripts/` — OAuth config generation, security checks, testing
- `dist/` — compiled output

## Development
```bash
npm run dev           # Run with tsx
npm run build         # Compile TypeScript
npm test              # Jest tests
npm run security:check  # Security audit
```

## Coding Regulations
See `spec/coding-regulations/zmemory-mcp.md` for full standards.
