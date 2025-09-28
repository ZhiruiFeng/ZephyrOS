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