import { BaseRepository } from './base-repository';
import type {
  DatabaseClient,
  RepositoryResult,
  RepositoryListResult,
  Conversation,
  ConversationFilterParams,
  CreateConversationInput,
  UpdateConversationInput,
  ChatMessage,
  MessageSearchResult,
  ConversationStats
} from '../types';
import { RepositoryError } from '../types';

export interface ConversationRepository {
  // Session/Conversation operations
  createConversation(userId: string, data: CreateConversationInput): Promise<RepositoryResult<Conversation>>;
  findConversationById(sessionId: string, userId?: string): Promise<RepositoryResult<Conversation>>;
  findAllConversations(userId: string, filters?: ConversationFilterParams): Promise<RepositoryListResult<Conversation>>;
  updateConversation(sessionId: string, userId: string, updates: UpdateConversationInput): Promise<RepositoryResult<Conversation>>;
  deleteConversation(sessionId: string, userId?: string): Promise<RepositoryResult<boolean>>;
  archiveConversation(sessionId: string): Promise<RepositoryResult<boolean>>;

  // Message operations
  addMessage(sessionId: string, message: ChatMessage): Promise<RepositoryResult<boolean>>;
  addMessages(sessionId: string, messages: ChatMessage[]): Promise<RepositoryResult<number>>;
  updateMessage(sessionId: string, messageId: string, updates: Partial<ChatMessage>): Promise<RepositoryResult<boolean>>;

  // Search and stats
  searchMessages(userId: string, query: string, limit?: number): Promise<RepositoryListResult<MessageSearchResult>>;
  getConversationStats(userId: string): Promise<RepositoryResult<ConversationStats>>;
}

export class ConversationRepositoryImpl extends BaseRepository<Conversation> implements ConversationRepository {
  constructor(client: DatabaseClient) {
    super(client, 'chat_sessions', '*');
  }

