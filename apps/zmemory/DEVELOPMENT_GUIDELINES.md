# ZMemory Development Guidelines

This document provides guidelines for developing with the new architecture while maintaining compatibility with existing code.

## 🏗️ Architecture Overview

ZMemory now has a layered architecture:

```
┌─────────────────────────────────────┐
│           API Routes               │ ← Middleware Applied Here
├─────────────────────────────────────┤
│          Middleware Layer          │ ← Auth, CORS, Validation, etc.
├─────────────────────────────────────┤
│          Service Layer             │ ← Business Logic
├─────────────────────────────────────┤
│         Repository Layer           │ ← Database Access
├─────────────────────────────────────┤
│          Database Layer            │ ← Supabase/PostgreSQL
└─────────────────────────────────────┘
```

## 📋 Development Patterns

### For NEW Routes (RECOMMENDED)

Use the new middleware-based pattern:

```typescript
import { withStandardMiddleware, type EnhancedRequest } from '@/middleware';
import { createYourService } from '@/services';
import { YourSchema } from '@/validation';

async function handleRequest(request: EnhancedRequest) {
  const userId = request.userId!; // Auth handled by middleware
  const data = request.validatedBody; // Validation handled by middleware

  // Use services for business logic
  const service = createYourService({ userId });
  const result = await service.yourMethod(data);

  if (result.error) throw result.error;
  return NextResponse.json(result.data);
}

export const POST = withStandardMiddleware(handleRequest, {
  validation: { bodySchema: YourSchema },
  rateLimit: { windowMs: 15 * 60 * 1000, maxRequests: 100 }
});
```

### For EXISTING Routes (MAINTAIN)

Keep the existing pattern until you need to modify:

```typescript
export async function GET(request: NextRequest) {
  try {
    // ... existing implementation
    // Don't change unless necessary
  } catch (error) {
    // ... existing error handling
  }
}
```

### For MODIFIED Existing Routes (MIGRATE)

When you need to change an existing route, consider migrating:

```typescript
// Before modification - assess if migration is worth it
// If yes: migrate to new pattern
// If no: make minimal changes to existing pattern
```

## 🛠️ Available Tools

### Middleware Options

```typescript
// Standard API middleware (recommended for most routes)
export const GET = withStandardMiddleware(handler, {
  validation: { querySchema: YourQuerySchema },
  rateLimit: { windowMs: 15 * 60 * 1000, maxRequests: 300 }
});

// Public API (no authentication)
export const GET = withPublicMiddleware(handler, {
  rateLimit: { windowMs: 15 * 60 * 1000, maxRequests: 100 }
});

// Admin only
export const GET = withAdminMiddleware(handler, ['admin-user-id']);

// Search endpoints (stricter rate limiting)
export const GET = withSearchMiddleware(handler, {
  validation: { querySchema: SearchSchema }
});

// Upload endpoints (very strict rate limiting)
export const POST = withUploadMiddleware(handler, {
  validation: { bodySchema: UploadSchema }
});
```

### Service Layer

```typescript
// Memory operations
const memoryService = createMemoryAnalysisService({ userId });
await memoryService.analyzeMemory(memory);
await memoryService.findPotentialAnchors(memory);

// Task operations
const taskService = createTaskWorkflowService({ userId });
await taskService.updateTaskStatus(taskId, status);
await taskService.calculateTaskProgress(taskId);

// Activity analytics
const analyticsService = createActivityAnalyticsService({ userId });
await analyticsService.calculateActivityStats(dateRange);
await analyticsService.generateInsights();
```

### Repository Layer

```typescript
// Direct repository access (if needed)
import { repositories } from '@/database';

const memories = await repositories.getMemoryRepository()
  .findMemoriesAdvanced(userId, filters);

const tasks = await repositories.getTaskRepository()
  .findTasksAdvanced(userId, filters);
```

## 🎯 When to Use Which Pattern

### Use NEW Pattern When:
- ✅ Creating new endpoints
- ✅ Major refactoring of existing endpoints
- ✅ Adding complex business logic
- ✅ Need better testing/maintainability
- ✅ Want to leverage services for reusability

