# ZFlow Agents API Reference

This document provides comprehensive API reference for the ZFlow agents system, including all endpoints, request/response formats, and usage examples.

## Table of Contents

- [API Endpoints Overview](#api-endpoints-overview)
- [Authentication](#authentication)
- [Session Management APIs](#session-management-apis)
- [Message Processing APIs](#message-processing-apis)
- [Streaming APIs](#streaming-apis)
- [Agent Management APIs](#agent-management-apis)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [SDK Usage Examples](#sdk-usage-examples)

## API Endpoints Overview

All agent APIs are located under `/api/agents/` and follow RESTful conventions:

```
POST   /api/agents/sessions     # Create new session
GET    /api/agents/sessions     # Get session(s)
DELETE /api/agents/sessions     # Delete session
POST   /api/agents/messages     # Send message
GET    /api/agents/stream       # SSE stream
POST   /api/agents/cancel       # Cancel streaming
GET    /api/agents/registry     # List available agents
GET    /api/agents/health       # Health check
```

## Authentication

### Required Headers

```typescript
// For user-authenticated requests
const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${userToken}` // Supabase JWT token
}

// Alternative format (legacy)
const headers = {
  'Content-Type': 'application/json',
  'Authorization': `${userToken}` // Direct token
}
```

### User Context Resolution

The system automatically resolves user context from the authorization token:

```typescript
// Backend extracts user info
const { getAuthHeader } = await import('../../lib/supabase')
const authHeaders = await getAuthHeader()
```

## Session Management APIs

### Create Session

Creates a new chat session between a user and an agent.

```http
POST /api/agents/sessions
```

**Request Body:**
```json
{
  "userId": "user_123",
  "agentId": "gpt-4"
}
```

**Response:**
```json
{
  "sessionId": "a1b2c3d4e5f6g7h8",
  "agentId": "gpt-4",
  "createdAt": "2024-03-15T10:30:00.000Z",
  "agent": {
    "id": "gpt-4",
    "name": "GPT-4",
    "description": "Advanced reasoning and task assistance",
    "status": "online",
    "model": "gpt-4-1106-preview",
    "provider": "openai"
  }
}
```

**Error Responses:**
```json
// Missing parameters
{
  "error": "agentId and userId are required",
  "status": 400
}

// Agent not found
{
  "error": "Agent not found",
  "status": 404
}
```

### Get Session

Retrieve a specific session or all sessions for a user.

```http
GET /api/agents/sessions?sessionId={sessionId}
GET /api/agents/sessions?userId={userId}
```

**Response (Single Session):**
```json
{
  "id": "a1b2c3d4e5f6g7h8",
  "userId": "user_123",
  "agentId": "gpt-4",
  "createdAt": "2024-03-15T10:30:00.000Z",
  "updatedAt": "2024-03-15T11:45:00.000Z",
  "messages": [
    {
      "id": "msg_001",
      "type": "user",
      "content": "Hello, how can you help me?",
      "timestamp": "2024-03-15T10:31:00.000Z"
    },
    {
      "id": "msg_002",
      "type": "agent",
      "content": "I can help you with various tasks...",
      "timestamp": "2024-03-15T10:31:15.000Z",
      "agent": "gpt-4",
      "streaming": false
    }
  ],
  "agent": {
    "id": "gpt-4",
    "name": "GPT-4",
    "description": "Advanced reasoning and task assistance",
    "status": "online"
  }
}
```

**Response (User Sessions):**
```json
{
  "sessions": [
    {
      "id": "a1b2c3d4e5f6g7h8",
      "userId": "user_123",
      "agentId": "gpt-4",
      "createdAt": "2024-03-15T10:30:00.000Z",
      "updatedAt": "2024-03-15T11:45:00.000Z",
      "messages": [...],
      "agent": {...}
    }
  ]
}
```

### Delete Session

Remove a session and all associated messages.

```http
DELETE /api/agents/sessions
```

**Request Body:**
```json
{
  "sessionId": "a1b2c3d4e5f6g7h8"
}
```

**Response:**
```json
{
  "success": true
}
```

## Message Processing APIs

### Send Message

Send a user message and trigger AI response generation.

```http
POST /api/agents/messages
```

**Request Body:**
```json
{
  "sessionId": "a1b2c3d4e5f6g7h8",
  "message": "What's the weather like today?",
  "userId": "user_123"
}
```

**Response:**
```json
{
  "success": true,
  "sessionId": "a1b2c3d4e5f6g7h8",
  "message": "Message received, connect to SSE stream for response"
}
```

**Error Responses:**
```json
// Missing parameters
{
  "error": "sessionId, message, and userId are required",
  "status": 400
}

// Session not found
{
  "error": "Session not found",
  "status": 404
}

// Unauthorized
{
  "error": "Unauthorized",
  "status": 403
}

// Agent provider unavailable
{
  "error": "Agent provider is unavailable or misconfigured",
  "status": 500
}
```

### Cancel Stream

Cancel an ongoing AI response stream.

```http
POST /api/agents/cancel
```

**Request Body:**
```json
{
  "sessionId": "a1b2c3d4e5f6g7h8"
}
```

**Response:**
```json
{
  "success": true
}
```

## Streaming APIs

### SSE Stream Connection

Establish a Server-Sent Events connection for real-time message streaming.

```http
GET /api/agents/stream?sessionId={sessionId}
```

**Connection Headers:**
```
Accept: text/event-stream
Cache-Control: no-cache
```

**Event Types:**

#### Connected Event
```
data: {"type":"connected","sessionId":"a1b2c3d4e5f6g7h8"}
```

#### Start Event
```
data: {"type":"start","sessionId":"a1b2c3d4e5f6g7h8","messageId":"msg_003"}
```

#### Token Event
```
data: {"type":"token","sessionId":"a1b2c3d4e5f6g7h8","messageId":"msg_003","content":"Hello"}
```

#### Tool Call Event
```
data: {
  "type": "tool_call",
  "sessionId": "a1b2c3d4e5f6g7h8",
  "messageId": "msg_003",
  "toolCall": {
    "id": "call_123",
    "name": "search_memory",
    "parameters": {
      "query": "weather"
    },
    "status": "running"
  }
}
```

#### Tool Result Event
```
data: {
  "type": "tool_result",
  "sessionId": "a1b2c3d4e5f6g7h8",
  "messageId": "msg_003",
  "toolCall": {
    "id": "call_123",
    "name": "search_memory",
    "parameters": {
      "query": "weather"
    },
    "status": "completed",
    "result": {
      "found": true,
      "data": "Current weather is sunny, 72°F"
    }
  }
}
```

#### End Event
```
data: {"type":"end","sessionId":"a1b2c3d4e5f6g7h8","messageId":"msg_003"}
```

#### Error Event
```
data: {
  "type": "error",
  "sessionId": "a1b2c3d4e5f6g7h8",
  "messageId": "msg_003",
  "error": "Rate limit exceeded. Please try again later."
}
```

#### Heartbeat Event
```
data: {"type":"heartbeat"}
```

### Connection Management

**Automatic Reconnection:**
```typescript
const eventSource = new EventSource('/api/agents/stream?sessionId=abc123')

eventSource.onerror = (error) => {
  if (eventSource.readyState === EventSource.CLOSED) {
    // Reconnect after delay
    setTimeout(() => {
      connectSSE()
    }, 3000)
  }
}
```

**Connection Lifecycle:**
1. Client establishes SSE connection
2. Server sends `connected` event
3. Message processing triggers `start` event
4. Tokens stream via `token` events
5. Tool calls use `tool_call` and `tool_result` events
6. Response completion sends `end` event
7. Heartbeats maintain connection (every 30s)

## Agent Management APIs

### List Available Agents

Get all registered agents or only online agents.

```http
GET /api/agents/registry
GET /api/agents/registry?onlineOnly=true
```

**Response:**
```json
{
  "agents": [
    {
      "id": "gpt-4",
      "name": "GPT-4",
      "description": "Advanced reasoning and task assistance",
      "status": "online",
      "model": "gpt-4-1106-preview",
      "provider": "openai"
    },
    {
      "id": "claude",
      "name": "Claude",
      "description": "Thoughtful analysis and creative help",
      "status": "online",
      "model": "claude-3-sonnet-20240229",
      "provider": "anthropic"
    },
    {
      "id": "gpt-3.5-turbo",
      "name": "GPT-3.5 Turbo",
      "description": "Fast and efficient assistance",
      "status": "online",
      "model": "gpt-3.5-turbo-1106",
      "provider": "openai"
    }
  ]
}
```

### Health Check

Check system health and streaming mode.

```http
GET /api/agents/health
```

**Response:**
```json
{
  "status": "healthy",
  "streamingMode": "redis",
  "timestamp": "2024-03-15T12:00:00.000Z",
  "sessions": {
    "active": 15,
    "total": 127
  },
  "providers": {
    "openai": "available",
    "anthropic": "available"
  }
}
```

## Error Handling

### Standard Error Format

All API errors follow this format:

```json
{
  "error": "Human readable error message",
  "code": "MACHINE_READABLE_CODE",
  "details": {
    "field": "Additional context",
    "timestamp": "2024-03-15T12:00:00.000Z"
  }
}
```

### Common Error Codes

| HTTP Status | Code | Description |
|-------------|------|-------------|
| 400 | `INVALID_REQUEST` | Missing or invalid parameters |
| 401 | `UNAUTHORIZED` | Missing or invalid authentication |
| 403 | `FORBIDDEN` | User doesn't own resource |
| 404 | `NOT_FOUND` | Session, agent, or message not found |
| 429 | `RATE_LIMITED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Server or provider error |
| 503 | `SERVICE_UNAVAILABLE` | Provider temporarily unavailable |

### Error Handling Best Practices

```typescript
async function sendMessage(sessionId: string, message: string) {
  try {
    const response = await fetch('/api/agents/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, message, userId })
    })

    if (!response.ok) {
      const error = await response.json()
      
      switch (response.status) {
        case 404:
          // Session expired, create new one
          await createNewSession()
          break
        case 429:
          // Rate limited, show user message
          showRateLimitMessage()
          break
        case 500:
          // Server error, retry with backoff
          await retryWithBackoff()
          break
        default:
          throw new Error(error.error)
      }
    }
  } catch (error) {
    console.error('Message sending failed:', error)
    showErrorMessage(error.message)
  }
}
```

## Rate Limiting

### Current Limits

- **Session Creation**: 10 per minute per user
- **Message Sending**: 30 per minute per session
- **Stream Connections**: 5 concurrent per user

### Rate Limit Headers

```http
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 25
X-RateLimit-Reset: 1647345600
```

### Handling Rate Limits

```typescript
function handleRateLimit(response: Response) {
  const resetTime = parseInt(response.headers.get('X-RateLimit-Reset') || '0')
  const waitTime = (resetTime * 1000) - Date.now()
  
  if (waitTime > 0) {
    setTimeout(() => {
      // Retry request
      retryRequest()
    }, waitTime)
  }
}
```

## SDK Usage Examples

### JavaScript/TypeScript Client

```typescript
class ZFlowAgentsClient {
  private baseUrl: string
  private authToken: string
  
  constructor(baseUrl: string, authToken: string) {
    this.baseUrl = baseUrl
    this.authToken = authToken
  }

  // Create session
  async createSession(userId: string, agentId: string): Promise<Session> {
    const response = await fetch(`${this.baseUrl}/api/agents/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.authToken}`
      },
      body: JSON.stringify({ userId, agentId })
    })

    if (!response.ok) {
      throw new Error(`Failed to create session: ${response.status}`)
    }

    return response.json()
  }

  // Send message
  async sendMessage(sessionId: string, message: string, userId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/agents/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.authToken}`
      },
      body: JSON.stringify({ sessionId, message, userId })
    })

    if (!response.ok) {
      throw new Error(`Failed to send message: ${response.status}`)
    }
  }

  // Subscribe to streaming
  subscribeToStream(sessionId: string, callbacks: StreamCallbacks): EventSource {
    const eventSource = new EventSource(
      `${this.baseUrl}/api/agents/stream?sessionId=${sessionId}`
    )

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data)
      
      switch (data.type) {
        case 'connected':
          callbacks.onConnected?.(data)
          break
        case 'token':
          callbacks.onToken?.(data)
          break
        case 'end':
          callbacks.onEnd?.(data)
          break
        case 'error':
          callbacks.onError?.(data)
          break
      }
    }

    eventSource.onerror = (error) => {
      callbacks.onError?.(error)
    }

    return eventSource
  }
}

