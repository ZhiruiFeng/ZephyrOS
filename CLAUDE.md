# Claude AI Development Guide for ZephyrOS

This document provides comprehensive guidance for Claude AI assistant when working on the ZephyrOS project.

## 📋 Quick Reference

### Project Overview
ZephyrOS is a personal AI operating system combining task management, knowledge reuse, and intelligent coaching. It consists of:
- **ZFlow (Frontend)** - Next.js 15 web app on port 3000
- **ZMemory (Backend API)** - Next.js API on port 3001
- **ZMemory MCP** - Model Context Protocol server for AI integration
- **ZFlow iOS** - React Native mobile app
- **Agents System** - AI agent framework with AWS Bedrock integration

### Repository Structure
```
ZephyrOS/
├── apps/
│   ├── zflow/              # Web frontend (Next.js 15, React 19, Tailwind)
│   ├── zmemory/            # Backend API (Next.js API Routes, Supabase)
│   ├── zmemory-mcp/        # MCP server for AI tools
│   ├── zflow-ios/          # iOS app (React Native, Expo)
│   └── agents/             # Agent system design docs
├── packages/
│   └── shared/             # Shared TypeScript types and utilities
├── supabase/               # Database schema and migrations
├── spec/
│   └── coding-regulations/ # Component-specific coding standards
├── guidance/               # Development and deployment guides
├── .claude/                # Claude AI instructions and commands
│   ├── instructions.md     # Main development instructions
│   └── commands/           # Slash commands
└── scripts/                # Setup and utility scripts
```

## 🚀 Getting Started

### First Time Setup
1. Read `.claude/instructions.md` for automatic regulation enforcement
2. Review `spec/coding-regulations/README.md` for universal standards
3. Understand the component you'll work on and read its specific regulations

### Before Every Development Task
1. **Identify component** from file path (see Component Detection table)
2. **Read relevant regulations** from `spec/coding-regulations/`
3. **Apply standards** before writing code
4. **Verify against checklist** before completion

## 🛠️ Development Workflow

### Standard Development Process

```bash
# 1. Identify what you're working on
# Example: Working on backend API endpoint

# 2. Read regulations
# - spec/coding-regulations/README.md (always)
# - spec/coding-regulations/zmemory-backend.md (for backend)

# 3. Make changes following the patterns

# 4. Before committing, run publish check
/publish-check

# 5. Fix any errors
# Repeat steps 3-4 until all checks pass

# 6. Commit and push
git add .
git commit -m "Description of changes"
git push origin <branch-name>
```

### Component Detection

| Path Pattern | Component | Regulation File |
|-------------|-----------|-----------------|
| `apps/zmemory/app/api/**` | ZMemory Backend | `spec/coding-regulations/zmemory-backend.md` |
| `apps/zmemory/lib/**` | ZMemory Backend | `spec/coding-regulations/zmemory-backend.md` |
| `supabase/**/*.sql` | Database | `spec/coding-regulations/database.md` |
| `apps/zmemory-mcp/**` | ZMemory MCP | `spec/coding-regulations/zmemory-mcp.md` |
| `apps/zflow-ios/**` | ZFlow iOS | `spec/coding-regulations/zflow-ios.md` |
| `apps/zflow/**` | ZFlow Web | `spec/coding-regulations/zflow-web.md` |

## ✅ Pre-Publish Checklist

**⚠️ CRITICAL**: Before pushing to GitHub, ALL checks must pass.

### Use the Publish Check Command
```bash
/publish-check
```

This command runs:
1. ✅ **Linting** - Code style and quality (`npm run lint`)
2. ✅ **Type Checking** - TypeScript validation (`npm run type-check`)
3. ✅ **Build** - Production build verification (`npm run build`)
4. ✅ **Tests** - Unit and integration tests (`npm run test`)
5. ✅ **Secret Scan** - Ensure no secrets committed (GitHub Action)

### Manual Checks (if needed)
```bash
# Run individually
npm run lint              # Check all workspaces
npm run type-check        # Type check all apps
npm run build            # Build all apps
npm run test -w @zephyros/zmemory-api  # Run tests
```

### If Checks Fail
1. **Fix all errors** reported by the checks
2. **Re-run** `/publish-check` until all pass
3. **Only then** proceed with `git push`

## 📝 Coding Standards

