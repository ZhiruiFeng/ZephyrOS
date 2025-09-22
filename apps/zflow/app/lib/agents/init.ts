import { initializeMCPBridge } from './mcp-bridge'
import { agentRegistry } from './registry'
import { OpenAIProvider } from './openai-client'
import { AnthropicProvider } from './anthropic-client'

let initializationPromise: Promise<void> | null = null
let openAIProvider: OpenAIProvider | null = null
let anthropicProvider: AnthropicProvider | null = null

export async function initializeAgentSystem(): Promise<void> {
  // Ensure we only initialize once, even with concurrent calls
  if (initializationPromise) {
    return initializationPromise
  }

  initializationPromise = performInitialization()
  return initializationPromise
}

async function performInitialization(): Promise<void> {
  try {
    console.log('🚀 Initializing ZFlow Agent System...')

    // Initialize agent providers (with build-time safety)
    if (process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV === undefined) {
      console.warn('Providers not initialized during build time')
      return
    }

    if (!openAIProvider) {
      openAIProvider = new OpenAIProvider()
      agentRegistry.registerProvider(openAIProvider)
    }

    if (!anthropicProvider) {
      anthropicProvider = new AnthropicProvider()
      agentRegistry.registerProvider(anthropicProvider)
    }

    // Initialize MCP bridge and register tools with providers
    try {
      console.log('🔧 Setting up MCP integration...')
      const mcpBridge = await initializeMCPBridge()

      // Get the registered providers from the bridge
      const providersWithTools = mcpBridge.getRegisteredProviders()
      console.log(`✅ MCP tools registered with ${providersWithTools.length} providers`)

      // Update registry with tool-enabled providers
      providersWithTools.forEach(provider => {
        agentRegistry.registerProvider(provider)
      })

    } catch (mcpError) {
      console.warn('⚠️ MCP initialization failed, continuing without MCP tools:', mcpError)
      // Continue without MCP - basic agent functionality will still work
    }

    console.log('✅ ZFlow Agent System initialized successfully')

  } catch (error) {
    console.error('❌ Failed to initialize ZFlow Agent System:', error)
    throw error
  }
}

// Legacy functions for backward compatibility
function getOpenAIProvider(): OpenAIProvider {
  if (!openAIProvider) {
    openAIProvider = new OpenAIProvider()
    agentRegistry.registerProvider(openAIProvider)
  }
  return openAIProvider!
}

function getAnthropicProvider(): AnthropicProvider {
  if (!anthropicProvider) {
    anthropicProvider = new AnthropicProvider()
    agentRegistry.registerProvider(anthropicProvider)
  }
  return anthropicProvider!
}

// Helper function to ensure agent system is ready
export async function ensureAgentSystemReady(): Promise<void> {
  await initializeAgentSystem()
}

// Debug function to check system status
export function getSystemStatus(): {
  initialized: boolean
  mcpAvailable: boolean
  availableAgents: string[]
  availableProviders: string[]
} {
  try {
    const agents = agentRegistry.getAvailableAgents()
    const providers = ['openai', 'anthropic'] // Known providers

    return {
      initialized: initializationPromise !== null,
      mcpAvailable: false, // Will be updated by MCP bridge
      availableAgents: agents.map(a => a.id),
      availableProviders: providers
    }
  } catch (error) {
    return {
      initialized: false,
      mcpAvailable: false,
      availableAgents: [],
      availableProviders: []
    }
  }
}

export { getOpenAIProvider as openAIProvider, getAnthropicProvider as anthropicProvider }