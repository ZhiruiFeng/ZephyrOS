/**
 * =====================================================
 * Agents Feature - Public API
 * =====================================================
 * 
 * This feature provides AI agent interactions including:
 * - Real-time streaming conversations
 * - Session management
 * - Tool calling capabilities
 * - Conversation history
 */

// Types (domain models)
export type {
  MessageType,
  Message,
  ToolCall,
  Agent,
  ConversationSession,
  ConversationSummary,
  SSEEventType,
  SSEEvent,
  InterfaceMode,
  AgentPageState,
  SessionManager,
  AgentChatWindowProps
} from './types/agents'

// Page component
export { default as AgentsPage } from './AgentsPage'

// Feature modules
export * from './components'
export * from './hooks'

// Types only (safe for client-side)
export type * from './api'
