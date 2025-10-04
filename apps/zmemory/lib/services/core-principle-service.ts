import { BaseServiceImpl } from './base-service';
import type {
  ServiceContext,
  ServiceDependencies,
  ServiceResult,
  ServiceListResult
} from './types';
import type {
  CorePrinciple,
  CorePrincipleFilterParams
} from '@/database/repositories/core-principle-repository';
import type {
  CorePrincipleMemory,
  CorePrincipleQuery,
  CreateCorePrincipleRequest,
  UpdateCorePrincipleRequest
} from '@/lib/types/core-principles-types';
import { nowUTC } from '@/lib/utils/time-utils';

export interface CorePrincipleService {
  listPrinciples(query: CorePrincipleQuery): Promise<ServiceListResult<CorePrincipleMemory>>;
  getPrincipleById(id: string): Promise<ServiceResult<CorePrincipleMemory>>;
  createPrinciple(data: CreateCorePrincipleRequest): Promise<ServiceResult<CorePrincipleMemory>>;
  updatePrinciple(id: string, updates: UpdateCorePrincipleRequest): Promise<ServiceResult<CorePrincipleMemory>>;
  deletePrinciple(id: string): Promise<ServiceResult<void>>;
  incrementApplicationCount(id: string): Promise<ServiceResult<CorePrincipleMemory>>;
  deprecatePrinciple(id: string, reason?: string): Promise<ServiceResult<CorePrincipleMemory>>;
  getStatistics(): Promise<ServiceResult<any>>;
}

export class CorePrincipleServiceImpl extends BaseServiceImpl implements CorePrincipleService {

  constructor(context: ServiceContext, dependencies: ServiceDependencies) {
    super(context, dependencies);
  }

  /**
   * List core principles with filtering and pagination
   */
  async listPrinciples(query: CorePrincipleQuery): Promise<ServiceListResult<CorePrincipleMemory>> {
    return this.safeListOperation(async () => {
      this.validateUserAccess();

      const filters: CorePrincipleFilterParams = {
        category: query.category,
        status: query.status,
        source: query.source,
        is_default: query.is_default,
        importance_level: query.importance_level,
        search: query.search,
        sort_by: query.sort_by || 'created_at',
        sort_order: query.sort_order || 'desc',
        limit: query.limit || 50,
        offset: query.offset || 0
      };

      const result = await this.dependencies.corePrincipleRepository.findPrinciplesAdvanced(
        this.context.userId,
        filters
      );

      if (result.error) throw result.error;

      // Map database rows to CorePrincipleMemory format
      const memories = (result.data || []).map(this.mapToMemory);

      return {
        items: memories,
        total: result.total
      };
    });
  }

  /**
   * Get a single principle by ID
   */
  async getPrincipleById(id: string): Promise<ServiceResult<CorePrincipleMemory>> {
    return this.safeOperation(async () => {
      this.validateUserAccess();

      const result = await this.dependencies.corePrincipleRepository.findById(
        this.context.userId,
        id
      );

      if (result.error) throw result.error;
      if (!result.data) {
        throw new Error('Core principle not found');
      }

      return this.mapToMemory(result.data);
    });
  }

  /**
   * Create a new core principle
   */
  async createPrinciple(data: CreateCorePrincipleRequest): Promise<ServiceResult<CorePrincipleMemory>> {
    return this.safeOperation(async () => {
      this.validateUserAccess();

      const now = nowUTC();
      const principleData: Partial<CorePrinciple> = {
        title: data.content.title,
        description: data.content.description || null,
        category: data.content.category,
        status: data.content.status || 'active',
        is_default: data.content.is_default || false,
        source: data.content.source || 'user_custom',
        trigger_questions: data.content.trigger_questions || [],
        application_examples: data.content.application_examples || [],
        personal_notes: data.content.personal_notes || null,
        importance_level: data.content.importance_level || 1,
        application_count: data.content.application_count || 0,
        last_applied_at: data.content.last_applied_at || null,
        deprecated_at: data.content.deprecated_at || null,
        deprecation_reason: data.content.deprecation_reason || null,
        metadata: data.metadata || {},
        created_at: now,
        updated_at: now
      };

      const result = await this.dependencies.corePrincipleRepository.create(
        this.context.userId,
        principleData
      );

      if (result.error) throw result.error;
      if (!result.data) throw new Error('Failed to create core principle');

      return this.mapToMemory(result.data);
    });
  }

