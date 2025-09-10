import { NextRequest, NextResponse } from 'next/server'
import { sessionManager } from '../../../lib/agents/session-manager'
import { agentRegistry } from '../../../lib/agents/registry'
import { StreamingService } from '../../../lib/agents/streaming'
import { openAIProvider, anthropicProvider } from '../../../lib/agents/init'
import { AgentMessage } from '../../../lib/agents/types'

export async function POST(request: NextRequest) {
  try {
    const { sessionId, message, userId } = await request.json()

    if (!sessionId || !message || !userId) {
      return NextResponse.json(
        { error: 'sessionId, message, and userId are required' },
        { status: 400 }
      )
    }

    // Get session
    const session = await sessionManager.getSession(sessionId)
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    // Verify user owns the session
    if (session.userId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Get agent
    const agent = agentRegistry.getAgent(session.agentId)
    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      )
    }

    // Add user message to session
    const userMessage: AgentMessage = {
      id: sessionManager.generateMessageId(),
      type: 'user',
      content: message,
      timestamp: new Date()
    }
    await sessionManager.addMessage(sessionId, userMessage)

    // Get appropriate provider
    let provider
    switch (agent.provider) {
      case 'openai':
        provider = openAIProvider
        break
      case 'anthropic':
        provider = anthropicProvider
        break
      default:
        return NextResponse.json(
          { error: `Provider ${agent.provider} not supported` },
          { status: 400 }
        )
    }

    // Create streaming service
    const streamingService = new StreamingService()

    // Start streaming response (async)
    const chatContext = {
      sessionId,
      userId,
      messages: session.messages,
      agent,
      metadata: session.metadata || {}
    }

    // Process the message and stream response in background
    console.log('Starting background message processing for session:', sessionId)
    processMessageStream(provider, message, chatContext, streamingService, sessionManager)
      .catch(error => {
        console.error('Error in message streaming for session:', sessionId, error)
        console.error('Error stack:', error.stack)
        streamingService.publishStreamEvent(sessionId, {
          sessionId,
          messageId: '',
          type: 'error',
          error: error instanceof Error ? error.message : 'Unknown error occurred'
        })
      })

    // Return immediately - client should connect to SSE stream
    return NextResponse.json({
      success: true,
      sessionId,
      message: 'Message received, connect to SSE stream for response'
    })

  } catch (error) {
    console.error('Error processing message:', error)
    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    )
  }
}

async function processMessageStream(
  provider: any,
  message: string,
  context: any,
  streamingService: StreamingService,
  sessionManager: any
) {
  let agentMessage: AgentMessage | null = null
  let fullContent = ''

  console.log('Starting message stream processing for:', context.sessionId)
  
  try {
    // Generate response stream
    console.log('Calling provider.sendMessage with:', { message, agentId: context.agent.id })
    for await (const chunk of provider.sendMessage(message, context)) {
      // Publish streaming event
      await streamingService.publishStreamEvent(context.sessionId, chunk)

      // Track full content for saving
      if (chunk.type === 'token' && chunk.content) {
        fullContent += chunk.content
      }

      // Create agent message on first token
      if (chunk.type === 'start' || (chunk.type === 'token' && !agentMessage)) {
        agentMessage = {
          id: chunk.messageId,
          type: 'agent',
          content: '',
          timestamp: new Date(),
          agent: context.agent.id,
          streaming: true,
          toolCalls: []
        }
        await sessionManager.addMessage(context.sessionId, agentMessage)
      }

      // Update agent message content
      if (agentMessage && chunk.type === 'token') {
        await sessionManager.updateMessage(context.sessionId, agentMessage.id, {
          content: fullContent
        })
      }

      // Handle tool calls
      if (chunk.type === 'tool_call' && agentMessage) {
        const toolCalls = agentMessage.toolCalls || []
        toolCalls.push(chunk.toolCall!)
        await sessionManager.updateMessage(context.sessionId, agentMessage.id, {
          toolCalls
        })
      }

      // Handle tool results
      if (chunk.type === 'tool_result' && agentMessage && chunk.toolCall) {
        const toolCalls = agentMessage.toolCalls || []
        const toolIndex = toolCalls.findIndex(t => t.id === chunk.toolCall!.id)
        if (toolIndex !== -1) {
          toolCalls[toolIndex] = chunk.toolCall
          await sessionManager.updateMessage(context.sessionId, agentMessage.id, {
            toolCalls
          })
        }
      }

      // End streaming
      if (chunk.type === 'end' && agentMessage) {
        await sessionManager.updateMessage(context.sessionId, agentMessage.id, {
          content: fullContent,
          streaming: false
        })
      }
    }
  } catch (error) {
    console.error('Error in message stream processing:', error)
    
    // Publish error event
    await streamingService.publishStreamEvent(context.sessionId, {
      sessionId: context.sessionId,
      messageId: agentMessage?.id || '',
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    })

    // Update message with error if it exists
    if (agentMessage) {
      await sessionManager.updateMessage(context.sessionId, agentMessage.id, {
        content: fullContent || 'An error occurred while generating the response.',
        streaming: false
      })
    }
  }
}