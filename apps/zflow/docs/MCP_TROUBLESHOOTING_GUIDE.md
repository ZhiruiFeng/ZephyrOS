# MCP Troubleshooting Guide

## Common Issues & Solutions

This guide provides solutions to common MCP integration issues encountered during development and production deployment.

## Development Issues

### 1. MCP Client Connection Failures

#### Symptom
```
❌ Failed to initialize MCP bridge: Error: spawn ENOENT
```

#### Causes & Solutions
```typescript
// Cause: MCP server path not found
// Solution: Verify MCP_SERVER_PATH environment variable
console.log('MCP Server Path:', process.env.MCP_SERVER_PATH)

// Cause: Permission issues
// Solution: Check file permissions
fs.access(process.env.MCP_SERVER_PATH, fs.constants.X_OK, (err) => {
  if (err) console.error('MCP server not executable:', err)
})

// Cause: Missing dependencies
// Solution: Install MCP server dependencies
// cd path/to/mcp-server && npm install
```

#### Quick Fix
```bash
# Verify MCP server exists and is executable
ls -la ./path/to/mcp-server/dist/index.js
chmod +x ./path/to/mcp-server/dist/index.js

# Test MCP server manually
node ./path/to/mcp-server/dist/index.js --help
```

### 2. Tool Discovery Issues

#### Symptom
```
📋 Created 0 ZFlow tools from MCP
```

#### Debugging Steps
```typescript
// Step 1: Check raw MCP tools
const mcpClient = getMCPClient()
await mcpClient.connect()
const rawTools = mcpClient.getRawTools()
console.log('Raw MCP tools:', rawTools)

// Step 2: Check tool transformation
const zflowTools = mcpClient.createZFlowTools()
console.log('ZFlow tools:', zflowTools)

// Step 3: Verify tool schema
rawTools.forEach(tool => {
  console.log(`Tool ${tool.name}:`, {
    hasName: !!tool.name,
    hasDescription: !!tool.description,
    hasInputSchema: !!tool.inputSchema,
    schemaType: tool.inputSchema?.type
  })
})
```

#### Common Solutions
```typescript
// Solution 1: Tool schema validation
function validateToolSchema(tool) {
  const required = ['name', 'description', 'inputSchema']
  const missing = required.filter(field => !tool[field])

  if (missing.length > 0) {
    console.warn(`Tool ${tool.name} missing:`, missing)
    return false
  }
  return true
}

// Solution 2: Manual tool registration
if (zflowTools.length === 0) {
  console.log('No tools discovered, registering fallback tools...')
  const fallbackTools = createFallbackTools()
  await registerToolsManually(fallbackTools)
}
```

### 3. Status Indicator Not Updating

#### Symptom
- Status shows "Disconnected" despite working MCP connection
- Status indicator doesn't refresh

#### Debugging
```typescript
// Check status endpoint directly
fetch('/api/agents/mcp/status')
  .then(r => r.json())
  .then(data => {
    console.log('Status response:', data)

    // Verify expected structure
    const hasValidStructure = data.success &&
                             data.mcp &&
                             typeof data.mcp.connected === 'boolean'

    console.log('Valid structure:', hasValidStructure)
  })
  .catch(err => console.error('Status fetch failed:', err))
```

#### Solutions
```typescript
// Solution 1: Force status refresh
const [mcpStatus, setMcpStatus] = useState<MCPStatus | null>(null)
const [refreshTrigger, setRefreshTrigger] = useState(0)

const forceRefresh = () => setRefreshTrigger(prev => prev + 1)

useEffect(() => {
  fetchStatus()
}, [refreshTrigger])

// Solution 2: Increase polling frequency during development
const pollInterval = process.env.NODE_ENV === 'development' ? 5000 : 30000

// Solution 3: Add error boundary
function MCPStatusWithErrorBoundary() {
  return (
    <ErrorBoundary fallback={<div>Status unavailable</div>}>
      <MCPStatusIndicator />
    </ErrorBoundary>
  )
}
```

## Production Issues

### 1. HTTP MCP Connection Failures

#### Symptom
```
🌐 Using HTTP MCP client for production/Vercel environment
❌ Failed to connect to HTTP MCP: fetch failed
```

#### Debugging Steps
```typescript
// Step 1: Test endpoint directly
const testEndpoint = async () => {
  const baseUrl = process.env.HTTP_MCP_URL || process.env.ZMEMORY_API_URL

  try {
    // Test health endpoint
    const health = await fetch(`${baseUrl}/health`)
    console.log('Health status:', health.status)

    if (health.ok) {
      const data = await health.json()
      console.log('Health data:', data)
    }
  } catch (error) {
    console.error('Health check failed:', error)
  }
}

// Step 2: Check CORS settings
const testCORS = async () => {
  try {
    const response = await fetch(baseUrl, {
      method: 'OPTIONS',
      headers: { 'Origin': window.location.origin }
    })

    console.log('CORS headers:', {
      'access-control-allow-origin': response.headers.get('access-control-allow-origin'),
      'access-control-allow-methods': response.headers.get('access-control-allow-methods'),
      'access-control-allow-headers': response.headers.get('access-control-allow-headers')
    })
  } catch (error) {
    console.error('CORS test failed:', error)
  }
}
```