### Universal Principles (Apply to All Code)

#### Clean Code
- Self-explanatory variable and function names
- Small, focused functions (single responsibility)
- No dead code or commented-out code
- Meaningful comments for complex logic

#### TypeScript
- Explicit types for all function parameters and return values
- Use interfaces for objects, types for unions
- Avoid `any` - use `unknown` if type is truly unknown
- Enable strict mode settings

#### Error Handling
- Comprehensive error handling in all async functions
- User-friendly error messages
- Proper HTTP status codes (200, 201, 400, 401, 404, 500)
- Structured error responses

### Component-Specific Patterns

#### ZMemory Backend API
```typescript
// Standard route handler pattern
export async function POST(request: Request) {
  try {
    // 1. Authentication check
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 2. Validate input with Zod
    const body = await request.json()
    const data = CreateTaskSchema.parse(body)

    // 3. Business logic
    const result = await supabase
      .from('tasks')
      .insert(data)
      .select()
      .single()

    // 4. Return response
    return NextResponse.json(result, { status: 201 })

  } catch (error) {
    // 5. Error handling
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

#### Database Schema
```sql
-- Standard table pattern
CREATE TABLE table_name (
  -- UUID primary key
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- User reference (for RLS)
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Data columns
  content JSONB NOT NULL,
  tags TEXT[],

  -- Timestamps (always include)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (for user data tables)
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- RLS policy
CREATE POLICY "Users can manage their own data"
  ON table_name
  FOR ALL
  USING (auth.uid() = user_id);

-- Indexes for common queries
CREATE INDEX idx_table_name_user_id ON table_name(user_id);
CREATE INDEX idx_table_name_created_at ON table_name(created_at DESC);
```

#### React Components (ZFlow Web)
```typescript
// Server Component (default - use whenever possible)
export default async function TasksPage() {
  const tasks = await fetchTasks()
  return <TaskList tasks={tasks} />
}

// Client Component (only when interactivity needed)
'use client'

import { useState } from 'react'

export function TaskForm() {
  const [title, setTitle] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await createTask({ title })
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="border rounded px-3 py-2"
      />
      <button type="submit">Create Task</button>
    </form>
  )
}
```

## 🔐 Security Checklist

Before committing any code, verify:

- [ ] No hardcoded secrets, API keys, or credentials
- [ ] User authentication properly checked
- [ ] All user input validated and sanitized
- [ ] SQL injection prevention (use parameterized queries via Supabase)
- [ ] XSS prevention (sanitize user-generated content)
- [ ] RLS policies enabled on user data tables
- [ ] Environment variables used for sensitive config
- [ ] No secrets in `.env.local` (use `.env.example` as template)

## 🧪 Testing Requirements

### Backend API Tests
```typescript
// Jest test example
describe('POST /api/tasks', () => {
  it('creates a new task', async () => {
    const task = {
      title: 'Test task',
      status: 'pending'
    }

    const response = await request(app)
      .post('/api/tasks')
      .send(task)
      .expect(201)

    expect(response.body).toMatchObject(task)
  })

  it('returns 401 for unauthenticated requests', async () => {
    await request(app)
      .post('/api/tasks')
      .send({})
      .expect(401)
  })
})
```

### Run Tests
```bash
# All tests for ZMemory API
npm run test -w @zephyros/zmemory-api

# Watch mode
npm run test:watch -w @zephyros/zmemory-api

# Coverage
npm run test:coverage -w @zephyros/zmemory-api
```

## 📚 Slash Commands

### Available Commands
- `/check-regulations` - Review coding standards before starting work
- `/publish-check` - Run all CI checks before pushing to GitHub

### Using Commands
```bash
# In Claude chat
/check-regulations

