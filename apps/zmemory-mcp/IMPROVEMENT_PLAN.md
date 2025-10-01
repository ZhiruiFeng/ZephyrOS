# ZMemory MCP Server Improvement Plan

**Version:** 1.0
**Date:** 2025-09-30
**Status:** Planning Phase

---

## 📊 Current State Assessment

### Strengths
- ✅ Well-structured modular architecture (handlers, modules, tools)
- ✅ Comprehensive tool coverage (46 tools across 7 categories)
- ✅ Good TypeScript type safety with Zod validation
- ✅ OAuth 2.0 authentication implemented
- ✅ Clear documentation structure
- ✅ Integration with ZFlow agents
- ✅ ~5,460 lines of code, well-organized

### Gaps Identified
- ❌ No automated tests (0 test files found)
- ❌ No error handling standardization
- ❌ Limited observability/logging
- ❌ No rate limiting or request throttling
- ❌ Missing tool usage analytics
- ❌ No caching layer
- ❌ Limited offline support
- ❌ No health monitoring

---

## 🎯 Improvement Roadmap

### **Phase 1: Quality & Reliability** (Weeks 1-2)

#### 1.1 Testing Infrastructure ⭐⭐⭐
**Priority:** CRITICAL
**Estimated Effort:** 1.5 weeks
**Impact:** 🔥🔥🔥 Prevents regressions, enables confident refactoring

**Current State:** 0% test coverage
**Target State:** 80% test coverage

**Tasks:**
- [ ] Set up Jest/Vitest testing framework with TypeScript
- [ ] Add unit tests for all tool handlers
  - [ ] task-handlers.test.ts
  - [ ] memory-handlers.test.ts
  - [ ] activity-handlers.test.ts
  - [ ] timeline-handlers.test.ts
  - [ ] time-tracking-handlers.test.ts
  - [ ] ai-tasks-handlers.test.ts
  - [ ] auth-handlers.test.ts
- [ ] Add integration tests for API client
  - [ ] zmemory-client.test.ts
  - [ ] auth-module.test.ts
- [ ] Add E2E tests for common workflows
  - [ ] task-workflow.test.ts (create → update → complete)
  - [ ] auth-flow.test.ts (OAuth flow)
  - [ ] memory-workflow.test.ts (add → search → update)
- [ ] Set up CI/CD pipeline with automated tests
- [ ] Add test fixtures and mock data generators
- [ ] Add coverage reporting (target: 80%)

**File Structure:**
```
apps/zmemory-mcp/
├── src/
│   └── __tests__/
│       ├── unit/
│       │   ├── handlers/
│       │   └── modules/
│       ├── integration/
│       │   ├── task-workflow.test.ts
│       │   └── auth-flow.test.ts
│       └── e2e/
│           └── complete-workflows.test.ts
├── test/
│   ├── fixtures/
│   │   ├── tasks.json
│   │   ├── memories.json
│   │   └── users.json
│   └── mocks/
│       ├── zmemory-api-mock.ts
│       └── oauth-mock.ts
└── jest.config.js
```

**Dependencies to Add:**
```json
{
  "devDependencies": {
    "@types/jest": "^29.5.0",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.0",
    "@testing-library/jest-dom": "^6.1.0"
  }
}
```

---

#### 1.2 Error Handling & Validation ⭐⭐⭐
**Priority:** HIGH
**Estimated Effort:** 0.5 weeks
**Impact:** 🔥🔥🔥 Better debugging, improved user experience

**Current State:** Inconsistent error handling
**Target State:** Standardized error classes with codes and context

**Tasks:**
- [ ] Create standardized error classes hierarchy
- [ ] Add error codes and i18n error messages
- [ ] Implement retry logic for transient failures
- [ ] Add request/response validation middleware
- [ ] Create error recovery strategies
- [ ] Add error context (user_id, request_id, timestamp)
- [ ] Update all handlers to use new error classes

**Implementation:**
```typescript
// src/errors/index.ts
export class ZMemoryMCPError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = this.constructor.name;
  }

  toJSON() {
    return {
      error: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      context: this.context,
    };
  }
}

export class ToolExecutionError extends ZMemoryMCPError {}
export class AuthenticationError extends ZMemoryMCPError {}
export class ValidationError extends ZMemoryMCPError {}
export class RateLimitError extends ZMemoryMCPError {}
export class NetworkError extends ZMemoryMCPError {}
export class NotFoundError extends ZMemoryMCPError {}

// Error codes
export const ErrorCodes = {
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  AUTH_TOKEN_INVALID: 'AUTH_TOKEN_INVALID',
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  NETWORK_ERROR: 'NETWORK_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

// Usage example
throw new AuthenticationError(
  ErrorCodes.AUTH_TOKEN_EXPIRED,
  'Access token has expired',
  401,
  { user_id, expires_at, issued_at }
);
```

