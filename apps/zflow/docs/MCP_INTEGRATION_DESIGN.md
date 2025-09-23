# MCP Integration Design & Architecture Documentation

## Overview

This document tracks the design, architecture, and mechanisms of the Model Context Protocol (MCP) integration in ZFlow. The MCP integration enables ZFlow to connect with external tools and services through a standardized protocol, supporting both local development and production deployment scenarios.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        ZFlow Application                        │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────────────────────────┐  │
│  │ Agent Providers │    │     MCP Status Indicator           │  │
│  │ - OpenAI        │    │     (React Component)              │  │
│  │ - Anthropic     │    │                                    │  │
│  └─────────────────┘    └─────────────────────────────────────┘  │
│           │                              │                       │
│           └──────────────┬───────────────┘                       │
│                          │                                       │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │                   MCP Bridge                                │  │
│  │   - Tool Registration                                       │  │
│  │   - Provider Management                                     │  │
│  │   - Initialization Logic                                    │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                          │                                       │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │                   MCP Client                                │  │
│  │   - Environment Detection                                   │  │
│  │   - Local/HTTP Mode Switching                              │  │
│  │   - Connection Management                                   │  │
│  └─────────────────────────────────────────────────────────────┘  │
│           │                              │                       │
│           ▼                              ▼                       │
│  ┌─────────────────┐         ┌─────────────────────────────────┐  │
│  │ Local MCP       │         │     HTTP MCP Client             │  │
│  │ (stdio)         │         │     (Production)                │  │
│  │ - Development   │         │ - Vercel/Serverless            │  │
│  │ - Local Process │         │ - HTTP API Calls               │  │
│  └─────────────────┘         └─────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
           │                              │
           ▼                              ▼
┌─────────────────┐         ┌─────────────────────────────────┐
│ Local MCP       │         │   Remote MCP Service            │
│ Server          │         │   (e.g., zmemory-mcp)           │
│ (Node.js)       │         │   - HTTP API                    │
└─────────────────┘         │   - Deployed on Vercel          │
                            └─────────────────────────────────┘
```

## Core Components

### 1. MCP Client (`mcp-client.ts`)

**Purpose**: Central connection manager that handles both local and HTTP-based MCP connections

**Key Design Patterns**:
- **Factory Pattern**: `getMCPClient()` returns appropriate client based on environment
- **Singleton Pattern**: Single client instance per environment
- **Strategy Pattern**: Different connection strategies for local vs. production
- **Environment Detection**: Automatic switching based on runtime environment

**Core Mechanisms**:
```typescript
// Environment Detection Logic
const isProduction = process.env.NODE_ENV === 'production'
const isVercel = !!process.env.VERCEL_ENV
const httpMcpUrl = process.env.HTTP_MCP_URL

// Auto-switching between local and HTTP modes
if (isProduction || isVercel || httpMcpUrl) {
  // Use HTTP client for production/serverless
  return new MCPHttpClient(config)
} else {
  // Use local stdio client for development
  return new LocalMCPClient(config)
}
```

**Connection Management**:
- Lazy initialization
- Connection pooling
- Automatic reconnection
- Error handling and fallbacks

### 2. HTTP MCP Client (`mcp-http-client.ts`)

**Purpose**: Production-ready HTTP client for serverless environments

**Key Features**:
- RESTful API communication
- Connection health checks
- Tool discovery and caching
- Error handling and retry logic
- Timeout management

**Design Patterns**:
- **Adapter Pattern**: Adapts HTTP responses to MCP protocol format
- **Command Pattern**: Tool execution through HTTP requests
- **Circuit Breaker**: Prevents cascading failures

**Core Mechanisms**:
```typescript
export class MCPHttpClient {
  private config: MCPHttpClientConfig
  private availableTools: MCPTool[] = []
  private connected = false

  async connect(): Promise<void> {
    // Health check endpoint
    await this.makeRequest('/health', 'GET')
    // Load available tools
    await this.loadTools()
    this.connected = true
  }

