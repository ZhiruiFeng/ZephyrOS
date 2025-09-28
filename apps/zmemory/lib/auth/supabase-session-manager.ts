import { supabaseServer, supabaseAuth, ChatSessionRow, ChatMessageRow } from '@/lib/supabase-server'
import { ChatSession, AgentMessage } from '@/types/agents'

export class SupabaseSessionManager {
  private getDb() {
    if (!supabaseServer) {
      throw new Error('Supabase is not configured on the server')
    }
    return supabaseServer
  }
  
  /**
   * Create a new chat session in Supabase
   */
  async createSession(userId: string, agentId: string, title?: string, sessionId?: string): Promise<ChatSession> {
    const now = new Date()

    const insertData: any = {
      user_id: userId,
      agent_id: agentId,
      title: title || `Chat with ${agentId}`,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      message_count: 0,
      is_archived: false,
      metadata: {}
    }

    // Use custom sessionId if provided
    if (sessionId) {
      insertData.id = sessionId
    }

    const db = this.getDb()
    const { data, error } = await db
      .from('chat_sessions')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create session: ${error.message}`)
    }

    return this.mapRowToSession(data)
  }

  /**
   * Get a specific session by ID
   */
  async getSession(sessionId: string, userId?: string): Promise<ChatSession | null> {
    const db = this.getDb()
    let query = db
      .from('chat_sessions')
      .select(`
        *,
        chat_messages (
          id,
          message_id,
          type,
          content,
          agent_name,
          tool_calls,
          streaming,
          created_at,
          message_index
        )
      `)
      .eq('id', sessionId)

    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data, error } = await query
      .order('message_index', { referencedTable: 'chat_messages', ascending: true })
      .single()

    if (error || !data) {
      return null
    }

    return this.mapRowToSessionWithMessages(data)
  }

  /**
   * Get all sessions for a user
   */
  async getUserSessions(userId: string, limit = 50, includeArchived = false): Promise<ChatSession[]> {
    const db = this.getDb()
    let query = db
      .from('chat_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(limit)

    if (!includeArchived) {
      query = query.eq('is_archived', false)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to get user sessions: ${error.message}`)
    }

    return data?.map(row => this.mapRowToSession(row)) || []
  }

  /**
   * Save/update a complete session with all messages
   */
  async saveSession(session: ChatSession): Promise<void> {
    const db = this.getDb()
    const { error: sessionError } = await db
      .from('chat_sessions')
      .upsert({
        id: session.id,
        user_id: session.userId,
        agent_id: session.agentId,
        title: session.title || `Chat with ${session.agentId}`,
        summary: session.summary,
        updated_at: session.updatedAt.toISOString(),
        message_count: session.messages.length,
        is_archived: session.isArchived || false,
        metadata: session.metadata || {}
      })

    if (sessionError) {
      throw new Error(`Failed to save session: ${sessionError.message}`)
    }

    // Save messages if any exist
    if (session.messages.length > 0) {
      const messagesData = session.messages.map((msg, index) => ({
        session_id: session.id,
        message_id: msg.id,
        type: msg.type,
        content: msg.content,
        agent_name: msg.agent,
        tool_calls: msg.toolCalls || null,
        streaming: msg.streaming || false,
        created_at: msg.timestamp.toISOString(),
        message_index: index
      }))

      // Delete existing messages first to handle updates
      await db
        .from('chat_messages')
        .delete()
        .eq('session_id', session.id)

      // Insert all messages
      const { error: messagesError } = await db
        .from('chat_messages')
        .insert(messagesData)

      if (messagesError) {
        throw new Error(`Failed to save messages: ${messagesError.message}`)
      }
    }
  }

  /**
   * Add a single message to an existing session
   */
  async addMessage(sessionId: string, message: AgentMessage): Promise<void> {
    const db = this.getDb()
    // Check if message already exists to prevent duplicates
    const { data: existingMessage } = await db
      .from('chat_messages')
      .select('message_id')
      .eq('session_id', sessionId)
      .eq('message_id', message.id)
      .single()

    if (existingMessage) {
      // Message already exists, skip insertion
      console.log(`Message ${message.id} already exists in session ${sessionId}, skipping`)
      return
    }

    // Get current message count
    const { data: session, error: sessionError } = await db
      .from('chat_sessions')
      .select('message_count')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      throw new Error(`Session ${sessionId} not found`)
    }

    const messageIndex = session.message_count

    const { error } = await db
      .from('chat_messages')
      .insert({
        session_id: sessionId,
        message_id: message.id,
        type: message.type,
        content: message.content,
        agent_name: message.agent,
        tool_calls: message.toolCalls || null,
        streaming: message.streaming || false,
        created_at: message.timestamp.toISOString(),
        message_index: messageIndex
      })

    if (error) {
      throw new Error(`Failed to add message: ${error.message}`)
    }
  }

  /**
   * Update a specific message
   */
  async updateMessage(sessionId: string, messageId: string, updates: Partial<AgentMessage>): Promise<void> {
    const updateData: any = {}
    
    if (updates.content !== undefined) updateData.content = updates.content
    if (updates.toolCalls !== undefined) updateData.tool_calls = updates.toolCalls
    if (updates.streaming !== undefined) updateData.streaming = updates.streaming

    const db = this.getDb()
    const { error } = await db
      .from('chat_messages')
      .update(updateData)
      .eq('session_id', sessionId)
      .eq('message_id', messageId)

    if (error) {
      throw new Error(`Failed to update message: ${error.message}`)
    }
  }

  /**
   * Archive a session (soft delete)
   */
  async archiveSession(sessionId: string): Promise<void> {
    const db = this.getDb()
    const { error } = await db
      .from('chat_sessions')
      .update({ 
        is_archived: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)

    if (error) {
      throw new Error(`Failed to archive session: ${error.message}`)
    }
  }

  /**
   * Permanently delete a session and all its messages
   */
  async deleteSession(sessionId: string): Promise<void> {
    const db = this.getDb()
    const { error } = await db
      .from('chat_sessions')
      .delete()
      .eq('id', sessionId)

    if (error) {
      throw new Error(`Failed to delete session: ${error.message}`)
    }
  }

  /**
   * Search messages across all user sessions
   */
  async searchMessages(userId: string, query: string, limit = 20): Promise<{
    sessionId: string
    sessionTitle: string
    message: AgentMessage
  }[]> {
    const db = this.getDb()
    const { data, error } = await db
      .from('chat_messages')
      .select(`
        *,
        chat_sessions!inner (
          id,
          title,
          user_id
        )
      `)
      .eq('chat_sessions.user_id', userId)
      .textSearch('content', query)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      throw new Error(`Failed to search messages: ${error.message}`)
    }

    return data?.map(row => ({
      sessionId: row.chat_sessions.id,
      sessionTitle: row.chat_sessions.title || 'Untitled Chat',
      message: {
        id: row.message_id,
        type: row.type as 'user' | 'agent' | 'system',
        content: row.content,
        timestamp: new Date(row.created_at),
        agent: row.agent_name,
        toolCalls: row.tool_calls,
        streaming: row.streaming
      }
    })) || []
  }

  /**
   * Get session statistics for a user
   */
  async getSessionStats(userId: string): Promise<{
    totalSessions: number
    totalMessages: number
    archivedSessions: number
  }> {
    const db = this.getDb()
    const { data, error } = await db
      .from('chat_sessions')
      .select('message_count, is_archived')
      .eq('user_id', userId)

    if (error) {
      throw new Error(`Failed to get session stats: ${error.message}`)
    }

    const stats = data?.reduce((acc, session) => {
      acc.totalSessions++
      acc.totalMessages += session.message_count
      if (session.is_archived) acc.archivedSessions++
      return acc
    }, { totalSessions: 0, totalMessages: 0, archivedSessions: 0 })

    return stats || { totalSessions: 0, totalMessages: 0, archivedSessions: 0 }
  }

  // Helper methods
  private mapRowToSession(row: ChatSessionRow): ChatSession {
    return {
      id: row.id,
      userId: row.user_id,
      agentId: row.agent_id,
      title: row.title,
      summary: row.summary,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      messages: [], // Will be populated separately if needed
      metadata: row.metadata,
      isArchived: row.is_archived
    }
  }

  private mapRowToSessionWithMessages(row: any): ChatSession {
    const session = this.mapRowToSession(row)
    
    if (row.chat_messages) {
      session.messages = row.chat_messages
        .sort((a: any, b: any) => a.message_index - b.message_index)
        .map((msgRow: any) => ({
          id: msgRow.message_id,
          type: msgRow.type,
          content: msgRow.content,
          timestamp: new Date(msgRow.created_at),
          agent: msgRow.agent_name,
          toolCalls: msgRow.tool_calls,
          streaming: msgRow.streaming
        }))
    }

    return session
  }
}

// Singleton instance
export const supabaseSessionManager = new SupabaseSessionManager()