**Error Response Format:**
```typescript
interface ErrorResponse {
  error: string;          // Error class name
  code: string;           // Error code
  message: string;        // Human-readable message
  statusCode: number;     // HTTP status code
  context?: {             // Additional context
    user_id?: string;
    request_id?: string;
    timestamp?: string;
    [key: string]: any;
  };
}
```

---

#### 1.3 Observability & Monitoring ⭐⭐
**Priority:** MEDIUM
**Estimated Effort:** 1 week
**Impact:** 🔥🔥 Better production support, performance insights

**Current State:** Basic console.log, no metrics
**Target State:** Structured logging, metrics, tracing, health checks

**Tasks:**
- [ ] Add structured logging with Pino
- [ ] Implement request/response logging middleware
- [ ] Add performance metrics (response times, error rates)
- [ ] Create comprehensive health check endpoint
- [ ] Add tracing for distributed debugging (optional: OpenTelemetry)
- [ ] Set up alerting for critical errors
- [ ] Add log levels configuration
- [ ] Implement PII redaction in logs

**Implementation:**
```typescript
// src/observability/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
  redact: {
    paths: [
      '*.access_token',
      '*.refresh_token',
      '*.password',
      '*.client_secret',
      'req.headers.authorization',
    ],
    censor: '[REDACTED]',
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

// src/observability/metrics.ts
export class MetricsCollector {
  private metrics = {
    toolCalls: new Map<string, number>(),
    responseTime: new Map<string, number[]>(),
    errors: new Map<string, number>(),
  };

  recordToolCall(toolName: string, durationMs: number, success: boolean) {
    // Increment counter
    this.metrics.toolCalls.set(
      toolName,
      (this.metrics.toolCalls.get(toolName) || 0) + 1
    );

    // Record response time
    const times = this.metrics.responseTime.get(toolName) || [];
    times.push(durationMs);
    this.metrics.responseTime.set(toolName, times);

    // Record errors
    if (!success) {
      this.metrics.errors.set(
        toolName,
        (this.metrics.errors.get(toolName) || 0) + 1
      );
    }
  }

  getMetrics() {
    return {
      toolCalls: Object.fromEntries(this.metrics.toolCalls),
      avgResponseTime: this.calculateAvgResponseTime(),
      errorRate: this.calculateErrorRate(),
    };
  }
}

// Usage in handlers
const startTime = Date.now();
try {
  logger.info({ tool: 'create_task', args }, 'Executing tool');
  const result = await this.taskHandlers.handleCreateTask(args);
  const duration = Date.now() - startTime;

  metrics.recordToolCall('create_task', duration, true);
  logger.info({ tool: 'create_task', duration, user_id }, 'Task created successfully');

  return result;
} catch (error) {
  const duration = Date.now() - startTime;
  metrics.recordToolCall('create_task', duration, false);
  logger.error({ tool: 'create_task', duration, error }, 'Task creation failed');
  throw error;
}
```

**Health Check Tool:**
```typescript
{
  name: 'health_check',
  description: 'Check MCP server health and diagnostics',
  inputSchema: {
    type: 'object',
    properties: {
      detailed: {
        type: 'boolean',
        default: false,
        description: 'Include detailed diagnostics'
      }
    }
  }
}

// Response
{
  status: 'healthy' | 'degraded' | 'unhealthy',
  timestamp: '2025-09-30T12:00:00Z',
  uptime: 3600,
  version: '2.0.0',
  checks: {
    api: { status: 'healthy', latency: 45 },
    auth: { status: 'healthy' },
    cache: { status: 'healthy', hit_rate: 0.72 }
  },
  metrics: {
    total_requests: 1234,
    error_rate: 0.02,
    avg_response_time: 120
  }
}
```

**Dependencies to Add:**
```json
{
  "dependencies": {
    "pino": "^8.16.0",
    "pino-pretty": "^10.2.0"
  }
}
```

---

### **Phase 2: Performance & Scalability** (Weeks 3-4)

#### 2.1 Caching Layer ⭐⭐
**Priority:** MEDIUM
**Estimated Effort:** 1 week
**Impact:** 🔥🔥 30-50% faster response times for cached data

**Current State:** No caching, every request hits API
**Target State:** Smart caching with TTL and invalidation

**Tasks:**
- [ ] Implement in-memory cache with LRU eviction
- [ ] Add cache invalidation strategies
- [ ] Cache user info and auth state (TTL: 5min)
- [ ] Cache task/memory lists (TTL: 1min)
- [ ] Cache search results (TTL: 30sec)
- [ ] Add cache hit/miss metrics
- [ ] Support distributed cache (Redis) for multi-instance
- [ ] Add cache warming for common queries
- [ ] Implement cache-aside pattern