### Keep LEGACY Pattern When:
- ✅ Route works fine and doesn't need changes
- ✅ Quick bug fixes to existing routes
- ✅ Simple endpoints with minimal logic
- ✅ Time constraints prevent full migration
- ✅ Risk of breaking working functionality

## 📐 Code Organization

### File Structure
```
app/api/
├── your-new-endpoint/
│   └── route.ts          ← Use new pattern
├── existing-endpoint/
│   └── route.ts          ← Keep legacy pattern
└── modified-endpoint/
    └── route.ts          ← Migrate if worth it
```

### Import Organization
```typescript
// New pattern imports
import { withStandardMiddleware, type EnhancedRequest } from '@/middleware';
import { createYourService } from '@/services';
import { YourSchema } from '@/validation';

// Legacy pattern imports (keep as-is)
import { getUserIdFromRequest } from '@/auth';
import { jsonWithCors } from '@/lib/security';
import { YourSchema } from '@/validation';
```

## 🧪 Testing Strategies

### New Pattern Testing
```typescript
// Easy to test - mock services
const mockService = {
  yourMethod: jest.fn().mockResolvedValue({ data: 'test', error: null })
};

// Test just the handler logic
await handleRequest(mockRequest);
```

### Legacy Pattern Testing
```typescript
// More complex - need to mock multiple dependencies
jest.mock('@/auth');
jest.mock('@/lib/security');
// ... more mocks

// Test the entire route
await GET(mockRequest);
```

## 🚀 Migration Strategy

### Phase 1: Coexistence (Current State)
- New routes use new pattern
- Existing routes remain unchanged
- Both patterns work side by side

### Phase 2: Selective Migration (Optional)
- Migrate high-traffic routes
- Migrate routes being modified
- Keep working routes as-is

### Phase 3: Full Migration (Future)
- Apply middleware to all routes
- Remove legacy patterns
- Clean up duplicated code

## ⚠️ Important Notes

### Do NOT:
- ❌ Mass-migrate all routes at once
- ❌ Change working routes without good reason
- ❌ Remove legacy utilities until nothing uses them
- ❌ Break existing API contracts

### DO:
- ✅ Use new pattern for new features
- ✅ Test thoroughly when migrating
- ✅ Keep both patterns documented
- ✅ Migrate incrementally and safely

## 🔍 Performance Considerations

### New Pattern Benefits:
- Faster development (less boilerplate)
- Better caching (services can be optimized)
- Easier debugging (clear separation)
- Better error handling (consistent responses)

### Legacy Pattern Stability:
- Battle-tested in production
- Known performance characteristics
- No migration risks
- Immediate availability

## 📚 Resources

- `EXAMPLE_NEW_ROUTE_PATTERN.md` - Side-by-side comparison
- `lib/middleware/index.ts` - Available middleware options
- `lib/services/index.ts` - Available services
- `lib/validation/index.ts` - Available validation schemas
- `REFACTORING_PROGRESS.md` - Complete refactoring history

## 🎉 Summary

The refactoring provides powerful new tools while preserving all existing functionality. Use the new patterns to improve development velocity and code quality, but don't feel pressured to migrate working code unless there's a clear benefit.

**Key Principle: Improve incrementally, break nothing.**

---

## 📖 API Development Best Practices

This section contains lessons learned from migrating 89 routes to the new architecture. These patterns and practices will help you avoid common pitfalls and write better code.

**Last Updated**: 2025-10-03
**Based on**: 89 successful migrations (100% success rate)

---

### Middleware Pattern

#### Standard Middleware Usage

**Use withStandardMiddleware for most API routes:**
```typescript
export const GET = withStandardMiddleware(handleGetRequest, {
  validation: { querySchema: YourQuerySchema },
  rateLimit: { windowMs: 15 * 60 * 1000, maxRequests: 300 }
});

export const POST = withStandardMiddleware(handlePostRequest, {
  validation: { bodySchema: YourBodySchema },
  rateLimit: { windowMs: 15 * 60 * 1000, maxRequests: 100 }
});
```