#### Solutions
```typescript
// Solution 1: Environment variable verification
console.log('Production config check:', {
  NODE_ENV: process.env.NODE_ENV,
  VERCEL_ENV: process.env.VERCEL_ENV,
  HTTP_MCP_URL: process.env.HTTP_MCP_URL,
  ZMEMORY_API_URL: process.env.ZMEMORY_API_URL,
  hasApiKey: !!process.env.ZMEMORY_API_KEY
})

// Solution 2: Fallback URL configuration
const getMCPUrl = () => {
  const urls = [
    process.env.HTTP_MCP_URL,
    process.env.ZMEMORY_API_URL,
    'https://default-mcp-server.vercel.app' // fallback
  ].filter(Boolean)

  return urls[0]
}

// Solution 3: Timeout and retry configuration
const httpConfig = {
  timeout: 15000,
  retries: 3,
  retryDelay: 1000
}
```

### 2. API Rate Limiting

#### Symptom
```
HTTP 429: Too Many Requests
Rate limit exceeded
```

#### Solutions
```typescript
// Solution 1: Implement exponential backoff
class RateLimitHandler {
  private attempts = 0
  private maxAttempts = 5

  async executeWithBackoff<T>(fn: () => Promise<T>): Promise<T> {
    try {
      const result = await fn()
      this.attempts = 0 // Reset on success
      return result
    } catch (error) {
      if (error.status === 429 && this.attempts < this.maxAttempts) {
        this.attempts++
        const delay = Math.pow(2, this.attempts) * 1000 // Exponential backoff

        console.log(`Rate limited, retrying in ${delay}ms (attempt ${this.attempts})`)
        await new Promise(resolve => setTimeout(resolve, delay))

        return this.executeWithBackoff(fn)
      }
      throw error
    }
  }
}

// Solution 2: Request queuing
class RequestQueue {
  private queue: Array<() => Promise<any>> = []
  private processing = false
  private requestInterval = 100 // ms between requests

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

      if (!this.processing) {
        this.processQueue()
      }
    })
  }

  private async processQueue() {
    if (this.queue.length === 0) {
      this.processing = false
      return
    }

    this.processing = true
    const request = this.queue.shift()!

    await request()
    await new Promise(resolve => setTimeout(resolve, this.requestInterval))

    this.processQueue()
  }
}
```

### 3. Tool Execution Timeouts

#### Symptom
```
Tool execution timeout after 30000ms
```

#### Solutions
```typescript
// Solution 1: Configurable timeouts by tool type
const getToolTimeout = (toolName: string) => {
  const timeouts = {
    search_memory: 5000,      // Fast operations
    analyze_document: 30000,  // Medium operations
    generate_report: 60000    // Slow operations
  }

  return timeouts[toolName] || 15000 // Default timeout
}

// Solution 2: Progress tracking for long operations
async function executeToolWithProgress(toolName: string, args: any) {
  const timeout = getToolTimeout(toolName)
  const progressInterval = Math.min(timeout / 10, 5000)

  let progressTimer: NodeJS.Timeout
  const progressPromise = new Promise((_, reject) => {
    progressTimer = setTimeout(() => {
      reject(new Error(`Tool ${toolName} timeout after ${timeout}ms`))
    }, timeout)
  })

  // Show progress updates
  const progressUpdater = setInterval(() => {
    console.log(`Tool ${toolName} still executing...`)
  }, progressInterval)

  try {
    const result = await Promise.race([
      mcpClient.callTool(toolName, args),
      progressPromise
    ])

    clearTimeout(progressTimer)
    clearInterval(progressUpdater)
    return result
  } catch (error) {
    clearTimeout(progressTimer)
    clearInterval(progressUpdater)
    throw error
  }
}
```

## Environment-Specific Issues

### Vercel Deployment Issues

#### Issue: Function Timeout
```
Error: Task timed out after 10.00 seconds
```

#### Solutions
```typescript
// Solution 1: Optimize for serverless
export const config = {
  maxDuration: 30, // Increase timeout for MCP operations
  memory: 256,     // Increase memory if needed
}

// Solution 2: Async background processing
export async function POST(request: Request) {
  // Start MCP operation
  const operation = startMCPOperation(request)

  // Return immediately with operation ID
  return new Response(JSON.stringify({
    operationId: operation.id,
    status: 'processing'
  }))

  // Process in background (won't block response)
  operation.process()
}
```

#### Issue: Cold Start Performance
```
First request takes 5+ seconds
```