**Implementation:**
```typescript
// src/cache/cache-manager.ts
export interface CacheEntry<T> {
  data: T;
  expires: number;
  created: number;
}

export class CacheManager {
  private cache = new Map<string, CacheEntry<any>>();
  private maxSize = 1000; // LRU eviction after this

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      metrics.recordCacheMiss(key);
      return null;
    }

    if (entry.expires < Date.now()) {
      this.cache.delete(key);
      metrics.recordCacheExpired(key);
      return null;
    }

    metrics.recordCacheHit(key);
    return entry.data as T;
  }

  set<T>(key: string, data: T, ttlMs: number = 60000) {
    // LRU eviction if needed
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      data,
      expires: Date.now() + ttlMs,
      created: Date.now(),
    });
  }

  invalidate(pattern: string | RegExp) {
    const regex = typeof pattern === 'string'
      ? new RegExp(pattern)
      : pattern;

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  invalidateByTag(tag: string) {
    // Tag-based invalidation for related items
    this.invalidate(`.*:${tag}:.*`);
  }

  clear() {
    this.cache.clear();
  }

  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: metrics.getCacheHitRate(),
    };
  }
}

// Usage in modules
export class TaskModule {
  constructor(
    private client: AxiosInstance,
    private authState: AuthState,
    private cache: CacheManager
  ) {}

  async searchTasks(params: SearchParams) {
    const cacheKey = `tasks:search:${JSON.stringify(params)}`;

    // Try cache first
    const cached = this.cache.get<Task[]>(cacheKey);
    if (cached) return cached;

    // Cache miss - fetch from API
    const tasks = await this.client.get('/tasks', { params });

    // Cache for 1 minute
    this.cache.set(cacheKey, tasks.data, 60000);

    return tasks.data;
  }

  async createTask(data: CreateTaskParams) {
    const task = await this.client.post('/tasks', data);

    // Invalidate search caches
    this.cache.invalidateByTag('tasks');

    return task.data;
  }
}
```

**Cache Strategies:**
- **User Info:** 5 min TTL, invalidate on logout
- **Task Lists:** 1 min TTL, invalidate on create/update/delete
- **Memory Lists:** 1 min TTL, invalidate on create/update/delete
- **Search Results:** 30 sec TTL, invalidate on any mutation
- **Stats:** 5 min TTL, invalidate on mutations

---

#### 2.2 Rate Limiting & Throttling ⭐⭐
**Priority:** MEDIUM
**Estimated Effort:** 0.5 weeks
**Impact:** 🔥 Prevents abuse, ensures service availability

**Current State:** No rate limiting
**Target State:** Per-user, per-tool rate limits with headers

**Tasks:**
- [ ] Implement per-user rate limiting
- [ ] Add per-tool rate limits
- [ ] Create rate limit headers (X-RateLimit-*)
- [ ] Add burst protection
- [ ] Implement queue for rate-limited requests (optional)
- [ ] Add rate limit bypass for premium users
- [ ] Add rate limit metrics and alerts

**Implementation:**
```typescript
// src/middleware/rate-limiter.ts
export interface RateLimitConfig {
  windowMs: number;      // Time window in milliseconds
  maxRequests: number;   // Max requests per window
  skipPremium?: boolean; // Skip rate limit for premium users
}

export class RateLimiter {
  private limits = new Map<string, { count: number; reset: number }>();

  // Tool-specific limits
  private toolLimits: Record<string, RateLimitConfig> = {
    default: { windowMs: 60000, maxRequests: 100 },
    create_task: { windowMs: 60000, maxRequests: 50 },
    search_tasks: { windowMs: 60000, maxRequests: 200 },
    add_memory: { windowMs: 60000, maxRequests: 50 },
  };

  async checkLimit(userId: string, tool: string): Promise<RateLimitInfo> {
    const key = `${userId}:${tool}`;
    const config = this.toolLimits[tool] || this.toolLimits.default;

    const current = this.limits.get(key);
    const now = Date.now();

    // Reset window if expired
    if (!current || current.reset < now) {
      this.limits.set(key, {
        count: 1,
        reset: now + config.windowMs
      });

      return {
        allowed: true,
        limit: config.maxRequests,
        remaining: config.maxRequests - 1,
        reset: now + config.windowMs,
      };
    }

    // Check if limit exceeded
    if (current.count >= config.maxRequests) {
      throw new RateLimitError(
        ErrorCodes.RATE_LIMIT_EXCEEDED,
        `Rate limit exceeded for ${tool}`,
        429,
        {
          limit: config.maxRequests,
          reset_at: current.reset,
          retry_after: Math.ceil((current.reset - now) / 1000),
        }
      );
    }

    current.count++;

    return {
      allowed: true,
      limit: config.maxRequests,
      remaining: config.maxRequests - current.count,
      reset: current.reset,
    };
  }

  // Add to response headers
  addHeaders(response: any, info: RateLimitInfo) {
    response.headers = {
      ...response.headers,
      'X-RateLimit-Limit': info.limit,
      'X-RateLimit-Remaining': info.remaining,
      'X-RateLimit-Reset': new Date(info.reset).toISOString(),
    };
  }
}

// Usage in server
async handleToolCall(name: string, args: any) {
  const userId = this.getCurrentUserId();
  const rateLimitInfo = await rateLimiter.checkLimit(userId, name);

  try {
    const result = await this.executeToolCall(name, args);

    // Add rate limit headers to response
    rateLimiter.addHeaders(result, rateLimitInfo);

    return result;
  } catch (error) {
    throw error;
  }
}
```

