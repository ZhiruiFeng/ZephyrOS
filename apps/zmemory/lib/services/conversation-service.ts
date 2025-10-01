import { BaseServiceImpl } from './base-service';
import type {
  ServiceContext,
  ServiceDependencies,
  ServiceResult
} from './types';
import type {
  Conversation,
  ConversationFilterParams,
  CreateConversationInput,
  UpdateConversationInput,
  ChatMessage,
  MessageSearchResult,
  ConversationStats
} from '../database/types';
import { createConversationRepository } from '../database';

export interface ConversationService {
  // Conversation CRUD operations
  getConversations(filters?: ConversationFilterParams): Promise<ServiceResult<Conversation[]>>;
  getConversation(sessionId: string): Promise<ServiceResult<Conversation>>;
  createConversation(data: CreateConversationInput): Promise<ServiceResult<Conversation>>;
  updateConversation(sessionId: string, data: UpdateConversationInput): Promise<ServiceResult<Conversation>>;
  deleteConversation(sessionId: string): Promise<ServiceResult<boolean>>;
  archiveConversation(sessionId: string): Promise<ServiceResult<boolean>>;

  // Message operations
  addMessage(sessionId: string, message: ChatMessage): Promise<ServiceResult<boolean>>;
  addMessages(sessionId: string, messages: ChatMessage[]): Promise<ServiceResult<{ added: number; total: number }>>;

  // Search and analytics
  searchMessages(query: string, limit?: number): Promise<ServiceResult<MessageSearchResult[]>>;
  getStats(): Promise<ServiceResult<ConversationStats>>;
}

export class ConversationServiceImpl extends BaseServiceImpl implements ConversationService {
  private conversationRepo = createConversationRepository();

  constructor(context: ServiceContext, dependencies: ServiceDependencies) {
    super(context, dependencies);
  }

  /**
   * Get all conversations for the user
   */
  async getConversations(filters: ConversationFilterParams = {}): Promise<ServiceResult<Conversation[]>> {
    return this.safeOperation(async () => {
      this.logOperation('info', 'getConversationsStarted', { filters });

      // Apply default limit if not provided
      const normalizedFilters = {
        ...filters,
        limit: filters.limit || 50
      };

      const result = await this.conversationRepo.findAllConversations(
        this.context.userId,
        normalizedFilters
      );

      if (result.error) {
        this.logOperation('error', 'getConversationsFailed', {
          error: result.error.message
        });
        throw result.error;
      }

      this.logOperation('info', 'getConversationsSuccess', {
        count: result.data?.length || 0,
        total: result.total
      });

      return result.data || [];
    });
  }

  /**
   * Get a single conversation by ID with all messages
   */
  async getConversation(sessionId: string): Promise<ServiceResult<Conversation>> {
    return this.safeOperation(async () => {
      this.logOperation('info', 'getConversationStarted', { sessionId });

      const result = await this.conversationRepo.findConversationById(
        sessionId,
        this.context.userId
      );

      if (result.error) {
        this.logOperation('error', 'getConversationFailed', {
          sessionId,
          error: result.error.message
        });
        throw result.error;
      }

      if (!result.data) {
        const error = new Error('Conversation not found');
        (error as any).code = '404';
        throw error;
      }

      this.logOperation('info', 'getConversationSuccess', {
        sessionId,
        messageCount: result.data.messages?.length || 0
      });

      return result.data;
    });
  }

