# ZMemory MCP Server Coding Regulations

## Overview

ZMemory MCP (Model Context Protocol) Server provides memory management capabilities for AI agents. This document defines the coding standards for developing and maintaining the MCP server.

**Technology Stack:**
- TypeScript 5.x (ES Modules)
- @modelcontextprotocol/sdk v1.0+
- Axios for HTTP requests
- Pino for logging
- Zod for validation

## MCP Server Architecture

### 1. **Server Structure**

```typescript
// ✅ Good: Clean MCP server structure
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = new Server({
  name: 'zmemory-mcp',
  version: '1.0.0',
}, {
  capabilities: {
    tools: {},
    resources: {},
  }
});

// Register tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'create_task',
      description: 'Create a new task in ZMemory',
      inputSchema: CreateTaskSchema,
    },
    // More tools...
  ]
}));

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);
```

### 2. **Tool Definitions**

```typescript
// ✅ Good: Well-defined tools with schemas
import { z } from 'zod';

const CreateTaskSchema = {
  type: 'object',
  properties: {
    title: { type: 'string', minLength: 1, maxLength: 500 },
    description: { type: 'string' },
    priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
    categoryId: { type: 'string', format: 'uuid' },
  },
  required: ['title'],
  additionalProperties: false,
};

// Runtime validation with Zod
const CreateTaskZodSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  categoryId: z.string().uuid().optional(),
});

// Tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === 'create_task') {
    // Validate input
    const args = CreateTaskZodSchema.parse(request.params.arguments);

    // Execute tool
    const result = await createTask(args);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        }
      ]
    };
  }
});
```

## Authentication and Authorization

### 1. **OAuth Integration**

```typescript
// ✅ Good: Secure OAuth implementation
import { AuthManager } from './lib/auth.js';

class AuthManager {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private tokenExpiry: number | null = null;

  async getAccessToken(): Promise<string> {
    // Check if token is still valid
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    // Refresh token if available
    if (this.refreshToken) {
      await this.refreshAccessToken();
      return this.accessToken!;
    }

    // Start new OAuth flow
    await this.startOAuthFlow();
    return this.accessToken!;
  }

  private async refreshAccessToken(): Promise<void> {
    try {
      const response = await axios.post(`${API_URL}/auth/refresh`, {
        refreshToken: this.refreshToken,
      });

      this.accessToken = response.data.accessToken;
      this.refreshToken = response.data.refreshToken;
      this.tokenExpiry = Date.now() + (response.data.expiresIn * 1000);
    } catch (error) {
      logger.error('Token refresh failed', { error });
      // Clear tokens and restart OAuth
      this.clearTokens();
      throw new Error('Authentication required');
    }
  }
}

// ❌ Bad: Hardcoded credentials
const API_KEY = 'hardcoded-key';  // Never do this!
```

### 2. **Secure Configuration**

```typescript
// ✅ Good: Environment-based configuration
import { z } from 'zod';

const EnvSchema = z.object({
  ZMEMORY_API_URL: z.string().url(),
  OAUTH_CLIENT_ID: z.string().min(1),
  OAUTH_REDIRECT_URI: z.string().url(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

// Validate at startup
const env = EnvSchema.parse(process.env);

// ❌ Bad: No validation
const API_URL = process.env.API_URL;  // Could be undefined!
```

## API Client Patterns

### 1. **HTTP Client with Error Handling**

```typescript
// ✅ Good: Robust API client
import axios, { AxiosError } from 'axios';
import pino from 'pino';

const logger = pino({ level: env.LOG_LEVEL });

class ZMemoryClient {
  private baseURL: string;
  private authManager: AuthManager;

  constructor(baseURL: string, authManager: AuthManager) {
    this.baseURL = baseURL;
    this.authManager = authManager;
  }

  async request<T>(
    method: string,
    path: string,
    data?: unknown
  ): Promise<T> {
    const token = await this.authManager.getAccessToken();

    try {
      const response = await axios({
        method,
        url: `${this.baseURL}${path}`,
        data,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000, // 30 second timeout
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        this.handleApiError(error);
      }
      throw error;
    }
  }

  private handleApiError(error: AxiosError): never {
    const status = error.response?.status;
    const message = error.response?.data?.error || error.message;

    logger.error('API request failed', {
      status,
      message,
      url: error.config?.url,
    });

    if (status === 401) {
      throw new Error('Authentication failed. Please re-authenticate.');
    } else if (status === 403) {
      throw new Error('Permission denied.');
    } else if (status === 429) {
      throw new Error('Rate limit exceeded. Please try again later.');
    } else if (status && status >= 500) {
      throw new Error('Server error. Please try again later.');
    }

    throw new Error(`API error: ${message}`);
  }
}
```

