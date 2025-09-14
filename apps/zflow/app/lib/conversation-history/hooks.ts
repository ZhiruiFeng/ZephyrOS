import { useState, useEffect, useCallback } from 'react'
import { conversationHistoryService } from './service'
import { ConversationSummary, ConversationDetail, ConversationSearchResult } from './types'

/**
 * Hook for managing conversation history list
 */
export function useConversationHistory(userId: string | null) {
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadConversations = useCallback(async (options: { includeArchived?: boolean } = {}) => {
    if (!userId) return

    setLoading(true)
    setError(null)

    try {
      const data = await conversationHistoryService.getUserConversations(userId, {
        limit: 50,
        includeArchived: options.includeArchived || false
      })
      setConversations(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversations')
      console.error('Error loading conversations:', err)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  const refreshConversations = useCallback(() => {
    return loadConversations()
  }, [loadConversations])

  return {
    conversations,
    loading,
    error,
    refreshConversations,
    loadConversations
  }
}

/**
 * Hook for managing a specific conversation
 */
export function useConversationDetail(sessionId: string | null, userId: string | null) {
  const [conversation, setConversation] = useState<ConversationDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadConversation = useCallback(async () => {
    if (!sessionId || !userId) {
      setConversation(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const data = await conversationHistoryService.getConversation(sessionId, userId)
      setConversation(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversation')
      console.error('Error loading conversation:', err)
    } finally {
      setLoading(false)
    }
  }, [sessionId, userId])

  useEffect(() => {
    loadConversation()
  }, [loadConversation])

  const updateConversation = useCallback(async (updates: {
    title?: string
    summary?: string
    isArchived?: boolean
  }) => {
    if (!sessionId || !userId) return

    try {
      const updatedConversation = await conversationHistoryService.updateConversation(
        sessionId, 
        userId, 
        updates
      )
      setConversation(updatedConversation)
      return updatedConversation
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update conversation')
      throw err
    }
  }, [sessionId, userId])

  return {
    conversation,
    loading,
    error,
    loadConversation,
    updateConversation
  }
}

/**
 * Hook for conversation search
 */
export function useConversationSearch(userId: string | null) {
  const [results, setResults] = useState<ConversationSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  const search = useCallback(async (searchQuery: string) => {
    if (!userId || !searchQuery.trim()) {
      setResults([])
      return
    }

    setLoading(true)
    setError(null)
    setQuery(searchQuery)

    try {
      const data = await conversationHistoryService.searchConversations(userId, searchQuery, 20)
      setResults(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
      console.error('Error searching conversations:', err)
    } finally {
      setLoading(false)
    }
  }, [userId])

  const clearSearch = useCallback(() => {
    setResults([])
    setQuery('')
    setError(null)
  }, [])

  return {
    results,
    loading,
    error,
    query,
    search,
    clearSearch
  }
}

/**
 * Hook for managing conversation operations (delete, archive, etc.)
 */
export function useConversationActions(userId: string | null) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const deleteConversation = useCallback(async (sessionId: string) => {
    if (!userId) return

    setLoading(true)
    setError(null)

    try {
      await conversationHistoryService.deleteConversation(sessionId, userId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete conversation')
      throw err
    } finally {
      setLoading(false)
    }
  }, [userId])

  const archiveConversation = useCallback(async (sessionId: string) => {
    if (!userId) return

    setLoading(true)
    setError(null)

    try {
      await conversationHistoryService.updateConversation(sessionId, userId, {
        isArchived: true
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to archive conversation')
      throw err
    } finally {
      setLoading(false)
    }
  }, [userId])

  const unarchiveConversation = useCallback(async (sessionId: string) => {
    if (!userId) return

    setLoading(true)
    setError(null)

    try {
      await conversationHistoryService.updateConversation(sessionId, userId, {
        isArchived: false
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unarchive conversation')
      throw err
    } finally {
      setLoading(false)
    }
  }, [userId])

  const renameConversation = useCallback(async (sessionId: string, newTitle: string) => {
    if (!userId) return

    setLoading(true)
    setError(null)

    try {
      await conversationHistoryService.updateConversation(sessionId, userId, {
        title: newTitle
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rename conversation')
      throw err
    } finally {
      setLoading(false)
    }
  }, [userId])

  return {
    loading,
    error,
    deleteConversation,
    archiveConversation,
    unarchiveConversation,
    renameConversation
  }
}