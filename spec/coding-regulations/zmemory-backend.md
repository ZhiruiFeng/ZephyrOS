# ZMemory Backend Coding Regulations

## Overview

ZMemory is the backend API service built with Next.js 15, TypeScript, and Supabase. This document defines the coding standards, patterns, and best practices for developing and maintaining the ZMemory backend.

**Technology Stack:**
- Next.js 15 (App Router)
- TypeScript 5.x
- Supabase (PostgreSQL + Auth)
- Zod (Runtime validation)
- OpenAPI/Swagger (API documentation)

## Architecture Principles

### 1. API Route Structure

Follow Next.js App Router conventions with proper organization:

```
app/api/
├── tasks/
│   ├── route.ts                 # GET, POST /api/tasks
│   ├── [id]/
│   │   ├── route.ts            # GET, PUT, DELETE /api/tasks/:id
│   │   ├── subtasks/
│   │   │   └── route.ts        # GET, POST /api/tasks/:id/subtasks
│   │   └── tree/
│   │       └── route.ts        # GET /api/tasks/:id/tree
│   └── updated-today/
│       └── route.ts            # GET /api/tasks/updated-today
├── categories/
│   └── route.ts
└── [other resources]/
```

**Rules:**
- One resource per top-level folder
- Use Next.js dynamic routes for parameters `[id]`
- Group related sub-resources in nested folders
- Keep route handlers focused and single-purpose

### 2. Route Handler Pattern

Every route handler must follow this pattern:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { z } from 'zod'

// Schema definition
const CreateTaskSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
})

