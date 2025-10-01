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
    // Initialize agent providers (with build-time safety)
    if (process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV === undefined) {
      return
    }

    // Create provider instances
    if (!openAIProvider) {
      openAIProvider = new OpenAIProvider()
    }

    if (!anthropicProvider) {
      anthropicProvider = new AnthropicProvider()
    }

    // Initialize MCP bridge and register tools with EXISTING provider instances
    try {
      await initializeMCPBridge([openAIProvider, anthropicProvider])
    } catch (mcpError) {
      console.error('[AGENT-INIT] MCP initialization failed:', mcpError instanceof Error ? mcpError.message : mcpError)
      // Continue without MCP - basic agent functionality will still work
    }

    // Register providers with registry (now with MCP tools loaded)
    agentRegistry.registerProvider(openAIProvider)
    agentRegistry.registerProvider(anthropicProvider)

  } catch (error) {
    console.error('❌ Failed to initialize ZFlow Agent System:', error)
    throw error
  }
}

// Provider getter functions that ensure initialization
async function getOpenAIProvider(): Promise<OpenAIProvider> {
  // Ensure system is initialized before returning provider
  await ensureAgentSystemReady()

  if (!openAIProvider) {
    console.error('❌ CRITICAL: OpenAI provider is null after initialization!')
    throw new Error('OpenAI provider failed to initialize')
  }

  console.log(`🔍 Returning OpenAI provider with ${openAIProvider['tools']?.length || 0} tools`)
  return openAIProvider!
}

async function getAnthropicProvider(): Promise<AnthropicProvider> {
  // Ensure system is initialized before returning provider
  await ensureAgentSystemReady()

  if (!anthropicProvider) {
    console.error('❌ CRITICAL: Anthropic provider is null after initialization!')
    throw new Error('Anthropic provider failed to initialize')
  }

  console.log(`🔍 Returning Anthropic provider with ${anthropicProvider['tools']?.length || 0} tools`)
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