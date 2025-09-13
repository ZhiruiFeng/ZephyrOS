# ZFlow Agents Infrastructure

This document provides a comprehensive guide to the ZFlow agents infrastructure, including architecture, streaming implementation, and how to extend the system with custom agents.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Component Flow & Data Structure](#component-flow--data-structure)
- [SSE Streaming Implementation](#sse-streaming-implementation)
- [Multi-Agent Framework Design](#multi-agent-framework-design)
- [Concurrent User Support](#concurrent-user-support)
- [OpenAI API Integration](#openai-api-integration)
- [Implementing Custom LLM Agents](#implementing-custom-llm-agents)
- [Two-Layer Streaming Benefits](#two-layer-streaming-benefits)

## Architecture Overview

The ZFlow agents system uses a **session-based architecture** with **Server-Sent Events (SSE)** for real-time streaming:

```
Frontend (AgentsPage) → API Routes → Providers (OpenAI/Anthropic) → SSE Streaming
```

### Key Components

- **Frontend**: React components for chat interface
- **API Routes**: Next.js API handlers for session and message management
- **Providers**: LLM integrations (OpenAI, Anthropic)
- **Streaming Service**: SSE implementation with Redis/memory fallback
- **Session Manager**: User session and conversation persistence

## Component Flow & Data Structure

### Frontend Components

#### AgentsPage (`apps/zflow/app/agents/page.tsx`)
```typescript
// Main container managing:
- Session creation and management
- SSE connection lifecycle  
- UI state (messages, streaming status)
- Agent selection
```

#### AgentChatWindow (`apps/zflow/app/components/agents/AgentChatWindow.tsx`)
```typescript
// Chat interface providing:
- Message display and input handling
- Real-time message updates
- Streaming status indicators
- Agent selector integration
```

### Data Flow Sequence

1. **Session Creation**: `POST /api/agents/sessions`
   - Creates unique session per user-agent pair
   - Returns sessionId for subsequent operations

2. **SSE Connection**: `GET /api/agents/stream?sessionId=xxx`
   - Establishes real-time streaming connection
   - Subscribes to session-specific events

3. **Message Sending**: `POST /api/agents/messages`
   - Processes user messages
   - Triggers background AI response generation
   - Returns immediately (non-blocking)

4. **Response Streaming**: Background processing
   - Calls LLM provider (OpenAI/Anthropic)
   - Streams tokens via SSE to frontend
   - Updates session storage

## SSE Streaming Implementation

### Dual-Mode Streaming Architecture

The streaming service supports two modes for maximum flexibility:

```typescript
// apps/zflow/app/lib/agents/streaming.ts
export class StreamingService {
  private redis: any = null
  private memoryService = getSharedMemoryStreamingService()
  private useRedis = false
  
  // Redis Mode: Production-ready with pub/sub
  // Memory Mode: Development fallback using EventEmitter
}
```

#### Redis Mode (Production)
- **Scalability**: Multiple server instances via pub/sub
- **Persistence**: Survives server restarts
- **Cross-instance**: Users can connect to different servers

#### Memory Mode (Development)
- **Simplicity**: No external dependencies
- **Local development**: Works without Redis setup
- **EventEmitter**: In-process event distribution

### Stream Event Types

```typescript
interface StreamingResponse {
  sessionId: string
  messageId: string
  type: 'start' | 'token' | 'tool_call' | 'tool_result' | 'end' | 'error'
  content?: string
  toolCall?: ToolCall
  error?: string
}
```

### Connection Flow

1. **Client Connection**:
   ```typescript
   const eventSource = new EventSource(`/api/agents/stream?sessionId=${sessionId}`)
   ```

2. **Server Subscription**:
   ```typescript
   // Subscribe to Redis channel: agent_stream:${sessionId}
   // Or memory EventEmitter for local development
   ```

3. **Event Distribution**:
   ```typescript
   // Events published to channel/emitter
   // SSE stream delivers to all connected clients
   // Heartbeat every 30 seconds to keep connection alive
   ```

## Multi-Agent Framework Design

### Agent Registry System

```typescript
// apps/zflow/app/lib/agents/registry.ts
export class AgentRegistry {
  private agents: Map<string, Agent> = new Map()
  private providers: Map<string, AgentProvider> = new Map()
  
  // Pluggable architecture supporting multiple providers
  // Dynamic agent registration at runtime
  // Status management and availability tracking
}
```

### Default Agents Configuration

```typescript
const defaultAgents = [
  {
    id: 'gpt-4',
    name: 'GPT-4',
    description: 'Advanced reasoning and task assistance',
    status: 'online',
    model: 'gpt-4-1106-preview',
    provider: 'openai'
  },
  {
    id: 'claude',
    name: 'Claude',
    description: 'Thoughtful analysis and creative help',
    status: 'online',
    model: 'claude-3-sonnet-20240229',
    provider: 'anthropic'
  }
]
```

### Provider Interface

```typescript
interface AgentProvider {
  id: string
  name: string
  sendMessage: (message: string, context: ChatContext) => AsyncGenerator<StreamingResponse>
  getAvailableModels: () => string[]
  registerTool?: (tool: ZFlowTool) => void
}
```

## Concurrent User Support

### Session Isolation Architecture

```typescript
// Each user-agent combination gets isolated session
interface ChatSession {
  id: string           // Unique session identifier
  userId: string       // User who owns the session
  agentId: string      // Selected agent
  createdAt: Date
  updatedAt: Date
  messages: AgentMessage[]
  metadata?: Record<string, any>
}
```

### Concurrency Handling Mechanisms

#### 1. Unique Session IDs
```typescript
// Random session IDs prevent collision
generateSessionId(): string {
  return randomBytes(16).toString('hex')
}
```

#### 2. Per-User API Keys
```typescript
// Dynamic OpenAI key resolution per user
async function resolveUserOpenAIKey(authToken: string): Promise<string | null> {
  const response = await fetch(`/api/internal/resolve-openai-key`, {
    headers: { Authorization: authToken }
  })
  return response.json().key
}
```

#### 3. Redis Channel Isolation
```typescript
// Each session gets dedicated Redis channel
const channel = `agent_stream:${sessionId}`
await redis.publish(channel, JSON.stringify(event))
```

#### 4. Automatic Cleanup
```typescript
// 24-hour TTL with extension on activity
private readonly SESSION_TTL = 24 * 60 * 60 // seconds
await redis.expire(`session:${sessionId}`, this.SESSION_TTL)
```

## OpenAI API Integration

### Streaming Implementation Flow

```typescript
// apps/zflow/app/lib/agents/openai-client.ts
async *sendMessage(message: string, context: ChatContext): AsyncGenerator<StreamingResponse> {
  // 1. Resolve per-user API key
  const userKey = await resolveUserOpenAIKey(authToken)
  const client = new OpenAI({ apiKey: userKey })
  
  // 2. Create streaming completion request
  const params: OpenAI.ChatCompletionCreateParamsStreaming = {
    model: agent.model || 'gpt-4-1106-preview',
    messages: formatMessagesForOpenAI(allMessages),
    stream: true,
    temperature: 0.7,
    max_tokens: 2000,
    tools: formatToolsForOpenAI() // If tools available
  }
  
  // 3. Process OpenAI stream and yield events
  const stream = await client.chat.completions.create(params)
  
  for await (const chunk of stream) {
    if (chunk.choices[0]?.delta?.content) {
      yield {
        sessionId,
        messageId,
        type: 'token',
        content: chunk.choices[0].delta.content
      }
    }
  }
}
```

### Tool Call Integration

```typescript
// Handle function calling during streaming
if (choice?.finish_reason === 'tool_calls') {
  for (const toolCall of toolCalls) {
    const tool = this.tools.find(t => t.name === toolCall.function.name)
    
    // Notify frontend tool is running
    yield {
      type: 'tool_call',
      toolCall: { id: toolCall.id, name: tool.name, status: 'running' }
    }
    
    // Execute tool
    const result = await tool.handler(args, context)
    
    // Return result
    yield {
      type: 'tool_result', 
      toolCall: { id: toolCall.id, status: 'completed', result }
    }
  }
}
```

## Implementing Custom LLM Agents

### Step 1: Create Provider Class

```typescript
// apps/zflow/app/lib/agents/custom-provider.ts
export class CustomProvider implements AgentProvider {
  id = 'custom'
  name = 'Custom LLM'
  
  async *sendMessage(message: string, context: ChatContext): AsyncGenerator<StreamingResponse> {
    const { sessionId } = context
    const messageId = generateMessageId()
    
    try {
      // Start streaming
      yield { sessionId, messageId, type: 'start', content: '' }
      
      // Your custom LLM integration here
      const response = await yourCustomLLMAPI.streamCompletion({
        prompt: message,
        model: context.agent.model,
        stream: true
      })
      
      // Stream tokens as they arrive
      for await (const token of response) {
        yield {
          sessionId,
          messageId, 
          type: 'token',
          content: token.text
        }
      }
      
      // End streaming
      yield { sessionId, messageId, type: 'end' }
      
    } catch (error) {
      yield {
        sessionId,
        messageId,
        type: 'error',
        error: error.message
      }
    }
  }
  
  getAvailableModels(): string[] {
    return ['custom-model-v1', 'custom-model-v2']
  }
}
```

### Step 2: Register Provider

```typescript
// apps/zflow/app/lib/agents/init.ts
import { CustomProvider } from './custom-provider'

function initializeProviders() {
  // Register custom provider
  const customProvider = new CustomProvider()
  agentRegistry.registerProvider(customProvider)
}
```

### Step 3: Add Agent Definition

```typescript
// apps/zflow/app/lib/agents/registry.ts
private initializeDefaultAgents(): void {
  // Add custom agent
  const customAgent: Agent = {
    id: 'custom-agent',
    name: 'Custom Agent',
    description: 'Your custom LLM integration',
    status: 'online',
    model: 'custom-model-v1',
    provider: 'custom'
  }
  
  this.agents.set(customAgent.id, customAgent)
}
```

### Step 4: Handle Provider Selection

The system automatically routes to your provider based on the agent's `provider` field:

```typescript
// apps/zflow/app/api/agents/messages/route.ts
switch (agent.provider) {
  case 'openai':
    provider = openAIProvider()
    break
  case 'anthropic':
    provider = anthropicProvider()
    break
  case 'custom':
    provider = customProvider()
    break
  default:
    return NextResponse.json({ error: `Provider ${agent.provider} not supported` })
}
```

## Two-Layer Streaming Benefits

### Why Not Direct Frontend → OpenAI?

The two-layer streaming architecture (Frontend ← Backend ← OpenAI) provides significant advantages over direct connections:

#### 1. Security & Authentication
```typescript
// ❌ Direct: API keys exposed in browser
const openai = new OpenAI({ 
  apiKey: 'sk-...', // Visible in browser dev tools!
  dangerouslyAllowBrowser: true 
})

// ✅ Two-layer: Server-side key management
async function resolveUserOpenAIKey(authToken: string) {
  // Secure server-side key resolution
  return await getUserApiKey(authToken)
}
```

#### 2. State Management & Persistence
```typescript
// Backend intercepts and stores every token
for await (const chunk of provider.sendMessage(message, context)) {
  // Save to database in real-time
  if (chunk.type === 'token') {
    await sessionManager.updateMessage(sessionId, messageId, {
      content: fullContent + chunk.content
    })
  }
  
  // Forward to frontend
  await streamingService.publishStreamEvent(sessionId, chunk)
}
```

#### 3. Multi-Client Synchronization
```typescript
// Multiple devices/tabs see same conversation
const stream1 = new EventSource(`/api/agents/stream?sessionId=${id}`) // Desktop
const stream2 = new EventSource(`/api/agents/stream?sessionId=${id}`) // Mobile
const stream3 = new EventSource(`/api/agents/stream?sessionId=${id}`) // Tablet

// All receive identical stream via Redis pub/sub
```

#### 4. Enhanced Features
```typescript
// Server-side tool execution during streaming
if (chunk.type === 'tool_call') {
  const result = await executeTool(chunk.toolCall)
  yield { type: 'tool_result', toolCall: { ...chunk.toolCall, result } }
}

// Content filtering and processing
if (chunk.type === 'token') {
  const cleanContent = await contentFilter(chunk.content)
  yield { ...chunk, content: cleanContent }
}
```

#### 5. Cost Optimization
```typescript
// Request deduplication and caching
const cacheKey = hashMessage(message)
const cached = await redis.get(`response:${cacheKey}`)

if (cached) {
  // Stream cached response instead of calling OpenAI
  for (const token of cached.tokens) {
    yield { type: 'token', content: token }
  }
}
```

#### 6. Error Handling & Reliability
```typescript
try {
  for await (const chunk of openaiStream) {
    yield chunk
  }
} catch (error) {
  if (error.code === 'rate_limit_exceeded') {
    await exponentialBackoff()
    // Retry with different strategy
  }
  yield { type: 'error', error: 'Service temporarily unavailable' }
}
```

### Complete Data Flow

```
OpenAI API Stream:
┌─────────────────────────────────────────────────┐
│ {"delta":{"content":"Hello"}}                   │
│ {"delta":{"content":" world"}}                  │ 
│ {"delta":{"content":"!"}}                       │
└─────────────────────────────────────────────────┘
                     ↓
OpenAI Client:
┌─────────────────────────────────────────────────┐
│ yield {type:'token', content:'Hello'}           │
│ yield {type:'token', content:' world'}          │
│ yield {type:'token', content:'!'}               │
└─────────────────────────────────────────────────┘
                     ↓
Streaming Service:
┌─────────────────────────────────────────────────┐
│ redis.publish('agent_stream:123', token1)       │
│ redis.publish('agent_stream:123', token2)       │
│ redis.publish('agent_stream:123', token3)       │
└─────────────────────────────────────────────────┘
                     ↓
SSE to Frontend:
┌─────────────────────────────────────────────────┐
│ data: {"type":"token","content":"Hello"}        │
│ data: {"type":"token","content":" world"}       │
│ data: {"type":"token","content":"!"}            │
└─────────────────────────────────────────────────┘
                     ↓
Frontend Updates:
┌─────────────────────────────────────────────────┐
│ "Hello"                                         │
│ "Hello world"                                   │
│ "Hello world!"                                  │
└─────────────────────────────────────────────────┘
```

## Best Practices

### 1. Error Handling
- Always wrap streaming operations in try-catch blocks
- Provide graceful fallbacks for network interruptions
- Implement exponential backoff for rate limits

### 2. Performance Optimization
- Use Redis for production deployments
- Implement request caching where appropriate
- Monitor token usage and costs

### 3. Security
- Never expose API keys to frontend
- Validate all user inputs server-side
- Implement proper authentication and authorization

### 4. Monitoring
- Log streaming events for debugging
- Track response times and error rates
- Monitor Redis/memory usage

### 5. Scalability
- Use Redis pub/sub for multi-instance deployments
- Implement session cleanup and TTL management
- Consider load balancing for high traffic

## Troubleshooting

### Common Issues

1. **SSE Connection Drops**
   - Check firewall/proxy settings
   - Verify heartbeat implementation
   - Ensure proper error handling

2. **Redis Connection Failures**
   - Falls back to memory mode automatically
   - Check Redis URL and credentials
   - Monitor Redis connection pool

3. **Token Streaming Delays**
   - Verify OpenAI API key and quotas
   - Check network latency
   - Monitor background processing

4. **Session Management Issues**
   - Verify session creation flow
   - Check TTL and cleanup logic
   - Monitor memory/Redis usage

This infrastructure provides a robust, scalable foundation for AI agent interactions while maintaining real-time streaming performance and supporting multiple concurrent users.