/**
 * POST /api/tasks
 * Create a new task
 *
 * @swagger
 * /api/tasks:
 *   post:
 *     summary: Create a new task
 *     ...
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authentication
    const supabase = createServerClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 2. Parse and validate input
    const body = await request.json()
    const validatedData = CreateTaskSchema.parse(body)

    // 3. Business logic
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        ...validatedData,
        user_id: session.user.id,
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    // 4. Return response
    return NextResponse.json(data, { status: 201 })

  } catch (error) {
    // 5. Error handling
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error creating task:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

### 3. Validation with Zod

**Required:** All input must be validated using Zod schemas.

```typescript
// ✅ Good: Explicit validation schema
const UpdateTaskSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().optional(),
  status: z.enum(['todo', 'in_progress', 'completed']).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  dueDate: z.string().datetime().optional(),
}).strict() // Reject unknown fields

// ✅ Good: Validate query parameters
const TaskQuerySchema = z.object({
  status: z.enum(['todo', 'in_progress', 'completed']).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  limit: z.coerce.number().int().positive().max(100).default(50),
  offset: z.coerce.number().int().nonnegative().default(0),
})

export async function GET(request: NextRequest) {
  const searchParams = Object.fromEntries(request.nextUrl.searchParams)
  const query = TaskQuerySchema.parse(searchParams)
  // ...
}

// ❌ Bad: No validation
export async function POST(request: NextRequest) {
  const body = await request.json()
  // Using body directly without validation
}
```

### 4. Authentication & Authorization

**Always authenticate and authorize requests:**

```typescript
// ✅ Good: Proper authentication check
const supabase = createServerClient()
const { data: { session } } = await supabase.auth.getSession()

if (!session) {
  return NextResponse.json(
    { error: 'Unauthorized' },
    { status: 401 }
  )
}

// For resource-specific authorization
const { data: task } = await supabase
  .from('tasks')
  .select('user_id')
  .eq('id', taskId)
  .single()

if (!task || task.user_id !== session.user.id) {
  return NextResponse.json(
    { error: 'Forbidden' },
    { status: 403 }
  )
}

// ❌ Bad: No authentication
export async function GET(request: NextRequest) {
  const supabase = createServerClient()
  const { data } = await supabase.from('tasks').select()
  // Missing authentication check!
}
```

## Database Interaction

### 1. Use Supabase Client Properly

```typescript
// ✅ Good: Use server client with RLS
import { createServerClient } from '@/lib/supabase/server'

const supabase = createServerClient()
// RLS policies automatically filter by user

// ✅ Good: Handle errors explicitly
const { data, error } = await supabase
  .from('tasks')
  .select('*')
  .eq('status', 'todo')

if (error) {
  throw new Error(`Database error: ${error.message}`)
}

// ❌ Bad: Using service role client unnecessarily
// This bypasses RLS - only use when absolutely necessary
const supabaseAdmin = createServiceClient()
```

### 2. Optimize Queries

```typescript
// ✅ Good: Select only needed fields
const { data } = await supabase
  .from('tasks')
  .select('id, title, status, created_at')
  .eq('user_id', userId)

// ✅ Good: Use pagination
const { data } = await supabase
  .from('tasks')
  .select('*', { count: 'exact' })
  .range(offset, offset + limit - 1)

// ✅ Good: Use efficient joins
const { data } = await supabase
  .from('tasks')
  .select(`
    *,
    category:categories(id, name),
    subtasks:subtasks(count)
  `)

// ❌ Bad: Loading all data without pagination
const { data } = await supabase
  .from('tasks')
  .select('*')
// Could return thousands of rows
```

### 3. Transaction Handling

```typescript
// ✅ Good: Use PostgreSQL functions for complex operations
const { data, error } = await supabase
  .rpc('complete_task_with_subtasks', {
    task_id: taskId,
    completion_time: new Date().toISOString(),
  })

// For simple operations, multiple queries are OK
const { error: deleteSubtasksError } = await supabase
  .from('subtasks')
  .delete()
  .eq('task_id', taskId)

if (deleteSubtasksError) throw deleteSubtasksError

const { error: deleteTaskError } = await supabase
  .from('tasks')
  .delete()
  .eq('id', taskId)

if (deleteTaskError) throw deleteTaskError
```

## Error Handling

### 1. Consistent Error Responses

```typescript
// Standard error response format
interface ErrorResponse {
  error: string
  details?: unknown
  code?: string
}

// ✅ Good: Consistent error handling
try {
  // Operation
} catch (error) {
  // Validation errors
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      {
        error: 'Validation error',
        details: error.errors
      },
      { status: 400 }
    )
  }

  // Database errors
  if (error && typeof error === 'object' && 'code' in error) {
    // PostgreSQL error codes
    if (error.code === '23505') { // Unique violation
      return NextResponse.json(
        { error: 'Resource already exists' },
        { status: 409 }
      )
    }
  }

  // Log unexpected errors
  console.error('Unexpected error:', error)

  // Never expose internal errors to clients in production
  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  )
}
```

### 2. HTTP Status Codes

Use appropriate HTTP status codes:

- `200` - Successful GET, PUT, PATCH
- `201` - Successful POST (created)
- `204` - Successful DELETE (no content)
- `400` - Bad request (validation error)
- `401` - Unauthorized (not authenticated)
- `403` - Forbidden (not authorized)
- `404` - Not found
- `409` - Conflict (duplicate, constraint violation)
- `422` - Unprocessable entity (semantic error)
- `429` - Too many requests (rate limit)
- `500` - Internal server error

## API Documentation

### 1. OpenAPI/Swagger Annotations

**Required:** All endpoints must have Swagger documentation.

```typescript
/**
 * GET /api/tasks
 * Retrieve a list of tasks with optional filtering
 *
 * @swagger
 * /api/tasks:
 *   get:
 *     summary: List tasks
 *     description: Retrieve a paginated list of tasks with optional filters
 *     tags:
 *       - Tasks
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [todo, in_progress, completed]
 *         description: Filter by task status
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *         description: Number of items to return
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Task'
 *                 total:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export async function GET(request: NextRequest) {
  // Implementation
}
```

### 2. Type Definitions

```typescript
// ✅ Good: Share types between client and server
// Define in packages/shared/types or lib/types

export interface Task {
  id: string
  title: string
  description: string | null
  status: 'todo' | 'in_progress' | 'completed'
  priority: 'low' | 'medium' | 'high'
  category_id: string | null
  user_id: string
  created_at: string
  updated_at: string
  due_date: string | null
}

export interface TaskWithCategory extends Task {
  category: Category | null
}

export type TaskStatus = Task['status']
export type TaskPriority = Task['priority']
```

## Security Best Practices

### 1. Input Sanitization

```typescript
// ✅ Good: Validate and sanitize
const CreateTaskSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(500, 'Title too long')
    .trim(),
  description: z.string()
    .max(5000, 'Description too long')
    .trim()
    .optional(),
  // Validate UUIDs
  categoryId: z.string().uuid().optional(),
  // Validate emails
  email: z.string().email().optional(),
  // Validate URLs
  websiteUrl: z.string().url().optional(),
})
```

### 2. Rate Limiting

```typescript
// Implement rate limiting for sensitive endpoints
import { rateLimit } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  // Check rate limit
  const identifier = request.ip ?? 'anonymous'
  const { success, reset } = await rateLimit(identifier, {
    interval: 60 * 1000, // 1 minute
    limit: 10, // 10 requests per minute
  })

  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Reset': reset.toString(),
        }
      }
    )
  }

  // Process request
}
```

### 3. SQL Injection Prevention

```typescript
// ✅ Good: Supabase automatically prevents SQL injection
const { data } = await supabase
  .from('tasks')
  .select('*')
  .eq('title', userInput) // Safe - parameterized

// ✅ Good: For RPC calls, use parameters
const { data } = await supabase
  .rpc('search_tasks', { search_term: userInput })

// ❌ Bad: Never use raw SQL with user input
// (Supabase doesn't expose raw SQL, but avoid if using other tools)
```

## Testing Requirements

### 1. Unit Tests

```typescript
// tests/api/tasks.test.ts
import { createMocks } from 'node-mocks-http'
import { GET, POST } from '@/app/api/tasks/route'

describe('/api/tasks', () => {
  describe('GET', () => {
    it('should return tasks for authenticated user', async () => {
      const { req } = createMocks({
        method: 'GET',
      })

      const response = await GET(req as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(Array.isArray(data)).toBe(true)
    })

    it('should return 401 for unauthenticated requests', async () => {
      // Test implementation
    })
  })

  describe('POST', () => {
    it('should create task with valid data', async () => {
      // Test implementation
    })

    it('should return 400 for invalid data', async () => {
      // Test implementation
    })
  })
})
```

### 2. Integration Tests

```typescript
// Use Postman/Newman for API integration tests
// tests/postman/ZMemory-API.postman_collection.json
```

Run with:
```bash
npm run test:api
```

## Code Organization

### 1. Utility Functions

```typescript
// lib/utils/
├── validation.ts      # Common Zod schemas
├── auth.ts           # Auth helpers
├── errors.ts         # Error classes
└── response.ts       # Response helpers

// Example: lib/utils/response.ts
export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json(data, { status })
}

export function errorResponse(
  message: string,
  status = 500,
  details?: unknown
) {
  return NextResponse.json(
    { error: message, details },
    { status }
  )
}
```

### 2. Middleware

```typescript
// lib/middleware/
├── auth.ts           # Authentication middleware
├── cors.ts           # CORS configuration
├── rate-limit.ts     # Rate limiting
└── logging.ts        # Request logging

// Example: lib/middleware/auth.ts
export async function withAuth(
  handler: (req: NextRequest, session: Session) => Promise<Response>
) {
  return async (request: NextRequest) => {
    const supabase = createServerClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return errorResponse('Unauthorized', 401)
    }

    return handler(request, session)
  }
}

// Usage in route
export const GET = withAuth(async (request, session) => {
  // Handler has access to session
})
```

## Performance Optimization

### 1. Caching

```typescript
// Use Next.js caching features
export const revalidate = 60 // Revalidate every 60 seconds

export async function GET() {
  const data = await fetchData()

  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120'
    }
  })
}
```

### 2. Database Query Optimization

```typescript
// ✅ Good: Use database functions for complex queries
const { data } = await supabase
  .rpc('get_task_statistics', {
    user_id: session.user.id,
    date_from: startDate,
    date_to: endDate,
  })

// ✅ Good: Use materialized views for expensive queries
const { data } = await supabase
  .from('task_statistics_view')
  .select('*')
  .eq('user_id', session.user.id)
```

## Monitoring and Logging

### 1. Structured Logging

```typescript
// Use structured logging
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  logger.info('Creating task', {
    userId: session.user.id,
    endpoint: '/api/tasks',
  })

  try {
    // Operation
    logger.info('Task created successfully', {
      taskId: data.id,
      userId: session.user.id,
    })
  } catch (error) {
    logger.error('Failed to create task', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: session.user.id,
    })
  }
}
```

### 2. Error Tracking

```typescript
// Integrate with error tracking service (e.g., Sentry)
import * as Sentry from '@sentry/nextjs'

try {
  // Operation
} catch (error) {
  Sentry.captureException(error, {
    tags: {
      endpoint: '/api/tasks',
      method: 'POST',
    },
    user: {
      id: session.user.id,
    },
  })

  return errorResponse('Internal server error', 500)
}
```

## Environment Configuration

### 1. Environment Variables

```typescript
// .env.local
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DATABASE_URL=your-database-url

// lib/env.ts - Validate environment variables
import { z } from 'zod'

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  NODE_ENV: z.enum(['development', 'production', 'test']),
})

export const env = envSchema.parse(process.env)
```

## Deployment Checklist

Before deploying to production:

- [ ] All tests pass
- [ ] TypeScript type checking passes
- [ ] API documentation is up to date
- [ ] Environment variables are configured
- [ ] Database migrations are applied
- [ ] Rate limiting is configured
- [ ] Error tracking is set up
- [ ] Logging is configured
- [ ] Security headers are set
- [ ] CORS is properly configured

---

**Last Updated**: 2025-10-10
**Component**: ZMemory Backend API
**Tech Stack**: Next.js 15 + TypeScript + Supabase
