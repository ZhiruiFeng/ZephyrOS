'use client'

import React, { useState, useEffect } from 'react'
import { Bot, Plus, MessageSquare } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useTranslation } from '../../contexts/LanguageContext'
import LoginPage from '../components/auth/LoginPage'
import { AgentChatWindow, Message } from '../components/agents'
import { Agent } from '../lib/agents/types'

export default function AgentsPage() {
  const { user, loading: authLoading } = useAuth()
  const { t } = useTranslation()

  // State management
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [selectedAgent, setSelectedAgent] = useState('gpt-4')
  const [isStreaming, setIsStreaming] = useState(false)
  const [availableAgents, setAvailableAgents] = useState<Agent[]>([])
  const [eventSource, setEventSource] = useState<EventSource | null>(null)
  const [streamEndedNormally, setStreamEndedNormally] = useState(false)
  const [lastUserId, setLastUserId] = useState<string | null>(null)

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
      if (lastUserId === user.id && sessionId) {
        console.log('User ID unchanged, keeping existing session:', sessionId)
        return
      }

      try {
        console.log('Creating new session for user:', user.id, 'agent:', selectedAgent)
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
          console.log('New session created:', data.sessionId)
          setSessionId(data.sessionId)
          setMessages([])
          setStreamEndedNormally(false) // Reset for new session
          setLastUserId(user.id)
        }
      } catch (error) {
        console.error('Error creating session:', error)
      }
    }

    createSession()
  }, [user, selectedAgent, lastUserId, sessionId])

  // Set up SSE connection when session is created
  useEffect(() => {
    if (!sessionId || !user) return

    // Add a small delay to ensure session is fully created
    const timer = setTimeout(() => {
      const connectSSE = async () => {
        // Close existing connection
        if (eventSource) {
          eventSource.close()
        }

        // Reset stream end flag for new connection
        setStreamEndedNormally(false)

        // Verify session exists before attempting SSE connection
        try {
          const sessionResponse = await fetch(`/api/agents/sessions?sessionId=${sessionId}`)
          if (!sessionResponse.ok) {
            console.error('Session not found, cannot establish SSE connection')
            return
          }
        } catch (error) {
          console.error('Failed to verify session existence:', error)
          return
        }

        try {
          const newEventSource = new EventSource(`/api/agents/stream?sessionId=${sessionId}`)
          
          newEventSource.onopen = () => {
            console.log('SSE connection opened for session:', sessionId)
            connectionSucceeded = true
          }

      newEventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          
          switch (data.type) {
            case 'connected':
              console.log('Connected to stream')
              break
              
            case 'start':
              setIsStreaming(true)
              break
              
            case 'token':
              setMessages(prev => {
                const lastMessage = prev[prev.length - 1]
                if (lastMessage && lastMessage.id === data.messageId && lastMessage.streaming) {
                  // Update the streaming message
                  return prev.map(msg => 
                    msg.id === data.messageId 
                      ? { ...msg, content: msg.content + data.content }
                      : msg
                  )
                } else {
                  // Create new streaming message
                  return [...prev, {
                    id: data.messageId,
                    type: 'agent' as const,
                    content: data.content || '',
                    timestamp: new Date(),
                    agent: selectedAgent,
                    streaming: true
                  }]
                }
              })
              break
              
            case 'tool_call':
              setMessages(prev => {
                return prev.map(msg => {
                  if (msg.id === data.messageId) {
                    const toolCalls = msg.toolCalls || []
                    return {
                      ...msg,
                      toolCalls: [...toolCalls, data.toolCall]
                    }
                  }
                  return msg
                })
              })
              break
              
            case 'tool_result':
              setMessages(prev => {
                return prev.map(msg => {
                  if (msg.id === data.messageId && msg.toolCalls) {
                    const updatedToolCalls = msg.toolCalls.map(tc => 
                      tc.id === data.toolCall.id ? data.toolCall : tc
                    )
                    return { ...msg, toolCalls: updatedToolCalls }
                  }
                  return msg
                })
              })
              break
              
            case 'end':
              setIsStreaming(false)
              setStreamEndedNormally(true)
              setMessages(prev => 
                prev.map(msg => 
                  msg.id === data.messageId 
                    ? { ...msg, streaming: false }
                    : msg
                )
              )
              break
              
            case 'error':
              setIsStreaming(false)
              console.error('Stream error:', data.error)
              setMessages(prev => [
                ...prev,
                {
                  id: Date.now().toString(),
                  type: 'system' as const,
                  content: `Error: ${data.error}`,
                  timestamp: new Date()
                }
              ])
              break
              
            case 'heartbeat':
              // Keep connection alive
              break
              
            default:
              console.log('Unknown SSE event:', data)
          }
        } catch (error) {
          console.error('Error parsing SSE data:', error)
        }
      }

          // Track connection attempts to avoid excessive error logging
          let connectionAttempted = false
          let connectionSucceeded = false
          
          newEventSource.onerror = () => {
            setIsStreaming(false)
            
            const readyState = newEventSource.readyState
            const readyStateText = readyState === 0 ? 'CONNECTING' : readyState === 1 ? 'OPEN' : 'CLOSED'
            
            // Only treat as error if stream didn't end normally
            if (!streamEndedNormally) {
              // If connection succeeded before, this might be a normal closure
              if (connectionSucceeded && readyState === EventSource.CLOSED) {
                console.log('SSE connection closed after successful operation')
                return
              }
              
              // Log establishment errors only once to avoid spam
              if (readyState === EventSource.CONNECTING && !connectionAttempted) {
                console.warn(`SSE connection error during establishment for session: ${sessionId}`, {
                  readyState: readyStateText,
                  timestamp: new Date().toISOString()
                })
                connectionAttempted = true
                // Don't treat establishment errors as fatal - connection might still succeed
                return
              } else if (readyState === EventSource.CLOSED && connectionSucceeded) {
                console.log('SSE connection closed unexpectedly, attempting reconnect...')
                setTimeout(async () => {
                  if (sessionId && user && !streamEndedNormally) {
                    await connectSSE()
                  }
                }, 3000)
              }
            } else {
              // Stream ended normally, just close the connection
              console.log('SSE connection closed after stream ended normally')
              if (readyState !== EventSource.CLOSED) {
                newEventSource.close()
              }
            }
          }

          setEventSource(newEventSource)
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
    }
  }, [sessionId, user])

  // Send message handler
  const handleSendMessage = async (message: string) => {
    if (!sessionId || !user) return

    // Reset stream end flag for new message
    setStreamEndedNormally(false)

    // Add user message to UI immediately
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: message,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, userMessage])
    setIsStreaming(true)

    try {
      const { getAuthHeader } = await import('../../lib/supabase')
      const authHeaders = await getAuthHeader()
      const response = await fetch('/api/agents/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          sessionId,
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
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          type: 'system',
          content: 'Failed to send message. Please try again.',
          timestamp: new Date()
        }
      ])
    }
  }

  // Cancel stream handler
  const handleCancelStream = async () => {
    if (!sessionId) return

    try {
      await fetch('/api/agents/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
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
              <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                <MessageSquare className="w-4 h-4 mr-2" />
                History
              </button>
              <button className="inline-flex items-center px-4 py-2 bg-primary-600 border border-transparent rounded-lg text-sm font-medium text-white hover:bg-primary-700">
                <Plus className="w-4 h-4 mr-2" />
                New Chat
              </button>
            </div>
          </div>
        </div>

        {/* Chat Interface */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden" style={{ height: 'calc(100vh - 280px)' }}>
          <AgentChatWindow
            sessionId={sessionId}
            messages={messages}
            selectedAgent={selectedAgent}
            isStreaming={isStreaming}
            availableAgents={availableAgents}
            onSendMessage={handleSendMessage}
            onCancelStream={handleCancelStream}
            onAgentChange={handleAgentChange}
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
