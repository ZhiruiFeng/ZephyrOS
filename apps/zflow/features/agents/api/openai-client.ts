import OpenAI from 'openai'
import { resolveZmemoryOrigin } from '@/lib/api/zmemory-api-base'
import { AgentProvider, ChatContext, StreamingResponse, ZFlowTool } from './types'

function getZmemoryBase(): string {
  return resolveZmemoryOrigin('http://localhost:3001') || 'http://localhost:3001'
}

async function resolveUserOpenAIKey(authToken?: string, service: string = 'openai_gpt4'): Promise<string | null> {
  if (!authToken) return null
  try {
    const base = getZmemoryBase()
    const res = await fetch(`${base}/api/internal/resolve-openai-key?service=${encodeURIComponent(service)}`, {
      headers: { Authorization: authToken },
      method: 'GET'
    })
    if (!res.ok) return null
    const data = await res.json().catch(() => null)
    return data?.key || null
  } catch {
    return null
  }
}

export class OpenAIProvider implements AgentProvider {
  id = 'openai'
  name = 'OpenAI'

  private client: OpenAI | null = null
  private tools: ZFlowTool[] = []

  constructor() {
    // Defer client creation until we have a per-request key
    if (process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV === undefined) {
      // ok to be empty here; will initialize in sendMessage
      return
    }
    // In dev, initialize with env key if present for convenience
    const apiKey = process.env.OPENAI_API_KEY
    if (apiKey) {
      this.client = new OpenAI({ apiKey })
    }
  }

  registerTool(tool: ZFlowTool): void {
    this.tools.push(tool)
  }

  getAvailableModels(): string[] {
    return ['gpt-4-1106-preview', 'gpt-4', 'gpt-3.5-turbo-1106', 'gpt-3.5-turbo']
  }

  private formatMessagesForOpenAI(messages: any[]): OpenAI.ChatCompletionMessageParam[] {
    return messages.map(msg => {
      if (msg.type === 'user') {
        return { role: 'user', content: msg.content }
      } else if (msg.type === 'agent') {
        return { role: 'assistant', content: msg.content }
      } else {
        return { role: 'system', content: msg.content }
      }
    })
  }

