import { AgentProvider, ChatContext, StreamingResponse } from './types'
import { getAWSAgentUrl, AWS_AGENT_CONFIG } from '../config/aws-agent-config'
import type { AWSAgentRequest, AWSAgentResponse } from '../types/aws-agent'

export class AWSAgentProvider implements AgentProvider {
  id = 'aws'
  name = 'AWS Agent'

  registerTool(): void {
    // AWS Agent doesn't use MCP tools - it has built-in capabilities
  }

  getAvailableModels(): string[] {
    return ['bedrock-agent']
  }

  async *sendMessage(message: string, context: ChatContext): AsyncGenerator<StreamingResponse> {
    const { sessionId } = context
    const messageId = Math.random().toString(36).substring(2, 15)

    try {
      // Emit start event with "thinking" status
      yield {
        sessionId,
        messageId,
        type: 'start',
        content: ''
      }

      // Prepare request
      const awsRequest: AWSAgentRequest = {
        input: message,
        sessionId: sessionId
      }

      // Call AWS Agent API
      const awsUrl = getAWSAgentUrl()
      const timeout = AWS_AGENT_CONFIG.timeout

      const response = await fetch(awsUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(awsRequest),
        signal: AbortSignal.timeout(timeout),
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error')
        throw new Error(`AWS Agent returned ${response.status}: ${errorText}`)
      }

      const awsResponse: AWSAgentResponse = await response.json()

      // Emit the complete message as a single token
      if (awsResponse.message) {
        yield {
          sessionId,
          messageId,
          type: 'token',
          content: awsResponse.message
        }
      }

      // Emit actions if present (for future use)
      if (awsResponse.actions && awsResponse.actions.length > 0) {
        for (const action of awsResponse.actions) {
          yield {
            sessionId,
            messageId,
            type: 'tool_call',
            toolCall: {
              id: Math.random().toString(36).substring(2, 15),
              name: action.type,
              parameters: action.params,
              status: 'completed',
              result: action.params
            }
          }
        }
      }

      // Emit end event
      yield {
        sessionId,
        messageId,
        type: 'end',
        content: awsResponse.message || ''
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      const isTimeout = errorMessage.includes('timeout') || errorMessage.includes('aborted')

      yield {
        sessionId,
        messageId,
        type: 'error',
        error: isTimeout ? 'AWS Agent request timed out. Please try again.' : errorMessage
      }
    }
  }
}
