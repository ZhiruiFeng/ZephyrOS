// =====================================================
// Agent Domain Types - Unified (eliminates duplicates)
// =====================================================

// Core enums
export type AgentProvider = 'openai' | 'anthropic' | 'bedrock' | 'custom'
export type AgentStatus = 'online' | 'offline' | 'busy'
export type MessageType = 'user' | 'agent' | 'system'
export type ToolCallStatus = 'pending' | 'running' | 'completed' | 'error'
export type StreamingResponseType = 'start' | 'token' | 'tool_call' | 'tool_result' | 'end' | 'error'

// Core Agent interface (eliminates duplicates)
export interface Agent {
  id: string
  name: string
  description: string
  status: AgentStatus
  model?: string
  provider: AgentProvider
}

// Tool system
export interface ToolCall {
  id: string
  name: string
  parameters: any
  status: ToolCallStatus
  result?: any
}

export interface ZFlowTool {
  name: string
  description: string
  parameters: any
  handler: (params: any, context: ChatContext) => Promise<any>
}

// Message system
export interface AgentMessage {
  id: string
  type: MessageType
  content: string
  timestamp: Date
  agent?: string
  streaming?: boolean
  toolCalls?: ToolCall[]
}

// Chat session
export interface ChatSession {
  id: string
  userId: string
  agentId: string
  createdAt: Date
  updatedAt: Date
  messages: AgentMessage[]
  metadata?: Record<string, any>
}

export interface ChatContext {
  sessionId: string
  userId: string
  messages: AgentMessage[]
  agent: Agent
  metadata?: Record<string, any>
}

// Streaming
export interface StreamingResponse {
  sessionId: string
  messageId: string
  type: StreamingResponseType
  content?: string
  toolCall?: ToolCall
  error?: string
}

// Provider interface
export interface AgentProviderInterface {
  id: string
  name: string
  sendMessage: (message: string, context: ChatContext) => AsyncGenerator<StreamingResponse>
  getAvailableModels: () => string[]
  registerTool: (tool: ZFlowTool) => void
}