#### Solutions
```typescript
// Solution 1: Warming strategy
const warmingRequests = [
  '/api/agents/mcp/status',
  '/api/agents/mcp/health'
]

// Solution 2: Connection pooling
class ConnectionPool {
  private connections = new Map<string, MCPHttpClient>()

  getConnection(url: string): MCPHttpClient {
    if (!this.connections.has(url)) {
      const client = new MCPHttpClient({ baseUrl: url })
      this.connections.set(url, client)
    }
    return this.connections.get(url)!
  }
}
```

### Local Development Issues

#### Issue: Port Conflicts
```
Error: listen EADDRINUSE :::3000
```

#### Solutions
```bash
# Find and kill process using port
lsof -ti:3000 | xargs kill -9

# Use different port
PORT=3001 npm run dev

# Auto-detect available port
npm install --save-dev detect-port
```

#### Issue: Hot Reload Not Working
```
MCP tools not updating after server changes
```

#### Solutions
```typescript
// Solution 1: File watching for MCP server
const chokidar = require('chokidar')

const watcher = chokidar.watch('./path/to/mcp-server/src')
watcher.on('change', async (path) => {
  console.log(`MCP server file changed: ${path}`)
  await restartMCPConnection()
})

// Solution 2: Manual refresh endpoint
export async function POST() {
  try {
    const bridge = getMCPBridge()
    await bridge.refreshTools()

    return Response.json({ success: true, message: 'Tools refreshed' })
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}
```

## Diagnostic Tools

### 1. MCP Connection Tester
```typescript
export async function testMCPConnection() {
  const results = {
    environment: process.env.NODE_ENV,
    clientType: null,
    connection: false,
    tools: [],
    providers: [],
    errors: []
  }

  try {
    // Test client creation
    const client = getMCPClient()
    results.clientType = client.constructor.name

    // Test connection
    await client.connect()
    results.connection = client.isConnected()

    // Test tool discovery
    results.tools = client.getAvailableTools().map(t => t.name)

    // Test bridge initialization
    const bridge = getMCPBridge()
    await bridge.initialize()
    results.providers = bridge.getRegisteredProviders().map(p => p.constructor.name)

  } catch (error) {
    results.errors.push(error.message)
  }

  return results
}
```

### 2. Performance Monitor
```typescript
class MCPPerformanceMonitor {
  private metrics = new Map<string, number[]>()

  startTiming(operation: string): () => void {
    const start = Date.now()

    return () => {
      const duration = Date.now() - start

      if (!this.metrics.has(operation)) {
        this.metrics.set(operation, [])
      }

      this.metrics.get(operation)!.push(duration)

      // Keep only last 100 measurements
      const measurements = this.metrics.get(operation)!
      if (measurements.length > 100) {
        measurements.shift()
      }
    }
  }

  getStats(operation: string) {
    const measurements = this.metrics.get(operation) || []

    if (measurements.length === 0) {
      return { count: 0, avg: 0, min: 0, max: 0 }
    }

    return {
      count: measurements.length,
      avg: measurements.reduce((a, b) => a + b, 0) / measurements.length,
      min: Math.min(...measurements),
      max: Math.max(...measurements)
    }
  }
}
```

### 3. Health Check Dashboard
```typescript
export function MCPHealthDashboard() {
  const [health, setHealth] = useState(null)

  useEffect(() => {
    const checkHealth = async () => {
      const connectionTest = await testMCPConnection()
      const performanceStats = monitor.getStats('tool_execution')

      setHealth({
        ...connectionTest,
        performance: performanceStats,
        timestamp: new Date().toISOString()
      })
    }

    checkHealth()
    const interval = setInterval(checkHealth, 10000)
    return () => clearInterval(interval)
  }, [])

  if (!health) return <div>Loading health data...</div>

  return (
    <div className="mcp-health-dashboard">
      <h3>MCP Health Status</h3>

      <div className="health-section">
        <h4>Connection</h4>
        <p>Status: {health.connection ? '✅ Connected' : '❌ Disconnected'}</p>
        <p>Client: {health.clientType}</p>
        <p>Environment: {health.environment}</p>
      </div>

      <div className="health-section">
        <h4>Tools ({health.tools.length})</h4>
        <ul>
          {health.tools.map(tool => <li key={tool}>{tool}</li>)}
        </ul>
      </div>

      <div className="health-section">
        <h4>Providers ({health.providers.length})</h4>
        <ul>
          {health.providers.map(provider => <li key={provider}>{provider}</li>)}
        </ul>
      </div>

      {health.errors.length > 0 && (
        <div className="health-section error">
          <h4>Errors</h4>
          <ul>
            {health.errors.map((error, i) => <li key={i}>{error}</li>)}
          </ul>
        </div>
      )}

      <div className="health-section">
        <h4>Performance</h4>
        <p>Avg execution time: {health.performance.avg.toFixed(2)}ms</p>
        <p>Total executions: {health.performance.count}</p>
      </div>
    </div>
  )
}
```

This troubleshooting guide provides comprehensive solutions for common MCP integration issues and diagnostic tools to help identify and resolve problems quickly.