**Benefits**:
- Automatic authentication via OAuth
- Automatic CORS handling with proper headers
- Request validation with Zod schemas
- Rate limiting to prevent abuse
- Consistent error handling
- Structured logging

#### Rate Limiting Guidelines

**By Operation Type**:
- **GET (read)**: 300 requests per 15 minutes
- **POST (create)**: 50-100 requests per 15 minutes
- **PUT/PATCH (update)**: 100 requests per 15 minutes
- **DELETE**: 50 requests per 15 minutes

**Special Cases**:
- **Search endpoints**: 100 requests per 15 minutes (more expensive)
- **Upload endpoints**: 20 requests per 15 minutes (very strict)
- **Timer operations**: 30-60 requests per minute (frequent but lightweight)
- **Computational endpoints** (e.g., brokerage): 30 requests per 15 minutes
- **AI operations**: 10-30 requests per hour (rate limited by cost)

#### Public vs Authenticated Middleware

**Public endpoints (no auth required)**:
```typescript
export const GET = withPublicMiddleware(handler, {
  rateLimit: { windowMs: 15 * 60 * 1000, maxRequests: 100 }
});
```

**Examples**: `/api/health`, `/api/docs`, `/api/docs/spec`

**Internal endpoints (server-to-server)**:
```typescript
export const GET = withStandardMiddleware(handler, {
  validation: { querySchema: Schema },
  rateLimit: { windowMs: 15 * 60 * 1000, maxRequests: 100 }
  // Note: Disable CORS for internal-only endpoints
});
```

**Examples**: `/api/internal/resolve-openai-key`, `/api/internal/resolve-elevenlabs-key`

#### OPTIONS Handler (CRITICAL)

**Always add explicit OPTIONS handlers**:
```typescript
export const OPTIONS = withStandardMiddleware(async () => {
  return new NextResponse(null, { status: 200 });
}, {
  auth: false // OPTIONS requests don't need authentication
});
```

**Why**: Next.js App Router requires explicit method exports for CORS preflight requests to work correctly. Without `export const OPTIONS`, browsers will fail CORS preflight checks even though middleware handles the response.

**Lesson**: This was discovered during conversations migration and is now required for all routes.

---

### Validation Best Practices

#### Zod Schema Design

**Basic schema with common patterns**:
```typescript
import { z } from 'zod';

export const QuerySchema = z.object({
  // Required fields
  id: z.string().uuid(),

  // Optional fields with defaults
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),

  // Enums
  status: z.enum(['active', 'archived', 'deleted']).optional(),

  // Dates (use transform for proper parsing)
  start_date: z.string().transform(val => new Date(val)).optional(),

  // Booleans (coerce string query params)
  include_details: z.coerce.boolean().default(false),

  // Arrays (handle comma-separated strings)
  tags: z.string().transform(val => val.split(',')).optional(),
});
```

#### Advanced Validation with .refine()

**Use .refine() for custom validation logic**:
```typescript
export const CreateSchema = z.object({
  start_date: z.string(),
  end_date: z.string(),
}).refine(
  (data) => new Date(data.end_date) > new Date(data.start_date),
  {
    message: "End date must be after start date",
    path: ["end_date"], // Error will be associated with this field
  }
);
```

**Common refine patterns**:
```typescript
// Validate parent_id is not same as id (prevent self-reference)
.refine(data => data.parent_id !== data.id, {
  message: "Task cannot be its own parent",
  path: ["parent_id"]
})

// Validate at least one field is provided (for partial updates)
.refine(data => Object.keys(data).length > 0, {
  message: "At least one field must be provided"
})

// Validate conditional requirements
.refine(data => !data.recurring || data.recurrence_rule, {
  message: "Recurrence rule required when recurring is true",
  path: ["recurrence_rule"]
})
```

#### Transform for Data Normalization

