import {
  ConversationSummary,
  ConversationDetail,
  ConversationSearchResult,
  ConversationStats,
  ConversationHistoryFilter,
  ConversationsResponse,
  ConversationDetailResponse,
  ConversationSearchResponse,
  ConversationStatsResponse,
  HistoricalMessage
} from '../types/conversation-history'
import { resolveZmemoryOrigin } from '@/lib/api/zmemory-api-base'
import { authManager } from '@/lib/auth-manager'

// Configuration for zmemory API endpoints
const ZMEMORY_ORIGIN = resolveZmemoryOrigin('http://localhost:3001') || 'http://localhost:3001'

/**
 * Service for managing conversation history via zmemory API
 */
export class ConversationHistoryService {

  /**
   * Fetch user's conversation history
   */
  async getUserConversations(
    userId: string,
    options: {
      limit?: number
      includeArchived?: boolean
    } = {}
  ): Promise<ConversationSummary[]> {
    try {
      const params = new URLSearchParams({
        userId,
        limit: (options.limit || 50).toString()
      })

      if (options.includeArchived) {
        params.set('includeArchived', 'true')
      }

      const authHeaders = await authManager.getAuthHeaders()
      const response = await fetch(`${ZMEMORY_ORIGIN}/api/conversations?${params}`, {
        headers: authHeaders
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch conversations: ${response.statusText}`)
      }

      const data: ConversationsResponse = await response.json()

      return data.conversations.map(conv => ({
        ...conv,
        createdAt: new Date(conv.createdAt),
        updatedAt: new Date(conv.updatedAt),
        lastMessagePreview: this.truncateText(conv.summary || '', 60),
        agentName: this.getAgentDisplayName(conv.agentId)
      }))

    } catch (error) {
      console.error('Error fetching user conversations:', error)
      throw error
    }
  }

  /**
   * Get specific conversation with full message history
   */
  async getConversation(sessionId: string, userId: string): Promise<ConversationDetail | null> {
    try {
      const params = new URLSearchParams({ userId })
      const authHeaders = await authManager.getAuthHeaders()
      const response = await fetch(`${ZMEMORY_ORIGIN}/api/conversations/${sessionId}?${params}`, {
        headers: authHeaders
      })

      if (response.status === 404) {
        return null
      }

      if (!response.ok) {
        const errorText = await response.text().catch(() => response.statusText)
        console.error(`Failed to fetch conversation ${sessionId}:`, errorText)
        throw new Error(`Failed to fetch conversation: ${response.statusText}`)
      }

      const data: ConversationDetailResponse = await response.json()

      return {
        ...data.conversation,
        createdAt: new Date(data.conversation.createdAt),
        updatedAt: new Date(data.conversation.updatedAt),
        messages: data.conversation.messages.map(msg => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }))
      }

    } catch (error) {
      console.error('Error fetching conversation:', error)
      throw error
    }
  }

  /**
   * Search across user's conversation history
   */
  async searchConversations(
    userId: string,
    query: string,
    limit = 20
  ): Promise<ConversationSearchResult[]> {
    try {
      const params = new URLSearchParams({
        userId,
        q: query,
        limit: limit.toString()
      })

      const authHeaders = await authManager.getAuthHeaders()
      const response = await fetch(`${ZMEMORY_ORIGIN}/api/conversations/search?${params}`, {
        headers: authHeaders
      })

      if (!response.ok) {
        throw new Error(`Failed to search conversations: ${response.statusText}`)
      }

      const data: ConversationSearchResponse = await response.json()

      return data.results.map(result => ({
        ...result,
        message: {
          ...result.message,
          timestamp: new Date(result.message.timestamp)
        }
      }))

    } catch (error) {
      console.error('Error searching conversations:', error)
      throw error
    }
  }

  /**
   * Update conversation metadata (title, summary, archive status)
   */
  async updateConversation(
    sessionId: string,
    userId: string,
    updates: {
      title?: string
      summary?: string
      isArchived?: boolean
    }
  ): Promise<ConversationDetail> {
    try {
      const authHeaders = await authManager.getAuthHeaders()
      const response = await fetch(`${ZMEMORY_ORIGIN}/api/conversations/${sessionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify({
          userId,
          ...updates
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to update conversation: ${response.statusText}`)
      }

      const data: ConversationDetailResponse = await response.json()

      return {
        ...data.conversation,
        createdAt: new Date(data.conversation.createdAt),
        updatedAt: new Date(data.conversation.updatedAt),
        messages: data.conversation.messages.map(msg => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }))
      }

    } catch (error) {
      console.error('Error updating conversation:', error)
      throw error
    }
  }

  /**
   * Delete a conversation
   */
  async deleteConversation(sessionId: string, userId: string): Promise<void> {
    try {
      const authHeaders = await authManager.getAuthHeaders()
      const response = await fetch(`${ZMEMORY_ORIGIN}/api/conversations/${sessionId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify({ userId })
      })

      if (!response.ok) {
        throw new Error(`Failed to delete conversation: ${response.statusText}`)
      }

    } catch (error) {
      console.error('Error deleting conversation:', error)
      throw error
    }
  }

  /**
   * Get conversation statistics for user
   */
  async getConversationStats(userId: string): Promise<ConversationStats> {
    try {
      const params = new URLSearchParams({ userId })
      const authHeaders = await authManager.getAuthHeaders()
      const response = await fetch(`${ZMEMORY_ORIGIN}/api/conversations/stats?${params}`, {
        headers: authHeaders
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch conversation stats: ${response.statusText}`)
      }

      const data: ConversationStatsResponse = await response.json()
      return data.stats

    } catch (error) {
      console.error('Error fetching conversation stats:', error)
      throw error
    }
  }

  /**
   * Create a new conversation in zmemory (for backup purposes)
   */
  async createConversation(
    userId: string,
    agentId: string,
    title?: string
  ): Promise<ConversationSummary> {
    try {
      const authHeaders = await authManager.getAuthHeaders()
      const response = await fetch(`${ZMEMORY_ORIGIN}/api/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify({
          userId,
          agentId,
          title
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to create conversation: ${response.statusText}`)
      }

      const data: ConversationDetailResponse = await response.json()

      return {
        ...data.conversation,
        createdAt: new Date(data.conversation.createdAt),
        updatedAt: new Date(data.conversation.updatedAt),
        messageCount: data.conversation.messages.length,
        lastMessagePreview: '',
        agentName: this.getAgentDisplayName(data.conversation.agentId)
      }

    } catch (error) {
      console.error('Error creating conversation:', error)
      throw error
    }
  }

  /**
   * Save conversation with messages to zmemory
   */
  async saveConversationWithMessages(
    sessionId: string,
    userId: string,
    agentId: string,
    messages: HistoricalMessage[],
    title?: string
  ): Promise<ConversationSummary> {
    try {
      console.log(`Saving conversation for agent: ${agentId}`)

      // First, try to get existing conversation
      const existing = await this.getConversation(sessionId, userId)

      if (existing) {
        // Find new messages that aren't already saved
        const existingMessageIds = new Set(existing.messages.map(msg => msg.id))
        const newMessages = messages.filter(msg => !existingMessageIds.has(msg.id))

        if (newMessages.length > 0) {
          // Only send new messages to avoid duplicates
          const authHeaders = await authManager.getAuthHeaders()
          const response = await fetch(`${ZMEMORY_ORIGIN}/api/conversations/${sessionId}/messages`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...authHeaders
            },
            body: JSON.stringify({
              userId,
              messages: newMessages.map(msg => ({
                id: msg.id,
                type: msg.type,
                content: msg.content,
                timestamp: msg.timestamp.toISOString(),
                agent: msg.agent,
                toolCalls: msg.toolCalls || []
              }))
            })
          })

          if (!response.ok) {
            console.warn(`Failed to update conversation messages: ${response.statusText}`)
          }
        }

        return {
          ...existing,
          messageCount: messages.length,
          lastMessagePreview: this.truncateText(messages[messages.length - 1]?.content || '', 60)
        }
      } else {
        // Create new conversation with all messages
        const authHeaders = await authManager.getAuthHeaders()
        const response = await fetch(`${ZMEMORY_ORIGIN}/api/conversations`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders
          },
          body: JSON.stringify({
            userId,
            agentId,
            title,
            sessionId,
            messages: messages.map(msg => ({
              id: msg.id,
              type: msg.type,
              content: msg.content,
              timestamp: msg.timestamp.toISOString(),
              agent: msg.agent,
              toolCalls: msg.toolCalls || []
            }))
          })
        })

        if (!response.ok) {
          const errorText = await response.text().catch(() => response.statusText)
          console.error(`Failed to create conversation for agent ${agentId}:`, errorText)
          throw new Error(`Failed to create conversation: ${response.statusText}`)
        }

        const data: ConversationDetailResponse = await response.json()

        return {
          ...data.conversation,
          createdAt: new Date(data.conversation.createdAt),
          updatedAt: new Date(data.conversation.updatedAt),
          messageCount: messages.length,
          lastMessagePreview: this.truncateText(messages[messages.length - 1]?.content || '', 60),
          agentName: this.getAgentDisplayName(data.conversation.agentId)
        }
      }

    } catch (error) {
      console.error('Error saving conversation with messages:', error)
      throw error
    }
  }

  // Helper methods

  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength).trim() + '...'
  }

  private getAgentDisplayName(agentId: string): string {
    const agentNames: Record<string, string> = {
      'gpt-4': 'GPT-4',
      'gpt-4-turbo': 'GPT-4 Turbo',
      'gpt-3.5-turbo': 'GPT-3.5',
      'claude-3-opus': 'Claude 3 Opus',
      'claude-3-sonnet': 'Claude 3 Sonnet',
      'claude-3-haiku': 'Claude 3 Haiku'
    }
    return agentNames[agentId] || agentId
  }

  /**
   * Convert current session messages to historical format
   */
  convertToHistoricalMessages(messages: any[]): HistoricalMessage[] {
    return messages.map(msg => ({
      id: msg.id,
      type: msg.type,
      content: msg.content,
      timestamp: msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp),
      agent: msg.agent,
      streaming: msg.streaming || false,
      toolCalls: msg.toolCalls || []
    }))
  }

  /**
   * Generate title from first user message
   */
  generateConversationTitle(messages: HistoricalMessage[]): string {
    const firstUserMessage = messages.find(msg => msg.type === 'user')
    if (!firstUserMessage) return 'New Conversation'

    const title = this.truncateText(firstUserMessage.content, 50)
    return title || 'New Conversation'
  }
}

// Singleton instance
export const conversationHistoryService = new ConversationHistoryService()