  async callTool(name: string, args: any): Promise<any> {
    return this.makeRequest('/tools/call', 'POST', {
      tool: name,
      arguments: args
    })
  }
}
```

### 3. MCP Bridge (`mcp-bridge.ts`)

**Purpose**: Integration layer between MCP clients and AI agent providers

**Key Responsibilities**:
- Tool registration across providers
- Provider lifecycle management
- Tool synchronization
- Error handling and logging

**Design Patterns**:
- **Bridge Pattern**: Decouples MCP tools from specific AI providers
- **Observer Pattern**: Notifies providers of tool changes
- **Registry Pattern**: Manages provider registration

**Core Mechanisms**:
```typescript
export class MCPBridge {
  private registeredProviders: Set<AgentProvider> = new Set()

  async initialize(): Promise<void> {
    // Connect to MCP
    const mcpClient = await initializeMCPConnection()

    // Transform MCP tools to ZFlow format
    const mcpTools = mcpClient.createZFlowTools()

    // Register with all providers
    await this.registerToolsWithProviders(mcpTools)
  }

  private async registerToolsWithProviders(tools: ZFlowTool[]): Promise<void> {
    // Register with OpenAI
    const openaiProvider = new OpenAIProvider()
    tools.forEach(tool => openaiProvider.registerTool(tool))

    // Register with Anthropic
    const anthropicProvider = new AnthropicProvider()
    tools.forEach(tool => anthropicProvider.registerTool(tool))
  }
}
```

### 4. MCP Status Indicator (`MCPStatusIndicator.tsx`)

**Purpose**: Real-time visualization of MCP service status and configuration

**Key Features**:
- Mobile-responsive design
- Real-time status updates
- Service health monitoring
- Tool categorization
- Provider information

**Design Patterns**:
- **Observer Pattern**: Polls status endpoint for updates
- **State Pattern**: Different UI states based on connection status
- **Responsive Design**: Mobile-first approach with adaptive layouts

**Core Mechanisms**:
```typescript
const [mcpStatus, setMcpStatus] = useState<MCPStatus | null>(null)
const [isMobile, setIsMobile] = useState(false)

// Polling mechanism
useEffect(() => {
  const fetchStatus = async () => {
    const response = await fetch('/api/agents/mcp/status')
    const data = await response.json()
    setMcpStatus(data)
  }

  fetchStatus()
  const interval = setInterval(fetchStatus, 30000) // 30s polling
  return () => clearInterval(interval)
}, [])

// Mobile detection
useEffect(() => {
  const checkMobile = () => setIsMobile(window.innerWidth < 640)
  checkMobile()
  window.addEventListener('resize', checkMobile)
  return () => window.removeEventListener('resize', checkMobile)
}, [])
```

### 5. API Endpoints

#### `/api/agents/mcp/status` (`status/route.ts`)

**Purpose**: Provides real-time MCP system status

**Response Format**:
```typescript
{
  success: boolean,
  timestamp: string,
  system: SystemStatus,
  mcp: {
    connected: boolean,
    bridgeInitialized: boolean,
    availableTools: string[],
    registeredProviders: string[],
    error?: string
  }
}
```

**Core Mechanisms**:
- System status aggregation
- MCP client health checks
- Provider registration status
- Error reporting

## Environment-Specific Behaviors

### Development Environment
- **Connection Type**: Local stdio process
- **MCP Server**: Local Node.js process
- **Tools**: File system access, local APIs
- **Benefits**: Full debugging capabilities, fast iteration

### Production Environment (Vercel)
- **Connection Type**: HTTP API calls
- **MCP Server**: Remote service (e.g., zmemory-mcp on Vercel)
- **Tools**: Cloud-based APIs, remote services
- **Benefits**: Scalable, serverless-compatible

## Configuration Management

### Environment Variables

**Development**:
```env
# Local MCP configuration
MCP_SERVER_PATH=./path/to/mcp-server
MCP_SERVER_ARGS=--memory-path ./data
```

**Production**:
```env
# HTTP MCP configuration
HTTP_MCP_URL=https://your-zmemory-mcp.vercel.app
ZMEMORY_API_URL=https://your-zmemory-mcp.vercel.app
ZMEMORY_API_KEY=your-api-key