**Rate Limits:**
- Default: 100 requests/min per user
- `create_task`: 50 requests/min
- `search_*`: 200 requests/min
- `add_memory`: 50 requests/min
- `update_*`: 100 requests/min

---

#### 2.3 Batch Operations ⭐
**Priority:** LOW
**Estimated Effort:** 1 week
**Impact:** 🔥 10x faster for bulk imports

**Tasks:**
- [ ] Add batch create tools (tasks, memories, activities)
- [ ] Add batch update tools
- [ ] Add batch delete tools
- [ ] Implement transaction support
- [ ] Add progress reporting for long operations
- [ ] Create batch validation
- [ ] Add partial success handling
- [ ] Add rollback on failure (optional)

**New Tools:**
```typescript
{
  name: 'batch_create_tasks',
  description: 'Create multiple tasks in a single operation. Maximum 100 tasks per batch.',
  inputSchema: {
    type: 'object',
    properties: {
      tasks: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
            // ... other task properties
          },
          required: ['title']
        },
        minItems: 1,
        maxItems: 100
      },
      stopOnError: {
        type: 'boolean',
        default: false,
        description: 'Stop processing on first error (default: continue and return partial results)'
      }
    },
    required: ['tasks']
  }
}

// Response
{
  success: true,
  total: 100,
  succeeded: 98,
  failed: 2,
  results: [
    { index: 0, success: true, task: {...} },
    { index: 1, success: true, task: {...} },
    { index: 42, success: false, error: 'Validation failed' },
    // ...
  ],
  errors: [
    { index: 42, error: 'Validation failed: title too long' },
    { index: 87, error: 'Category not found' }
  ]
}
```

---

### **Phase 3: Developer Experience** (Weeks 5-6)

#### 3.1 Enhanced Documentation ⭐⭐
**Priority:** MEDIUM
**Estimated Effort:** 1 week
**Impact:** 🔥🔥 Faster onboarding, fewer support requests

**Tasks:**
- [ ] Create interactive API playground/sandbox
- [ ] Add video tutorials for common workflows
- [ ] Generate OpenAPI/Swagger spec from tools
- [ ] Create troubleshooting flowcharts
- [ ] Add migration guides for version updates
- [ ] Document performance best practices
- [ ] Add API changelog with breaking changes
- [ ] Create contribution guidelines

**File Structure:**
```
apps/zmemory-mcp/
├── docs/
│   ├── api-reference/
│   │   ├── README.md          # Auto-generated from tools
│   │   ├── tasks.md
│   │   ├── memories.md
│   │   └── activities.md
│   ├── tutorials/
│   │   ├── 01-getting-started.md
│   │   ├── 02-task-management.md
│   │   ├── 03-memory-capture.md
│   │   └── 04-time-tracking.md
│   ├── troubleshooting/
│   │   ├── auth-issues.md
│   │   ├── connection-issues.md
│   │   └── common-errors.md
│   ├── examples/
│   │   ├── daily-standup-report.md
│   │   ├── bulk-task-import.md
│   │   └── productivity-dashboard.md
│   └── videos/
│       └── README.md           # Links to video tutorials
└── playground/
    ├── index.html              # Interactive tool tester
    └── README.md
```

**OpenAPI Generation:**
```typescript
// scripts/generate-openapi.ts
import { allTools } from '../src/tools';

function generateOpenAPISpec() {
  return {
    openapi: '3.0.0',
    info: {
      title: 'ZMemory MCP Server',
      version: '2.0.0',
      description: 'Memory management for AI agents via MCP protocol',
    },
    servers: [
      { url: 'http://localhost:3000', description: 'Local' },
      { url: 'https://your-api.vercel.app', description: 'Production' },
    ],
    paths: generatePathsFromTools(allTools),
    components: {
      schemas: generateSchemasFromTools(allTools),
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer' },
      },
    },
  };
}
```

---

#### 3.2 Development Tools ⭐⭐
**Priority:** MEDIUM
**Estimated Effort:** 1 week
**Impact:** 🔥 Faster development iterations

**Tasks:**
- [ ] Create CLI for local testing
- [ ] Add request/response inspector
- [ ] Build tool usage analytics dashboard
- [ ] Create migration scripts for schema changes
- [ ] Add performance profiler
- [ ] Create debug mode with verbose logging
- [ ] Add mock data generators

**CLI Implementation:**
```bash
# Install CLI globally
npm install -g @zephyros/zmemory-mcp-cli

# Commands
zmemory-mcp test create_task --title "Test" --dry-run
zmemory-mcp inspect request --id req_123
zmemory-mcp analyze usage --from 2024-01-01 --to 2024-01-31
zmemory-mcp migrate --from v1.0 --to v2.0
zmemory-mcp profile search_tasks --iterations 100
zmemory-mcp mock generate --type tasks --count 100
zmemory-mcp doctor  # Check configuration and health
```

