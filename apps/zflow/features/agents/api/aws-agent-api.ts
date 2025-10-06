import type { AWSAgentInvokeResult } from '../types/aws-agent'

export interface AWSAgentInvokeOptions {
  input: string
  sessionId: string
  context?: Record<string, any>
}

export async function invokeAWSAgent(options: AWSAgentInvokeOptions): Promise<AWSAgentInvokeResult> {
  const response = await fetch('/api/agents/aws/invoke', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(options),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(errorData.error || `Failed to invoke AWS Agent: ${response.status}`)
  }

  return response.json()
}

export const awsAgentApi = {
  invoke: invokeAWSAgent,
}
