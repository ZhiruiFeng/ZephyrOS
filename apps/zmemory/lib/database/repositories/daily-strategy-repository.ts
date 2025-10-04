import { BaseRepository } from './base-repository';
import type {
  DatabaseClient,
  FilterParams,
  RepositoryResult,
  RepositoryListResult
} from '../types';

// Daily Strategy entity type matching database schema
export interface DailyStrategyItem {
  id: string;
  user_id: string;
  timeline_item_id: string;
  timeline_item_type: 'task' | 'activity' | 'memory' | 'routine' | 'habit';
  strategy_type: 'priority' | 'planning' | 'reflection' | 'adventure' | 'learning' | 'milestone' | 'insight' | 'routine';
  local_date: string;
  importance_level: number;
  priority_order?: number | null;
  planned_duration_minutes?: number | null;
  actual_duration_minutes?: number | null;
  planned_time_of_day?: string | null;
  actual_time_of_day?: string | null;
  required_energy_level?: number | null;
  actual_energy_used?: number | null;
  status: 'planned' | 'in_progress' | 'completed' | 'deferred' | 'cancelled';
  completed_at?: string | null;
  completion_notes?: string | null;
  reflection_notes?: string | null;
  season_id?: string | null;
  initiative_id?: string | null;
  tags: string[];
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// Daily strategy filter parameters
export interface DailyStrategyFilterParams extends Omit<FilterParams, 'search_fields'> {
  date?: string;
  date_from?: string;
  date_to?: string;
  strategy_type?: string;
  timeline_item_type?: string;
  timeline_item_id?: string;
  importance_level?: number;
  planned_time_of_day?: string;
  season_id?: string;
  initiative_id?: string;
  tags?: string;
  search?: string;
  include_season?: boolean;
  include_initiative?: boolean;
  include_timeline_item?: boolean;
}

export class DailyStrategyRepository extends BaseRepository<DailyStrategyItem> {
  constructor(client: DatabaseClient) {
    super(client, 'core_strategy_daily', '*');
  }

  /**
   * Find a daily strategy item by ID (wrapper for findByUserAndId for consistency)
   */
  async findById(userId: string, id: string): Promise<RepositoryResult<DailyStrategyItem>> {
    return this.findByUserAndId(userId, id);
  }

  /**
   * Update a daily strategy item by ID (wrapper for updateByUserAndId for consistency)
   */
  async update(userId: string, id: string, data: Partial<DailyStrategyItem>): Promise<RepositoryResult<DailyStrategyItem>> {
    return this.updateByUserAndId(userId, id, data);
  }

  /**
   * Delete a daily strategy item by ID (wrapper for deleteByUserAndId for consistency)
   */
  async delete(userId: string, id: string): Promise<RepositoryResult<boolean>> {
    return this.deleteByUserAndId(userId, id);
  }

