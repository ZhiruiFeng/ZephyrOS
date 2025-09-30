# ZMemory MCP Integration Guide

This guide documents how the ZMemory MCP (Model Context Protocol) server integrates with the ZephyrOS ecosystem, specifically with zflow agents and the zmemory backend.

## Architecture Overview

```
┌─────────────────┐
│   zflow Agent   │ (User logged in via Google OAuth)
│   (OpenAI/      │
│   Anthropic)    │
└────────┬────────┘
         │ OAuth JWT Token
         ▼
┌─────────────────┐
│ zflow Backend   │
│ /api/agents/    │
│ messages        │
└────────┬────────┘
         │ Pass token in context.metadata.authToken
         ▼
┌─────────────────┐
│  MCP HTTP       │
│  Client         │ Automatically calls set_access_token
└────────┬────────┘
         │ X-User-Auth-Token header
         ▼
┌─────────────────┐
│  MCP Server     │
│  (zmemory-mcp)  │
└────────┬────────┘
         │ Authorization: Bearer <token>
         ▼
┌─────────────────┐
│ zmemory Backend │
│ /api/tasks      │
│ /api/memories   │
└─────────────────┘
```

## Authentication Flow

### 1. User Authentication
- Users log in to zflow via **Google OAuth**
- Supabase session provides a JWT access token
- This token is valid for accessing the zmemory backend

### 2. Token Passing (zflow → MCP)
**Frontend** (`apps/zflow/lib/supabase.ts`):
```typescript
export async function getAuthHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  return token ? { Authorization: `Bearer ${token}` } : {}
}
```

**Backend** (`apps/zflow/app/api/agents/messages/route.ts`):
```typescript
const authHeader = request.headers.get('authorization')
const chatContext = {
  sessionId,
  userId,
  messages: messagesToSend,
  agent,
  metadata: { authToken: authHeader }  // ← Token passed here
}
```

### 3. Automatic Authentication (MCP HTTP Client)
**Location**: `apps/zflow/features/agents/api/mcp-http-client.ts`

The MCP HTTP client automatically handles authentication:
```typescript
async callTool(name: string, arguments_: any, userAuthToken?: string) {
  const token = extractToken(userAuthToken)
  const shouldPrimeAuth = !!token && token !== this.lastAccessToken

  if (shouldPrimeAuth) {
    // Automatically call set_access_token before first tool use
    await this.sendMCPRequest('tools/call', {
      name: 'set_access_token',
      arguments: { access_token: token }
    }, userAuthToken)
    this.lastAccessToken = token
  }

  // Now execute the actual tool
  const result = await this.sendMCPRequest('tools/call', {
    name,
    arguments: arguments_
  }, userAuthToken)
}
```

**Key Points**:
- `set_access_token` is called **automatically** before the first tool call
- Token is cached in `lastAccessToken` to avoid redundant calls
- If authentication fails, it retries once with a fresh `set_access_token` call

### 4. Token Storage (MCP Server)
**Location**: `apps/zmemory-mcp/src/modules/auth/auth-module.ts`

```typescript
setAccessToken(accessToken: string): void {
  this.authState.isAuthenticated = true
  this.authState.tokens = {
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: 3600,
  }
}
```

The token is stored in the MCP session's `authState` and used for all subsequent API calls.

### 5. Backend Authentication (zmemory)
**Location**: `apps/zmemory/lib/auth/index.ts`

The zmemory backend supports **two authentication methods**:

#### OAuth JWT (from Google/Supabase)
```typescript
// OAuth path via Supabase JWT
const client = createClientForRequest(request)
const { data, error } = await client.auth.getUser()
return { id: data.user.id, authType: 'oauth' }
```

#### API Keys (zm_...)
```typescript
// API key path: Bearer zm_...
if (token.startsWith('zm_')) {
  const keyHash = await hashApiKey(token)
  const { data } = await supabaseServer.rpc('authenticate_zmemory_api_key', {
    api_key_hash: keyHash
  })
  return { id: row.user_id, authType: 'api_key', scopes: row.scopes }
}
```

#### Smart Client Selection
```typescript
export async function getClientForAuthType(request: NextRequest) {
  const authContext = await getAuthContext(request)

  if (authContext?.authType === 'api_key') {
    // Use service role client (bypasses RLS)
    return createClient(supabaseUrl, serviceRoleKey)
  }

  // Use user-scoped client for OAuth
  return createClientForRequest(request)
}
```

