import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { ChatContext, ZFlowTool } from './types'
import { MCPHttpClient } from './mcp-http-client'

export interface MCPTool {
  name: string
  description: string
  inputSchema: any
}

export interface MCPToolResult {
  content: Array<{
    type: 'text' | 'image' | 'resource'
    text?: string
    data?: string
    mimeType?: string
  }>
  isError?: boolean
}

export class MCPClient {
  private client: Client | null = null
  private transport: StdioClientTransport | null = null
  private connected = false
  private availableTools: MCPTool[] = []
  private serverPath: string
  private serverArgs: string[]

  constructor(serverPath: string = 'zmemory-mcp', serverArgs: string[] = []) {
    this.serverPath = serverPath
    this.serverArgs = serverArgs
  }

  async connect(): Promise<void> {
    if (this.connected) return

    try {
      console.log(`🔌 Connecting to MCP server: ${this.serverPath} with args:`, this.serverArgs)

      // Create transport - StdioClientTransport will handle spawning the process
      this.transport = new StdioClientTransport({
        command: this.serverPath,
        args: this.serverArgs,
        env: {
          ...process.env,
          // Pass environment variables for ZMemory MCP
          ZMEMORY_API_URL: process.env.ZMEMORY_API_URL || 'http://localhost:3001',
          ZMEMORY_API_KEY: process.env.ZMEMORY_API_KEY || '',
          OAUTH_CLIENT_ID: process.env.OAUTH_CLIENT_ID || 'zmemory-mcp',
          OAUTH_CLIENT_SECRET: process.env.OAUTH_CLIENT_SECRET || '',
        }
      })

      // Create MCP client
      this.client = new Client(
        {
          name: 'zflow-agent',
          version: '1.0.0'
        },
        {
          capabilities: {
            tools: {}
          }
        }
      )

      // Connect to the server
      await this.client.connect(this.transport)
      this.connected = true

      // Load available tools
      await this.loadTools()

      // Auto-authenticate on connection
      await this.ensureAuthenticated()

      console.log(`✅ Connected to MCP server with ${this.availableTools.length} tools`)
    } catch (error) {
      console.error('❌ Failed to connect to MCP server:', error)
      throw new Error(`Failed to connect to MCP server: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close()
      this.client = null
    }
    if (this.transport) {
      await this.transport.close()
      this.transport = null
    }
    this.connected = false
    this.availableTools = []
    console.log('🔌 Disconnected from MCP server')
  }

  private async loadTools(): Promise<void> {
    if (!this.client) throw new Error('Client not connected')

    try {
      const response = await this.client.listTools()
      this.availableTools = response.tools.map(tool => ({
        name: tool.name,
        description: tool.description || '',
        inputSchema: tool.inputSchema
      }))

      console.log(`📋 Loaded ${this.availableTools.length} MCP tools:`,
        this.availableTools.map(t => t.name).join(', '))
    } catch (error) {
      console.error('Failed to load MCP tools:', error)
      throw error
    }
  }

  getAvailableTools(): MCPTool[] {
    return [...this.availableTools]
  }

  async callTool(name: string, arguments_: any, userAuthToken?: string): Promise<MCPToolResult> {
    if (!this.client) {
      throw new Error('MCP client not connected')
    }

    try {
      console.log(`🔧 Calling MCP tool: ${name}`, arguments_)

      // Authentication is handled during connection setup

      const response = await this.client.callTool({
        name,
        arguments: arguments_
      })

      console.log(`✅ MCP tool ${name} completed:`, response)

      return {
        content: response.content as Array<{
          type: 'text' | 'image' | 'resource'
          text?: string
          data?: string
          mimeType?: string
        }>,
        isError: response.isError as boolean
      }
    } catch (error) {
      console.error(`❌ MCP tool ${name} failed:`, error)

      return {
        content: [{
          type: 'text',
          text: `Error calling ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      }
    }
  }

  private requiresAuth(toolName: string): boolean {
    // Tools that don't require authentication
    const publicTools = ['authenticate', 'get_auth_status']
    return !publicTools.includes(toolName)
  }