**Files:**
```
apps/zmemory-mcp-cli/
├── src/
│   ├── commands/
│   │   ├── test.ts
│   │   ├── inspect.ts
│   │   ├── analyze.ts
│   │   ├── migrate.ts
│   │   ├── profile.ts
│   │   ├── mock.ts
│   │   └── doctor.ts
│   └── index.ts
└── package.json
```

---

#### 3.3 SDK & Client Libraries ⭐
**Priority:** LOW
**Estimated Effort:** 1.5 weeks
**Impact:** 🔥 Lower barrier to entry for integrations

**Tasks:**
- [ ] Create JavaScript/TypeScript SDK
- [ ] Create Python SDK
- [ ] Add code generation from tools schema
- [ ] Publish SDKs to npm/PyPI
- [ ] Add SDK examples and starter templates
- [ ] Add SDK documentation
- [ ] Create SDK test suites

**TypeScript SDK:**
```typescript
// @zephyros/zmemory-sdk
import { ZMemoryClient } from '@zephyros/zmemory-sdk';

const client = new ZMemoryClient({
  apiKey: process.env.ZMEMORY_API_KEY,
  baseUrl: 'http://localhost:3001',
});

// Type-safe API
const task = await client.tasks.create({
  title: 'Complete documentation',
  priority: 'high',
  dueDate: '2024-12-31',
});

const tasks = await client.tasks.search({
  status: 'pending',
  priority: 'high',
});

// Batch operations
const results = await client.tasks.batchCreate([
  { title: 'Task 1' },
  { title: 'Task 2' },
]);
```

---

### **Phase 4: Advanced Features** (Weeks 7-8)

#### 4.1 Offline Support & Sync ⭐⭐
**Priority:** MEDIUM
**Estimated Effort:** 1.5 weeks
**Impact:** 🔥🔥 Works in unreliable networks

**Tasks:**
- [ ] Implement offline queue for operations
- [ ] Add conflict resolution strategies
- [ ] Create sync status tracking
- [ ] Support optimistic updates
- [ ] Add sync prioritization (urgent ops first)
- [ ] Build recovery from sync failures
- [ ] Add offline storage (IndexedDB/localStorage)
- [ ] Create sync manager

**Implementation:**
```typescript
// src/offline/sync-manager.ts
export interface QueuedOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  tool: string;
  args: any;
  timestamp: number;
  priority: number;
  retries: number;
  maxRetries: number;
}

export class SyncManager {
  private queue: QueuedOperation[] = [];
  private syncInProgress = false;

  async queueOperation(op: Omit<QueuedOperation, 'id' | 'timestamp' | 'retries'>) {
    const operation: QueuedOperation = {
      ...op,
      id: uuid(),
      timestamp: Date.now(),
      retries: 0,
      maxRetries: 3,
    };

    this.queue.push(operation);
    await this.persistQueue();

    // Try opportunistic sync
    this.trySync();

    return operation.id;
  }

  async sync() {
    if (this.syncInProgress) return;
    this.syncInProgress = true;

    try {
      // Sort by priority (high first) then timestamp (oldest first)
      const operations = [...this.queue].sort((a, b) =>
        b.priority - a.priority || a.timestamp - b.timestamp
      );

      for (const op of operations) {
        try {
          await this.executeOperation(op);
          this.removeFromQueue(op.id);
          logger.info({ op_id: op.id }, 'Operation synced successfully');
        } catch (error) {
          await this.handleSyncError(op, error);
        }
      }
    } finally {
      this.syncInProgress = false;
    }
  }

  private async handleSyncError(op: QueuedOperation, error: any) {
    op.retries++;

    if (op.retries >= op.maxRetries) {
      logger.error({ op_id: op.id, error }, 'Operation failed after max retries');
      this.removeFromQueue(op.id);
      // Move to failed queue for manual review
      await this.moveToFailedQueue(op, error);
    } else {
      logger.warn({ op_id: op.id, retries: op.retries }, 'Operation failed, will retry');
      await this.persistQueue();
    }
  }

  getQueueStatus() {
    return {
      total: this.queue.length,
      pending: this.queue.filter(op => op.retries === 0).length,
      retrying: this.queue.filter(op => op.retries > 0).length,
      syncInProgress: this.syncInProgress,
    };
  }
}

// New tools for sync management
{
  name: 'get_sync_status',
  description: 'Get offline sync queue status',
}
{
  name: 'force_sync',
  description: 'Force sync of offline queue',
}
{
  name: 'clear_failed_operations',
  description: 'Clear failed operations from queue',
}
```

**Conflict Resolution:**
- **Last-Write-Wins:** Default strategy
- **Server-Wins:** For critical fields
- **Client-Wins:** For user preferences
- **Merge:** For arrays/lists (append)
- **Manual:** Prompt user for conflicts

---

