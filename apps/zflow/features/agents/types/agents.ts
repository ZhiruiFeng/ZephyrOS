/**
 * Agents Feature - Type Definitions
 * 
 * This module defines all types and interfaces used by the Agents feature,
 * including AI agent interactions, streaming, and session management.
 */

/**
 * Message types in agent conversations
 */
export type MessageType = 'user' | 'agent' | 'system'

/**
 * Agent conversation message
 */
export interface Message {
  id: string
  type: MessageType
  content: string
  timestamp: Date
  agent?: string
  streaming?: boolean
  toolCalls?: ToolCall[]
}

/**
 * Tool call information for agents
 */
export interface ToolCall {
  id: string
  name: string
  arguments?: any
  result?: any
  status?: 'pending' | 'running' | 'completed' | 'error'
}

/**
 * Agent definition
 */
export interface Agent {
  id: string
  name: string
  description?: string
  model?: string
  capabilities?: string[]
  isOnline?: boolean
  icon?: string
}

/**
 * Conversation session
 */
export interface ConversationSession {
  sessionId: string
  userId: string
  agentId: string
  messages: Message[]
  createdAt: Date
  updatedAt?: Date
  isActive: boolean
}

/**
 * Conversation summary for history
 */
export interface ConversationSummary {
  id: string
  sessionId: string
  title: string
  preview: string
  messageCount: number
  agentId: string
  createdAt: Date
  updatedAt: Date
}

/**
 * SSE event types for streaming
 */
export type SSEEventType = 
  | 'connected'
  | 'start'
  | 'token'
  | 'tool_call'
  | 'tool_result'
  | 'end'
  | 'error'
  | 'heartbeat'

/**
 * SSE event data
 */
export interface SSEEvent {
  type: SSEEventType
  messageId?: string
  content?: string
  toolCall?: ToolCall
  error?: string
}

/**
 * Interface mode for agent interaction
 */
export type InterfaceMode = 'text' | 'voice'

/**
 * Agent page state
 */
export interface AgentPageState {
  selectedAgent: string
  isStreaming: boolean
  availableAgents: Agent[]
  streamEndedNormally: boolean
  sidebarOpen: boolean
  sseReady: boolean
  interfaceMode: InterfaceMode
  currentSessionId?: string
  messages: Message[]
  viewingHistoricalConversation: boolean
  needsRedisSession: boolean
}

/**
 * Session manager interface
 */
export interface SessionManager {
  currentSessionId?: string
  currentMessages: Message[]
  isActive: boolean
  viewingHistoricalConversation: boolean
  needsRedisSession: boolean
  canSendMessages: boolean
  
  addMessage: (message: Message) => void
  updateMessage: (id: string, updates: Partial<Message>) => void
  setCurrentSessionId: (sessionId: string) => void
  createNewSession: () => void
  switchToConversation: (conversation: ConversationSummary) => void
}

/**
 * Agent chat window props
 */
export interface AgentChatWindowProps {
  sessionId?: string
  messages: Message[]
  selectedAgent: string
  isStreaming: boolean
  userId?: string
  availableAgents: Agent[]
  onSendMessage: (message: string) => Promise<void>
  onCancelStream: () => Promise<void>
  onAgentChange: (agentId: string) => void
  sidebarOpen: boolean
  onSidebarToggle: (open: boolean) => void
  onSelectConversation: (conversation: ConversationSummary) => void
  onCreateNewConversation: () => void
  refreshHistoryRef?: React.MutableRefObject<(() => Promise<void>) | null>
}