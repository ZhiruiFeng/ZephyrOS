import { getMCPClient, initializeMCPConnection } from './mcp-client'
import { AgentProvider, ZFlowTool } from './types'
import { OpenAIProvider } from './openai-client'
import { AnthropicProvider } from './anthropic-client'

export class MCPBridge {
  private initialized = false
  private registeredProviders: Set<AgentProvider> = new Set()

  async initialize(providers?: AgentProvider[]): Promise<void> {
    if (this.initialized) return

    const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build'

    try {
      console.log('🚀 Initializing MCP bridge...')

      // Connect to MCP server
      const mcpClient = await initializeMCPConnection()

      // Get available tools from MCP
      const mcpTools = mcpClient.createZFlowTools()
      console.log(`📋 Created ${mcpTools.length} ZFlow tools from MCP`)

      // Register tools with provided providers or create new ones
      await this.registerToolsWithProviders(mcpTools, providers)

      this.initialized = true
      console.log('✅ MCP bridge initialized successfully')
    } catch (error) {
      if (isBuildTime) {
        console.warn('⚠️ MCP bridge initialization skipped during build time')
        this.initialized = true
        return
      }
      console.error('❌ Failed to initialize MCP bridge:', error)
      throw error
    }
  }

  private async registerToolsWithProviders(tools: ZFlowTool[], providers?: AgentProvider[]): Promise<void> {
    // If providers are passed in, register tools with them directly
    if (providers && providers.length > 0) {
      providers.forEach(provider => {
        try {
          tools.forEach(tool => provider.registerTool(tool))
          this.registeredProviders.add(provider)
          console.log(`✅ Registered ${tools.length} tools with ${provider.name} provider`)
        } catch (error) {
          console.warn(`Failed to register tools with ${provider.name} provider:`, error)
        }
      })
      return
    }

    // Legacy: create new provider instances (not recommended - causes instance mismatch)
    console.warn('⚠️  Creating new provider instances - this may cause tool registration issues')

    // Register with OpenAI provider if available
    try {
      const openaiProvider = new OpenAIProvider()
      tools.forEach(tool => openaiProvider.registerTool(tool))
      this.registeredProviders.add(openaiProvider)
      console.log(`✅ Registered ${tools.length} tools with OpenAI provider`)
    } catch (error) {
      console.warn('Failed to register tools with OpenAI provider:', error)
    }

    // Register with Anthropic provider if available
    try {
      const anthropicProvider = new AnthropicProvider()
      tools.forEach(tool => anthropicProvider.registerTool(tool))
      this.registeredProviders.add(anthropicProvider)
      console.log(`✅ Registered ${tools.length} tools with Anthropic provider`)
    } catch (error) {
      console.warn('Failed to register tools with Anthropic provider:', error)
    }
  }

  async getAvailableTools(): Promise<string[]> {
    const mcpClient = getMCPClient()
    if (!mcpClient.isConnected()) {
      await mcpClient.connect()
    }

    return mcpClient.getAvailableTools().map(tool => tool.name)
  }

  async refreshTools(): Promise<void> {
    console.log('🔄 Refreshing MCP tools...')

    // Reconnect to MCP server to get latest tools
    const mcpClient = getMCPClient()
    await mcpClient.disconnect()
    await mcpClient.connect()

    // Re-register tools with providers
    const mcpTools = mcpClient.createZFlowTools()
    await this.registerToolsWithProviders(mcpTools)

    console.log('✅ MCP tools refreshed')
  }

  isInitialized(): boolean {
    return this.initialized
  }

  getRegisteredProviders(): AgentProvider[] {
    return Array.from(this.registeredProviders)
  }
}

// Singleton MCP bridge instance
let mcpBridgeInstance: MCPBridge | null = null

export function getMCPBridge(): MCPBridge {
  if (!mcpBridgeInstance) {
    mcpBridgeInstance = new MCPBridge()
  }
  return mcpBridgeInstance
}

// Initialize MCP bridge on server startup
export async function initializeMCPBridge(providers?: AgentProvider[]): Promise<MCPBridge> {
  const bridge = getMCPBridge()
  if (!bridge.isInitialized()) {
    await bridge.initialize(providers)
  }
  return bridge
}

// Helper function to ensure MCP bridge is ready before handling requests
export async function ensureMCPReady(): Promise<void> {
  const bridge = getMCPBridge()
  if (!bridge.isInitialized()) {
    await bridge.initialize()
  }
}