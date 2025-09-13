# ZFlow Agents Troubleshooting Guide

This guide helps diagnose and resolve common issues with the ZFlow agents system, from setup problems to production debugging.

## Table of Contents

- [Quick Diagnostics](#quick-diagnostics)
- [Common Setup Issues](#common-setup-issues)
- [Streaming Connection Problems](#streaming-connection-problems)
- [Session Management Issues](#session-management-issues)
- [Provider Integration Problems](#provider-integration-problems)
- [Performance Issues](#performance-issues)
- [Production Debugging](#production-debugging)
- [Monitoring and Alerts](#monitoring-and-alerts)

## Quick Diagnostics

### Health Check Endpoint

First, verify system status:

```bash
curl http://localhost:3000/api/agents/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "streamingMode": "redis", // or "memory"
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

### Quick Status Checks

```typescript
// In browser console or debug endpoint
async function quickDiagnostics() {
  console.log('=== ZFlow Agents Diagnostics ===')
  
  // 1. Check available agents
  const agents = await fetch('/api/agents/registry?onlineOnly=true').then(r => r.json())
  console.log('Available agents:', agents.agents?.length || 0)
  
  // 2. Check streaming mode
  const health = await fetch('/api/agents/health').then(r => r.json())
  console.log('Streaming mode:', health.streamingMode)
  
  // 3. Check environment
  console.log('Environment:', {
    hasRedisUrl: !!process.env.REDIS_URL,
    hasOpenAIKey: !!process.env.OPENAI_API_KEY,
    nodeEnv: process.env.NODE_ENV
  })
}
```

## Common Setup Issues

### 1. Redis Connection Failed

**Symptoms:**
```
StreamingService: Redis unavailable, falling back to memory streaming
```

**Diagnosis:**
```typescript
// Check Redis connection
async function testRedis() {
  try {
    const { getRedisClient } = await import('./lib/redis')
    const redis = getRedisClient()
    const result = await redis.ping()
    console.log('Redis ping result:', result)
  } catch (error) {
    console.error('Redis connection failed:', error)
  }
}
```

**Solutions:**
1. **Check Redis URL:**
   ```bash
   echo $REDIS_URL
   # Should be: redis://username:password@host:port
   ```

2. **Verify Redis Service:**
   ```bash
   # Local Redis
   redis-cli ping
   
   # Docker Redis
   docker ps | grep redis
   
   # Remote Redis
   redis-cli -u $REDIS_URL ping
   ```

3. **Environment Configuration:**
   ```bash
   # .env.local
   REDIS_URL=redis://localhost:6379
   
   # For Redis with auth
   REDIS_URL=redis://username:password@host:6379
   ```

### 2. OpenAI API Key Issues

**Symptoms:**
```
OpenAI client not initialized. Please configure a user API key or set OPENAI_API_KEY.
```

**Diagnosis:**
```typescript
// Check OpenAI configuration
async function testOpenAI() {
  try {
    const { openAIProvider } = await import('./lib/agents/init')
    const provider = openAIProvider()
    const models = provider.getAvailableModels()
    console.log('Available OpenAI models:', models)
  } catch (error) {
    console.error('OpenAI setup failed:', error)
  }
}
```

**Solutions:**
1. **Set Environment Variable:**
   ```bash
   # .env.local
   OPENAI_API_KEY=sk-your-key-here
   ```

2. **Verify API Key:**
   ```bash
   curl -H "Authorization: Bearer $OPENAI_API_KEY" \
        "https://api.openai.com/v1/models"
   ```

3. **Check User-Specific Keys:**
   ```typescript
   // Verify user key resolution
   const userKey = await resolveUserOpenAIKey(authToken, 'openai_gpt4')
   console.log('User key available:', !!userKey)
   ```

### 3. Agent Registry Empty

**Symptoms:**
```json
{
  "agents": []
}
```

**Diagnosis:**
```typescript
// Check agent initialization
import { agentRegistry } from './lib/agents/registry'

console.log('Registered agents:', agentRegistry.getAllAgents())
console.log('Available agents:', agentRegistry.getAvailableAgents())
```

**Solutions:**
1. **Verify Provider Initialization:**
   ```typescript
   // Check if providers are registered
   const openaiProvider = agentRegistry.getProvider('openai')
   const anthropicProvider = agentRegistry.getProvider('anthropic')
   
   console.log('OpenAI provider:', !!openaiProvider)
   console.log('Anthropic provider:', !!anthropicProvider)
   ```

2. **Force Provider Initialization:**
   ```typescript
   // In your initialization code
   import { openAIProvider, anthropicProvider } from './lib/agents/init'
   
   // Force initialization
   openAIProvider()
   anthropicProvider()
   ```

## Streaming Connection Problems

### 1. SSE Connection Not Establishing

**Symptoms:**
- Browser shows "connecting" but never receives events
- Network tab shows failed SSE request

**Diagnosis:**
```javascript
// Test SSE connection manually
const eventSource = new EventSource('/api/agents/stream?sessionId=test')

eventSource.onopen = () => {
  console.log('✅ SSE connection opened')
}

eventSource.onerror = (error) => {
  console.error('❌ SSE connection error:', error)
  console.log('ReadyState:', eventSource.readyState)
  // 0 = CONNECTING, 1 = OPEN, 2 = CLOSED
}

setTimeout(() => {
  console.log('Connection state after 5s:', eventSource.readyState)
  eventSource.close()
}, 5000)
```

**Solutions:**
1. **Check Session Exists:**
   ```typescript
   // Verify session before connecting
   const session = await fetch(`/api/agents/sessions?sessionId=${sessionId}`)
   if (!session.ok) {
     console.error('Session not found')
     // Create new session
   }
   ```

2. **CORS Configuration:**
   ```typescript
   // In your API route
   const headers = {
     'Access-Control-Allow-Origin': '*',
     'Access-Control-Allow-Methods': 'GET',
     'Access-Control-Allow-Headers': 'Cache-Control',
   }
   ```

3. **Proxy/Nginx Configuration:**
   ```nginx
   # nginx.conf
   location /api/agents/stream {
     proxy_pass http://localhost:3000;
     proxy_buffering off;
     proxy_cache off;
     proxy_set_header X-Accel-Buffering no;
   }
   ```

### 2. Events Not Reaching Frontend

**Symptoms:**
- SSE connection is open
- Backend logs show events being published
- Frontend receives no events

**Diagnosis:**
```typescript
// Add debug logging to streaming service
class StreamingService {
  async publishStreamEvent(sessionId: string, event: StreamingResponse) {
    console.log(`📤 Publishing event [${sessionId}]:`, {
      type: event.type,
      contentLength: event.content?.length,
      mode: this.useRedis ? 'redis' : 'memory'
    })
    
    if (this.useRedis) {
      const channel = `agent_stream:${sessionId}`
      const result = await this.redis.publish(channel, JSON.stringify(event))
      console.log(`📡 Redis publish result: ${result} subscribers`)
    } else {
      await this.memoryService.publishStreamEvent(sessionId, event)
      const stats = this.memoryService.getStats()
      console.log('📊 Memory service stats:', stats)
    }
  }
}
```

**Solutions:**
1. **Verify Redis Pub/Sub:**
   ```bash
   # In Redis CLI
   redis-cli
   MONITOR  # Watch all Redis commands
   
   # In another terminal
   redis-cli
   PUBSUB CHANNELS agent_stream:*  # List active channels
   ```

2. **Check Memory Mode Listeners:**
   ```typescript
   // In memory mode
   const memoryService = getSharedMemoryStreamingService()
   const stats = memoryService.getStats()
   console.log('Active listeners:', stats.totalListeners)
   console.log('Channels:', stats.channels)
   ```

3. **Test Event Publishing:**
   ```typescript
   // Manually test event publishing
   const streamingService = new StreamingService()
   await streamingService.publishStreamEvent('test-session', {
     sessionId: 'test-session',
     messageId: 'test-msg',
     type: 'token',
     content: 'test'
   })
   ```

### 3. Token Accumulation Issues

**Symptoms:**
- Tokens arrive but don't accumulate properly
- Messages appear fragmented or duplicated

**Diagnosis:**
```javascript
// Add detailed logging to token handling
newEventSource.onmessage = (event) => {
  const data = JSON.parse(event.data)
  
  if (data.type === 'token') {
    console.log('🔤 Token received:', {
      messageId: data.messageId,
      content: JSON.stringify(data.content),
      contentLength: data.content?.length,
      currentMessages: messages.length,
      lastMessageId: messages[messages.length - 1]?.id
    })
  }
  
  // ... rest of handling
}
```

**Solutions:**
1. **Fix Message ID Matching:**
   ```typescript
   setMessages(prev => {
     const lastMessage = prev[prev.length - 1]
     
     console.log('Token matching check:', {
       hasLastMessage: !!lastMessage,
       lastMessageId: lastMessage?.id,
       incomingMessageId: data.messageId,
       isStreaming: lastMessage?.streaming,
       match: lastMessage?.id === data.messageId && lastMessage?.streaming
     })
     
     if (lastMessage && lastMessage.id === data.messageId && lastMessage.streaming) {
       // Append to existing message
       return prev.map(msg => 
         msg.id === data.messageId 
           ? { ...msg, content: msg.content + data.content }
           : msg
       )
     } else {
       // Create new message
       return [...prev, {
         id: data.messageId,
         type: 'agent',
         content: data.content || '',
         timestamp: new Date(),
         streaming: true
       }]
     }
   })
   ```

## Session Management Issues

### 1. Session Creation Failures

**Symptoms:**
```json
{
  "error": "Failed to create session",
  "status": 500
}
```

**Diagnosis:**
```typescript
// Test session creation manually
async function testSessionCreation() {
  try {
    const response = await fetch('/api/agents/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'test-user',
        agentId: 'gpt-4'
      })
    })
    
    console.log('Response status:', response.status)
    const data = await response.json()
    console.log('Response data:', data)
  } catch (error) {
    console.error('Session creation failed:', error)
  }
}
```

**Solutions:**
1. **Check Agent Availability:**
   ```typescript
   import { agentRegistry } from './lib/agents/registry'
   
   const agent = agentRegistry.getAgent('gpt-4')
   console.log('Agent exists:', !!agent)
   console.log('Agent status:', agent?.status)
   ```

2. **Verify Storage Backend:**
   ```typescript
   // Test session manager
   import { sessionManager } from './lib/agents/session-manager'
   
   const mode = await sessionManager.getMode()
   console.log('Session storage mode:', mode)
   
   // Test session creation
   const session = await sessionManager.createSession('test-user', 'gpt-4')
   console.log('Session created:', session.id)
   ```

### 2. Session Not Found Errors

**Symptoms:**
```json
{
  "error": "Session not found",
  "status": 404
}
```

**Diagnosis:**
```typescript
// Check session existence and TTL
async function debugSession(sessionId: string) {
  const session = await sessionManager.getSession(sessionId)
  
  if (session) {
    console.log('Session found:', {
      id: session.id,
      userId: session.userId,
      agentId: session.agentId,
      messageCount: session.messages.length,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      ageMinutes: (Date.now() - session.updatedAt.getTime()) / (1000 * 60)
    })
  } else {
    console.log('Session not found in storage')
    
    // Check Redis directly if using Redis mode
    if (await sessionManager.getMode() === 'redis') {
      const redis = getRedisClient()
      const exists = await redis.exists(`session:${sessionId}`)
      console.log('Session exists in Redis:', !!exists)
    }
  }
}
```

**Solutions:**
1. **Extend Session TTL:**
   ```typescript
   // Extend session when user is active
   await sessionManager.extendSessionTTL(sessionId)
   ```

2. **Handle Session Expiry:**
   ```typescript
   // In your frontend
   const handleSessionExpiry = async () => {
     console.log('Session expired, creating new one')
     const newSession = await createSession(userId, agentId)
     setSessionId(newSession.sessionId)
   }
   ```

## Provider Integration Problems

### 1. OpenAI Rate Limiting

**Symptoms:**
```json
{
  "error": "Rate limit exceeded. Please try again later.",
  "type": "error"
}
```

**Diagnosis:**
```typescript
// Monitor OpenAI usage
class OpenAIUsageMonitor {
  private requestCounts = new Map<string, number>()
  private resetTimes = new Map<string, number>()
  
  trackRequest(userId: string) {
    const key = `${userId}:${Math.floor(Date.now() / 60000)}` // Per minute
    this.requestCounts.set(key, (this.requestCounts.get(key) || 0) + 1)
  }
  
  getUsage(userId: string): number {
    const key = `${userId}:${Math.floor(Date.now() / 60000)}`
    return this.requestCounts.get(key) || 0
  }
}
```

**Solutions:**
1. **Implement Exponential Backoff:**
   ```typescript
   async function callOpenAIWithRetry(apiCall: () => Promise<any>, maxRetries = 3) {
     for (let attempt = 0; attempt < maxRetries; attempt++) {
       try {
         return await apiCall()
       } catch (error) {
         if (error.code === 'rate_limit_exceeded' && attempt < maxRetries - 1) {
           const delay = Math.pow(2, attempt) * 1000 // 1s, 2s, 4s
           await new Promise(resolve => setTimeout(resolve, delay))
           continue
         }
         throw error
       }
     }
   }
   ```

2. **Request Queuing:**
   ```typescript
   class RequestQueue {
     private queue: Array<() => Promise<any>> = []
     private processing = false
     
     async add<T>(request: () => Promise<T>): Promise<T> {
       return new Promise((resolve, reject) => {
         this.queue.push(async () => {
           try {
             const result = await request()
             resolve(result)
           } catch (error) {
             reject(error)
           }
         })
         
         this.processQueue()
       })
     }
     
     private async processQueue() {
       if (this.processing || this.queue.length === 0) return
       
       this.processing = true
       while (this.queue.length > 0) {
         const request = this.queue.shift()!
         await request()
         await new Promise(resolve => setTimeout(resolve, 100)) // 100ms between requests
       }
       this.processing = false
     }
   }
   ```

### 2. Provider Authentication Issues

**Symptoms:**
```json
{
  "error": "Invalid API key",
  "type": "error"
}
```

**Diagnosis:**
```typescript
// Test provider authentication
async function testProviderAuth() {
  // Test OpenAI
  try {
    const openaiKey = process.env.OPENAI_API_KEY
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: { 'Authorization': `Bearer ${openaiKey}` }
    })
    console.log('OpenAI auth status:', response.status)
  } catch (error) {
    console.error('OpenAI auth failed:', error)
  }
  
  // Test user-specific keys
  const userKey = await resolveUserOpenAIKey(authToken)
  console.log('User-specific key available:', !!userKey)
}
```

**Solutions:**
1. **Validate API Keys:**
   ```typescript
   async function validateApiKey(key: string): Promise<boolean> {
     try {
       const response = await fetch('https://api.openai.com/v1/models', {
         headers: { 'Authorization': `Bearer ${key}` }
       })
       return response.ok
     } catch {
       return false
     }
   }
   ```

2. **Graceful Fallback:**
   ```typescript
   async function getOpenAIClient(authToken?: string): Promise<OpenAI> {
     // Try user-specific key first
     const userKey = await resolveUserOpenAIKey(authToken)
     if (userKey && await validateApiKey(userKey)) {
       return new OpenAI({ apiKey: userKey })
     }
     
     // Fallback to system key
     const systemKey = process.env.OPENAI_API_KEY
     if (systemKey && await validateApiKey(systemKey)) {
       return new OpenAI({ apiKey: systemKey })
     }
     
     throw new Error('No valid OpenAI API key available')
   }
   ```

## Performance Issues

### 1. Slow Token Streaming

**Symptoms:**
- Delays between token arrivals
- Choppy or stuttering text appearance

**Diagnosis:**
```typescript
// Measure streaming performance
class StreamingPerformanceMonitor {
  private startTime: number = 0
  private tokenCount: number = 0
  private lastTokenTime: number = 0
  
  onStart() {
    this.startTime = Date.now()
    this.tokenCount = 0
    this.lastTokenTime = Date.now()
  }
  
  onToken() {
    this.tokenCount++
    const now = Date.now()
    const timeSinceLastToken = now - this.lastTokenTime
    this.lastTokenTime = now
    
    console.log('Token performance:', {
      tokenNumber: this.tokenCount,
      timeSinceLastToken,
      averageTokenTime: (now - this.startTime) / this.tokenCount
    })
  }
  
  onEnd() {
    const totalTime = Date.now() - this.startTime
    console.log('Streaming complete:', {
      totalTokens: this.tokenCount,
      totalTime,
      tokensPerSecond: this.tokenCount / (totalTime / 1000)
    })
  }
}
```

**Solutions:**
1. **Optimize Redis Performance:**
   ```typescript
   // Use connection pooling
   const redis = new Redis({
     host: process.env.REDIS_HOST,
     port: process.env.REDIS_PORT,
     lazyConnect: true,
     maxRetriesPerRequest: 1,
     retryDelayOnFailover: 50,
     keepAlive: 30000
   })
   ```

2. **Batch Token Updates:**
   ```typescript
   // Batch tokens for better UI performance
   class TokenBatcher {
     private tokens: string[] = []
     private timeoutId: NodeJS.Timeout | null = null
     
     addToken(token: string, callback: (batch: string) => void) {
       this.tokens.push(token)
       
       if (this.timeoutId) {
         clearTimeout(this.timeoutId)
       }
       
       this.timeoutId = setTimeout(() => {
         const batch = this.tokens.join('')
         this.tokens = []
         callback(batch)
       }, 50) // 50ms batching window
     }
   }
   ```

### 2. Memory Leaks

**Symptoms:**
- Increasing memory usage over time
- Slow response times
- Server crashes under load

**Diagnosis:**
```typescript
// Monitor memory usage
setInterval(() => {
  const usage = process.memoryUsage()
  console.log('Memory usage:', {
    rss: Math.round(usage.rss / 1024 / 1024) + 'MB',
    heapUsed: Math.round(usage.heapUsed / 1024 / 1024) + 'MB',
    heapTotal: Math.round(usage.heapTotal / 1024 / 1024) + 'MB'
  })
  
  // Check streaming service stats
  const streamingService = getSharedMemoryStreamingService()
  const stats = streamingService.getStats()
  console.log('Active listeners:', stats.totalListeners)
}, 30000) // Every 30 seconds
```

**Solutions:**
1. **Cleanup Event Listeners:**
   ```typescript
   // Properly cleanup SSE connections
   useEffect(() => {
     const eventSource = new EventSource(url)
     
     return () => {
       eventSource.close() // Always cleanup
     }
   }, [sessionId])
   ```

2. **Implement Session Cleanup:**
   ```typescript
   // Regular cleanup of expired sessions
   setInterval(() => {
     memorySessionManager.cleanupExpiredSessions()
     memoryStreamingService.removeAllListeners()
   }, 300000) // Every 5 minutes
   ```

## Production Debugging

### 1. Structured Logging

```typescript
// Enhanced logging for production
class AgentLogger {
  private log(level: string, message: string, context: any = {}) {
    const timestamp = new Date().toISOString()
    const logEntry = {
      timestamp,
      level,
      message,
      service: 'zflow-agents',
      ...context
    }
    
    if (process.env.NODE_ENV === 'production') {
      console.log(JSON.stringify(logEntry))
    } else {
      console.log(`[${level}] ${message}`, context)
    }
  }
  
  info(message: string, context?: any) {
    this.log('INFO', message, context)
  }
  
  error(message: string, error: Error, context?: any) {
    this.log('ERROR', message, {
      error: error.message,
      stack: error.stack,
      ...context
    })
  }
  
  performance(operation: string, duration: number, context?: any) {
    this.log('PERF', `${operation} completed in ${duration}ms`, context)
  }
}

const logger = new AgentLogger()

// Usage in streaming
async function processMessageStream(provider: any, message: string, context: any) {
  const startTime = Date.now()
  
  try {
    logger.info('Starting message processing', {
      sessionId: context.sessionId,
      agentId: context.agent.id,
      messageLength: message.length
    })
    
    for await (const chunk of provider.sendMessage(message, context)) {
      await streamingService.publishStreamEvent(context.sessionId, chunk)
    }
    
    logger.performance('message_processing', Date.now() - startTime, {
      sessionId: context.sessionId
    })
  } catch (error) {
    logger.error('Message processing failed', error, {
      sessionId: context.sessionId,
      agentId: context.agent.id
    })
  }
}
```

### 2. Health Monitoring

```typescript
// Comprehensive health check
export async function GET() {
  const startTime = Date.now()
  const healthData: any = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || 'unknown'
  }
  
  try {
    // Check Redis
    const streamingService = new StreamingService()
    const streamingMode = await streamingService.getMode()
    healthData.streaming = { mode: streamingMode }
    
    if (streamingMode === 'redis') {
      const redis = getRedisClient()
      const pingResult = await redis.ping()
      healthData.redis = { status: 'connected', ping: pingResult }
    }
    
    // Check session storage
    const sessionManager = getSessionManager()
    const sessionMode = await sessionManager.getMode()
    healthData.sessions = { mode: sessionMode }
    
    // Check providers
    const agents = agentRegistry.getAvailableAgents()
    healthData.agents = {
      total: agentRegistry.getAllAgents().length,
      online: agents.length,
      providers: [...new Set(agents.map(a => a.provider))]
    }
    
    // Performance metrics
    healthData.performance = {
      responseTime: Date.now() - startTime,
      memory: process.memoryUsage(),
      uptime: process.uptime()
    }
    
  } catch (error) {
    healthData.status = 'unhealthy'
    healthData.error = error.message
  }
  
  const statusCode = healthData.status === 'healthy' ? 200 : 503
  return NextResponse.json(healthData, { status: statusCode })
}
```

## Monitoring and Alerts

### 1. Key Metrics to Monitor

```typescript
// Metrics collection
class MetricsCollector {
  private metrics = {
    sessions: {
      created: 0,
      active: 0,
      failed: 0
    },
    messages: {
      sent: 0,
      processed: 0,
      failed: 0
    },
    streaming: {
      connections: 0,
      events: 0,
      errors: 0
    },
    performance: {
      avgResponseTime: 0,
      avgTokensPerSecond: 0
    }
  }
  
  incrementSessionsCreated() {
    this.metrics.sessions.created++
  }
  
  incrementMessagesProcessed() {
    this.metrics.messages.processed++
  }
  
  recordResponseTime(ms: number) {
    // Update rolling average
    this.metrics.performance.avgResponseTime = 
      (this.metrics.performance.avgResponseTime + ms) / 2
  }
  
  getMetrics() {
    return { ...this.metrics, timestamp: Date.now() }
  }
}
```

### 2. Alert Conditions

```typescript
// Alert thresholds
const ALERT_THRESHOLDS = {
  errorRate: 0.05,        // 5% error rate
  responseTime: 5000,     // 5 seconds
  memoryUsage: 0.9,       // 90% memory usage
  redisConnections: 100,  // Max Redis connections
  activeConnections: 1000 // Max concurrent SSE connections
}

// Alert checker
function checkAlerts(metrics: any) {
  const alerts = []
  
  // Error rate
  const errorRate = metrics.messages.failed / metrics.messages.sent
  if (errorRate > ALERT_THRESHOLDS.errorRate) {
    alerts.push({
      type: 'HIGH_ERROR_RATE',
      value: errorRate,
      threshold: ALERT_THRESHOLDS.errorRate
    })
  }
  
  // Response time
  if (metrics.performance.avgResponseTime > ALERT_THRESHOLDS.responseTime) {
    alerts.push({
      type: 'SLOW_RESPONSE_TIME',
      value: metrics.performance.avgResponseTime,
      threshold: ALERT_THRESHOLDS.responseTime
    })
  }
  
  // Memory usage
  const memoryUsage = process.memoryUsage()
  const memoryPercent = memoryUsage.heapUsed / memoryUsage.heapTotal
  if (memoryPercent > ALERT_THRESHOLDS.memoryUsage) {
    alerts.push({
      type: 'HIGH_MEMORY_USAGE',
      value: memoryPercent,
      threshold: ALERT_THRESHOLDS.memoryUsage
    })
  }
  
  return alerts
}
```

This troubleshooting guide provides systematic approaches to diagnosing and resolving issues in the ZFlow agents system. Regular monitoring and proactive debugging help maintain system reliability and performance.