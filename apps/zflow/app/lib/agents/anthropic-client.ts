import Anthropic from '@anthropic-ai/sdk'
import { AgentProvider, ChatContext, StreamingResponse, ZFlowTool } from './types'

export class AnthropicProvider implements AgentProvider {
  id = 'anthropic'
  name = 'Anthropic'
  
  private client: Anthropic
  private tools: ZFlowTool[] = []

  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    })
  }

  registerTool(tool: ZFlowTool): void {
    this.tools.push(tool)
  }

  getAvailableModels(): string[] {
    return ['claude-3-sonnet-20240229', 'claude-3-haiku-20240307', 'claude-3-opus-20240229']
  }

  private formatMessagesForAnthropic(messages: any[]): Anthropic.MessageParam[] {
    const formatted: Anthropic.MessageParam[] = []
    
    for (const msg of messages) {
      if (msg.type === 'user') {
        formatted.push({ role: 'user', content: msg.content })
      } else if (msg.type === 'agent') {
        formatted.push({ role: 'assistant', content: msg.content })
      }
      // Skip system messages as they're handled separately in Anthropic
    }
    
    return formatted
  }

  private formatToolsForAnthropic(): Anthropic.Tool[] {
    return this.tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.parameters
    }))
  }

  async *sendMessage(message: string, context: ChatContext): AsyncGenerator<StreamingResponse> {
    const { sessionId, messages, agent } = context
    
    // Create system message for ZFlow context
    const systemMessage = `You are ${agent.name}, an AI assistant integrated into ZephyrOS, a productivity platform. 

You can help users with their tasks, memories, and projects. You have access to tools that can:
- Create and manage tasks
- Search through user's memories and notes
- Retrieve context from their activity timeline
- Save important information to their knowledge base

Be helpful, concise, and proactive in using tools when appropriate. If users ask about their tasks or memories, use the available tools to provide accurate, up-to-date information.`

    const anthropicMessages = this.formatMessagesForAnthropic([...messages, { type: 'user', content: message }])
    const messageId = Math.random().toString(36).substring(2, 15)

    try {
      yield {
        sessionId,
        messageId,
        type: 'start',
        content: ''
      }

      const params: Anthropic.MessageCreateParams = {
        model: agent.model || 'claude-3-sonnet-20240229',
        max_tokens: 2000,
        system: systemMessage,
        messages: anthropicMessages,
        stream: true,
      }

      // Add tools if available
      if (this.tools.length > 0) {
        params.tools = this.formatToolsForAnthropic()
      }

      const stream = await this.client.messages.create(params)

      let fullContent = ''

      for await (const chunk of stream) {
        if (chunk.type === 'content_block_start') {
          // Handle content block start
          continue
        }
        
        if (chunk.type === 'content_block_delta') {
          if (chunk.delta.type === 'text_delta') {
            const content = chunk.delta.text
            fullContent += content
            
            yield {
              sessionId,
              messageId,
              type: 'token',
              content
            }
          }
        }

        if (chunk.type === 'message_delta') {
          if (chunk.delta.stop_reason === 'tool_use') {
            // Handle tool use completion
            // Note: Full tool call handling would require additional implementation
            // This is a simplified version
          }
        }
      }

      yield {
        sessionId,
        messageId,
        type: 'end',
        content: fullContent
      }

    } catch (error) {
      console.error('Anthropic streaming error:', error)
      yield {
        sessionId,
        messageId,
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }
}