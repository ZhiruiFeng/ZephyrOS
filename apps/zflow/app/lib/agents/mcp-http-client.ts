import { MCPTool, MCPToolResult } from './mcp-client'
import { ChatContext, ZFlowTool } from './types'

export interface MCPHttpClientConfig {
  baseUrl: string
  apiKey?: string
  timeout?: number
}

export class MCPHttpClient {
  private config: MCPHttpClientConfig
  private availableTools: MCPTool[] = []
  private connected = false

  constructor(config: MCPHttpClientConfig) {
    this.config = {
      timeout: 10000,
      ...config
    }
  }

  async connect(): Promise<void> {
    if (this.connected) return

    const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build'

    try {
      console.log(`🔌 Connecting to HTTP MCP server: ${this.config.baseUrl}`)

      // Test connection with health check
      const healthResponse = await this.makeRequest('/health', 'GET')
      if (!healthResponse.ok) {
        throw new Error(`MCP server health check failed: ${healthResponse.status}`)
      }

      // Load available tools
      await this.loadTools()
      this.connected = true

      console.log(`✅ Connected to HTTP MCP server with ${this.availableTools.length} tools`)
    } catch (error) {
      if (isBuildTime) {
        console.warn('⚠️ MCP server unavailable during build time - this is expected')
        // During build time, we'll just mark as connected with no tools
        this.connected = true
        this.availableTools = []
        return
      }
      console.error('❌ Failed to connect to HTTP MCP server:', error)
      throw new Error(`Failed to connect to HTTP MCP server: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async disconnect(): Promise<void> {
    this.connected = false
    this.availableTools = []
    console.log('🔌 Disconnected from HTTP MCP server')
  }

  private async makeRequest(endpoint: string, method: 'GET' | 'POST', body?: any): Promise<Response> {
    const url = `${this.config.baseUrl.replace(/\/$/, '')}${endpoint}`
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'ZFlow-MCP-Client/1.0'
    }

    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`
    }

    const requestOptions: RequestInit = {
      method,
      headers,
      signal: AbortSignal.timeout(this.config.timeout!)
    }

    if (body && method === 'POST') {
      requestOptions.body = JSON.stringify(body)
    }

    return fetch(url, requestOptions)
  }

  private async loadTools(): Promise<void> {
    try {
      const response = await this.makeRequest('/mcp/tools', 'GET')

      if (!response.ok) {
        throw new Error(`Failed to load tools: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()

      if (data.tools && Array.isArray(data.tools)) {
        this.availableTools = data.tools.map((tool: any) => ({
          name: tool.name,
          description: tool.description || '',
          inputSchema: tool.inputSchema || {}
        }))
      } else {
        // Fallback: assume we have standard zmemory tools
        this.availableTools = this.getDefaultTools()
      }

      console.log(`📋 Loaded ${this.availableTools.length} HTTP MCP tools:`,
        this.availableTools.map(t => t.name).join(', '))
    } catch (error) {
      console.warn('Failed to load HTTP MCP tools, using defaults:', error)
      this.availableTools = this.getDefaultTools()
    }
  }

  private getDefaultTools(): MCPTool[] {
    // Default tools based on zmemory-mcp functionality
    return [
      {
        name: 'authenticate',
        description: 'Authenticate with the service',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'search_memories',
        description: 'Search through memories',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string' },
            limit: { type: 'number' }
          }
        }
      },
      {
        name: 'add_memory',
        description: 'Add a new memory',
        inputSchema: {
          type: 'object',
          properties: {
            content: { type: 'string' },
            category: { type: 'string' }
          }
        }
      },
      {
        name: 'search_tasks',
        description: 'Search through tasks',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string' },
            status: { type: 'string' }
          }
        }
      },
      {
        name: 'create_task',
        description: 'Create a new task',
        inputSchema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            priority: { type: 'string' }
          }
        }
      }
    ]
  }

  getAvailableTools(): MCPTool[] {
    return [...this.availableTools]
  }

  async callTool(name: string, arguments_: any, userAuthToken?: string): Promise<MCPToolResult> {
    if (!this.connected) {
      throw new Error('HTTP MCP client not connected')
    }

    try {
      console.log(`🔧 Calling HTTP MCP tool: ${name}`, arguments_)

      const requestBody = {
        tool: name,
        arguments: arguments_,
        authToken: userAuthToken
      }

      const response = await this.makeRequest('/mcp/call', 'POST', requestBody)

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP MCP tool call failed: ${response.status} ${errorText}`)
      }

      const result = await response.json()
      console.log(`✅ HTTP MCP tool ${name} completed:`, result)

      // Transform response to match MCP format
      return {
        content: result.content || [{
          type: 'text',
          text: result.result || result.message || 'Tool executed successfully'
        }],
        isError: result.isError || false
      }
    } catch (error) {
      console.error(`❌ HTTP MCP tool ${name} failed:`, error)

      return {
        content: [{
          type: 'text',
          text: `Error calling ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      }
    }
  }

  /**
   * Convert MCP tools to ZFlow tool format for agent registration
   */
  createZFlowTools(): ZFlowTool[] {
    return this.availableTools.map(mcpTool => ({
      name: mcpTool.name,
      description: mcpTool.description,
      parameters: mcpTool.inputSchema,
      handler: async (params: any, context: ChatContext) => {
        // Extract user auth token from context
        const userAuthToken = (context.metadata as any)?.authToken

        const result = await this.callTool(mcpTool.name, params, userAuthToken)

        if (result.isError) {
          throw new Error(result.content[0]?.text || 'HTTP MCP tool execution failed')
        }

        // Return the text content from MCP response
        return result.content
          .filter(item => item.type === 'text')
          .map(item => item.text)
          .join('\n') || 'Tool executed successfully'
      }
    }))
  }

  isConnected(): boolean {
    return this.connected
  }
}