**Why this matters**:
- **API keys** are not JWTs → PostgREST can't parse them → Use service role client
- **OAuth tokens** are JWTs → PostgREST can validate them → Use user-scoped client

## Tool Registration

### Filtering Authentication Tools
**Location**: `apps/zflow/features/agents/api/mcp-http-client.ts`

Since users are already authenticated via Google OAuth, we filter out OAuth-related tools:

```typescript
createZFlowTools(): ZFlowTool[] {
  const authToolsToExclude = [
    'authenticate',           // OAuth flow start - not needed
    'exchange_code_for_token', // OAuth flow step - not needed
    'refresh_token',          // OAuth flow - not needed
    'set_access_token',       // Called automatically by mcp-http-client
    'clear_auth',             // Not needed - user logs out via zflow UI
    'get_auth_status',        // Not useful - auth is automatic
    'get_user_info'           // Not needed - user info comes from Google OAuth
  ]

  return this.availableTools
    .filter(tool => !authToolsToExclude.includes(tool.name))
    .map(mcpTool => ({ /* ... */ }))
}
```

**Result**: Agents see 36 useful tools (tasks, memories, activities, timeline) instead of 43.

### Provider Instance Management
**Critical Fix**: Ensure MCP tools are registered with the SAME provider instances used by the agent system.

**Problem** (before fix):
```typescript
// init.ts creates providers
openAIProvider = new OpenAIProvider()

// mcp-bridge.ts creates NEW providers (wrong!)
const openaiProvider = new OpenAIProvider()  // ← Different instance!
tools.forEach(tool => openaiProvider.registerTool(tool))

// Later, agent uses the FIRST instance which has NO tools
provider.sendMessage(...)  // ← No tools available!
```

**Solution** (after fix):
```typescript
// init.ts - Create providers first
openAIProvider = new OpenAIProvider()
anthropicProvider = new AnthropicProvider()

// Pass existing instances to MCP bridge
await initializeMCPBridge([openAIProvider, anthropicProvider])

// MCP bridge registers tools with the SAME instances
providers.forEach(provider => {
  tools.forEach(tool => provider.registerTool(tool))
  this.registeredProviders.add(provider)
})

// Now agents have access to MCP tools!
```

**Files modified**:
- `apps/zflow/features/agents/api/mcp-bridge.ts` - Accept providers parameter
- `apps/zflow/features/agents/api/init.ts` - Pass existing providers

## Multi-Turn Tool Calling

Both Anthropic and OpenAI providers support multi-turn conversations where agents can:
1. Call a tool (e.g., `search_tasks`)
2. Receive results
3. Call another tool based on results (e.g., `update_task`)
4. Continue until reaching a final answer

### Implementation Pattern
```typescript
async *sendMessage(message: string, context: ChatContext) {
  let turnCount = 0
  const maxTurns = 10

  while (turnCount < maxTurns) {
    turnCount++

    // Get LLM response
    const response = await llm.complete(messages, tools)

    if (response.stopReason === 'tool_use') {
      // Execute tools
      for (const toolCall of response.toolCalls) {
        const result = await executeTool(toolCall)
        yield { type: 'tool_result', toolCall, result }
      }

      // Add tool results to conversation
      messages.push({ role: 'tool', content: results })
      continue  // Loop back for next turn
    }

    // Final answer received
    yield { type: 'end', content: response.content }
    break
  }
}
```

**Locations**:
- `apps/zflow/features/agents/api/anthropic-client.ts`
- `apps/zflow/features/agents/api/openai-client.ts`

## Testing

### Jupyter Notebook Testing
**Location**: `MCP_JUPYTER_TESTING.ipynb`

The notebook demonstrates:
1. MCP session initialization
2. Manual tool calling
3. Multi-turn conversations with Claude
4. Multi-turn conversations with OpenAI

**Key learnings**:
- Always call `set_access_token` before using protected tools
- MCP sessions are ephemeral in serverless environments
- Both Claude and OpenAI can reliably use MCP tools with proper setup

### Production URLs
- **MCP Server**: `https://zmemory-mcp.vercel.app`
- **zmemory Backend**: `https://zmemory.vercel.app`

## Common Issues & Solutions