#### 4.2 Smart Suggestions & AI Features ⭐
**Priority:** LOW
**Estimated Effort:** 1.5 weeks
**Impact:** 🔥 Smarter workflows, reduced cognitive load

**Tasks:**
- [ ] Add smart task priority suggestions
- [ ] Implement duplicate detection
- [ ] Create auto-categorization
- [ ] Add time estimate predictions
- [ ] Build related items suggestions
- [ ] Create smart search with embeddings
- [ ] Add sentiment analysis for memories

**New Tools:**
```typescript
{
  name: 'suggest_task_priority',
  description: 'AI-powered task priority suggestion based on content, due date, and historical patterns',
  inputSchema: {
    type: 'object',
    properties: {
      task_id: { type: 'string', description: 'Task ID to analyze' },
      context: {
        type: 'object',
        description: 'Additional context (related tasks, calendar events, etc.)'
      }
    },
    required: ['task_id']
  }
}

{
  name: 'detect_duplicates',
  description: 'Detect potential duplicate tasks or memories using semantic similarity',
  inputSchema: {
    type: 'object',
    properties: {
      type: { type: 'string', enum: ['task', 'memory'] },
      content: { type: 'string', description: 'Content to check for duplicates' },
      threshold: { type: 'number', minimum: 0, maximum: 1, default: 0.85 }
    }
  }
}

{
  name: 'auto_categorize',
  description: 'Automatically suggest category for task/memory based on content',
  inputSchema: {
    type: 'object',
    properties: {
      content: { type: 'string' },
      type: { type: 'string', enum: ['task', 'memory', 'activity'] }
    }
  }
}

{
  name: 'predict_duration',
  description: 'Predict task duration based on historical similar tasks',
  inputSchema: {
    type: 'object',
    properties: {
      task_id: { type: 'string' }
    }
  }
}

{
  name: 'find_related',
  description: 'Find related tasks/memories using semantic search',
  inputSchema: {
    type: 'object',
    properties: {
      item_id: { type: 'string' },
      type: { type: 'string', enum: ['task', 'memory', 'activity'] },
      limit: { type: 'number', default: 10 }
    }
  }
}
```

**Implementation:**
```typescript
// src/ai/embeddings.ts
import { OpenAI } from 'openai';

export class EmbeddingsService {
  private openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  async generateEmbedding(text: string): Promise<number[]> {
    const response = await this.openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });

    return response.data[0].embedding;
  }

  async findSimilar(
    queryEmbedding: number[],
    candidates: Array<{ id: string; embedding: number[] }>,
    threshold: number = 0.85
  ) {
    return candidates
      .map(c => ({
        ...c,
        similarity: this.cosineSimilarity(queryEmbedding, c.embedding),
      }))
      .filter(c => c.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    // Vector similarity calculation
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }
}
```

---

#### 4.3 Webhooks & Events ⭐
**Priority:** LOW
**Estimated Effort:** 1 week
**Impact:** 🔥 Enables powerful automations

**Tasks:**
- [ ] Implement webhook registration endpoints
- [ ] Add event types (task.created, task.updated, etc.)
- [ ] Create webhook delivery queue
- [ ] Add retry logic for failed deliveries
- [ ] Build webhook signature verification (HMAC)
- [ ] Add webhook management UI
- [ ] Create webhook logs and analytics
- [ ] Add webhook testing tools

**Event Types:**
```typescript
enum WebhookEvent {
  TASK_CREATED = 'task.created',
  TASK_UPDATED = 'task.updated',
  TASK_DELETED = 'task.deleted',
  TASK_COMPLETED = 'task.completed',
  MEMORY_CREATED = 'memory.created',
  MEMORY_UPDATED = 'memory.updated',
  ACTIVITY_CREATED = 'activity.created',
  TIMER_STARTED = 'timer.started',
  TIMER_STOPPED = 'timer.stopped',
}
```

**New Tools:**
```typescript
{
  name: 'register_webhook',
  description: 'Register a webhook endpoint for event notifications',
  inputSchema: {
    type: 'object',
    properties: {
      url: { type: 'string', format: 'uri' },
      events: {
        type: 'array',
        items: { type: 'string' },
        description: 'Events to subscribe to'
      },
      secret: {
        type: 'string',
        description: 'Secret for HMAC signature verification'
      }
    }
  }
}

{
  name: 'list_webhooks',
  description: 'List all registered webhooks',
}

{
  name: 'delete_webhook',
  description: 'Delete a webhook subscription',
  inputSchema: {
    type: 'object',
    properties: {
      webhook_id: { type: 'string' }
    }
  }
}

{
  name: 'test_webhook',
  description: 'Send a test event to webhook',
  inputSchema: {
    type: 'object',
    properties: {
      webhook_id: { type: 'string' },
      event_type: { type: 'string' }
    }
  }
}
```

---

### **Phase 5: Enterprise Features** (Weeks 9-10)