// Usage example
const client = new ZFlowAgentsClient('http://localhost:3000', userToken)

// Create session and start conversation
const session = await client.createSession('user_123', 'gpt-4')

// Set up streaming
const eventSource = client.subscribeToStream(session.sessionId, {
  onToken: (data) => {
    console.log('Received token:', data.content)
    updateUI(data.content)
  },
  onEnd: () => {
    console.log('Response complete')
  },
  onError: (error) => {
    console.error('Stream error:', error)
  }
})

// Send message
await client.sendMessage(session.sessionId, "Hello, how can you help me?", 'user_123')
```

### React Hook Example

```typescript
import { useState, useEffect, useRef } from 'react'

interface UseAgentChatOptions {
  userId: string
  agentId: string
  onError?: (error: any) => void
}

export function useAgentChat({ userId, agentId, onError }: UseAgentChatOptions) {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const eventSourceRef = useRef<EventSource | null>(null)

  // Create session
  useEffect(() => {
    async function createSession() {
      try {
        const response = await fetch('/api/agents/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, agentId })
        })
        
        const session = await response.json()
        setSessionId(session.sessionId)
      } catch (error) {
        onError?.(error)
      }
    }

    createSession()
  }, [userId, agentId])

  // Set up streaming
  useEffect(() => {
    if (!sessionId) return

    const eventSource = new EventSource(`/api/agents/stream?sessionId=${sessionId}`)
    eventSourceRef.current = eventSource

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data)
      
      switch (data.type) {
        case 'token':
          setMessages(prev => {
            const lastMessage = prev[prev.length - 1]
            if (lastMessage?.id === data.messageId && lastMessage.streaming) {
              return prev.map(msg =>
                msg.id === data.messageId
                  ? { ...msg, content: msg.content + data.content }
                  : msg
              )
            } else {
              return [...prev, {
                id: data.messageId,
                type: 'agent',
                content: data.content,
                streaming: true,
                timestamp: new Date()
              }]
            }
          })
          break
          
        case 'start':
          setIsStreaming(true)
          break
          
        case 'end':
          setIsStreaming(false)
          setMessages(prev =>
            prev.map(msg =>
              msg.id === data.messageId
                ? { ...msg, streaming: false }
                : msg
            )
          )
          break
      }
    }

    return () => {
      eventSource.close()
    }
  }, [sessionId])

  const sendMessage = async (content: string) => {
    if (!sessionId) return

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content,
      timestamp: new Date(),
      streaming: false
    }
    setMessages(prev => [...prev, userMessage])

    try {
      await fetch('/api/agents/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message: content, userId })
      })
    } catch (error) {
      onError?.(error)
    }
  }

  return {
    messages,
    isStreaming,
    sendMessage,
    sessionId
  }
}
```

This API reference provides comprehensive documentation for integrating with the ZFlow agents system. The streaming architecture allows for real-time, interactive AI conversations while maintaining proper session management and error handling.