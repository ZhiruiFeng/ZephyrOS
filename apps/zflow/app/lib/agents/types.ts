export interface AgentMessage {
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

export interface Agent {
  id: string
  name: string
  description: string
  status: 'online' | 'offline' | 'busy'
  model?: string
  provider: 'openai' | 'anthropic' | 'bedrock' | 'custom'
}

export interface ChatSession {
  id: string
  userId: string
  agentId: string
  createdAt: Date
  updatedAt: Date
  messages: AgentMessage[]
  metadata?: Record<string, any>
}

export interface StreamingResponse {
  sessionId: string
  messageId: string
  type: 'start' | 'token' | 'tool_call' | 'tool_result' | 'end' | 'error'
  content?: string
  toolCall?: ToolCall
  error?: string
}

export interface AgentProvider {
  id: string
  name: string
  sendMessage: (message: string, context: ChatContext) => AsyncGenerator<StreamingResponse>
  getAvailableModels: () => string[]
  registerTool: (tool: ZFlowTool) => void
}

export interface ChatContext {
  sessionId: string
  userId: string
  messages: AgentMessage[]
  agent: Agent
  metadata?: Record<string, any>
}

export interface ZFlowTool {
  name: string
  description: string
  parameters: any
  handler: (params: any, context: ChatContext) => Promise<any>
}