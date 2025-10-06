export interface AWSAgentRequest {
  input: string
  sessionId: string
  context?: Record<string, any>
}

export interface AWSAgentResponse {
  message: string
  actions?: AWSAgentAction[]
  metadata?: Record<string, any>
}

export interface AWSAgentAction {
  type: 'create_task' | 'create_reflection' | 'update_priority' | 'save_memory' | 'decompose_task'
  params: Record<string, any>
}

export interface AWSAgentInvokeResult {
  success: boolean
  message?: string
  actions?: AWSAgentAction[]
  metadata?: Record<string, any>
  error?: string
  timestamp?: string
}
