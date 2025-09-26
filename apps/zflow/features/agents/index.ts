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
  SSEEventType,
  SSEEvent,
  InterfaceMode,
  AgentPageState,
  SessionManager,
  AgentChatWindowProps
} from './types/agents'

// Conversation history types
export type {
  ConversationSummary,
  ConversationDetail,
  HistoricalMessage,
  ConversationSearchResult,
  ConversationStats,
  ConversationHistoryFilter,
  ConversationsResponse,
  ConversationDetailResponse,
  ConversationSearchResponse,
  ConversationStatsResponse
} from './types/conversation-history'

// Legacy compatibility
export type { Message as LegacyMessage } from './types/agents'

// Page component
export { default as AgentsPage } from './AgentsPage'

// Feature modules
export * from './components'
export * from './hooks'

// Session manager
export { useSessionManager } from './hooks/session-manager'

// Types only (safe for client-side)
export type * from './api'
