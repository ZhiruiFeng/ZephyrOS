# MCP Development Workflow & Deployment Guide

## Development Channel Workflow

This document outlines the complete development workflow for MCP integration, from local development to production deployment.

## Development Phases

### Phase 1: Local Development Setup

#### Prerequisites
- Node.js 18+ installed
- Local MCP server (zmemory-mcp or similar)
- ZFlow development environment

#### Local MCP Server Setup
```bash
# Clone and setup local MCP server
git clone https://github.com/your-org/zmemory-mcp
cd zmemory-mcp
npm install
npm run dev

# Server runs on stdio for local development
# No HTTP endpoints needed for development
```

#### Environment Configuration
```env
# .env.local (Development)
NODE_ENV=development
MCP_SERVER_PATH=../zmemory-mcp/dist/index.js
MCP_SERVER_ARGS=--memory-path ./data --debug
```

#### Development Features
- **Hot Reload**: Tools update automatically on server changes
- **Debug Logging**: Full stdio communication logs
- **Local File Access**: Direct file system operations
- **Fast Iteration**: No network latency

### Phase 2: Testing & Validation

#### Component Testing
```typescript
// Test MCP connection
const mcpClient = getMCPClient()
await mcpClient.connect()
console.log('Available tools:', mcpClient.getAvailableTools())

// Test tool execution
const result = await mcpClient.callTool('search_memory', {
  query: 'test query',
  limit: 10
})
```

#### Integration Testing
```typescript
// Test MCP bridge initialization
const bridge = getMCPBridge()
await bridge.initialize()
console.log('Registered providers:', bridge.getRegisteredProviders())

// Test UI status indicator
// Visit /agents page and verify MCP status display
```

#### Status Validation
- ✅ MCP client connects successfully
- ✅ Tools are discovered and registered
- ✅ Status indicator shows green/connected
- ✅ Agent providers can execute MCP tools

### Phase 3: Production Preparation

#### HTTP MCP Server Deployment
```bash
# Deploy zmemory-mcp to Vercel
cd zmemory-mcp
vercel --prod

# Note the deployment URL for configuration
# e.g., https://zmemory-mcp-abc123.vercel.app
```

#### Production Environment Variables
```env
# .env.production (or Vercel environment settings)
NODE_ENV=production
VERCEL_ENV=production

# HTTP MCP Configuration
HTTP_MCP_URL=https://zmemory-mcp-abc123.vercel.app
ZMEMORY_API_URL=https://zmemory-mcp-abc123.vercel.app
ZMEMORY_API_KEY=your-secure-api-key

# Optional: Explicit override
NEXT_PUBLIC_MCP_MODE=http
```

#### Production Features
- **HTTP API**: RESTful tool execution
- **Serverless Compatible**: Works in Vercel/Netlify/AWS Lambda
- **Scalable**: Multiple concurrent connections
- **Monitored**: Health checks and status monitoring

### Phase 4: Deployment & Monitoring

#### Pre-deployment Checklist
- [ ] HTTP MCP server deployed and accessible
- [ ] Environment variables configured
- [ ] Build passes without errors
- [ ] Status endpoint returns valid response
- [ ] Tools are discoverable via HTTP

#### Deployment Process
```bash
# Build for production
npm run build

# Deploy to Vercel
vercel --prod

# Or deploy to other platforms
# npm run deploy:netlify
# npm run deploy:aws
```

#### Post-deployment Validation
1. **Status Check**: Visit `/api/agents/mcp/status`
2. **UI Verification**: Check agents page for MCP status
3. **Tool Execution**: Test agent interactions with tools
4. **Error Monitoring**: Check logs for connection issues

## Development Best Practices

### Code Organization
```
app/lib/agents/
├── mcp-client.ts          # Main client with env detection
├── mcp-http-client.ts     # Production HTTP client
├── mcp-bridge.ts          # Provider integration bridge
└── types.ts               # TypeScript definitions

app/components/agents/
└── MCPStatusIndicator.tsx # Status visualization

app/api/agents/mcp/
├── status/route.ts        # Status endpoint
└── test/route.ts          # Testing endpoint
```

### Environment Detection Pattern
```typescript
// Centralized environment detection
export function getEnvironmentConfig() {
  const isProduction = process.env.NODE_ENV === 'production'
  const isVercel = !!process.env.VERCEL_ENV
  const httpMcpUrl = process.env.HTTP_MCP_URL

  return {
    mode: (isProduction || isVercel || httpMcpUrl) ? 'http' : 'local',
    mcpUrl: httpMcpUrl || process.env.ZMEMORY_API_URL,
    apiKey: process.env.ZMEMORY_API_KEY,
    debug: process.env.NODE_ENV === 'development'
  }
}
```

### Error Handling Strategy
```typescript
// Graceful degradation pattern
export async function connectWithFallback() {
  try {
    // Try primary connection method
    await primaryConnect()
  } catch (primaryError) {
    console.warn('Primary connection failed, trying fallback:', primaryError)

    try {
      // Try fallback method
      await fallbackConnect()
    } catch (fallbackError) {
      console.error('All connection methods failed:', {
        primary: primaryError.message,
        fallback: fallbackError.message
      })

      // Enter offline mode
      enterOfflineMode()
    }
  }
}
```

### Testing Strategies