# Vercel detection
VERCEL_ENV=production
NODE_ENV=production
```

### Auto-Detection Logic
```typescript
const isProduction = process.env.NODE_ENV === 'production'
const isVercel = !!process.env.VERCEL_ENV
const httpMcpUrl = process.env.HTTP_MCP_URL

// Priority order:
// 1. Explicit HTTP_MCP_URL
// 2. Vercel environment detection
// 3. Production environment
// 4. Fallback to local stdio
```

## Tool Integration Flow

### 1. Discovery Phase
```
MCP Client → Connect → Discover Tools → Transform to ZFlow Format
```

### 2. Registration Phase
```
MCP Bridge → Register with OpenAI Provider
           → Register with Anthropic Provider
           → Store in Provider Registry
```

### 3. Execution Phase
```
Agent Request → Provider → MCP Bridge → MCP Client → Tool Execution → Response
```

### 4. Monitoring Phase
```
Status Indicator → Poll /api/agents/mcp/status → Update UI → Show Health
```

## Error Handling Strategy

### Connection Errors
- **Local**: Process spawn failures, stdio communication errors
- **HTTP**: Network timeouts, API endpoint failures
- **Fallback**: Graceful degradation, offline mode

### Tool Execution Errors
- **Validation**: Parameter validation before execution
- **Timeout**: Configurable execution timeouts
- **Retry**: Exponential backoff for transient failures

### UI Error Handling
- **Connection Status**: Red/yellow/green indicators
- **Error Messages**: User-friendly error descriptions
- **Recovery Actions**: Manual refresh, reconnection options

## Performance Considerations

### Local Development
- **Pros**: Fast tool execution, full debugging
- **Cons**: Local resource usage, process management

### Production HTTP
- **Pros**: Scalable, serverless-compatible
- **Cons**: Network latency, API rate limits

### Optimization Strategies
- **Tool Caching**: Cache tool definitions to reduce API calls
- **Connection Pooling**: Reuse HTTP connections
- **Lazy Loading**: Initialize tools only when needed
- **Health Checks**: Proactive connection monitoring

## Security Considerations

### API Key Management
- Environment variable storage
- No hardcoded credentials
- Production/development key separation

### Tool Execution Security
- Input validation and sanitization
- Execution timeouts
- Resource usage limits

### Network Security
- HTTPS-only communication
- API endpoint authentication
- Request rate limiting

## Monitoring & Observability

### Logging Strategy
```typescript
// Connection events
console.log('🚀 Initializing MCP bridge...')
console.log('✅ MCP bridge initialized successfully')
console.error('❌ Failed to initialize MCP bridge:', error)

// Tool registration
console.log(`📋 Created ${mcpTools.length} ZFlow tools from MCP`)
console.log(`✅ Registered ${tools.length} tools with OpenAI provider`)
```

### Status Monitoring
- Real-time connection status
- Tool availability tracking
- Provider registration status
- Error rate monitoring

### Health Checks
- Connection health validation
- Tool execution verification
- Provider responsiveness testing

## Future Enhancements

### Planned Features
1. **Dynamic Tool Loading**: Hot-reload tools without restart
2. **Tool Versioning**: Support multiple tool versions
3. **Provider Plugins**: Extensible provider architecture
4. **Advanced Caching**: Persistent tool and result caching
5. **Metrics Dashboard**: Detailed usage and performance metrics

### Scalability Improvements
1. **Connection Pooling**: Multiple concurrent connections
2. **Load Balancing**: Distribute tools across multiple MCP servers
3. **Circuit Breakers**: Advanced failure detection and recovery
4. **Caching Layers**: Multi-level caching strategy

This architecture provides a robust, scalable foundation for MCP integration that works seamlessly across development and production environments while maintaining high performance and reliability.