  /**
   * Find daily strategy items with advanced filtering and joins
   */
  async findStrategiesAdvanced(
    userId: string,
    filters: DailyStrategyFilterParams
  ): Promise<RepositoryListResult<DailyStrategyItem>> {
    try {
      // Build select clause with optional joins
      let selectClause = `
        *,
        timeline_item:timeline_items!inner(
          id,
          type,
          title,
          description,
          status,
          priority,
          tags,
          metadata,
          category:categories(id, name, color, icon)
        )
      `;

      if (filters.include_season) {
        selectClause += `,season:seasons(id, title, theme, status)`;
      }
      if (filters.include_initiative) {
        selectClause += `,initiative:core_strategy_initiatives(id, title, status, priority)`;
      }

      let query = this.client
        .from(this.tableName)
        .select(selectClause, { count: 'exact' })
        .eq('user_id', userId);

      // Apply date filters
      if (filters.date) {
        query = query.eq('local_date', filters.date);
      } else {
        if (filters.date_from) {
          query = query.gte('local_date', filters.date_from);
        }
        if (filters.date_to) {
          query = query.lte('local_date', filters.date_to);
        }
      }

      // Apply strategy filters
      if (filters.strategy_type) {
        query = query.eq('strategy_type', filters.strategy_type);
      }
      if (filters.importance_level) {
        query = query.eq('importance_level', filters.importance_level);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.planned_time_of_day) {
        query = query.eq('planned_time_of_day', filters.planned_time_of_day);
      }

      // Apply timeline item filters
      if (filters.timeline_item_type) {
        query = query.eq('timeline_item_type', filters.timeline_item_type);
      }
      if (filters.timeline_item_id) {
        query = query.eq('timeline_item_id', filters.timeline_item_id);
      }

      // Apply strategy framework filters
      if (filters.season_id) {
        query = query.eq('season_id', filters.season_id);
      }
      if (filters.initiative_id) {
        query = query.eq('initiative_id', filters.initiative_id);
      }

      // Apply search filter
      if (filters.search) {
        query = query.or(`
          timeline_items.title.ilike.%${filters.search}%,
          timeline_items.description.ilike.%${filters.search}%,
          completion_notes.ilike.%${filters.search}%,
          reflection_notes.ilike.%${filters.search}%
        `);
      }

      // Apply tags filter
      if (filters.tags) {
        const filterTags = filters.tags.split(',').map(tag => tag.trim());
        query = query.overlaps('tags', filterTags);
      }

      // Apply sorting
      const sortBy = filters.sort_by || 'local_date';
      const ascending = filters.sort_order === 'asc';

      switch (sortBy) {
        case 'priority_order':
          query = query
            .order('local_date', { ascending: false })
            .order('strategy_type', { ascending: true })
            .order('priority_order', { ascending: true });
          break;
        case 'importance_level':
          query = query.order('importance_level', { ascending: false });
          break;
        case 'local_date':
          query = query.order('local_date', { ascending });
          break;
        default:
          query = query.order(sortBy, { ascending });
      }

      // Apply pagination
      const limit = filters.limit || 20;
      const offset = filters.offset || 0;
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        return {
          data: null,
          error: new Error(`Failed to fetch daily strategy items: ${error.message}`),
          total: 0
        };
      }

      return {
        data: (data as unknown) as DailyStrategyItem[],
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
   * Create a daily strategy item using the database RPC function
   */
  async createWithRPC(
    userId: string,
    params: {
      timeline_item_id: string;
      strategy_type: string;
      local_date: string;
      importance_level: number;
      priority_order?: number | null;
      planned_duration_minutes?: number | null;
      planned_time_of_day?: string | null;
      required_energy_level?: number | null;
      tags: string[];
      metadata: Record<string, any>;
    }
  ): Promise<RepositoryResult<string>> {
    try {
      const { data: newItemId, error } = await this.client.rpc('add_daily_strategy_item', {
        p_timeline_item_id: params.timeline_item_id,
        p_strategy_type: params.strategy_type,
        p_local_date: params.local_date,
        p_importance_level: params.importance_level,
        p_priority_order: params.priority_order || null,
        p_planned_duration_minutes: params.planned_duration_minutes || null,
        p_planned_time_of_day: params.planned_time_of_day || null,
        p_required_energy_level: params.required_energy_level || null,
        p_tags: params.tags,
        p_metadata: params.metadata,
        p_user_id: userId
      });

      if (error) {
        return {
          data: null,
          error: new Error(`Failed to create daily strategy item: ${error.message}`)
        };
      }

      return { data: newItemId as string, error: null };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Unknown error')
      };
    }
  }

  /**
   * Update status of a daily strategy item
   */
  async updateStatus(
    userId: string,
    id: string,
    status: string,
    notes?: string
  ): Promise<RepositoryResult<DailyStrategyItem>> {
    try {
      const updateData: Partial<DailyStrategyItem> = {
        status: status as any,
        updated_at: new Date().toISOString()
      };

      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
        if (notes) {
          updateData.completion_notes = notes;
        }
      }

      const { data, error } = await this.client
        .from(this.tableName)
        .update(updateData)
        .eq('id', id)
        .eq('user_id', userId)
        .select(this.defaultSelect)
        .single();

      if (error) {
        return {
          data: null,
          error: new Error(`Failed to update strategy status: ${error.message}`)
        };
      }

      return { data: (data as unknown) as DailyStrategyItem, error: null };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Unknown error')
      };
    }
  }
}