### 2. **Resource Handlers**

```typescript
// ✅ Good: Resource pattern for large datasets
server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: [
    {
      uri: 'zmemory://tasks/recent',
      name: 'Recent Tasks',
      description: 'Your recently created tasks',
      mimeType: 'application/json',
    },
    {
      uri: 'zmemory://tasks/pending',
      name: 'Pending Tasks',
      description: 'Tasks awaiting completion',
      mimeType: 'application/json',
    },
  ]
}));

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri;

  if (uri === 'zmemory://tasks/recent') {
    const tasks = await client.request('GET', '/api/tasks?limit=10');

    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(tasks, null, 2),
        }
      ]
    };
  }

  throw new Error(`Unknown resource: ${uri}`);
});
```

## Logging and Debugging

### 1. **Structured Logging**

```typescript
// ✅ Good: Structured logging with Pino
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    }
  }
});

// Usage
logger.info({ toolName: 'create_task', userId: 'user-123' }, 'Tool called');
logger.error({ error: err, context: 'auth' }, 'Authentication failed');

// ❌ Bad: Console logging
console.log('Tool called');  // No structure, no levels
```

### 2. **Error Context**

```typescript
// ✅ Good: Rich error context
class MCPError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'MCPError';
  }
}

try {
  await createTask(args);
} catch (error) {
  logger.error({
    error: error instanceof Error ? error.message : 'Unknown error',
    tool: 'create_task',
    args,
  }, 'Tool execution failed');

  throw new MCPError(
    'Failed to create task',
    'TOOL_EXECUTION_ERROR',
    { originalError: error }
  );
}
```

## Testing

### 1. **Unit Tests**

```typescript
// ✅ Good: Comprehensive unit tests
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ZMemoryClient } from './client.js';

describe('ZMemoryClient', () => {
  let client: ZMemoryClient;
  let mockAuthManager: AuthManager;

  beforeEach(() => {
    mockAuthManager = {
      getAccessToken: vi.fn().mockResolvedValue('mock-token'),
    };
    client = new ZMemoryClient('http://localhost:3001', mockAuthManager);
  });

  it('should create a task successfully', async () => {
    const taskData = { title: 'Test Task' };
    const mockResponse = { id: '123', ...taskData };

    // Mock axios
    vi.spyOn(axios, 'request').mockResolvedValue({ data: mockResponse });

    const result = await client.createTask(taskData);

    expect(result).toEqual(mockResponse);
    expect(mockAuthManager.getAccessToken).toHaveBeenCalled();
  });

  it('should handle 401 errors', async () => {
    vi.spyOn(axios, 'request').mockRejectedValue({
      isAxiosError: true,
      response: { status: 401 }
    });

    await expect(client.createTask({ title: 'Test' }))
      .rejects
      .toThrow('Authentication failed');
  });
});
```

### 2. **Integration Tests**

```typescript
// ✅ Good: Integration tests with real MCP protocol
import { Client } from '@modelcontextprotocol/sdk/client/index.js';

describe('MCP Server Integration', () => {
  it('should list available tools', async () => {
    const client = new Client({
      name: 'test-client',
      version: '1.0.0',
    });

    // Connect to server
    await client.connect(transport);

    const tools = await client.listTools();

    expect(tools.tools).toContainEqual(
      expect.objectContaining({
        name: 'create_task',
        description: expect.any(String),
      })
    );
  });
});
```

## Performance and Reliability

### 1. **Caching**