  /**
   * Update an existing core principle
   */
  async updatePrinciple(id: string, updates: UpdateCorePrincipleRequest): Promise<ServiceResult<CorePrincipleMemory>> {
    return this.safeOperation(async () => {
      this.validateUserAccess();

      const updateData: Partial<CorePrinciple> = {};

      if (updates.content) {
        if (updates.content.title !== undefined) updateData.title = updates.content.title;
        if (updates.content.description !== undefined) updateData.description = updates.content.description || null;
        if (updates.content.category !== undefined) updateData.category = updates.content.category;
        if (updates.content.status !== undefined) updateData.status = updates.content.status;
        if (updates.content.is_default !== undefined) updateData.is_default = updates.content.is_default;
        if (updates.content.source !== undefined) updateData.source = updates.content.source;
        if (updates.content.trigger_questions !== undefined) updateData.trigger_questions = updates.content.trigger_questions;
        if (updates.content.application_examples !== undefined) updateData.application_examples = updates.content.application_examples;
        if (updates.content.personal_notes !== undefined) updateData.personal_notes = updates.content.personal_notes || null;
        if (updates.content.importance_level !== undefined) updateData.importance_level = updates.content.importance_level;
        if (updates.content.application_count !== undefined) updateData.application_count = updates.content.application_count;
        if (updates.content.last_applied_at !== undefined) updateData.last_applied_at = updates.content.last_applied_at || null;
        if (updates.content.deprecated_at !== undefined) updateData.deprecated_at = updates.content.deprecated_at || null;
        if (updates.content.deprecation_reason !== undefined) updateData.deprecation_reason = updates.content.deprecation_reason || null;
      }

      if (updates.metadata !== undefined) {
        updateData.metadata = updates.metadata;
      }

      updateData.updated_at = nowUTC();

      const result = await this.dependencies.corePrincipleRepository.update(
        this.context.userId,
        id,
        updateData
      );

      if (result.error) throw result.error;
      if (!result.data) throw new Error('Core principle not found or unauthorized');

      return this.mapToMemory(result.data);
    });
  }

  /**
   * Delete a core principle
   */
  async deletePrinciple(id: string): Promise<ServiceResult<void>> {
    return this.safeOperation(async () => {
      this.validateUserAccess();

      const result = await this.dependencies.corePrincipleRepository.delete(
        this.context.userId,
        id
      );

      if (result.error) throw result.error;

      return undefined;
    });
  }

  /**
   * Increment application count for a principle
   */
  async incrementApplicationCount(id: string): Promise<ServiceResult<CorePrincipleMemory>> {
    return this.safeOperation(async () => {
      this.validateUserAccess();

      const result = await this.dependencies.corePrincipleRepository.incrementApplicationCount(
        this.context.userId,
        id
      );

      if (result.error) throw result.error;
      if (!result.data) throw new Error('Core principle not found or unauthorized');

      return this.mapToMemory(result.data);
    });
  }

  /**
   * Mark a principle as deprecated
   */
  async deprecatePrinciple(id: string, reason?: string): Promise<ServiceResult<CorePrincipleMemory>> {
    return this.safeOperation(async () => {
      this.validateUserAccess();

      const result = await this.dependencies.corePrincipleRepository.deprecatePrinciple(
        this.context.userId,
        id,
        reason
      );

      if (result.error) throw result.error;
      if (!result.data) throw new Error('Core principle not found or unauthorized');

      return this.mapToMemory(result.data);
    });
  }

  /**
   * Get statistics about user's core principles
   */
  async getStatistics(): Promise<ServiceResult<any>> {
    return this.safeOperation(async () => {
      this.validateUserAccess();

      const result = await this.dependencies.corePrincipleRepository.getStatistics(
        this.context.userId
      );

      if (result.error) throw result.error;

      return result.data;
    });
  }

  /**
   * Map database row to CorePrincipleMemory format
   */
  private mapToMemory(row: CorePrinciple): CorePrincipleMemory {
    return {
      id: row.id,
      type: 'core_principle',
      content: {
        title: row.title,
        description: row.description || undefined,
        category: row.category as any,
        status: row.status,
        is_default: row.is_default,
        source: row.source,
        trigger_questions: row.trigger_questions || [],
        application_examples: row.application_examples || [],
        personal_notes: row.personal_notes || undefined,
        importance_level: row.importance_level,
        application_count: row.application_count,
        last_applied_at: row.last_applied_at || undefined,
        deprecated_at: row.deprecated_at || undefined,
        deprecation_reason: row.deprecation_reason || undefined
      },
      metadata: row.metadata || {},
      created_at: row.created_at,
      updated_at: row.updated_at,
      user_id: row.user_id
    };
  }
}
