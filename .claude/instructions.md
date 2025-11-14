# ZephyrOS Development Instructions

## Automatic Regulation Enforcement

When working on any code in this project, you MUST automatically:

1. **Identify the component** from the file path
2. **Read the relevant regulation** from `spec/coding-regulations/`
3. **Apply the standards** before writing any code

## Component Detection

Use these path patterns to auto-detect the component:

| Path Pattern | Component | Regulation File |
|-------------|-----------|-----------------|
| `apps/zmemory/app/api/**` | ZMemory Backend | `spec/coding-regulations/zmemory-backend.md` |
| `apps/zmemory/lib/**` | ZMemory Backend | `spec/coding-regulations/zmemory-backend.md` |
| `supabase/**/*.sql` | Database | `spec/coding-regulations/database.md` |
| `apps/zmemory-mcp/**` | ZMemory MCP | `spec/coding-regulations/zmemory-mcp.md` |
| `apps/zflow-ios/**` | ZFlow iOS | `spec/coding-regulations/zflow-ios.md` |
| `apps/zflow/**` | ZFlow Web | `spec/coding-regulations/zflow-web.md` |

## Always Apply

For **every** development task, regardless of component:
- Read `spec/coding-regulations/README.md` first
- Then read the component-specific regulation
- Follow the patterns and standards exactly
- Verify against the security checklist

## Code Review Checklist

Before completing any task, verify:

### Universal Standards
- [ ] Code is clean and self-documenting
- [ ] Functions are small and focused
- [ ] No code duplication
- [ ] Consistent with existing patterns
- [ ] TypeScript types are explicit
- [ ] Error handling is comprehensive
- [ ] Security best practices followed

### Documentation
- [ ] JSDoc comments for public functions
- [ ] Complex logic explained
- [ ] API endpoints have Swagger docs (backend)
- [ ] README updated if needed

### Testing
- [ ] Unit tests for business logic
- [ ] Integration tests for APIs
- [ ] Edge cases covered

## Quick Reference

### Backend API Pattern
```typescript
// 1. Auth check
const { data: { session } } = await supabase.auth.getSession()
if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

// 2. Validate input
const data = Schema.parse(await request.json())

// 3. Business logic
const result = await supabase.from('table').insert(data)

// 4. Return response
return NextResponse.json(result, { status: 201 })
```

### Database Pattern
```sql
-- UUID primary keys
id UUID DEFAULT gen_random_uuid() PRIMARY KEY

-- Always include timestamps
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()

-- Enable RLS
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
```

### React Component Pattern
```typescript
// Server Component (default)
export default async function Page() {
  const data = await fetch()
  return <Component data={data} />
}

// Client Component (only when needed)
'use client'
export function InteractiveComponent() {
  const [state, setState] = useState()
  return <div onClick={handler}>...</div>
}
```

## Slash Commands

- `/check-regulations` - Review coding standards before starting work
- `/publish-check` - **Run ALL CI checks before pushing to GitHub (REQUIRED)**

## Pre-Publish Requirements

**⚠️ CRITICAL**: Before auto-publishing commits to GitHub, you MUST run:

```bash
/publish-check
```

This command verifies:
1. ✅ All lint checks pass (`npm run lint`)
2. ✅ All type checks pass (`npm run type-check`)
3. ✅ All builds succeed (`npm run build`)
4. ✅ All tests pass (`npm run test`)
5. ✅ No secrets are committed (GitHub Actions check)

**DO NOT push to GitHub until all checks pass.**

If any check fails:
1. Fix the reported errors
2. Re-run `/publish-check`
3. Repeat until all checks pass
4. Only then proceed with `git push`

This ensures the same standards as GitHub Actions are met locally, preventing CI failures.

## Enforcement

These regulations are mandatory. Any code that doesn't follow them should be:
1. Flagged during review
2. Refactored to comply
3. Not merged until compliant

**All GitHub Action checks must pass before merge.**

Quality over speed. Consistent, maintainable code is the priority.