  /**
   * Create a new conversation/session
   */
  async createConversation(userId: string, data: CreateConversationInput): Promise<RepositoryResult<Conversation>> {
    try {
      const now = new Date().toISOString();

      const insertData: any = {
        user_id: userId,
        agent_id: data.agentId,
        title: data.title || `Chat with ${data.agentId}`,
        created_at: now,
        updated_at: now,
        message_count: 0,
        is_archived: false,
        metadata: {}
      };

      // Use custom sessionId if provided
      if (data.sessionId) {
        insertData.id = data.sessionId;
      }

      const { data: session, error } = await this.client
        .from(this.tableName)
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('Database error creating conversation:', error);
        return { data: null, error: new RepositoryError('Failed to create conversation', error.code) };
      }

      // If messages provided, add them
      if (data.messages && data.messages.length > 0) {
        const messagesData = data.messages.map((msg, index) => ({
          session_id: session.id,
          message_id: msg.id,
          type: msg.type,
          content: msg.content,
          agent_name: msg.agent,
          tool_calls: msg.toolCalls || null,
          streaming: false,
          created_at: new Date(msg.timestamp).toISOString(),
          message_index: index
        }));

        const { error: messagesError } = await this.client
          .from('chat_messages')
          .insert(messagesData);

        if (messagesError) {
          console.error('Error adding initial messages:', messagesError);
          // Continue anyway, session was created
        } else {
          // Update message count
          await this.client
            .from(this.tableName)
            .update({ message_count: data.messages.length })
            .eq('id', session.id);
        }
      }

      return { data: session as unknown as Conversation, error: null };
    } catch (error) {
      console.error('Error creating conversation:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Find a conversation by ID with all messages
   */
  async findConversationById(sessionId: string, userId?: string): Promise<RepositoryResult<Conversation>> {
    try {
      let query = this.client
        .from(this.tableName)
        .select(`
          *,
          chat_messages (
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
        .eq('id', sessionId);

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query
        .order('message_index', { referencedTable: 'chat_messages', ascending: true })
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return { data: null, error: new RepositoryError('Conversation not found', '404') };
        }
        console.error('Database error finding conversation:', error);
        return { data: null, error: new RepositoryError('Failed to get conversation', error.code) };
      }

      // Map messages
      const conversation = data as any;
      if (conversation.chat_messages) {
        conversation.messages = conversation.chat_messages.map((msg: any) => ({
          id: msg.message_id,
          type: msg.type,
          content: msg.content,
          timestamp: new Date(msg.created_at),
          agent: msg.agent_name,
          toolCalls: msg.tool_calls,
          streaming: msg.streaming
        }));
        delete conversation.chat_messages;
      }

      return { data: conversation as unknown as Conversation, error: null };
    } catch (error) {
      console.error('Error finding conversation:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Find all conversations for a user
   */
  async findAllConversations(
    userId: string,
    filters?: ConversationFilterParams
  ): Promise<RepositoryListResult<Conversation>> {
    try {
      let query = this.client
        .from(this.tableName)
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      // Apply filters
      if (filters) {
        if (filters.agent_id) {
          query = query.eq('agent_id', filters.agent_id);
        }

        if (filters.is_archived !== undefined) {
          query = query.eq('is_archived', filters.is_archived);
        } else if (!filters.includeArchived) {
          // Default: exclude archived unless explicitly requested
          query = query.eq('is_archived', false);
        }

        if (filters.limit !== undefined) {
          query = query.limit(filters.limit);
        }

        if (filters.offset !== undefined) {
          query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
        }
      } else {
        // Default: exclude archived, limit 50
        query = query.eq('is_archived', false).limit(50);
      }

      const { data, error, count } = await query;

      if (error) {
        console.error('Database error finding conversations:', error);
        return { data: [], total: 0, error: new RepositoryError('Failed to list conversations', error.code) };
      }

      return {
        data: (data as unknown as Conversation[]) || [],
        total: count || 0,
        error: null
      };
    } catch (error) {
      console.error('Error finding conversations:', error);
      return { data: [], total: 0, error: error as Error };
    }
  }

  /**
   * Update a conversation's metadata
   */
  async updateConversation(
    sessionId: string,
    userId: string,
    updates: UpdateConversationInput
  ): Promise<RepositoryResult<Conversation>> {
    try {
      // First verify the conversation exists and belongs to user
      const existing = await this.findConversationById(sessionId, userId);
      if (existing.error || !existing.data) {
        return { data: null, error: existing.error || new RepositoryError('Conversation not found', '404') };
      }

      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.summary !== undefined) updateData.summary = updates.summary;
      if (updates.isArchived !== undefined) updateData.is_archived = updates.isArchived;

      const { data, error } = await this.client
        .from(this.tableName)
        .update(updateData)
        .eq('id', sessionId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        console.error('Database error updating conversation:', error);
        return { data: null, error: new RepositoryError('Failed to update conversation', error.code) };
      }

      return { data: data as unknown as Conversation, error: null };
    } catch (error) {
      console.error('Error updating conversation:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Delete a conversation and all its messages
   */
  async deleteConversation(sessionId: string, userId?: string): Promise<RepositoryResult<boolean>> {
    try {
      // Verify ownership if userId provided
      if (userId) {
        const existing = await this.findConversationById(sessionId, userId);
        if (existing.error || !existing.data) {
          return { data: false, error: existing.error || new RepositoryError('Conversation not found', '404') };
        }
      }

      const { error } = await this.client
        .from(this.tableName)
        .delete()
        .eq('id', sessionId);

      if (error) {
        console.error('Database error deleting conversation:', error);
        return { data: false, error: new RepositoryError('Failed to delete conversation', error.code) };
      }

      return { data: true, error: null };
    } catch (error) {
      console.error('Error deleting conversation:', error);
      return { data: false, error: error as Error };
    }
  }

  /**
   * Archive a conversation (soft delete)
   */
  async archiveConversation(sessionId: string): Promise<RepositoryResult<boolean>> {
    try {
      const { error } = await this.client
        .from(this.tableName)
        .update({
          is_archived: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (error) {
        console.error('Database error archiving conversation:', error);
        return { data: false, error: new RepositoryError('Failed to archive conversation', error.code) };
      }

      return { data: true, error: null };
    } catch (error) {
      console.error('Error archiving conversation:', error);
      return { data: false, error: error as Error };
    }
  }

  /**
   * Add a single message to a conversation
   */
  async addMessage(sessionId: string, message: ChatMessage): Promise<RepositoryResult<boolean>> {
    try {
      // Check if message already exists to prevent duplicates
      const { data: existingMessage } = await this.client
        .from('chat_messages')
        .select('message_id')
        .eq('session_id', sessionId)
        .eq('message_id', message.id)
        .single();

      if (existingMessage) {
        console.log(`Message ${message.id} already exists, skipping`);
        return { data: true, error: null };
      }

      // Get current message count
      const { data: session, error: sessionError } = await this.client
        .from(this.tableName)
        .select('message_count')
        .eq('id', sessionId)
        .single();

      if (sessionError || !session) {
        return { data: false, error: new RepositoryError('Session not found', '404') };
      }

      const messageIndex = session.message_count;

      // Insert message
      const { error } = await this.client
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
        });

      if (error) {
        console.error('Database error adding message:', error);
        return { data: false, error: new RepositoryError('Failed to add message', error.code) };
      }

      // Update message count
      await this.client
        .from(this.tableName)
        .update({
          message_count: messageIndex + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      return { data: true, error: null };
    } catch (error) {
      console.error('Error adding message:', error);
      return { data: false, error: error as Error };
    }
  }

  /**
   * Add multiple messages to a conversation
   */
  async addMessages(sessionId: string, messages: ChatMessage[]): Promise<RepositoryResult<number>> {
    try {
      let successCount = 0;

      for (const message of messages) {
        const result = await this.addMessage(sessionId, message);
        if (!result.error) {
          successCount++;
        }
      }

      return { data: successCount, error: null };
    } catch (error) {
      console.error('Error adding messages:', error);
      return { data: 0, error: error as Error };
    }
  }

  /**
   * Update a specific message
   */
  async updateMessage(
    sessionId: string,
    messageId: string,
    updates: Partial<ChatMessage>
  ): Promise<RepositoryResult<boolean>> {
    try {
      const updateData: any = {};

      if (updates.content !== undefined) updateData.content = updates.content;
      if (updates.toolCalls !== undefined) updateData.tool_calls = updates.toolCalls;
      if (updates.streaming !== undefined) updateData.streaming = updates.streaming;

      const { error } = await this.client
        .from('chat_messages')
        .update(updateData)
        .eq('session_id', sessionId)
        .eq('message_id', messageId);

      if (error) {
        console.error('Database error updating message:', error);
        return { data: false, error: new RepositoryError('Failed to update message', error.code) };
      }

      return { data: true, error: null };
    } catch (error) {
      console.error('Error updating message:', error);
      return { data: false, error: error as Error };
    }
  }

  /**
   * Search messages across user's conversations
   */
  async searchMessages(
    userId: string,
    query: string,
    limit: number = 20
  ): Promise<RepositoryListResult<MessageSearchResult>> {
    try {
      const { data, error } = await this.client
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
        .limit(limit);

      if (error) {
        console.error('Database error searching messages:', error);
        return { data: [], total: 0, error: new RepositoryError('Failed to search messages', error.code) };
      }

      const results: MessageSearchResult[] = (data || []).map((row: any) => ({
        sessionId: row.chat_sessions.id,
        sessionTitle: row.chat_sessions.title || 'Untitled Chat',
        message: {
          id: row.message_id,
          type: row.type,
          content: row.content,
          timestamp: new Date(row.created_at),
          agent: row.agent_name,
          toolCalls: row.tool_calls,
          streaming: row.streaming
        }
      }));

      return { data: results, total: results.length, error: null };
    } catch (error) {
      console.error('Error searching messages:', error);
      return { data: [], total: 0, error: error as Error };
    }
  }

  /**
   * Get conversation statistics for a user
   */
  async getConversationStats(userId: string): Promise<RepositoryResult<ConversationStats>> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select('message_count, is_archived')
        .eq('user_id', userId);

      if (error) {
        console.error('Database error getting stats:', error);
        return { data: null, error: new RepositoryError('Failed to get conversation stats', error.code) };
      }

      const stats = (data || []).reduce(
        (acc, session) => {
          acc.totalConversations++;
          acc.totalMessages += session.message_count;
          if (session.is_archived) {
            acc.archivedConversations++;
          }
          return acc;
        },
        { totalConversations: 0, totalMessages: 0, archivedConversations: 0, activeConversations: 0 }
      );

      stats.activeConversations = stats.totalConversations - stats.archivedConversations;

      return { data: stats, error: null };
    } catch (error) {
      console.error('Error getting conversation stats:', error);
      return { data: null, error: error as Error };
    }
  }
}