#### 5.1 Multi-tenancy & Teams ⭐
**Priority:** LOW (unless targeting enterprise)
**Estimated Effort:** 2 weeks
**Impact:** 🔥🔥 Enables enterprise sales

**Tasks:**
- [ ] Add organization/workspace support
- [ ] Implement team member management
- [ ] Create role-based access control (RBAC)
- [ ] Add shared tasks/memories
- [ ] Build activity audit logs
- [ ] Create usage quotas per organization
- [ ] Add billing and subscription management
- [ ] Implement data isolation

**Schema Changes:**
```sql
-- Add organizations table
CREATE TABLE organizations (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  plan TEXT NOT NULL, -- free, pro, enterprise
  settings JSONB,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Add team members
CREATE TABLE organization_members (
  organization_id UUID REFERENCES organizations(id),
  user_id UUID REFERENCES users(id),
  role TEXT NOT NULL, -- owner, admin, member, viewer
  permissions JSONB,
  joined_at TIMESTAMP,
  PRIMARY KEY (organization_id, user_id)
);

-- Add organization_id to existing tables
ALTER TABLE tasks ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE memories ADD COLUMN organization_id UUID REFERENCES organizations(id);

-- Add sharing
CREATE TABLE shared_items (
  item_id UUID NOT NULL,
  item_type TEXT NOT NULL, -- task, memory, activity
  shared_with_user_id UUID REFERENCES users(id),
  shared_with_org_id UUID REFERENCES organizations(id),
  permissions TEXT[], -- read, write, delete
  created_at TIMESTAMP,
  PRIMARY KEY (item_id, item_type, shared_with_user_id, shared_with_org_id)
);
```

**New Tools:**
```typescript
{
  name: 'create_organization',
  description: 'Create a new organization/workspace',
}
{
  name: 'invite_member',
  description: 'Invite user to organization',
}
{
  name: 'set_member_role',
  description: 'Update member role and permissions',
}
{
  name: 'share_task',
  description: 'Share task with user or organization',
}
{
  name: 'get_audit_log',
  description: 'Get activity audit log for organization',
}
```

---

#### 5.2 Advanced Security ⭐⭐
**Priority:** MEDIUM
**Estimated Effort:** 1 week
**Impact:** 🔥🔥 Critical for compliance (SOC2, GDPR)

**Tasks:**
- [ ] Add API key rotation
- [ ] Implement IP whitelisting
- [ ] Add request signing
- [ ] Create security audit logs
- [ ] Add data encryption at rest
- [ ] Implement CORS policies
- [ ] Add CSP headers
- [ ] Add 2FA support
- [ ] Implement session management
- [ ] Add security headers (HSTS, X-Frame-Options, etc.)

**Implementation:**
```typescript
// src/security/api-key-manager.ts
export class APIKeyManager {
  async rotateKey(userId: string): Promise<{ oldKey: string; newKey: string }> {
    const oldKey = await this.getCurrentKey(userId);
    const newKey = await this.generateKey();

    // Grace period: both keys valid for 24h
    await this.addKey(userId, newKey, { grace_period: 24 * 60 * 60 * 1000 });

    return { oldKey, newKey };
  }

  async validateKey(key: string): Promise<boolean> {
    // Check key format, expiration, IP whitelist, etc.
    return true;
  }
}

// src/security/ip-whitelist.ts
export class IPWhitelist {
  async checkIP(ip: string, userId: string): Promise<boolean> {
    const whitelist = await this.getWhitelist(userId);
    return whitelist.some(range => this.isInRange(ip, range));
  }
}

// Security headers middleware
app.use((req, res, next) => {
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});
```

**New Tools:**
```typescript
{
  name: 'rotate_api_key',
  description: 'Rotate API key with grace period',
}
{
  name: 'add_ip_whitelist',
  description: 'Add IP address to whitelist',
}
{
  name: 'enable_2fa',
  description: 'Enable two-factor authentication',
}
{
  name: 'get_security_audit',
  description: 'Get security audit log',
}
```

---

#### 5.3 Analytics & Insights ⭐
**Priority:** LOW
**Estimated Effort:** 1 week
**Impact:** 🔥 Data-driven decision making

**Tasks:**
- [ ] Add usage analytics dashboard
- [ ] Create productivity metrics
- [ ] Build custom reports
- [ ] Add data export features (CSV, JSON, PDF)
- [ ] Create visualizations
- [ ] Add benchmarking against goals
- [ ] Implement trend analysis
- [ ] Add predictive insights

**New Tools:**
```typescript
{
  name: 'get_productivity_report',
  description: 'Generate productivity report for date range',
  inputSchema: {
    type: 'object',
    properties: {
      from: { type: 'string', format: 'date' },
      to: { type: 'string', format: 'date' },
      metrics: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['tasks_completed', 'time_tracked', 'memories_created']
        }
      }
    }
  }
}

{
  name: 'export_data',
  description: 'Export user data in specified format',
  inputSchema: {
    type: 'object',
    properties: {
      format: { type: 'string', enum: ['csv', 'json', 'pdf'] },
      types: { type: 'array', items: { type: 'string' } },
      from: { type: 'string', format: 'date' },
      to: { type: 'string', format: 'date' }
    }
  }
}

{
  name: 'get_trends',
  description: 'Analyze trends over time',
  inputSchema: {
    type: 'object',
    properties: {
      metric: { type: 'string' },
      period: { type: 'string', enum: ['day', 'week', 'month'] },
      duration: { type: 'number', description: 'Number of periods' }
    }
  }
}
```

