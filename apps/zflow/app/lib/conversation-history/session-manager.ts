import { useState, useCallback, useEffect } from 'react'
import { ConversationSummary, ConversationDetail, HistoricalMessage } from './types'
import { conversationHistoryService } from './service'
import { Message } from '../../components/agents/AgentChatWindow'

export interface SessionManagerState {
  // Current active session
  currentSessionId: string | null
  currentMessages: Message[]
  isLoadingMessages: boolean
  
  // Historical conversation being viewed
  viewingHistoricalConversation: boolean
  historicalConversation: ConversationDetail | null
  
  // Session management
  isCreatingSession: boolean
  error: string | null
}

export function useSessionManager(userId: string | null, selectedAgent: string) {
  const [state, setState] = useState<SessionManagerState>({
    currentSessionId: null,
    currentMessages: [],
    isLoadingMessages: false,
    viewingHistoricalConversation: false,
    historicalConversation: null,
    isCreatingSession: false,
    error: null
  })

  // Convert historical messages to current message format
  const convertHistoricalToCurrentMessages = useCallback((historicalMessages: HistoricalMessage[]): Message[] => {
    return historicalMessages.map(msg => ({
      id: msg.id,
      type: msg.type,
      content: msg.content,
      timestamp: msg.timestamp,
      agent: msg.agent,
      streaming: false, // Historical messages are never streaming
      toolCalls: msg.toolCalls
    }))
  }, [])

  // Load a specific conversation from history
  const loadHistoricalConversation = useCallback(async (sessionId: string) => {
    if (!userId) return

    setState(prev => ({ ...prev, isLoadingMessages: true, error: null }))

    try {
      const conversation = await conversationHistoryService.getConversation(sessionId, userId)
      
      if (!conversation) {
        setState(prev => ({ 
          ...prev, 
          isLoadingMessages: false, 
          error: 'Conversation not found' 
        }))
        return
      }

      // Convert historical messages to current format
      const currentMessages = convertHistoricalToCurrentMessages(conversation.messages)

      setState(prev => ({
        ...prev,
        currentSessionId: sessionId,
        currentMessages,
        viewingHistoricalConversation: true,
        historicalConversation: conversation,
        isLoadingMessages: false,
        error: null
      }))

    } catch (error) {
      console.error('Failed to load historical conversation:', error)
      setState(prev => ({
        ...prev,
        isLoadingMessages: false,
        error: 'Failed to load conversation'
      }))
    }
  }, [userId, convertHistoricalToCurrentMessages])

  // Create a new session (active session)
  const createNewSession = useCallback(async () => {
    if (!userId) return

    setState(prev => ({ ...prev, isCreatingSession: true, error: null }))

    try {
      // Reset to new session state
      setState(prev => ({
        ...prev,
        currentSessionId: null, // Will be set when Redis session is created
        currentMessages: [],
        viewingHistoricalConversation: false,
        historicalConversation: null,
        isCreatingSession: false,
        error: null
      }))

      return true
    } catch (error) {
      console.error('Failed to create new session:', error)
      setState(prev => ({
        ...prev,
        isCreatingSession: false,
        error: 'Failed to create new session'
      }))
      return false
    }
  }, [userId])

  // Switch to a conversation from history
  const switchToConversation = useCallback(async (conversation: ConversationSummary) => {
    await loadHistoricalConversation(conversation.id)
  }, [loadHistoricalConversation])

  // Update current session ID (called when Redis session is created)
  const setCurrentSessionId = useCallback((sessionId: string | null) => {
    setState(prev => ({
      ...prev,
      currentSessionId: sessionId,
      // If we're setting a new Redis session, we're no longer viewing historical
      viewingHistoricalConversation: sessionId ? false : prev.viewingHistoricalConversation
    }))
  }, [])

  // Update current messages (called when new messages arrive via SSE)
  const setCurrentMessages = useCallback((messages: Message[]) => {
    setState(prev => ({
      ...prev,
      currentMessages: messages,
      // If we're receiving new messages, we're in active mode
      viewingHistoricalConversation: false
    }))
  }, [])

  // Add a message to current session
  const addMessage = useCallback((message: Message) => {
    setState(prev => {
      // Check if message with this ID already exists to prevent duplicates
      const existingIndex = prev.currentMessages.findIndex(msg => msg.id === message.id)
      if (existingIndex !== -1) {
        // Message already exists, don't add duplicate
        return prev
      }
      
      return {
        ...prev,
        currentMessages: [...prev.currentMessages, message],
        viewingHistoricalConversation: false
      }
    })
  }, [])

  // Update a specific message (for streaming updates)
  const updateMessage = useCallback((messageId: string, updates: Partial<Message>) => {
    setState(prev => {
      const messageIndex = prev.currentMessages.findIndex(msg => msg.id === messageId)
      if (messageIndex === -1) {
        return prev
      }

      const updatedMessages = [...prev.currentMessages]
      updatedMessages[messageIndex] = { ...updatedMessages[messageIndex], ...updates }
      
      return {
        ...prev,
        currentMessages: updatedMessages
      }
    })
  }, [])

  // Save current session to Supabase (for backup/archival)
  const saveCurrentSessionToHistory = useCallback(async () => {
    if (!userId || !state.currentSessionId || state.currentMessages.length === 0) return

    try {
      // Create the session in Supabase if it doesn't exist
      const title = conversationHistoryService.generateConversationTitle(
        conversationHistoryService.convertToHistoricalMessages(state.currentMessages)
      )

      await conversationHistoryService.createConversation(userId, selectedAgent, title)
      
    } catch (error) {
      // Intentionally ignore backup failures in UI; backend logs should capture details
    }
  }, [userId, selectedAgent, state.currentSessionId, state.currentMessages])

  // Auto-save current session periodically
  useEffect(() => {
    if (!state.viewingHistoricalConversation && state.currentMessages.length > 0) {
      const timeoutId = setTimeout(saveCurrentSessionToHistory, 30000) // Save every 30 seconds
      return () => clearTimeout(timeoutId)
    }
  }, [state.currentMessages, state.viewingHistoricalConversation, saveCurrentSessionToHistory])

  return {
    // State
    ...state,
    
    // Actions
    loadHistoricalConversation,
    createNewSession,
    switchToConversation,
    setCurrentSessionId,
    setCurrentMessages,
    addMessage,
    updateMessage,
    saveCurrentSessionToHistory,

    // Computed properties
    isActive: !state.viewingHistoricalConversation,
    canSendMessages: !state.viewingHistoricalConversation && !state.isLoadingMessages,
    displayTitle: state.historicalConversation?.title || 'New Conversation',
    messageCount: state.currentMessages.length
  }
}