  /**
   * Create a new conversation
   */
  async createConversation(data: CreateConversationInput): Promise<ServiceResult<Conversation>> {
    return this.safeOperation(async () => {
      this.logOperation('info', 'createConversationStarted', {
        agentId: data.agentId,
        hasMessages: !!data.messages?.length
      });

      // Validate agent ID
      if (!data.agentId || data.agentId.trim().length === 0) {
        const error = new Error('Agent ID is required');
        (error as any).code = '400';
        throw error;
      }

      // Normalize message data if provided
      const normalizedData: CreateConversationInput = {
        ...data,
        title: data.title || `Chat with ${data.agentId}`,
        messages: data.messages?.map(msg => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }))
      };

      const result = await this.conversationRepo.createConversation(
        this.context.userId,
        normalizedData
      );

      if (result.error) {
        this.logOperation('error', 'createConversationFailed', {
          agentId: data.agentId,
          error: result.error.message
        });
        throw result.error;
      }

      this.logOperation('info', 'createConversationSuccess', {
        sessionId: result.data?.id,
        agentId: data.agentId
      });

      // If messages were provided, fetch the updated conversation
      if (data.messages && data.messages.length > 0 && result.data?.id) {
        const updatedResult = await this.conversationRepo.findConversationById(
          result.data.id,
          this.context.userId
        );
        return updatedResult.data || result.data;
      }

      return result.data!;
    });
  }

  /**
   * Update a conversation's metadata
   */
  async updateConversation(
    sessionId: string,
    data: UpdateConversationInput
  ): Promise<ServiceResult<Conversation>> {
    return this.safeOperation(async () => {
      this.logOperation('info', 'updateConversationStarted', { sessionId, updates: Object.keys(data) });

      // Validate that at least one field is being updated
      if (Object.keys(data).length === 0) {
        const error = new Error('No update fields provided');
        (error as any).code = '400';
        throw error;
      }

      const result = await this.conversationRepo.updateConversation(
        sessionId,
        this.context.userId,
        data
      );

      if (result.error) {
        this.logOperation('error', 'updateConversationFailed', {
          sessionId,
          error: result.error.message
        });
        throw result.error;
      }

      if (!result.data) {
        const error = new Error('Conversation not found or update failed');
        (error as any).code = '404';
        throw error;
      }

      this.logOperation('info', 'updateConversationSuccess', { sessionId });

      return result.data;
    });
  }

  /**
   * Delete a conversation permanently
   */
  async deleteConversation(sessionId: string): Promise<ServiceResult<boolean>> {
    return this.safeOperation(async () => {
      this.logOperation('info', 'deleteConversationStarted', { sessionId });

      const result = await this.conversationRepo.deleteConversation(
        sessionId,
        this.context.userId
      );

      if (result.error) {
        this.logOperation('error', 'deleteConversationFailed', {
          sessionId,
          error: result.error.message
        });
        throw result.error;
      }

      if (!result.data) {
        const error = new Error('Conversation not found or delete failed');
        (error as any).code = '404';
        throw error;
      }

      this.logOperation('info', 'deleteConversationSuccess', { sessionId });

      return true;
    });
  }

  /**
   * Archive a conversation (soft delete)
   */
  async archiveConversation(sessionId: string): Promise<ServiceResult<boolean>> {
    return this.safeOperation(async () => {
      this.logOperation('info', 'archiveConversationStarted', { sessionId });

      // Verify ownership first
      const conversation = await this.conversationRepo.findConversationById(
        sessionId,
        this.context.userId
      );

      if (conversation.error || !conversation.data) {
        const error = new Error('Conversation not found');
        (error as any).code = '404';
        throw error;
      }

      const result = await this.conversationRepo.archiveConversation(sessionId);

      if (result.error) {
        this.logOperation('error', 'archiveConversationFailed', {
          sessionId,
          error: result.error.message
        });
        throw result.error;
      }

      this.logOperation('info', 'archiveConversationSuccess', { sessionId });

      return true;
    });
  }

  /**
   * Add a single message to a conversation
   */
  async addMessage(sessionId: string, message: ChatMessage): Promise<ServiceResult<boolean>> {
    return this.safeOperation(async () => {
      this.logOperation('info', 'addMessageStarted', { sessionId, messageId: message.id });

      // Verify conversation exists and user has access
      const conversation = await this.conversationRepo.findConversationById(
        sessionId,
        this.context.userId
      );

      if (conversation.error || !conversation.data) {
        const error = new Error('Conversation not found or access denied');
        (error as any).code = '404';
        throw error;
      }

      const result = await this.conversationRepo.addMessage(sessionId, message);

      if (result.error) {
        this.logOperation('error', 'addMessageFailed', {
          sessionId,
          messageId: message.id,
          error: result.error.message
        });
        throw result.error;
      }

      this.logOperation('info', 'addMessageSuccess', { sessionId, messageId: message.id });

      return true;
    });
  }

  /**
   * Add multiple messages to a conversation
   */
  async addMessages(
    sessionId: string,
    messages: ChatMessage[]
  ): Promise<ServiceResult<{ added: number; total: number }>> {
    return this.safeOperation(async () => {
      this.logOperation('info', 'addMessagesStarted', { sessionId, count: messages.length });

      // Verify conversation exists and user has access
      const conversation = await this.conversationRepo.findConversationById(
        sessionId,
        this.context.userId
      );

      if (conversation.error || !conversation.data) {
        const error = new Error('Conversation not found or access denied');
        (error as any).code = '404';
        throw error;
      }

      const result = await this.conversationRepo.addMessages(sessionId, messages);

      if (result.error) {
        this.logOperation('error', 'addMessagesFailed', {
          sessionId,
          error: result.error.message
        });
        throw result.error;
      }

      this.logOperation('info', 'addMessagesSuccess', {
        sessionId,
        added: result.data || 0,
        total: messages.length
      });

      return {
        added: result.data || 0,
        total: messages.length
      };
    });
  }

  /**
   * Search messages across user's conversations
   */
  async searchMessages(query: string, limit: number = 20): Promise<ServiceResult<MessageSearchResult[]>> {
    return this.safeOperation(async () => {
      this.logOperation('info', 'searchMessagesStarted', { query, limit });

      // Validate query
      if (!query || query.trim().length === 0) {
        const error = new Error('Search query is required');
        (error as any).code = '400';
        throw error;
      }

      const result = await this.conversationRepo.searchMessages(
        this.context.userId,
        query,
        limit
      );

      if (result.error) {
        this.logOperation('error', 'searchMessagesFailed', {
          query,
          error: result.error.message
        });
        throw result.error;
      }

      this.logOperation('info', 'searchMessagesSuccess', {
        query,
        count: result.data?.length || 0
      });

      return result.data || [];
    });
  }

  /**
   * Get conversation statistics for the user
   */
  async getStats(): Promise<ServiceResult<ConversationStats>> {
    return this.safeOperation(async () => {
      this.logOperation('info', 'getStatsStarted', {});

      const result = await this.conversationRepo.getConversationStats(this.context.userId);

      if (result.error) {
        this.logOperation('error', 'getStatsFailed', {
          error: result.error.message
        });
        throw result.error;
      }

      if (!result.data) {
        // Return empty stats if none found
        return {
          totalConversations: 0,
          totalMessages: 0,
          archivedConversations: 0,
          activeConversations: 0
        };
      }

      this.logOperation('info', 'getStatsSuccess', { stats: result.data });

      return result.data;
    });
  }
}