---

## 🚀 Quick Wins (Implement First - 1 Week)

These can be implemented immediately for quick value:

### 1. Health Check Tool (2 hours)
- [ ] Add comprehensive health check endpoint
- [ ] Include API connectivity test
- [ ] Show auth status
- [ ] Display version info

### 2. Request ID Tracking (2 hours)
- [ ] Add UUID to each request
- [ ] Include in logs for tracing
- [ ] Return in response headers

### 3. Structured Logging (4 hours)
- [ ] Replace console.log with Pino
- [ ] Add log levels configuration
- [ ] Implement PII redaction

### 4. Error Standardization (4 hours)
- [ ] Create error classes
- [ ] Add error codes
- [ ] Standardize error responses

### 5. Rate Limiting Headers (3 hours)
- [ ] Add X-RateLimit-* headers
- [ ] Implement basic rate limiting
- [ ] Add metrics

### 6. Basic Caching (6 hours)
- [ ] Add in-memory cache
- [ ] Cache user info (5min TTL)
- [ ] Cache search results (1min TTL)

**Total Quick Wins: ~21 hours (3 days)**

---

## 📈 Success Metrics

### Phase 1: Quality & Reliability
- **Test coverage:** 0% → 80%
- **Error resolution time:** ↓50%
- **Mean time to debug:** ↓60%
- **Production incidents:** ↓70%

### Phase 2: Performance & Scalability
- **API response time:** ↓40%
- **Cache hit rate:** >70%
- **API error rate:** <1%
- **Concurrent users supported:** 10x increase

### Phase 3: Developer Experience
- **Developer onboarding time:** ↓50%
- **Support ticket volume:** ↓30%
- **Integration time:** ↓60%
- **SDK adoption:** >50% of new integrations

### Phase 4: Advanced Features
- **Offline success rate:** >95%
- **User satisfaction:** +25%
- **Feature adoption:** +40%
- **Automation usage:** +60%

### Phase 5: Enterprise
- **Enterprise deals:** Enable enterprise sales
- **Compliance:** SOC2, GDPR ready
- **Team adoption:** >80% of enterprise users

---

## 💡 Implementation Priorities

### Recommended Order

**1. Start with:** Phase 1 (Testing + Error Handling + Monitoring)
- **Reason:** Foundation for all other improvements
- **Duration:** 2 weeks
- **Risk:** Low - doesn't affect existing functionality

**2. Next:** Quick Wins
- **Reason:** Immediate value with minimal effort
- **Duration:** 3 days
- **Risk:** Very low

**3. Then:** Phase 2 (Performance - Caching + Rate Limiting)
- **Reason:** Immediate user-visible benefits
- **Duration:** 1.5 weeks
- **Risk:** Medium - needs careful testing

**4. Follow with:** Phase 3 (Developer Experience)
- **Reason:** Accelerates future development
- **Duration:** 2 weeks
- **Risk:** Low

**5. Consider:** Phase 4 (Advanced Features)
- **Reason:** Differentiation features
- **Duration:** 2 weeks
- **Risk:** Medium - new territory

**6. Skip unless needed:** Phase 5 (Enterprise)
- **Reason:** Only if targeting enterprise market
- **Duration:** 3 weeks
- **Risk:** High - complex features

---

## 🛠️ Resource Requirements

### Team Size
- **Minimum:** 1 full-time developer
- **Recommended:** 2 developers (1 backend, 1 frontend/tooling)
- **Ideal:** 3 developers + 1 QA engineer

### Timeline
- **Minimum viable:** 4 weeks (Phases 1 + Quick Wins)
- **Recommended:** 8 weeks (Phases 1-3)
- **Complete:** 12 weeks (All phases)

### Skills Required
- TypeScript/Node.js (expert)
- Testing frameworks (Jest/Vitest)
- API design
- Performance optimization
- Security best practices
- DevOps/CI-CD (nice to have)

---

## 📝 Notes

- This plan assumes current architecture is sound
- Each phase builds on previous phases
- Quick Wins can be done in parallel with Phase 1
- Enterprise features (Phase 5) are optional
- Adjust priorities based on specific business needs
- Review and update plan quarterly

---

## ✅ Approval & Sign-off

- [ ] Plan reviewed by engineering team
- [ ] Priorities aligned with business goals
- [ ] Resources allocated
- [ ] Timeline approved
- [ ] Success metrics agreed upon
- [ ] Risk mitigation strategies in place

**Last Updated:** 2025-09-30
**Next Review:** 2025-10-30