### Issue 1: "Unauthorized" errors
**Symptom**: API calls return 401 Unauthorized

**Cause**: OAuth token not being passed to MCP tools

**Solution**: Verify token flow:
```bash
# Check frontend sends token
console.log(authHeader)  // Should be "Bearer eyJ..."

# Check backend receives token
console.log(context.metadata.authToken)  // Should be "Bearer eyJ..."

# Check MCP client receives token
console.log(userAuthToken)  // Should be "Bearer eyJ..."
```

### Issue 2: JWT Parsing Error
**Symptom**: `JWSError (CompactDecodeError Invalid number of parts: Expected 3 parts; got 1)`

**Cause**: API key (zm_...) being passed to PostgREST which expects JWT

**Solution**: Use `getClientForAuthType()` instead of `createClientForRequest()`
```typescript
// ❌ Wrong - fails for API keys
const client = createClientForRequest(request)

// ✅ Correct - handles both OAuth and API keys
const client = await getClientForAuthType(request)
```

### Issue 3: Agent not calling tools
**Symptom**: Agent hallucinates responses instead of using tools

**Root Cause**: Provider instance mismatch (tools registered on different instance)

**Solution**: Pass existing provider instances to `initializeMCPBridge()`

### Issue 4: Agent asks for authentication
**Symptom**: Agent says "Please call authenticate tool first"

**Cause**: Authentication tools exposed to agents

**Solution**: Filter out auth tools in `createZFlowTools()` (already implemented)

## Environment Variables

### MCP Server (zmemory-mcp)
```bash
ZMEMORY_API_URL=https://zmemory.vercel.app  # zmemory backend URL
# Note: API keys should be passed via headers, not env vars
```

### zflow
```bash
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
ANTHROPIC_API_KEY=<your-key>
OPENAI_API_KEY=<your-key>
```

### zmemory
```bash
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>  # For API key auth
```

## API Routes That Need Fixing

The authentication fix (`getClientForAuthType`) is currently only applied to `/api/tasks/*` endpoints.

### Other Routes That May Need This Fix
If you plan to use API keys (zm_...) to access these endpoints via MCP or other clients:

**High Priority** (likely to be used by MCP):
- `/api/memories/*` - Memory management
- `/api/activities/*` - Activity tracking
- `/api/timeline-items/*` - Timeline operations
- `/api/ai-tasks/*` - AI task management

**Medium Priority**:
- `/api/oauth/*` - OAuth endpoints (if API keys should access)
- `/api/stats/*` - Statistics endpoints

**Low Priority**:
- Other endpoints that are only accessed via OAuth

### How to Apply the Fix
Find this pattern:
```typescript
const client = createClientForRequest(request) || supabase
```

Replace with:
```typescript
const client = await getClientForAuthType(request) || supabase
```

**Note**: Only necessary if these endpoints need to support API key authentication. If they're only accessed via OAuth (web app), the current implementation is fine.

## Best Practices

1. **Authentication is automatic** - Never expose auth tools to agents
2. **Use existing provider instances** - Don't create new ones after MCP initialization
3. **Handle both auth types** - Support OAuth JWTs and API keys (zm_...)
4. **Session management** - MCP sessions are ephemeral in serverless
5. **Error handling** - Retry auth failures once with fresh token
6. **Multi-turn support** - Implement agentic loops for complex tasks
7. **Tool filtering** - Only expose relevant tools to agents

## References

- [MCP Specification](https://modelcontextprotocol.io)
- [Anthropic Tool Use](https://docs.anthropic.com/en/docs/tool-use)
- [OpenAI Function Calling](https://platform.openai.com/docs/guides/function-calling)
- [Supabase Auth](https://supabase.com/docs/guides/auth)

## Troubleshooting Checklist

- [ ] User logged in via Google OAuth?
- [ ] Frontend sending Authorization header?
- [ ] Backend extracting token to context.metadata?
- [ ] MCP client receiving userAuthToken?
- [ ] set_access_token called automatically?
- [ ] MCP server forwarding token to zmemory backend?
- [ ] zmemory backend validating token correctly?
- [ ] Tools registered with correct provider instances?
- [ ] Authentication tools filtered out?
- [ ] Multi-turn loop implemented?

---

**Last Updated**: 2025-09-30
**Version**: 1.0.0