```typescript
// ✅ Good: Simple caching for expensive operations
class CachedZMemoryClient extends ZMemoryClient {
  private cache = new Map<string, { data: unknown; expiry: number }>();

  async getCached<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = 60000
  ): Promise<T> {
    const cached = this.cache.get(key);

    if (cached && Date.now() < cached.expiry) {
      return cached.data as T;
    }

    const data = await fetcher();
    this.cache.set(key, {
      data,
      expiry: Date.now() + ttl,
    });

    return data;
  }

  async getCategories() {
    return this.getCached(
      'categories',
      () => this.request('GET', '/api/categories'),
      300000 // 5 minutes
    );
  }
}
```

### 2. **Retry Logic**

```typescript
// ✅ Good: Exponential backoff for transient failures
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;

      // Don't retry client errors
      if (axios.isAxiosError(error) && error.response?.status && error.response.status < 500) {
        throw error;
      }

      const delay = baseDelay * Math.pow(2, i);
      logger.warn({ attempt: i + 1, delay }, 'Retrying after error');
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries exceeded');
}

// Usage
const result = await withRetry(() =>
  client.request('GET', '/api/tasks')
);
```

## Security Best Practices

### 1. **Input Sanitization**

```typescript
// ✅ Good: Sanitize and validate all inputs
const sanitizeTitle = (title: string): string => {
  return title
    .trim()
    .replace(/[<>]/g, '') // Remove angle brackets
    .substring(0, 500);   // Enforce length limit
};

const CreateTaskSchema = z.object({
  title: z.string()
    .min(1)
    .max(500)
    .transform(sanitizeTitle),
  // Other fields...
});
```

### 2. **Secret Management**

```typescript
// ✅ Good: Never log secrets
logger.info({
  url: requestUrl,
  // ❌ Don't log: headers, tokens, passwords
}, 'Making API request');

// ✅ Good: Clear secrets from memory
class SecureAuthManager extends AuthManager {
  clearTokens() {
    if (this.accessToken) {
      this.accessToken = null;
    }
    if (this.refreshToken) {
      this.refreshToken = null;
    }
  }

  async shutdown() {
    this.clearTokens();
  }
}
```

## Deployment

### 1. **Build Configuration**

```json
// package.json
{
  "type": "module",
  "main": "dist/index.js",
  "bin": {
    "zmemory-mcp": "dist/index.js"
  },
  "scripts": {
    "build": "tsc && chmod +x dist/index.js",
    "dev": "tsx src/index.ts",
    "test": "vitest",
    "type-check": "tsc --noEmit"
  }
}
```

```typescript
// dist/index.js should have shebang
#!/usr/bin/env node

import { startServer } from './server.js';
startServer().catch(console.error);
```

### 2. **Claude Desktop Integration**

```json
// ~/.config/claude/claude_desktop_config.json
{
  "mcpServers": {
    "zmemory": {
      "command": "node",
      "args": ["/path/to/zmemory-mcp/dist/index.js"],
      "env": {
        "ZMEMORY_API_URL": "http://localhost:3001",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

## Common Pitfalls to Avoid

### ❌ **Not Handling Stdio Properly**

```typescript
// ❌ Bad: Console.log breaks stdio transport
console.log('Debug message');  // Breaks MCP communication!

// ✅ Good: Use stderr for logging
process.stderr.write('Debug message\n');
// Or use logger configured to stderr
```

### ❌ **Blocking the Event Loop**

```typescript
// ❌ Bad: Synchronous operations
const data = fs.readFileSync('file.json');

// ✅ Good: Async operations
const data = await fs.promises.readFile('file.json', 'utf-8');
```

### ❌ **Not Validating Tool Arguments**

```typescript
// ❌ Bad: Using arguments without validation
const title = request.params.arguments.title; // Could be undefined!

// ✅ Good: Validate with Zod
const args = CreateTaskSchema.parse(request.params.arguments);
const title = args.title; // Guaranteed to be valid string
```

---

**Last Updated**: 2025-10-10
**Component**: ZMemory MCP Server
**Tech Stack**: TypeScript + MCP SDK + Axios
