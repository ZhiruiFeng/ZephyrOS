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
export { AWSAgentProvider } from './aws-agent-client'

// Init and system functions
export {
  initializeAgentSystem,
  ensureAgentSystemReady,
  getSystemStatus,
  openAIProvider,
  anthropicProvider,
  awsProvider
} from './init'

// MCP functions
export { getMCPClient, initializeMCPConnection } from './mcp-client'
export { getMCPBridge, initializeMCPBridge } from './mcp-bridge'

// Legacy compatibility export
export * as AgentsInfraTypes from './types'

// AWS Agent (client-side only - use direct import for components)
// Use: import { awsAgentApi } from '@/features/agents/api/aws-agent-api'
export { awsAgentApi } from './aws-agent-api'
export * from '../config/aws-agent-config'