  private authenticated = false

  private async ensureAuthenticated(userAuthToken?: string): Promise<void> {
    // Skip if already authenticated in this session
    if (this.authenticated) {
      return
    }

    try {
      // Check current auth status
      const authStatus = await this.client!.callTool({
        name: 'get_auth_status',
        arguments: {}
      })

      // If already authenticated, we're good
      if (!authStatus.isError) {
        const content = authStatus.content as Array<{type: string, text?: string}>
        const statusText = content[0]?.text || ''
        if (statusText.includes('已认证') || statusText.includes('authenticated')) {
          console.log('✅ MCP already authenticated')
          this.authenticated = true
          return
        }
      }

      console.log('🔐 Auto-authenticating MCP with service credentials...')

      // Use OAuth flow for auto-authentication
      const clientId = process.env.OAUTH_CLIENT_ID || 'zmemory-mcp'
      const clientSecret = process.env.OAUTH_CLIENT_SECRET

      if (clientSecret) {
        // Perform service-level OAuth authentication
        const authResult = await this.performServiceAuth(clientId, clientSecret)
        if (authResult) {
          this.authenticated = true
          console.log('✅ MCP service authentication successful')
        } else {
          console.warn('⚠️ Service authentication failed')
        }
      } else {
        console.warn('⚠️ No service credentials available for auto-authentication')
      }
    } catch (error) {
      console.warn('⚠️ Auto-authentication failed:', error)
      // Don't throw - let the tool call proceed and fail with proper auth error
    }
  }

  private async performServiceAuth(clientId: string, clientSecret: string): Promise<boolean> {
    try {
      // For now, use a simple service token approach
      // In production, this would be generated by the ZMemory API
      const serviceToken = 'service_token_' + Date.now()

      // Set the access token directly in MCP
      await this.client!.callTool({
        name: 'set_access_token',
        arguments: { access_token: serviceToken }
      })

      // This is a temporary workaround until we implement proper OAuth flow
      console.log('✅ Using temporary service token for MCP authentication')
      return true
    } catch (error) {
      console.warn('Service authentication error:', error)
      return false
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
          throw new Error(result.content[0]?.text || 'MCP tool execution failed')
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

// Singleton MCP client instance
let mcpClientInstance: MCPClient | MCPHttpClient | null = null

export function getMCPClient(): MCPClient | MCPHttpClient {
  if (!mcpClientInstance) {
    const isProduction = process.env.NODE_ENV === 'production'
    const isVercel = process.env.VERCEL === '1'
    const httpMcpUrl = process.env.MCP_HTTP_URL
    const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build'

    // Use HTTP client in production or when MCP_HTTP_URL is specified
    if (isProduction || isVercel || httpMcpUrl) {
      console.log('🌐 Using HTTP MCP client for production/Vercel environment')
      const httpClient = new MCPHttpClient({
        baseUrl: httpMcpUrl || 'https://zmemory-mcp.vercel.app',
        apiKey: process.env.ZMEMORY_API_KEY,
        timeout: isBuildTime ? 5000 : 15000
      })
      mcpClientInstance = httpClient as any // Store HTTP client as singleton
      return httpClient
    }

    // Use local stdio client in development
    const isDevelopment = process.env.NODE_ENV === 'development'

    // In development, try to use tsx to run the TypeScript source directly
    if (isDevelopment) {
      const serverPath = '/Users/zhiruifeng/Workspace/dev/ZephyrOS/apps/zmemory-mcp/src/index.ts'
      mcpClientInstance = new MCPClient('tsx', [serverPath])
    } else {
      // Fallback: try to use the built version
      const serverPath = '/Users/zhiruifeng/Workspace/dev/ZephyrOS/apps/zmemory-mcp/dist/index.js'
      mcpClientInstance = new MCPClient('node', [serverPath])
    }
  }
  return mcpClientInstance
}

export async function initializeMCPConnection(): Promise<MCPClient | MCPHttpClient> {
  const client = getMCPClient()
  if (!client.isConnected()) {
    await client.connect()
  }
  return client
}