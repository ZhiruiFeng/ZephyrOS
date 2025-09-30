import Anthropic from '@anthropic-ai/sdk'
import { AgentProvider, ChatContext, StreamingResponse, ZFlowTool } from './types'

export class AnthropicProvider implements AgentProvider {
  id = 'anthropic'
  name = 'Anthropic'
  
  private client: Anthropic | null = null
  private tools: ZFlowTool[] = []

  constructor() {
    // 在构建时不创建 Anthropic 客户端
    if (process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV === undefined) {
      console.warn('Anthropic client not initialized during build time')
      return
    }
    
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      console.warn('ANTHROPIC_API_KEY not found, Anthropic client will be unavailable')
      return
    }
    
    this.client = new Anthropic({
      apiKey,
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
    const messageId = Math.random().toString(36).substring(2, 15)

    // 检查客户端是否已初始化
    if (!this.client) {
      yield {
        sessionId,
        messageId,
        type: 'error',
        error: 'Anthropic client not initialized. Please check ANTHROPIC_API_KEY environment variable.'
      }
      return
    }

    // Create system message for ZFlow context
    const systemMessage = `You are ${agent.name}, an AI assistant integrated into ZephyrOS, a productivity platform.

You can help users with their tasks, memories, and projects. You have access to tools that can:
- Create and manage tasks
- Search through user's memories and notes
- Retrieve context from their activity timeline
- Save important information to their knowledge base

Be helpful, concise, and proactive in using tools when appropriate. If users ask about their tasks or memories, use the available tools to provide accurate, up-to-date information.`

    // Initialize conversation with the new user message
    let conversationMessages = this.formatMessagesForAnthropic([...messages, { type: 'user', content: message }])

    try {
      yield {
        sessionId,
        messageId,
        type: 'start',
        content: ''
      }

      // Multi-turn agentic loop - continue until we get a final answer
      let turnCount = 0
      const maxTurns = 10  // Prevent infinite loops
      let fullContent = ''

      while (turnCount < maxTurns) {
        turnCount++

        const params: Anthropic.MessageCreateParams = {
          model: agent.model || 'claude-3-sonnet-20240229',
          max_tokens: 4096,
          system: systemMessage,
          messages: conversationMessages,
          stream: true,
        }

        // Add tools if available
        if (this.tools.length > 0) {
          params.tools = this.formatToolsForAnthropic()
        }

        const stream: AsyncIterable<Anthropic.MessageStreamEvent> = await this.client.messages.create(params)

        let stopReason: string | null = null
        let currentContent: Anthropic.ContentBlock[] = []
        let textContent = ''

        // Process streaming response
        for await (const chunk of stream) {
          if (chunk.type === 'content_block_start') {
            currentContent.push(chunk.content_block)
            continue
          }

          if (chunk.type === 'content_block_delta') {
            const index = chunk.index

            if (chunk.delta.type === 'text_delta') {
              const content = chunk.delta.text
              textContent += content
              fullContent += content

              yield {
                sessionId,
                messageId,
                type: 'token',
                content
              }

              // Update the content block
              if (currentContent[index] && currentContent[index].type === 'text') {
                (currentContent[index] as Anthropic.TextBlock).text += content
              }
            } else if (chunk.delta.type === 'input_json_delta') {
              // Tool input is being streamed
              if (currentContent[index] && currentContent[index].type === 'tool_use') {
                const toolBlock = currentContent[index] as Anthropic.ToolUseBlock
                if (!toolBlock.input) {
                  toolBlock.input = chunk.delta.partial_json
                } else {
                  toolBlock.input += chunk.delta.partial_json
                }
              }
            }
          }

          if (chunk.type === 'message_delta') {
            stopReason = chunk.delta.stop_reason || null
          }
        }

        // Add assistant's response to conversation history
        conversationMessages.push({
          role: 'assistant',
          content: currentContent
        })

        // Check if we need to execute tools
        if (stopReason === 'tool_use') {
          // Extract tool calls
          const toolUseBlocks = currentContent.filter(
            (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
          )

          if (toolUseBlocks.length === 0) {
            // No tools to execute, exit loop
            break
          }

          // Execute tools and collect results
          const toolResults: Anthropic.ToolResultBlockParam[] = []

          for (const toolBlock of toolUseBlocks) {
            const tool = this.tools.find(t => t.name === toolBlock.name)

            if (!tool) {
              console.error(`Tool not found: ${toolBlock.name}`)
              toolResults.push({
                type: 'tool_result',
                tool_use_id: toolBlock.id,
                content: JSON.stringify({ error: `Tool '${toolBlock.name}' not found` })
              })
              continue
            }

            try {
              // Parse tool input
              const toolInput = typeof toolBlock.input === 'string'
                ? JSON.parse(toolBlock.input)
                : toolBlock.input

              // Emit tool call event
              yield {
                sessionId,
                messageId,
                type: 'tool_call',
                toolCall: {
                  id: toolBlock.id,
                  name: toolBlock.name,
                  parameters: toolInput,
                  status: 'running'
                }
              }

              // Execute tool
              const result = await tool.handler(toolInput, context)

              // Emit tool result event
              yield {
                sessionId,
                messageId,
                type: 'tool_result',
                toolCall: {
                  id: toolBlock.id,
                  name: toolBlock.name,
                  parameters: toolInput,
                  status: 'completed',
                  result
                }
              }

              // Add to tool results
              toolResults.push({
                type: 'tool_result',
                tool_use_id: toolBlock.id,
                content: JSON.stringify(result)
              })

            } catch (error) {
              console.error(`Tool execution error for ${toolBlock.name}:`, error)

              const errorMessage = error instanceof Error ? error.message : 'Unknown error'

              yield {
                sessionId,
                messageId,
                type: 'tool_result',
                toolCall: {
                  id: toolBlock.id,
                  name: toolBlock.name,
                  parameters: toolBlock.input,
                  status: 'error',
                  error: errorMessage
                }
              }

              toolResults.push({
                type: 'tool_result',
                tool_use_id: toolBlock.id,
                content: JSON.stringify({ error: errorMessage }),
                is_error: true
              })
            }
          }

          // Add tool results to conversation and continue loop
          conversationMessages.push({
            role: 'user',
            content: toolResults
          })

          // Continue to next turn
          continue

        } else {
          // Stop condition: end_turn, max_tokens, etc. - we have a final answer
          break
        }
      }

      if (turnCount >= maxTurns) {
        console.warn(`Conversation reached maximum turns (${maxTurns})`)
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