**Use .transform() to normalize data**:
```typescript
export const CreateMemorySchema = z.object({
  // Trim whitespace
  title: z.string().min(1).transform(val => val.trim()),

  // Normalize arrays (remove empty strings, duplicates)
  tags: z.array(z.string())
    .transform(arr => [...new Set(arr.filter(t => t.trim()))])
    .optional(),

  // Parse JSON strings
  metadata: z.string()
    .transform(val => JSON.parse(val))
    .optional(),

  // Convert date strings to ISO format
  occurred_at: z.string()
    .transform(val => new Date(val).toISOString()),
});
```

#### Validation Syntax Gotchas

**WRONG - .refine() before field definitions**:
```typescript
// ❌ This will fail - refine must come after all fields
export const Schema = z.object({
  field1: z.string(),
}).refine(...)  // ✅ Correct placement
  .object({      // ❌ Can't add more fields after refine
    field2: z.string()
  });
```

**CORRECT - All fields first, then refine**:
```typescript
// ✅ Define all fields first
export const Schema = z.object({
  field1: z.string(),
  field2: z.string(),
  // ... all fields
}).refine((data) => {
  // Custom validation logic
  return true;
}, {
  message: "Validation error message"
});
```

---

### Database Patterns

#### Supabase Client Usage

**Always use non-null assertion for supabaseServer in routes**:
```typescript
async function handleRequest(request: EnhancedRequest) {
  const userId = request.userId!;

  // Even though middleware verified supabase exists, TypeScript needs this
  const supabase = request.supabaseServer!;

  // Now safe to use in query builder
  const { data, error } = await supabase
    .from('table')
    .select('*')
    .eq('user_id', userId);
}
```

**Why**: TypeScript requires explicit non-null assertion (`!`) even when middleware has already verified the client exists. This is necessary for both variable assignments and query builders.

**Lesson**: Discovered during Phase 3 migrations - applies to ALL routes using Supabase.

#### Service-Role vs Anon Client

**Use service-role client for server-side operations**:
```typescript
// ✅ CORRECT - Service role bypasses RLS for authenticated operations
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Not anon key
  { auth: { persistSession: false } }
);
```

**Use anon client for user-scoped operations**:
```typescript
// For operations that should respect RLS policies
const supabase = request.supabaseServer; // From middleware (anon key)
```

**Lesson**: Repository pattern originally used anon key which caused RLS issues. Service-role key is needed for server-side operations that query user data.

#### Null Safety in Queries

**Handle potential null results**:
```typescript
// ❌ WRONG - Assumes data exists
const result = await supabase.from('table').select('*').eq('id', id);
const item = result.data[0]; // Could be undefined!

// ✅ CORRECT - Check for data existence
const { data, error } = await supabase
  .from('table')
  .select('*')
  .eq('id', id)
  .single(); // Use .single() for single item

if (error || !data) {
  throw new Error('Item not found');
}

const item = data; // Now safe to use
```

**Optional chaining for nested access**:
```typescript
// ✅ Safe access to potentially undefined properties
const categoryName = data?.category?.name ?? 'Uncategorized';
const tags = data?.tags ?? [];
```

#### Query Building Best Practices

**Conditional filtering**:
```typescript
let query = supabase.from('tasks').select('*').eq('user_id', userId);

// Add filters conditionally
if (status) {
  query = query.eq('status', status);
}

if (priority) {
  query = query.eq('priority', priority);
}

if (search) {
  query = query.ilike('title', `%${search}%`);
}

// Execute query
const { data, error } = await query;
```

**Joins and relationships**:
```typescript
// Include related data
const { data } = await supabase
  .from('tasks')
  .select(`
    *,
    category:categories(id, name, color),
    created_by:users(id, email, display_name)
  `)
  .eq('user_id', userId);
```

**Pagination**:
```typescript
const limit = 20;
const offset = page * limit;

const { data, error, count } = await supabase
  .from('table')
  .select('*', { count: 'exact' }) // Include total count
  .range(offset, offset + limit - 1)
  .order('created_at', { ascending: false });
```

---

### Common Pitfalls

#### Schema Mismatches (CRITICAL)

**Problem**: TypeScript interfaces don't always match actual database schema.

**Examples Encountered**:
```typescript
// Task interface claimed nested content object
interface Task {
  content: {
    title: string;
    status: string;
  };
}

// But database has flat columns
// Actual schema: title, status (no nesting)
```

