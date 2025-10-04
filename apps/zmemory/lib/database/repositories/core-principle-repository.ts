import { BaseRepository } from './base-repository';
import type {
  DatabaseClient,
  FilterParams,
  RepositoryResult,
  RepositoryListResult
} from '../types';
import type { CorePrincipleQuery } from '@/lib/types/core-principles-types';

// Core Principle entity type matching database schema
export interface CorePrinciple {
  id: string;
  user_id: string;
  title: string;
  description?: string | null;
  category: string;
  status: 'active' | 'deprecated' | 'archived';
  is_default: boolean;
  source: 'ray_dalio' | 'user_custom';
  trigger_questions: string[];
  application_examples: string[];
  personal_notes?: string | null;
  importance_level: number;
  application_count: number;
  last_applied_at?: string | null;
  deprecated_at?: string | null;
  deprecation_reason?: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// Core principle filter parameters
export interface CorePrincipleFilterParams extends Omit<FilterParams, 'search_fields'> {
  category?: string;
  status?: string;
  source?: string;
  is_default?: boolean;
  importance_level?: number;
  search?: string;
  search_fields?: 'title' | 'description' | 'all';
}

export class CorePrincipleRepository extends BaseRepository<CorePrinciple> {
  constructor(client: DatabaseClient) {
    super(client, 'core_principles', '*');
  }

  /**
   * Find a principle by ID (wrapper for findByUserAndId for consistency)
   */
  async findById(userId: string, id: string): Promise<RepositoryResult<CorePrinciple>> {
    return this.findByUserAndId(userId, id);
  }

  /**
   * Update a principle by ID (wrapper for updateByUserAndId for consistency)
   */
  async update(userId: string, id: string, data: Partial<CorePrinciple>): Promise<RepositoryResult<CorePrinciple>> {
    return this.updateByUserAndId(userId, id, data);
  }

  /**
   * Delete a principle by ID (wrapper for deleteByUserAndId for consistency)
   */
  async delete(userId: string, id: string): Promise<RepositoryResult<boolean>> {
    return this.deleteByUserAndId(userId, id);
  }

  /**
   * Find core principles with advanced filtering
   * Includes both user's custom principles and default principles
   */
  async findPrinciplesAdvanced(
    userId: string,
    filters: CorePrincipleFilterParams
  ): Promise<RepositoryListResult<CorePrinciple>> {
    try {
      let query = this.client
        .from(this.tableName)
        .select(this.defaultSelect, { count: 'exact' });

      // Include user's principles + default principles
      query = query.or(`user_id.eq.${userId},is_default.eq.true`);

      // Apply filters
      if (filters.category) {
        query = query.eq('category', filters.category);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.source) {
        query = query.eq('source', filters.source);
      }
      if (filters.is_default !== undefined) {
        query = query.eq('is_default', filters.is_default);
      }
      if (filters.importance_level) {
        query = query.eq('importance_level', filters.importance_level);
      }

      // Apply search
      if (filters.search) {
        const searchFields = filters.search_fields || 'all';
        if (searchFields === 'title') {
          query = query.ilike('title', `%${filters.search}%`);
        } else if (searchFields === 'description') {
          query = query.ilike('description', `%${filters.search}%`);
        } else {
          query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
        }
      }

      // Apply sorting
      const sortBy = filters.sort_by || 'created_at';
      const ascending = filters.sort_order === 'asc';

      if (sortBy === 'last_applied_at') {
        query = query.order('last_applied_at', { ascending, nullsFirst: false });
      } else {
        query = query.order(sortBy, { ascending });
      }

      // Apply pagination
      const limit = filters.limit || 50;
      const offset = filters.offset || 0;
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        return {
          data: null,
          error: new Error(`Failed to fetch core principles: ${error.message}`),
          total: 0
        };
      }

      return {
        data: (data as unknown) as CorePrinciple[],
        error: null,
        total: count || 0
      };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Unknown error'),
        total: 0
      };
    }
  }

  /**
   * Increment application count for a principle
   */
  async incrementApplicationCount(
    userId: string,
    id: string
  ): Promise<RepositoryResult<CorePrinciple>> {
    try {
      // First, get the current principle
      const current = await this.findById(userId, id);
      if (current.error || !current.data) {
        return {
          data: null,
          error: current.error || new Error('Core principle not found')
        };
      }

      // Increment and update
      const { data, error } = await this.client
        .from(this.tableName)
        .update({
          application_count: (current.data.application_count || 0) + 1,
          last_applied_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('user_id', userId)
        .select(this.defaultSelect)
        .single();

      if (error) {
        return {
          data: null,
          error: new Error(`Failed to increment application count: ${error.message}`)
        };
      }

      return { data: (data as unknown) as CorePrinciple, error: null };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Unknown error')
      };
    }
  }

  /**
   * Mark a principle as deprecated
   */
  async deprecatePrinciple(
    userId: string,
    id: string,
    reason?: string
  ): Promise<RepositoryResult<CorePrinciple>> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .update({
          status: 'deprecated',
          deprecated_at: new Date().toISOString(),
          deprecation_reason: reason || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('user_id', userId)
        .select(this.defaultSelect)
        .single();

      if (error) {
        return {
          data: null,
          error: new Error(`Failed to deprecate principle: ${error.message}`)
        };
      }

      return { data: (data as unknown) as CorePrinciple, error: null };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Unknown error')
      };
    }
  }

  /**
   * Get principle statistics
   */
  async getStatistics(userId: string): Promise<RepositoryResult<any>> {
    try {
      // Get all user's principles
      const { data, error } = await this.client
        .from(this.tableName)
        .select('category, status, source, importance_level, application_count')
        .eq('user_id', userId);

      if (error) {
        return {
          data: null,
          error: new Error(`Failed to fetch statistics: ${error.message}`)
        };
      }

      const principles = data || [];

      // Calculate statistics
      const stats: {
        total: number;
        by_category: Record<string, number>;
        by_status: Record<string, number>;
        by_source: Record<string, number>;
        average_importance_level: number;
        total_applications: number;
      } = {
        total: principles.length,
        by_category: {},
        by_status: {},
        by_source: {},
        average_importance_level: 0,
        total_applications: 0
      };

      principles.forEach((p: any) => {
        // Count by category
        stats.by_category[p.category] = (stats.by_category[p.category] || 0) + 1;
        // Count by status
        stats.by_status[p.status] = (stats.by_status[p.status] || 0) + 1;
        // Count by source
        stats.by_source[p.source] = (stats.by_source[p.source] || 0) + 1;
        // Sum importance and applications
        stats.average_importance_level += p.importance_level;
        stats.total_applications += p.application_count;
      });

      if (principles.length > 0) {
        stats.average_importance_level = stats.average_importance_level / principles.length;
      }

      return { data: stats, error: null };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Unknown error')
      };
    }
  }
}
