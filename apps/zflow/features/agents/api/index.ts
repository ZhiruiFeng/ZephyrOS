/**
 * Agents Feature - API & Infrastructure
 *
 * All agents infrastructure is now internal to the feature.
 */

export * from './types'
export { agentRegistry } from './registry'
export { sessionManager } from './session-manager'
export { StreamingService } from './streaming'
export { OpenAIProvider } from './openai-client'
export { AnthropicProvider } from './anthropic-client'

// Init and system functions
export {
  initializeAgentSystem,
  ensureAgentSystemReady,
  getSystemStatus,
  openAIProvider,
  anthropicProvider
} from './init'

// MCP functions
export { getMCPClient, initializeMCPConnection } from './mcp-client'
export { getMCPBridge, initializeMCPBridge } from './mcp-bridge'

// Legacy compatibility export
export * as AgentsInfraTypes from './types'
