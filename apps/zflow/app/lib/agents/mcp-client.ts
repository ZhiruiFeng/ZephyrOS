import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { ChatContext, ZFlowTool } from './types'

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

  async callTool(name: string, arguments_: any): Promise<MCPToolResult> {
    if (!this.client) {
      throw new Error('MCP client not connected')
    }

    try {
      console.log(`🔧 Calling MCP tool: ${name}`, arguments_)

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

  /**
   * Convert MCP tools to ZFlow tool format for agent registration
   */
  createZFlowTools(): ZFlowTool[] {
    return this.availableTools.map(mcpTool => ({
      name: mcpTool.name,
      description: mcpTool.description,
      parameters: mcpTool.inputSchema,
      handler: async (params: any, context: ChatContext) => {
        const result = await this.callTool(mcpTool.name, params)

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
let mcpClientInstance: MCPClient | null = null

export function getMCPClient(): MCPClient {
  if (!mcpClientInstance) {
    // Try to use zmemory-mcp from the monorepo
    const isDevelopment = process.env.NODE_ENV === 'development'

    // In development, try to use tsx to run the TypeScript source directly
    if (isDevelopment) {
      const serverPath = '/Users/zhiruifeng/Workspace/dev/ZephyrOS/apps/zmemory-mcp/src/index.ts'
      mcpClientInstance = new MCPClient('tsx', [serverPath])
    } else {
      // In production, try to use the built version
      const serverPath = '/Users/zhiruifeng/Workspace/dev/ZephyrOS/apps/zmemory-mcp/dist/index.js'
      mcpClientInstance = new MCPClient('node', [serverPath])
    }
  }
  return mcpClientInstance
}

export async function initializeMCPConnection(): Promise<MCPClient> {
  const client = getMCPClient()
  if (!client.isConnected()) {
    await client.connect()
  }
  return client
}