# This will show you the relevant coding standards
# for the component you're working on
```

## 🎯 Common Development Tasks

### Adding a New API Endpoint

1. **Read regulations**
   ```bash
   /check-regulations
   ```

2. **Create route file**
   ```
   apps/zmemory/app/api/your-endpoint/route.ts
   ```

3. **Follow the pattern**
   - Authentication → Validation → Logic → Response → Error handling

4. **Add Swagger documentation**
   ```typescript
   /**
    * @swagger
    * /api/your-endpoint:
    *   post:
    *     summary: Create resource
    *     tags: [Resources]
    *     responses:
    *       201:
    *         description: Resource created
    */
   ```

5. **Write tests**
   ```
   apps/zmemory/__tests__/api/your-endpoint.test.ts
   ```

6. **Run publish check**
   ```bash
   /publish-check
   ```

### Adding a New React Component

1. **Determine if it needs to be a Client Component**
   - Default: Server Component
   - Only use `'use client'` if you need:
     - State (`useState`, `useReducer`)
     - Effects (`useEffect`)
     - Event handlers
     - Browser APIs

2. **Create component file**
   ```
   apps/zflow/app/components/YourComponent.tsx
   ```

3. **Follow naming conventions**
   - PascalCase for component files
   - Props interface: `YourComponentProps`

4. **Use Tailwind for styling**
   ```typescript
   export function YourComponent({ title }: YourComponentProps) {
     return (
       <div className="bg-white rounded-lg shadow p-4">
         <h2 className="text-xl font-bold">{title}</h2>
       </div>
     )
   }
   ```

### Database Migrations

1. **Create migration file**
   ```
   supabase/migrations/YYYYMMDD_description.sql
   ```

2. **Follow the pattern**
   - UUID primary keys
   - Timestamps on all tables
   - RLS for user data
   - Proper indexes

3. **Test locally**
   ```bash
   # Apply migration
   supabase db push

   # Verify
   supabase db diff
   ```

## 🚨 Common Pitfalls to Avoid

### ❌ Don't Do This
```typescript
// Missing authentication
export async function GET() {
  const data = await supabase.from('tasks').select()
  return NextResponse.json(data)
}

// Using 'any' type
function processData(data: any) {
  return data.map((item: any) => item.value)
}

// Hardcoded secrets
const API_KEY = 'sk-1234567890abcdef'

// No error handling
async function fetchData() {
  const response = await fetch(url)
  return response.json()
}
```

### ✅ Do This Instead
```typescript
// With authentication
export async function GET(request: Request) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const data = await supabase.from('tasks').select()
  return NextResponse.json(data)
}

// Proper types
interface DataItem {
  id: string
  value: number
}

function processData(data: DataItem[]): number[] {
  return data.map(item => item.value)
}

// Environment variables
const API_KEY = process.env.OPENAI_API_KEY

// Comprehensive error handling
async function fetchData(): Promise<Data | null> {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return await response.json()
  } catch (error) {
    console.error('Failed to fetch data:', error)
    return null
  }
}
```

## 📖 Additional Resources

### Documentation Locations
- **API Documentation**: http://localhost:3001/api/docs (when running locally)
- **Development Guides**: `/guidance` directory
- **Architecture Diagrams**: `README.md` and individual app READMEs
- **MCP Integration**: `guidance/ZMEMORY_MCP_INTEGRATION.md`
- **Coding Regulations**: `spec/coding-regulations/`

### Key Files to Reference
- **Shared Types**: `packages/shared/types/`
- **API Schemas**: `apps/zmemory/lib/schemas/`
- **Constants**: `apps/zflow/app/constants/`
- **Utilities**: `apps/zflow/app/utils/`

## 🎓 Learning Path for New Features

1. **Understand the architecture** - Read README.md
2. **Review existing code** - Look at similar features
3. **Read regulations** - Use `/check-regulations`
4. **Implement following patterns** - Consistency is key
5. **Test thoroughly** - Write and run tests
6. **Run publish check** - Use `/publish-check`
7. **Document your work** - Update relevant docs

## 📝 Summary

### Essential Workflow
1. ✅ Read regulations before coding
2. ✅ Follow component-specific patterns
3. ✅ Write tests for new features
4. ✅ Run `/publish-check` before pushing
5. ✅ Fix all errors before committing
6. ✅ Document significant changes

### Quality Standards
- **Clean**: Self-explanatory, maintainable code
- **Typed**: Explicit TypeScript types
- **Tested**: Unit and integration tests
- **Secure**: No secrets, proper auth, input validation
- **Consistent**: Follow established patterns
- **Documented**: JSDoc comments, README updates

### Remember
**Quality over speed.** Taking time to ensure all checks pass and following coding standards saves debugging time later and maintains a healthy, maintainable codebase.

---

**For questions or issues**: Check the `/guidance` directory or create a GitHub issue.