**Memory interface included non-existent fields**:
- `importance_level` ❌ (most critical - caused errors)
- `mood` ❌
- `source` ❌
- `context` ❌
- `related_to` ❌

**Prevention**:
1. **Always verify schema in Supabase Studio** before building repository
2. **Check original route's insert payload** for field exclusions
3. **Look for comments** like "Note: X, Y, Z are NOT included as they don't exist"
4. **Test repository independently** before using in routes
5. **Document non-existent fields** clearly in interface comments

**Pattern for handling**:
```typescript
// Keep interface with all fields for compatibility
interface Memory {
  title: string;
  note: string;
  // These fields DON'T exist in database - for compatibility only
  importance_level?: 'low' | 'medium' | 'high'; // ❌ Not in DB
  mood?: number; // ❌ Not in DB
}

// Explicitly whitelist fields that exist
const createPayload = {
  title: data.title,
  note: data.note,
  // DO NOT include: importance_level, mood, etc.
};
```

#### Validation Syntax Errors

**Common mistakes**:
```typescript
// ❌ WRONG - Can't chain .refine() before all fields defined
z.object({
  field1: z.string()
}).refine(...).object({ field2: z.string() })

// ✅ CORRECT - All fields first, then refine
z.object({
  field1: z.string(),
  field2: z.string()
}).refine(...)

// ❌ WRONG - Using wrong path syntax
.refine(data => check(data), "Error message") // Missing config object

// ✅ CORRECT - Proper refine syntax
.refine(data => check(data), {
  message: "Error message",
  path: ["field_name"]
})
```

#### Null Safety Errors

**TypeScript vs Runtime Reality**:
```typescript
// ❌ WRONG - Trusting TypeScript types
const task: Task = result.data;
console.log(task.content.title); // Runtime error!

// ✅ CORRECT - Verify actual data structure
const task = result.data;
console.log(task.title); // Check actual DB schema

// ✅ CORRECT - Map to interface if needed
const mapped: Task = {
  id: row.id,
  content: {
    title: row.title, // Flat → Nested mapping
    status: row.status
  }
};
```

#### Service Layer Anti-Patterns

**Avoid over-engineering**:
```typescript
// ❌ WRONG - Service just passes through to repository
class TaskService {
  async getTasks(filters: any) {
    return this.repository.findByUser(userId, filters);
  }
}

// ✅ CORRECT - Service adds business value
class TaskService {
  async getTasks(filters: any) {
    // Add business logic
    const tasks = await this.repository.findByUser(userId, filters);

    // Enrich with category names
    if (filters.include_category) {
      for (const task of tasks) {
        task.category = await this.categoryRepo.findById(task.category_id);
      }
    }

    return tasks;
  }
}
```

**When to use service layer**:
- ✅ Cross-repository operations
- ✅ Complex business logic
- ✅ Workflow validation
- ✅ Batch operations with transactions
- ✅ Analytics/aggregations across tables

**When to skip service layer**:
- ❌ Simple CRUD passthrough
- ❌ Direct filter passthrough
- ❌ Route already works perfectly

---

### Testing Approach

#### Pre-Migration Testing

**Establish baseline before migrating**:
```bash
# 1. Document current responses
curl http://localhost:3001/api/route > baseline.json

# 2. Test all endpoints
curl http://localhost:3001/api/route?filter=value
curl -X POST http://localhost:3001/api/route -d '{"data": "value"}'

# 3. Record performance metrics
time curl http://localhost:3001/api/route

# 4. Capture error scenarios
curl http://localhost:3001/api/route?invalid=param
```

#### During Migration Testing

**Compare new implementation**:
```bash
# Side-by-side comparison
diff <(curl http://localhost:3001/api/route-old) \
     <(curl http://localhost:3001/api/route-new)

# Validate identical responses
# Check performance hasn't degraded
# Verify error handling matches
```

#### Post-Migration Testing