  private formatToolsForOpenAI(): OpenAI.ChatCompletionTool[] {
    return this.tools.map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
      }
    }))
  }

  async *sendMessage(message: string, context: ChatContext): AsyncGenerator<StreamingResponse> {
    const { sessionId, messages, agent } = context
    const messageId = Math.random().toString(36).substring(2, 15)

    // Resolve per-user API key first
    const authToken = (context.metadata && (context.metadata as any).authToken) as string | undefined
    const userKey = await resolveUserOpenAIKey(authToken, 'openai_gpt4')

    let client = this.client
    if (userKey) {
      client = new OpenAI({ apiKey: userKey })
    }
    if (!client) {
      // Fallback to env-initialized client
      if (!this.client) {
        yield {
          sessionId,
          messageId,
          type: 'error',
          error: 'OpenAI client not initialized. Please configure a user API key or set OPENAI_API_KEY.'
        }
        return
      }
      client = this.client
    }

    // Create system message for ZFlow context
    const systemMessage = `You are ${agent.name}, an AI assistant integrated into ZephyrOS, a productivity platform.

You can help users with their tasks, memories, and projects. You have access to tools that can:
- Create and manage tasks
- Search through user's memories and notes
- Retrieve context from their activity timeline
- Save important information to their knowledge base

Be helpful, concise, and proactive in using tools when appropriate. If users ask about their tasks or memories, use the available tools to provide accurate, up-to-date information.`

    const allMessages = [
      { type: 'system', content: systemMessage },
      ...messages,
      { type: 'user', content: message }
    ]

    // Initialize conversation messages
    let conversationMessages: OpenAI.ChatCompletionMessageParam[] = this.formatMessagesForOpenAI(allMessages)

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

        const params: OpenAI.ChatCompletionCreateParamsStreaming = {
          model: agent.model || 'gpt-4-1106-preview',
          messages: conversationMessages,
          stream: true,
          temperature: 0.7,
          max_tokens: 4096,
        }

        // Add tools if available
        if (this.tools.length > 0) {
          params.tools = this.formatToolsForOpenAI()
          params.tool_choice = 'auto'
        }

        const stream = await client.chat.completions.create(params)

        let currentContent = ''
        let toolCalls: Array<{
          id: string
          type: 'function'
          function: { name: string; arguments: string }
        }> = []
        let finishReason: string | null = null

        // Process streaming response
        for await (const chunk of stream) {
          const choice = chunk.choices[0]

          if (choice?.delta?.content) {
            const content = choice.delta.content
            currentContent += content
            fullContent += content

            yield {
              sessionId,
              messageId,
              type: 'token',
              content
            }
          }

          // Handle tool calls
          if (choice?.delta?.tool_calls) {
            for (const deltaToolCall of choice.delta.tool_calls) {
              const index = deltaToolCall.index
              if (index !== undefined) {
                if (!toolCalls[index]) {
                  toolCalls[index] = {
                    id: deltaToolCall.id || '',
                    type: 'function',
                    function: { name: '', arguments: '' }
                  }
                }

                if (deltaToolCall.id) {
                  toolCalls[index].id = deltaToolCall.id
                }

                if (deltaToolCall.function?.name) {
                  toolCalls[index].function.name += deltaToolCall.function.name
                }

                if (deltaToolCall.function?.arguments) {
                  toolCalls[index].function.arguments += deltaToolCall.function.arguments
                }
              }
            }
          }

          if (choice?.finish_reason) {
            finishReason = choice.finish_reason
          }
        }

        // Add assistant's response to conversation history
        const assistantMessage: OpenAI.ChatCompletionAssistantMessageParam = {
          role: 'assistant',
          content: currentContent || null
        }

        if (toolCalls.length > 0) {
          assistantMessage.tool_calls = toolCalls
        }

        conversationMessages.push(assistantMessage)

        // Check if we need to execute tools
        if (finishReason === 'tool_calls' && toolCalls.length > 0) {
          // Execute tools and collect results
          const toolResults: OpenAI.ChatCompletionToolMessageParam[] = []

          for (const toolCall of toolCalls) {
            const tool = this.tools.find(t => t.name === toolCall.function.name)

            if (!tool) {
              console.error(`Tool not found: ${toolCall.function.name}`)
              toolResults.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                content: JSON.stringify({ error: `Tool '${toolCall.function.name}' not found` })
              })
              continue
            }

            try {
              const args = JSON.parse(toolCall.function.arguments)

              // Emit tool call event
              yield {
                sessionId,
                messageId,
                type: 'tool_call',
                toolCall: {
                  id: toolCall.id,
                  name: toolCall.function.name,
                  parameters: args,
                  status: 'running'
                }
              }

              // Execute tool
              const result = await tool.handler(args, context)

              // Emit tool result event
              yield {
                sessionId,
                messageId,
                type: 'tool_result',
                toolCall: {
                  id: toolCall.id,
                  name: toolCall.function.name,
                  parameters: args,
                  status: 'completed',
                  result
                }
              }

              // Add to tool results
              toolResults.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                content: JSON.stringify(result)
              })

            } catch (error) {
              console.error(`Tool execution error for ${toolCall.function.name}:`, error)

              const errorMessage = error instanceof Error ? error.message : 'Unknown error'

              yield {
                sessionId,
                messageId,
                type: 'tool_result',
                toolCall: {
                  id: toolCall.id,
                  name: toolCall.function.name,
                  parameters: {},
                  status: 'error',
                  error: errorMessage
                }
              }

              toolResults.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                content: JSON.stringify({ error: errorMessage })
              })
            }
          }

          // Add tool results to conversation and continue loop
          conversationMessages.push(...toolResults)

          // Continue to next turn
          continue

        } else {
          // Stop condition: stop, length, content_filter, etc. - we have a final answer
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
      console.error('OpenAI streaming error:', error)
      yield {
        sessionId,
        messageId,
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }
}
