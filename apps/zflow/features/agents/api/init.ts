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
    console.log('🚀 [INIT] Initializing ZFlow Agent System...')
    console.log('🚀 [INIT] Environment:', {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV,
      VERCEL: process.env.VERCEL,
      NEXT_PHASE: process.env.NEXT_PHASE
    })

    // Initialize agent providers (with build-time safety)
    if (process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV === undefined) {
      console.warn('⚠️ [INIT] Providers not initialized during build time - exiting early')
      return
    }

    // Create provider instances
    if (!openAIProvider) {
      console.log('🔧 [INIT] Creating OpenAI provider instance...')
      openAIProvider = new OpenAIProvider()
      console.log(`✅ [INIT] OpenAI provider created`)
    } else {
      console.log(`♻️ [INIT] OpenAI provider already exists (reusing singleton)`)
    }

    if (!anthropicProvider) {
      console.log('🔧 [INIT] Creating Anthropic provider instance...')
      anthropicProvider = new AnthropicProvider()
      console.log(`✅ [INIT] Anthropic provider created`)
    } else {
      console.log(`♻️ [INIT] Anthropic provider already exists (reusing singleton)`)
    }

    // Initialize MCP bridge and register tools with EXISTING provider instances
    try {
      console.log('🔧 [INIT] Setting up MCP integration...')
      const startTime = Date.now()
      await initializeMCPBridge([openAIProvider, anthropicProvider])
      const duration = Date.now() - startTime
      console.log(`✅ [INIT] MCP tools registered (took ${duration}ms)`)
      console.log(`✅ [INIT] OpenAI now has ${openAIProvider['tools']?.length || 0} tools`)
      console.log(`✅ [INIT] Anthropic now has ${anthropicProvider['tools']?.length || 0} tools`)

    } catch (mcpError) {
      console.error('❌ [INIT] MCP initialization FAILED:', mcpError)
      console.error('❌ [INIT] Agents will have NO TOOLS and will hallucinate!')
      console.error('❌ [INIT] Error details:', mcpError instanceof Error ? mcpError.stack : mcpError)
      // Continue without MCP - basic agent functionality will still work
    }

    // Register providers with registry (now with MCP tools loaded)
    console.log('📋 [INIT] Registering providers with agent registry...')
    agentRegistry.registerProvider(openAIProvider)
    agentRegistry.registerProvider(anthropicProvider)

    console.log('✅ [INIT] ZFlow Agent System initialized successfully')
    console.log('✅ [INIT] Final tool counts: OpenAI=' + (openAIProvider['tools']?.length || 0) + ', Anthropic=' + (anthropicProvider['tools']?.length || 0))

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