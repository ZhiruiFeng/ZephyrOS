---
description: Review coding standards before starting work on any component
disable-model-invocation: true
---

# Coding Regulations Checker

Before starting development work, identify the target component and read its regulation file.

## Component Map

| Component | Path | Regulation |
|-----------|------|------------|
| ZMemory Backend | `apps/zmemory/` | `spec/coding-regulations/zmemory-backend.md` |
| Database | `supabase/**/*.sql` | `spec/coding-regulations/database.md` |
| ZMemory MCP | `apps/zmemory-mcp/` | `spec/coding-regulations/zmemory-mcp.md` |
| ZFlow iOS | `apps/zflow-ios/` | `spec/coding-regulations/zflow-ios.md` |
| ZFlow Web | `apps/zflow/` | `spec/coding-regulations/zflow-web.md` |

## Workflow

1. Read `spec/coding-regulations/README.md` (universal standards)
2. Read the component-specific regulation file from the table above
3. Implement following the patterns and standards exactly
4. Verify against the component checklist in `check-regulations-checklists.md`