**Comprehensive checklist** (from 89 successful migrations):
- [ ] All HTTP methods work (GET, POST, PUT, DELETE)
- [ ] All query parameters function correctly
- [ ] All filters work as before
- [ ] Pagination works correctly
- [ ] Sorting works correctly
- [ ] Search functionality preserved
- [ ] Error messages are appropriate
- [ ] Rate limiting works
- [ ] CORS headers present
- [ ] Authentication enforced
- [ ] Validation catches invalid inputs
- [ ] Chinese error messages preserved (if applicable)
- [ ] Response format identical
- [ ] Status codes correct (200, 201, 400, 404, 500, 503)

#### Unit Testing Pattern

**Repository testing**:
```typescript
describe('TaskRepository', () => {
  it('should find tasks by user', async () => {
    const repo = new TaskRepository(supabase);
    const tasks = await repo.findByUser('user-123', {});
    expect(tasks).toBeDefined();
    expect(Array.isArray(tasks)).toBe(true);
  });

  it('should handle filters correctly', async () => {
    const repo = new TaskRepository(supabase);
    const tasks = await repo.findByUser('user-123', {
      status: 'active',
      priority: 'high'
    });
    expect(tasks.every(t => t.status === 'active')).toBe(true);
  });
});
```

**Service testing**:
```typescript
describe('TaskService', () => {
  it('should create task with category lookup', async () => {
    const mockRepo = {
      create: jest.fn().mockResolvedValue({ id: '123' })
    };
    const service = new TaskService(context, { repository: mockRepo });

    const result = await service.createTask({
      title: 'Test',
      category: 'Work' // Name, not ID
    });

    expect(result.data.id).toBe('123');
    expect(mockRepo.create).toHaveBeenCalled();
  });
});
```

---

### Migration Decision Framework

**When to migrate NOW**:
- ✅ Route has bugs or needs new features
- ✅ Code is hard to maintain/understand
- ✅ Business logic should be reusable
- ✅ Route is simple and migration is low-risk
- ✅ Existing infrastructure (service/repository) is proven

**When to DEFER migration**:
- ⏸️ Route works perfectly with all features
- ⏸️ Migration adds complexity without clear benefit
- ⏸️ Schema mismatches need to be resolved first
- ⏸️ High risk of regression for low reward
- ⏸️ No clear business driver for change

**Success Criteria** (from 89 migrations):
- ✅ All original features work identically
- ✅ No regressions in existing functionality
- ✅ Code is cleaner and more maintainable
- ✅ Error handling is improved
- ✅ Tests pass (manual + automated)
- ✅ Documentation updated
- ✅ Team understands changes

**Example: `/api/tasks` Deferral Decision**:
- Working perfectly: ✅
- All features functional: ✅
- High complexity: ✅
- Schema mismatch issues: ✅
- **Decision**: Defer migration, use infrastructure for future features

---

### Quick Reference Checklist

**Before starting ANY migration**:
- [ ] Verify database schema matches TypeScript types
- [ ] Check if Repository exists and is correct
- [ ] Check if Service exists and what methods it provides
- [ ] Read original route completely
- [ ] List all features to preserve
- [ ] Identify special business logic
- [ ] Create backup of original route file
- [ ] Plan testing approach

**Critical questions**:
1. Is the route working perfectly? → Consider deferring
2. Does DB schema match TypeScript? → Verify first
3. What's the business value? → Don't migrate for architecture alone
4. Are there similar routes? → Reuse patterns

---

## 📚 Additional Resources

- [MIGRATION_DOCUMENTATION.md](./MIGRATION_DOCUMENTATION.md) - Complete migration history and status
- [MIGRATION_LESSONS_LEARNED.md](./MIGRATION_LESSONS_LEARNED.md) - Detailed lessons from all 89 migrations
- `lib/middleware/index.ts` - Available middleware options
- `lib/services/index.ts` - Available services
- `lib/validation/index.ts` - Validation schema examples

---

**Remember**:
- The goal is to improve maintainability and enable new features
- Sometimes the best decision is to keep working code as-is
- Learn from 89 successful migrations: verify schema, test thoroughly, migrate incrementally
- 100% success rate achieved by following these guidelines