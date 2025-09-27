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

    const openAIMessages = this.formatMessagesForOpenAI(allMessages)

    try {
      yield {
        sessionId,
        messageId,
        type: 'start',
        content: ''
      }

      const params: OpenAI.ChatCompletionCreateParamsStreaming = {
        model: agent.model || 'gpt-4-1106-preview',
        messages: openAIMessages,
        stream: true,
        temperature: 0.7,
        max_tokens: 2000,
      }

      // Add tools if available
      if (this.tools.length > 0) {
        params.tools = this.formatToolsForOpenAI()
        params.tool_choice = 'auto'
      }

      const stream = await client.chat.completions.create(params)

      let fullContent = ''
      let toolCalls: any[] = []

      for await (const chunk of stream) {
        const choice = chunk.choices[0]
        
        if (choice?.delta?.content) {
          const content = choice.delta.content
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
          for (const toolCall of choice.delta.tool_calls) {
            if (toolCall.index !== undefined) {
              if (!toolCalls[toolCall.index]) {
                toolCalls[toolCall.index] = {
                  id: toolCall.id,
                  type: 'function',
                  function: { name: '', arguments: '' }
                }
              }

              if (toolCall.function?.name) {
                toolCalls[toolCall.index].function.name += toolCall.function.name
              }
              
              if (toolCall.function?.arguments) {
                toolCalls[toolCall.index].function.arguments += toolCall.function.arguments
              }
            }
          }
        }

        if (choice?.finish_reason === 'tool_calls' && toolCalls.length > 0) {
          // Execute tool calls
          for (const toolCall of toolCalls) {
            const tool = this.tools.find(t => t.name === toolCall.function.name)
            if (tool) {
              try {
                const args = JSON.parse(toolCall.function.arguments)
                
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

                const result = await tool.handler(args, context)
                
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
              } catch (error) {
                yield {
                  sessionId,
                  messageId,
                  type: 'tool_result',
                  toolCall: {
                    id: toolCall.id,
                    name: toolCall.function.name,
                    parameters: {},
                    status: 'error',
                    result: error instanceof Error ? error.message : 'Unknown error'
                  }
                }
              }
            }
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
