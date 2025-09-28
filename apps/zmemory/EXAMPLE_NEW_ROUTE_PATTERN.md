# Example: New Route Pattern vs Legacy Pattern

This document demonstrates the difference between the new middleware-based approach and the legacy pattern.

## Legacy Pattern (Current)

```typescript
// app/api/memories/route.ts (simplified excerpt)
export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const rlKey = `${getClientIP(request)}:GET:/api/memories`;
    if (isRateLimited(rlKey, 15 * 60 * 1000, 300)) {
      return jsonWithCors(request, { error: 'Too many requests' }, 429);
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const queryResult = MemoriesQuerySchema.safeParse(Object.fromEntries(searchParams));
    if (!queryResult.success) {
      return jsonWithCors(request, { error: 'Invalid query parameters', details: queryResult.error.errors }, 400);
    }
    const query = queryResult.data;

    // Authentication
    let userId = await getUserIdFromRequest(request);
    if (!userId) {
      if (process.env.NODE_ENV !== 'production') {
        userId = 'dev-user-123';
      } else {
        return jsonWithCors(request, { error: 'Unauthorized' }, 401);
      }
    }

    // Business logic mixed with database calls
    const client = supabase;
    let dbQuery = client
      .from('memories')
      .select('*')
      .eq('user_id', userId);

    // Apply filters... (50+ lines of database query building)

    const { data, error } = await dbQuery;
    if (error) {
      console.error('Database error:', error);
      return jsonWithCors(request, { error: 'Failed to fetch memories' }, 500);
    }

    return jsonWithCors(request, data);
  } catch (error) {
    console.error('API error:', error);
    const errorMessage = sanitizeErrorMessage(error);
    return jsonWithCors(request, { error: errorMessage }, 500);
  }
}

export async function OPTIONS(request: NextRequest) {
  return createOptionsResponse(request);
}
```

## New Pattern (Using Middleware + Services)

```typescript
// app/api/memories-new/route.ts (example implementation)
import { withStandardMiddleware, type EnhancedRequest } from '@/middleware';
import { createMemoryAnalysisService } from '@/services';
import { MemoriesQuerySchema } from '@/validation';

// Clean, focused business logic
async function handleGetMemories(request: EnhancedRequest) {
  // Data is already validated and available on request
  const query = request.validatedQuery;
  const userId = request.userId!; // Authentication already handled

  // Use service for business logic
  const memoryService = createMemoryAnalysisService(
    { userId },
    // Dependencies injected automatically
  );

  // Simple service call
  const result = await memoryService.findMemoriesAdvanced(query);

  if (result.error) {
    throw result.error; // Middleware handles error responses
  }

  return NextResponse.json(result.data);
}

// Apply middleware stack (auth, validation, CORS, rate limiting, error handling)
export const GET = withStandardMiddleware(handleGetMemories, {
  validation: { querySchema: MemoriesQuerySchema },
  rateLimit: { windowMs: 15 * 60 * 1000, maxRequests: 300 }
});

// OPTIONS handler automatically handled by CORS middleware
```

## Benefits Comparison

| Aspect | Legacy Pattern | New Pattern |
|--------|---------------|-------------|
| **Lines of Code** | ~150 lines | ~25 lines |
| **Duplication** | Repeated across 94+ files | Zero duplication |
| **Error Handling** | Manual try/catch | Automatic middleware |
| **Validation** | Manual schema parsing | Automatic validation |
| **Authentication** | Manual checks | Automatic middleware |
| **CORS** | Manual headers | Automatic middleware |
| **Rate Limiting** | Manual implementation | Automatic middleware |
| **Business Logic** | Mixed with infrastructure | Clean separation |
| **Testing** | Complex setup required | Easy to mock services |
| **Maintainability** | Hard to change patterns | Change once, apply everywhere |

## Migration Strategy

### Option 1: Keep Both Patterns (RECOMMENDED)
- Existing routes continue working as-is
- New routes use new pattern
- Migrate routes only when modifying them

### Option 2: Gradual Migration
- Migrate high-traffic routes first
- Apply middleware incrementally
- Remove legacy code gradually

### Option 3: Full Migration
- Apply middleware to all 94+ routes
- Replace direct DB calls with services
- Remove all duplicate patterns

## Development Guidelines

### For New Routes:
```typescript
// Always use middleware for new routes
export const GET = withStandardMiddleware(handler, {
  validation: { querySchema: YourSchema },
  rateLimit: yourRateLimit
});
```

### For Existing Routes:
```typescript
// Keep existing pattern until modification needed
export async function GET(request: NextRequest) {
  // ... existing legacy implementation
}
```

### For Modified Routes:
```typescript
// When touching existing routes, consider migrating
export const GET = withStandardMiddleware(newHandler, options);
```