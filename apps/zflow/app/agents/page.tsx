'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Bot, Plus, MessageSquare, MessageCircle, Mic } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useTranslation } from '../../contexts/LanguageContext'
import LoginPage from '../components/auth/LoginPage'
import { AgentChatWindow, Message } from '../components/agents'
import { Agent } from '../lib/agents/types'
import { ConversationSummary } from '../lib/conversation-history/types'
import { useSessionManager } from '../lib/conversation-history/session-manager'
import BatchTranscriber from '../speech/components/BatchTranscriber'
import MCPStatusIndicator from '../components/agents/MCPStatusIndicator'

export default function AgentsPage() {
  const { user, loading: authLoading } = useAuth()
  const { t } = useTranslation()

  // State management
  const [selectedAgent, setSelectedAgent] = useState('gpt-4')
  const [isStreaming, setIsStreaming] = useState(false)
  const [availableAgents, setAvailableAgents] = useState<Agent[]>([])
  const [streamEndedNormally, setStreamEndedNormally] = useState(false)
  const [lastUserId, setLastUserId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sseReady, setSseReady] = useState(false)
  const [interfaceMode, setInterfaceMode] = useState<'text' | 'voice'>('text')
  const sseReadyRef = useRef(false)
  // Stable EventSource holder (avoid re-renders on connection changes)
  const eventSourceRef = useRef<EventSource | null>(null)
  // Reconnect/backoff state
  const reconnectAttemptRef = useRef(0)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Ensure we verify/restore a given sessionId only once
  const verifiedSessionIdRef = useRef<string | null>(null)
  // Prevent duplicate session creation in dev/StrictMode
  const sessionCreationInFlightRef = useRef(false)
  const sessionCreatedKeyRef = useRef<string | null>(null)
  // Keep a live map of current messages to avoid stale-closure lookups in SSE callbacks
  const messagesMapRef = useRef<Map<string, Message>>(new Map())
  
  // Track messages being processed to prevent race conditions
  const processingMessagesRef = useRef<Set<string>>(new Set())

  // Create ref for conversation history refresh function
  const refreshHistoryRef = useRef<(() => Promise<void>) | null>(null)

  // Session management with conversation history
  const sessionManager = useSessionManager(user?.id || null, selectedAgent, () => {
    refreshHistoryRef.current?.()
  })

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
        sessionCreatedKeyRef.current = null
        sessionCreationInFlightRef.current = false
        return
      }

      // Idempotency key for this user+agent pair
      const key = `${user.id}:${selectedAgent}`
      if (sessionCreatedKeyRef.current === key || sessionCreationInFlightRef.current) {
        return
      }

      // Only create new session if user actually changed, not just auth state refresh
      if (lastUserId === user.id && sessionManager.currentSessionId) {
        sessionCreatedKeyRef.current = key
        return
      }

      try {
        sessionCreationInFlightRef.current = true
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
          sessionCreatedKeyRef.current = key
        }
      } catch (error) {
        console.error('Error creating session:', error)
      } finally {
        sessionCreationInFlightRef.current = false
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
        // Close existing connection, if any
        if (eventSourceRef.current) {
          try { eventSourceRef.current.close() } catch {}
          eventSourceRef.current = null
        }

        // Reset stream end flag for new connection
        setStreamEndedNormally(false)
        
        // Clear processing messages for new session
        processingMessagesRef.current.clear()

        // For historical conversations, try to restore session if it doesn't exist in Redis
        try {
          if (verifiedSessionIdRef.current !== sessionManager.currentSessionId) {
            const sessionResponse = await fetch(`/api/agents/sessions?sessionId=${sessionManager.currentSessionId}`)
            if (!sessionResponse.ok) {
              // If session doesn't exist and we're viewing a historical conversation, restore it
              if (sessionManager.viewingHistoricalConversation || sessionManager.needsRedisSession) {
                console.log('🔄 Restoring historical session to Redis for SSE connection')
                try {
                  const restoreResponse = await fetch('/api/agents/sessions/restore', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      sessionId: sessionManager.currentSessionId,
                      userId: user?.id,
                      agentId: selectedAgent,
                      messages: sessionManager.currentMessages.map(msg => ({
                        id: msg.id,
                        type: msg.type,
                        content: msg.content,
                        timestamp: msg.timestamp,
                        agent: msg.agent,
                        toolCalls: msg.toolCalls || []
                      }))
                    })
                  })

                  if (!restoreResponse.ok) {
                    console.warn('Failed to restore session for SSE connection')
                    return
                  } else {
                    console.log('✅ Session restored to Redis for SSE connection')
                    // Clear the restoration flag since session is now in Redis
                    sessionManager.setCurrentSessionId(sessionManager.currentSessionId)
                  }
                } catch (restoreError) {
                  console.warn('Error restoring session for SSE:', restoreError)
                  return
                }
              } else {
                console.error('Session not found, cannot establish SSE connection')
                return
              }
            }
            // Mark this sessionId as verified to avoid re-checks
            verifiedSessionIdRef.current = sessionManager.currentSessionId
          }
        } catch (error) {
          console.error('Failed to verify session existence:', error)
          return
        }

        try {
          const newEventSource = new EventSource(`/api/agents/stream?sessionId=${sessionManager.currentSessionId}`)
          eventSourceRef.current = newEventSource
          
          newEventSource.onopen = () => {
            // Reset backoff on successful open
            reconnectAttemptRef.current = 0
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
                    const updatedToolCalls = messageWithTools.toolCalls.map((tc: any) => tc.id === data.toolCall.id ? data.toolCall : tc)
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
              }
            } catch (error) {
              console.error('Error parsing SSE data:', error)
            }
          }

          newEventSource.onerror = () => {
            setSseReady(false)
            sseReadyRef.current = false
            setIsStreaming(false)

            // Exponential backoff reconnect (3s, 6s, 12s, capped at 30s)
            const attempt = reconnectAttemptRef.current + 1
            reconnectAttemptRef.current = attempt
            const delay = Math.min(3000 * Math.pow(2, attempt - 1), 30000)

            if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
            reconnectTimerRef.current = setTimeout(() => {
              // Only reconnect if session/user are still valid and stream didn't end normally
              if (sessionManager.currentSessionId && user && !streamEndedNormally) {
                connectSSE()
              }
            }, delay)
          }
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
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current)
        reconnectTimerRef.current = null
      }
      if (eventSourceRef.current) {
        try { eventSourceRef.current.close() } catch {}
        eventSourceRef.current = null
      }
      setSseReady(false)
      sseReadyRef.current = false
    }
  }, [sessionManager.currentSessionId, user?.id, sessionManager.isActive])

  // Send message handler
  const handleSendMessage = async (message: string) => {
    if (!user || !sessionManager.canSendMessages) return

    // If we need a Redis session (no active session), create one
    if (!sessionManager.currentSessionId) {
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
          console.log(`✅ Created new Redis session: ${data.sessionId}`)
        } else {
          console.error('Failed to create session:', await response.text())
          return
        }
      } catch (error) {
        console.error('Failed to create session:', error)
        return
      }
    } else {
      // Check if this Redis session exists, if not populate it with current messages
      try {
        const checkResponse = await fetch(`/api/agents/sessions?sessionId=${sessionManager.currentSessionId}`)
        if (!checkResponse.ok) {
          // Session doesn't exist in Redis, need to populate it
          console.log(`🔄 Populating Redis session ${sessionManager.currentSessionId} with historical messages`)

          const createResponse = await fetch('/api/agents/sessions/restore', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: sessionManager.currentSessionId,
              userId: user.id,
              agentId: selectedAgent,
              messages: sessionManager.currentMessages.map(msg => ({
                id: msg.id,
                type: msg.type,
                content: msg.content,
                timestamp: msg.timestamp,
                agent: msg.agent,
                toolCalls: msg.toolCalls || []
              }))
            })
          })

          if (!createResponse.ok) {
            console.warn('Failed to restore session to Redis')
          }
        }
      } catch (error) {
        console.warn('Error checking/restoring Redis session:', error)
      }
    }

    if (!sessionManager.currentSessionId) return

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
      // For historical conversations, send current UI messages as context
      const contextMessages = sessionManager.viewingHistoricalConversation || sessionManager.needsRedisSession
        ? sessionManager.currentMessages.map(msg => ({
            id: msg.id,
            type: msg.type,
            content: msg.content,
            timestamp: msg.timestamp,
            agent: msg.agent,
            toolCalls: msg.toolCalls || []
          }))
        : undefined

      const response = await fetch('/api/agents/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          sessionId: sessionManager.currentSessionId,
          message,
          userId: user.id,
          contextMessages
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
    <div className="relative overflow-hidden min-h-screen bg-gradient-to-br from-primary-50 to-primary-100">
      {/* Subtle top glow for cohesive theming */}
      <div aria-hidden className="pointer-events-none absolute -inset-x-24 -top-24 h-56 blur-3xl opacity-25 dark:opacity-20 animate-glow-drift">
        <div
          className="h-full w-full"
          style={{
            background:
              'radial-gradient(520px circle at 15% 0%, rgba(56,189,248,0.55) 0%, transparent 60%),\n' +
              'radial-gradient(640px circle at 85% -10%, rgba(2,132,199,0.40) 0%, transparent 65%)'
          }}
        />
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="relative">
                <div className="inline-flex items-center justify-center w-10 h-10 sm:w-14 sm:h-14 bg-gradient-to-br from-primary-600 to-primary-700 rounded-xl sm:rounded-2xl shadow-lg">
                  <Bot className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 bg-emerald-500 rounded-full border-2 border-white animate-pulse"></div>
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-xl sm:text-3xl font-bold bg-gradient-to-r from-primary-700 to-primary-500 dark:from-primary-300 dark:to-primary-400 bg-clip-text text-transparent truncate">
                  {t.agents.chatTitle}
                </h1>
                <p className="text-gray-600 mt-1 text-sm sm:text-base hidden sm:block">
                  {t.agents.chatSubtitle}
                </p>
              </div>
            </div>
            
            <div className="flex space-x-2 sm:space-x-3">
              {/* MCP Status Indicator */}
              <MCPStatusIndicator />

              {/* Interface Mode Toggle */}
              <div className="inline-flex items-center bg-white/80 backdrop-blur-sm border border-primary-100 rounded-lg sm:rounded-xl p-1">
                <button
                  onClick={() => setInterfaceMode('text')}
                  className={`inline-flex items-center px-2 py-1.5 sm:px-3 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-all duration-200 ${
                    interfaceMode === 'text'
                      ? 'bg-primary-600 text-white shadow-md'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <MessageCircle className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1.5" />
                  <span className="hidden sm:inline">Text</span>
                </button>
                <button
                  onClick={() => setInterfaceMode('voice')}
                  className={`inline-flex items-center px-2 py-1.5 sm:px-3 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-all duration-200 ${
                    interfaceMode === 'voice'
                      ? 'bg-primary-600 text-white shadow-md'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Mic className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1.5" />
                  <span className="hidden sm:inline">Voice</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Chat Interface */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden" style={{ height: 'calc(100vh - 200px)' }}>
          {interfaceMode === 'text' ? (
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
              refreshHistoryRef={refreshHistoryRef}
            />
          ) : (
            <div className="p-6 h-full flex flex-col">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Voice Interface</h2>
                <p className="text-gray-600">Record your voice and get transcriptions. Use the text interface to chat with agents.</p>
              </div>
              <div className="flex-1 overflow-auto">
                <BatchTranscriber />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500 bg-white/60 backdrop-blur-sm rounded-lg px-4 py-2 inline-block">
            {t.agents.aiDisclaimer}
          </p>
        </div>
      </div>
    </div>
  )
}
