// Conversation history types for zflow frontend
// Compatible with zmemory backend types

export interface ConversationSummary {
  id: string
  userId: string
  agentId: string
  title?: string | null
  summary?: string | null
  createdAt: Date
  updatedAt: Date
  messageCount: number
  isArchived?: boolean
  metadata?: Record<string, any>
  // Frontend-specific properties
  lastMessagePreview?: string
  agentName?: string
}

export interface HistoricalMessage {
  id: string
  type: 'user' | 'agent' | 'system'
  content: string
  timestamp: Date
  agent?: string
  streaming?: boolean
  toolCalls?: ToolCall[]
}

export interface ToolCall {
  id: string
  name: string
  parameters: any
  status: 'pending' | 'running' | 'completed' | 'error'
  result?: any
}

export interface ConversationDetail {
  id: string
  userId: string
  agentId: string
  title?: string | null
  summary?: string | null
  createdAt: Date
  updatedAt: Date
  messages: HistoricalMessage[]
  metadata?: Record<string, any>
  isArchived?: boolean
}

export interface ConversationSearchResult {
  sessionId: string
  sessionTitle: string
  message: HistoricalMessage
}

export interface ConversationStats {
  totalConversations: number
  totalMessages: number
  archivedConversations: number
  activeConversations: number
}

export interface ConversationHistoryFilter {
  agentId?: string
  dateFrom?: Date
  dateTo?: Date
  includeArchived?: boolean
  searchQuery?: string
}

// API Response types
export interface ConversationsResponse {
  success: boolean
  conversations: ConversationSummary[]
  count: number
}

export interface ConversationDetailResponse {
  success: boolean
  conversation: ConversationDetail
}

export interface ConversationSearchResponse {
  success: boolean
  query: string
  results: ConversationSearchResult[]
  count: number
}

export interface ConversationStatsResponse {
  success: boolean
  stats: ConversationStats
}