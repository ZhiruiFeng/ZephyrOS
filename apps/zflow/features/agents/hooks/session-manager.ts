import { useState, useCallback, useEffect, useRef } from 'react'
import { ConversationSummary, ConversationDetail, HistoricalMessage } from '../types/conversation-history'
import { conversationHistoryService } from '../utils/conversation-history-service'
import { Message } from '../types/agents'

export interface SessionManagerState {
  // Current active session (Redis)
  currentSessionId: string | null
  currentMessages: Message[]
  isLoadingMessages: boolean

  // Historical conversation being viewed
  viewingHistoricalConversation: boolean
  historicalConversation: ConversationDetail | null
  historicalSessionId: string | null // Store the historical session ID separately
  needsRedisRestore: boolean // Flag to indicate session needs Redis restoration

  // Session management
  isCreatingSession: boolean
  error: string | null
}

export function useSessionManager(userId: string | null, selectedAgent: string, onHistoryUpdate?: () => void) {
  const [state, setState] = useState<SessionManagerState>({
    currentSessionId: null,
    currentMessages: [],
    isLoadingMessages: false,
    viewingHistoricalConversation: false,
    historicalConversation: null,
    historicalSessionId: null,
    needsRedisRestore: false,
    isCreatingSession: false,
    error: null
  })

  // Track last saved state to prevent duplicate saves
  const lastSavedStateRef = useRef<{
    messageCount: number
    lastMessageId: string | null
    isSaving: boolean
  }>({
    messageCount: 0,
    lastMessageId: null,
    isSaving: false
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

    console.log('📖 Loading historical conversation:', sessionId)
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
        currentSessionId: sessionId, // Use original session ID
        currentMessages,
        viewingHistoricalConversation: false, // Treat as active conversation
        historicalConversation: conversation,
        historicalSessionId: null, // No need for separate tracking
        needsRedisRestore: true, // Flag that this session needs Redis restoration
        isLoadingMessages: false,
        error: null
      }))

      console.log(`📖 Loaded ${currentMessages.length} historical messages from session: ${sessionId}`)

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

    console.log('🆕 Creating new chat session...')
    setState(prev => ({ ...prev, isCreatingSession: true, error: null }))

    try {
      // Reset to new session state
      setState(prev => ({
        ...prev,
        currentSessionId: null, // Will be set when Redis session is created
        currentMessages: [],
        viewingHistoricalConversation: false,
        historicalConversation: null,
        historicalSessionId: null, // Clear historical session ID for new chat
        needsRedisRestore: false, // Clear restoration flag for new chat
        isCreatingSession: false,
        error: null
      }))

      console.log('🆕 New chat session state reset - ready for fresh conversation')
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
      isCreatingSession: false, // Reset creating session flag
      needsRedisRestore: false, // Clear restoration flag since session is now in Redis
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

  // Transition historical conversation to active session for continued messaging
  const continueHistoricalConversation = useCallback(async () => {
    if (!state.viewingHistoricalConversation || !userId) return null

    // We need to signal that a Redis session should be created
    // The session ID will be set by setCurrentSessionId when the Redis session is created
    setState(prev => ({
      ...prev,
      viewingHistoricalConversation: false, // Now it becomes an active conversation
      isCreatingSession: true
    }))

    return state.historicalSessionId // Return the historical ID for reference
  }, [state.viewingHistoricalConversation, state.historicalSessionId, userId])

  // Add a message to current session
  const addMessage = useCallback(async (message: Message) => {
    setState(prev => {
      // Check if message with this ID already exists to prevent duplicates
      const existingIndex = prev.currentMessages.findIndex(msg => msg.id === message.id)
      if (existingIndex !== -1) {
        // Message already exists, don't add duplicate
        return prev
      }

      let newState = {
        ...prev,
        currentMessages: [...prev.currentMessages, message]
      }

      // If we're viewing historical conversation, transition to active
      if (prev.viewingHistoricalConversation) {
        newState.viewingHistoricalConversation = false
        newState.isCreatingSession = true // Signal that we need a Redis session
      }

      return newState
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
    if (!userId || state.currentMessages.length === 0) return

    // Check if we need to save (prevent duplicate saves)
    const currentMessageCount = state.currentMessages.length
    const lastMessageId = state.currentMessages[state.currentMessages.length - 1]?.id || null
    const lastSavedState = lastSavedStateRef.current

    // Skip if already saving or no changes since last save
    if (lastSavedState.isSaving ||
        (lastSavedState.messageCount === currentMessageCount &&
         lastSavedState.lastMessageId === lastMessageId)) {
      return
    }

    // Set saving flag to prevent concurrent saves
    lastSavedStateRef.current.isSaving = true

    try {
      // Convert messages to historical format
      const historicalMessages = conversationHistoryService.convertToHistoricalMessages(state.currentMessages)

      // Generate title from first user message
      const title = conversationHistoryService.generateConversationTitle(historicalMessages)

      // Determine which session ID to use for saving
      let sessionIdToUse: string
      if (state.viewingHistoricalConversation && state.historicalSessionId) {
        // Continuing historical conversation - use historical session ID
        sessionIdToUse = state.historicalSessionId
        console.log('💾 Saving to historical session:', state.historicalSessionId)
      } else if (state.currentSessionId) {
        // New conversation - use current Redis session ID
        sessionIdToUse = state.currentSessionId
        console.log('💾 Saving to new session:', state.currentSessionId)
      } else {
        console.warn('💾 No session ID available for saving')
        return
      }

      // Save the conversation with all messages to zmemory
      await conversationHistoryService.saveConversationWithMessages(
        sessionIdToUse,
        userId,
        selectedAgent,
        historicalMessages,
        title
      )

      // Update last saved state
      lastSavedStateRef.current = {
        messageCount: currentMessageCount,
        lastMessageId: lastMessageId,
        isSaving: false
      }

      // Refresh the conversation history sidebar to show the new/updated conversation
      onHistoryUpdate?.()

    } catch (error) {
      // Reset saving flag on error
      lastSavedStateRef.current.isSaving = false
      // Intentionally ignore backup failures in UI; backend logs should capture details
      console.warn('Failed to save conversation to history:', error)
    }
  }, [userId, selectedAgent, state.currentSessionId, state.historicalSessionId, state.currentMessages, state.viewingHistoricalConversation, onHistoryUpdate])

  // Save to history when LLM completes a response (better UX than periodic saves)
  useEffect(() => {
    if (!state.viewingHistoricalConversation &&
        state.currentMessages.length > 0 &&
        state.currentSessionId) {

      // Check if the last message is a completed agent response
      const lastMessage = state.currentMessages[state.currentMessages.length - 1]
      const isCompletedAgentResponse = lastMessage?.type === 'agent' && !lastMessage?.streaming

      if (isCompletedAgentResponse) {
        // Save immediately after agent completes response
        saveCurrentSessionToHistory()
      }
    }
  }, [state.currentMessages, state.viewingHistoricalConversation, state.currentSessionId, saveCurrentSessionToHistory])

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
    continueHistoricalConversation,

    // Computed properties
    isActive: !state.viewingHistoricalConversation,
    canSendMessages: !state.isLoadingMessages, // Allow sending messages to historical conversations
    displayTitle: state.historicalConversation?.title || 'New Conversation',
    messageCount: state.currentMessages.length,
    needsRedisSession: state.viewingHistoricalConversation || (state.isCreatingSession && !state.currentSessionId) || state.needsRedisRestore
  }
}