'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Bot, Plus, MessageSquare } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useTranslation } from '../../contexts/LanguageContext'
import LoginPage from '../components/auth/LoginPage'
import { AgentChatWindow, Message } from '../components/agents'
import { Agent } from '../lib/agents/types'
import { ConversationSummary } from '../lib/conversation-history/types'
import { useSessionManager } from '../lib/conversation-history/session-manager'

export default function AgentsPage() {
  const { user, loading: authLoading } = useAuth()
  const { t } = useTranslation()

  // State management
  const [selectedAgent, setSelectedAgent] = useState('gpt-4')
  const [isStreaming, setIsStreaming] = useState(false)
  const [availableAgents, setAvailableAgents] = useState<Agent[]>([])
  const [eventSource, setEventSource] = useState<EventSource | null>(null)
  const [streamEndedNormally, setStreamEndedNormally] = useState(false)
  const [lastUserId, setLastUserId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sseReady, setSseReady] = useState(false)
  const sseReadyRef = useRef(false)
  // Keep a live map of current messages to avoid stale-closure lookups in SSE callbacks
  const messagesMapRef = useRef<Map<string, Message>>(new Map())
  
  // Track messages being processed to prevent race conditions
  const processingMessagesRef = useRef<Set<string>>(new Set())

  // Session management with conversation history
  const sessionManager = useSessionManager(user?.id || null, selectedAgent)

  // Sync messages into a ref map for up-to-date lookups inside event handlers
  useEffect(() => {
    const map = new Map<string, Message>()
    for (const m of sessionManager.currentMessages) {
      map.set(m.id, m)
    }
    messagesMapRef.current = map
  }, [sessionManager.currentMessages])

  // Load available agents
  useEffect(() => {
    const loadAgents = async () => {
      try {
        const response = await fetch('/api/agents/registry?onlineOnly=true')
        const data = await response.json()
        if (data.agents) {
          setAvailableAgents(data.agents)
        }
      } catch (error) {
        console.error('Error loading agents:', error)
      }
    }

    loadAgents()
  }, [])

  // Create new session when component mounts or agent changes  
  useEffect(() => {
    const createSession = async () => {
      if (!user) {
        setLastUserId(null)
        return
      }

      // Only create new session if user actually changed, not just auth state refresh
      if (lastUserId === user.id && sessionManager.currentSessionId) {
        return
      }

      try {
        
        const response = await fetch('/api/agents/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            agentId: selectedAgent
          })
        })

        if (response.ok) {
          const data = await response.json()
          sessionManager.setCurrentSessionId(data.sessionId)
          setStreamEndedNormally(false) // Reset for new session
          setLastUserId(user.id)
        }
      } catch (error) {
        console.error('Error creating session:', error)
      }
    }

    createSession()
  }, [user, selectedAgent, lastUserId, sessionManager])

  // Set up SSE connection when session is created
  useEffect(() => {
    if (!sessionManager.currentSessionId || !user || !sessionManager.isActive) return

    // Add a small delay to ensure session is fully created
    const timer = setTimeout(() => {
      const connectSSE = async () => {
        // Close existing connection
        if (eventSource) {
          eventSource.close()
        }

        // Reset stream end flag for new connection
        setStreamEndedNormally(false)
        
        // Clear processing messages for new session
        processingMessagesRef.current.clear()

        // Verify session exists before attempting SSE connection
        try {
          const sessionResponse = await fetch(`/api/agents/sessions?sessionId=${sessionManager.currentSessionId}`)
          if (!sessionResponse.ok) {
            console.error('Session not found, cannot establish SSE connection')
            return
          }
        } catch (error) {
          console.error('Failed to verify session existence:', error)
          return
        }

        try {
          const newEventSource = new EventSource(`/api/agents/stream?sessionId=${sessionManager.currentSessionId}`)
          
          let connectionAttempted = false
          let connectionSucceeded = false

          newEventSource.onopen = () => {
            connectionSucceeded = true
          }

      newEventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          
          switch (data.type) {
            case 'connected': {
              setSseReady(true)
              sseReadyRef.current = true
              break
            }

            case 'start': {
              setIsStreaming(true)
              // Use atomic check-and-set to prevent race conditions
              if (data.messageId && !processingMessagesRef.current.has(data.messageId)) {
                const existingMessage = messagesMapRef.current.get(data.messageId)
                if (!existingMessage) {
                  processingMessagesRef.current.add(data.messageId)
                  const newMsg: Message = {
                    id: data.messageId,
                    type: 'agent' as const,
                    content: '',
                    timestamp: new Date(),
                    agent: selectedAgent,
                    streaming: true
                  }
                  messagesMapRef.current.set(data.messageId, newMsg)
                  sessionManager.addMessage(newMsg)
                }
              } else {
              }
              break
            }

            case 'token': {
              // Handle streaming tokens - update existing message or create if needed
              const existingMessage = data.messageId ? messagesMapRef.current.get(data.messageId) : undefined
              if (existingMessage) {
                // Update existing message by appending new content
                const newContent = existingMessage.content + (data.content || '')
                const updated: Message = { ...existingMessage, content: newContent, streaming: true }
                messagesMapRef.current.set(existingMessage.id, updated)
                sessionManager.updateMessage(existingMessage.id, { content: newContent, streaming: true })
              } else if (data.messageId && !processingMessagesRef.current.has(data.messageId)) {
                // Create message if it doesn't exist (fallback for missing start event)
                processingMessagesRef.current.add(data.messageId)
                const newMsg: Message = {
                  id: data.messageId,
                  type: 'agent' as const,
                  content: data.content || '',
                  timestamp: new Date(),
                  agent: selectedAgent,
                  streaming: true
                }
                messagesMapRef.current.set(data.messageId, newMsg)
                sessionManager.addMessage(newMsg)
              } else if (data.messageId && processingMessagesRef.current.has(data.messageId)) {
              }
              break
            }

            case 'tool_call': {
              const targetMessage = data.messageId ? messagesMapRef.current.get(data.messageId) : undefined
              if (targetMessage) {
                const toolCalls = targetMessage.toolCalls || []
                const updated: Message = { ...targetMessage, toolCalls: [...toolCalls, data.toolCall] }
                messagesMapRef.current.set(targetMessage.id, updated)
                sessionManager.updateMessage(targetMessage.id, { toolCalls: updated.toolCalls })
              }
              break
            }

            case 'tool_result': {
              const messageWithTools = data.messageId ? messagesMapRef.current.get(data.messageId) : undefined
              if (messageWithTools && messageWithTools.toolCalls) {
                const updatedToolCalls = messageWithTools.toolCalls.map(tc => tc.id === data.toolCall.id ? data.toolCall : tc)
                const updated: Message = { ...messageWithTools, toolCalls: updatedToolCalls }
                messagesMapRef.current.set(messageWithTools.id, updated)
                sessionManager.updateMessage(messageWithTools.id, { toolCalls: updatedToolCalls })
              }
              break
            }

            case 'end': {
              setIsStreaming(false)
              setStreamEndedNormally(true)
              // Ensure the message exists before updating it
              const endingMessage = data.messageId ? messagesMapRef.current.get(data.messageId) : undefined
              if (endingMessage) {
                const hasContent = endingMessage.content && endingMessage.content.length > 0
                const nextContent = typeof data.content === 'string' && data.content.length > 0 
                  ? data.content 
                  : endingMessage.content
                const updated: Message = { ...endingMessage, streaming: false, content: hasContent ? endingMessage.content : nextContent }
                messagesMapRef.current.set(endingMessage.id, updated)
                sessionManager.updateMessage(endingMessage.id, { 
                  streaming: false,
                  // If we missed token events (e.g., subscriber attached late), use final content from 'end'
                  content: updated.content
                })
              } else if (data.messageId) {
                // Fallback: if we never saw start/token, create the message now with final content
                processingMessagesRef.current.add(data.messageId)
                const newMsg: Message = {
                  id: data.messageId,
                  type: 'agent' as const,
                  content: data.content || '',
                  timestamp: new Date(),
                  agent: selectedAgent,
                  streaming: false
                }
                messagesMapRef.current.set(data.messageId, newMsg)
                sessionManager.addMessage(newMsg)
              }
              // Clean up processing tracker
              if (data.messageId) {
                processingMessagesRef.current.delete(data.messageId)
              }
              break
            }

            case 'error': {
              setIsStreaming(false)
              console.error('Stream error:', data.error)
              sessionManager.addMessage({
                id: Date.now().toString(),
                type: 'system' as const,
                content: `Error: ${data.error}`,
                timestamp: new Date()
              })
              // Clean up processing tracker
              if (data.messageId) {
                processingMessagesRef.current.delete(data.messageId)
              }
              break
            }

            case 'heartbeat': {
              // Keep connection alive
              break
            }
            
            default: {
            }
          }
        } catch (error) {
          console.error('Error parsing SSE data:', error)
        }
      }

          // Variables already declared above
          
          newEventSource.onerror = (error) => {
            const readyState = newEventSource.readyState
            const readyStateText = readyState === 0 ? 'CONNECTING' : readyState === 1 ? 'OPEN' : 'CLOSED'
            
            // Only log errors if we haven't seen them before and stream didn't end normally
            if (!streamEndedNormally) {
              // Mark SSE as not ready on any error
              setSseReady(false)
              sseReadyRef.current = false
              if (readyState === EventSource.CONNECTING && !connectionAttempted) {
                connectionAttempted = true
                return // Don't stop streaming state yet, connection might still succeed
              } 
              
              if (readyState === EventSource.CLOSED) {
                if (connectionSucceeded) {
                  setIsStreaming(false)
                  // Attempt reconnection after delay
                  setTimeout(async () => {
                    if (sessionManager.currentSessionId && user && !streamEndedNormally) {
                      await connectSSE()
                    }
                  }, 3000)
                } else {
                  console.error('SSE connection failed to establish for session:', sessionManager.currentSessionId)
                  setIsStreaming(false)
                }
              }
            } else {
              // Stream ended normally
              setIsStreaming(false)
              setSseReady(false)
              sseReadyRef.current = false
            }
          }

          setEventSource(newEventSource)
          // Reset readiness on errors/cleanup is handled below
        } catch (error) {
          console.error('Failed to create EventSource:', error)
          setIsStreaming(false)
        }
      }

      connectSSE().catch(error => {
        console.error('Failed to establish initial SSE connection:', error)
      })
    }, 500) // 500ms delay

    // Cleanup on unmount or session change
    return () => {
      clearTimeout(timer)
      if (eventSource) {
        eventSource.close()
      }
      setSseReady(false)
      sseReadyRef.current = false
    }
  }, [sessionManager.currentSessionId, user, sessionManager.isActive])

  // Send message handler
  const handleSendMessage = async (message: string) => {
    if (!sessionManager.currentSessionId || !user || !sessionManager.canSendMessages) return

    // Reset stream end flag for new message
    setStreamEndedNormally(false)

    // Ensure SSE is connected to avoid missing early tokens in memory mode
    if (!sseReadyRef.current) {
      for (let i = 0; i < 10; i++) { // wait up to ~1s
        if (sseReadyRef.current) break
        await new Promise(r => setTimeout(r, 100))
      }
    }

    // Add user message to UI immediately
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: message,
      timestamp: new Date()
    }
    sessionManager.addMessage(userMessage)
    setIsStreaming(true)

    try {
      const { getAuthHeader } = await import('../../lib/supabase')
      const authHeaders = await getAuthHeader()
      const response = await fetch('/api/agents/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          sessionId: sessionManager.currentSessionId,
          message,
          userId: user.id
        })
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }
    } catch (error) {
      console.error('Error sending message:', error)
      setIsStreaming(false)
      sessionManager.addMessage({
        id: Date.now().toString(),
        type: 'system',
        content: 'Failed to send message. Please try again.',
        timestamp: new Date()
      })
    }
  }

  // Cancel stream handler
  const handleCancelStream = async () => {
    if (!sessionManager.currentSessionId) return

    try {
      await fetch('/api/agents/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sessionManager.currentSessionId })
      })
    } catch (error) {
      console.error('Error cancelling stream:', error)
    }
  }

  // Agent change handler
  const handleAgentChange = (agentId: string) => {
    setSelectedAgent(agentId)
    // Session will be recreated by useEffect
  }

  // Authentication/loading guards
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!user) {
    return <LoginPage />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-primary-500 to-primary-600 rounded-full">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  AI Agents
                </h1>
                <p className="text-gray-600">
                  Chat with intelligent assistants to help manage your tasks and productivity
                </p>
              </div>
            </div>
            
            <div className="hidden sm:flex space-x-3">
              <button 
                onClick={() => setSidebarOpen(true)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                History
              </button>
              <button 
                onClick={() => sessionManager.createNewSession()}
                className="inline-flex items-center px-4 py-2 bg-primary-600 border border-transparent rounded-lg text-sm font-medium text-white hover:bg-primary-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Chat
              </button>
            </div>
          </div>
        </div>

        {/* Chat Interface */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden" style={{ height: 'calc(100vh - 280px)' }}>
          <AgentChatWindow
            sessionId={sessionManager.currentSessionId}
            messages={sessionManager.currentMessages}
            selectedAgent={selectedAgent}
            isStreaming={isStreaming}
            userId={user?.id}
            availableAgents={availableAgents}
            onSendMessage={handleSendMessage}
            onCancelStream={handleCancelStream}
            onAgentChange={handleAgentChange}
            sidebarOpen={sidebarOpen}
            onSidebarToggle={setSidebarOpen}
            onSelectConversation={(conversation) => {
              sessionManager.switchToConversation(conversation)
            }}
            onCreateNewConversation={() => {
              sessionManager.createNewSession()
            }}
          />
        </div>

        {/* Footer */}
        <div className="mt-4 text-center text-sm text-gray-500">
          <p>AI responses are generated and may contain inaccuracies. Use with discretion.</p>
        </div>
      </div>
    </div>
  )
}