#### Unit Tests
```typescript
describe('MCP Client', () => {
  it('should connect in development mode', async () => {
    process.env.NODE_ENV = 'development'
    const client = getMCPClient()
    await expect(client.connect()).resolves.not.toThrow()
  })

  it('should use HTTP in production mode', async () => {
    process.env.NODE_ENV = 'production'
    process.env.HTTP_MCP_URL = 'https://test.com'
    const client = getMCPClient()
    expect(client).toBeInstanceOf(MCPHttpClient)
  })
})
```

#### Integration Tests
```typescript
describe('MCP Integration', () => {
  it('should register tools with providers', async () => {
    const bridge = getMCPBridge()
    await bridge.initialize()

    const providers = bridge.getRegisteredProviders()
    expect(providers.length).toBeGreaterThan(0)

    const tools = await bridge.getAvailableTools()
    expect(tools).toContain('search_memory')
  })
})
```

#### E2E Tests
```typescript
describe('MCP E2E', () => {
  it('should show MCP status on agents page', async () => {
    await page.goto('/agents')
    await expect(page.locator('[data-testid="mcp-status"]')).toBeVisible()
    await expect(page.locator('[data-testid="mcp-connected"]')).toContainText('Connected')
  })
})
```

## Debugging Guide

### Common Development Issues

#### 1. MCP Server Not Starting
```bash
# Check if MCP server process is running
ps aux | grep mcp

# Check server logs
tail -f ./logs/mcp-server.log

# Restart server
npm run restart:mcp
```

#### 2. Tools Not Discovered
```typescript
// Debug tool discovery
const client = getMCPClient()
await client.connect()
console.log('Raw tools:', client.getRawTools())
console.log('ZFlow tools:', client.createZFlowTools())
```

#### 3. Provider Registration Failures
```typescript
// Debug provider registration
const bridge = getMCPBridge()
try {
  await bridge.initialize()
} catch (error) {
  console.error('Bridge init failed:', error)
  console.log('Partial state:', {
    initialized: bridge.isInitialized(),
    providers: bridge.getRegisteredProviders().length
  })
}
```

### Production Debugging

#### 1. HTTP Connection Issues
```typescript
// Test HTTP endpoint directly
fetch('https://your-mcp-server.vercel.app/health')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error)
```

#### 2. Environment Variable Issues
```typescript
// Debug environment detection
console.log('Environment config:', {
  NODE_ENV: process.env.NODE_ENV,
  VERCEL_ENV: process.env.VERCEL_ENV,
  HTTP_MCP_URL: process.env.HTTP_MCP_URL,
  hasApiKey: !!process.env.ZMEMORY_API_KEY
})
```

#### 3. Status Endpoint Debugging
```bash
# Test status endpoint
curl https://your-app.vercel.app/api/agents/mcp/status

# Expected response structure
{
  "success": true,
  "timestamp": "2024-01-01T00:00:00.000Z",
  "mcp": {
    "connected": true,
    "bridgeInitialized": true,
    "availableTools": ["search_memory", "store_memory"],
    "registeredProviders": ["openai", "anthropic"]
  }
}
```

## Monitoring & Maintenance

### Health Monitoring
```typescript
// Automated health checks
setInterval(async () => {
  const status = await fetch('/api/agents/mcp/status').then(r => r.json())

  if (!status.mcp.connected) {
    console.error('MCP connection lost, attempting reconnection...')
    await reconnectMCP()
  }
}, 60000) // Check every minute
```

### Performance Monitoring
```typescript
// Tool execution timing
async function executeToolWithTiming(name: string, args: any) {
  const start = Date.now()

  try {
    const result = await mcpClient.callTool(name, args)
    const duration = Date.now() - start

    console.log(`Tool ${name} executed in ${duration}ms`)
    return result
  } catch (error) {
    const duration = Date.now() - start
    console.error(`Tool ${name} failed after ${duration}ms:`, error)
    throw error
  }
}
```

### Log Analysis
```bash
# Vercel function logs
vercel logs --follow

# Filter MCP-related logs
vercel logs | grep -i mcp

# Monitor error rates
vercel logs | grep -i error | grep -i mcp
```

## Migration Strategies

### Upgrading MCP Protocol
1. **Backward Compatibility**: Maintain old protocol support
2. **Feature Flags**: Enable new features gradually
3. **Versioned APIs**: Support multiple API versions

### Database Migrations
```typescript
// Tool definition updates
async function migrateMCPTools() {
  const oldTools = await getStoredTools()
  const newTools = await mcpClient.getAvailableTools()

  for (const tool of newTools) {
    if (!oldTools.find(t => t.name === tool.name)) {
      await storeNewTool(tool)
    }
  }
}
```

### Configuration Updates
```typescript
// Environment variable migration
const legacyConfig = {
  MCP_SERVER_URL: process.env.MCP_SERVER_URL,
  MCP_API_KEY: process.env.MCP_API_KEY
}

const modernConfig = {
  HTTP_MCP_URL: process.env.HTTP_MCP_URL || legacyConfig.MCP_SERVER_URL,
  ZMEMORY_API_KEY: process.env.ZMEMORY_API_KEY || legacyConfig.MCP_API_KEY
}
```

This comprehensive workflow ensures smooth development, testing, and deployment of MCP integrations while maintaining high code quality and system reliability.