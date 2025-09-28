import { BaseRepository } from './base-repository';
import type { RepositoryResult, RepositoryListResult, FilterParams } from '../types';
import type { SupabaseClient } from '@supabase/supabase-js';

// Activity type definition
export interface Activity {
  id: string;
  user_id: string;
  activity_type: string;
  planned_duration: number | null;
  actual_duration: number | null;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  satisfaction_rating: number | null;
  mood_before: number | null;
  mood_after: number | null;
  energy_before: number | null;
  energy_after: number | null;
  notes: string | null;
  location: string | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
}

// Activity-specific filter parameters
export interface ActivityFilterParams extends Omit<FilterParams, 'search_fields'> {
  activity_types?: string[];
  status?: string[];
  min_satisfaction?: number;
  max_satisfaction?: number;
  min_duration?: number;
  max_duration?: number;
  start_date?: string;
  end_date?: string;
  location?: string;
  mood_range?: { min: number; max: number };
  energy_range?: { min: number; max: number };
  search_fields?: ('activity_type' | 'notes' | 'location')[];
}

export class ActivityRepository extends BaseRepository<Activity> {
  constructor(client: SupabaseClient) {
    super(client, 'activities');
  }

  /**
   * Find activities with advanced filtering
   */
  async findActivitiesAdvanced(
    userId: string,
    filters: ActivityFilterParams = {}
  ): Promise<RepositoryListResult<Activity>> {
    try {
      let query = this.client
        .from(this.tableName)
        .select('*')
        .eq('user_id', userId);

      // Activity type filtering
      if (filters.activity_types && filters.activity_types.length > 0) {
        query = query.in('activity_type', filters.activity_types);
      }

      // Status filtering
      if (filters.status && filters.status.length > 0) {
        query = query.in('status', filters.status);
      }

      // Satisfaction rating range
      if (filters.min_satisfaction !== undefined) {
        query = query.gte('satisfaction_rating', filters.min_satisfaction);
      }
      if (filters.max_satisfaction !== undefined) {
        query = query.lte('satisfaction_rating', filters.max_satisfaction);
      }

      // Duration range
      if (filters.min_duration !== undefined) {
        query = query.gte('actual_duration', filters.min_duration);
      }
      if (filters.max_duration !== undefined) {
        query = query.lte('actual_duration', filters.max_duration);
      }

      // Date range filtering
      if (filters.start_date) {
        query = query.gte('started_at', filters.start_date);
      }
      if (filters.end_date) {
        query = query.lte('started_at', filters.end_date);
      }

      // Location filtering
      if (filters.location) {
        query = query.ilike('location', `%${filters.location}%`);
      }

      // Mood range filtering
      if (filters.mood_range) {
        if (filters.mood_range.min !== undefined) {
          query = query.gte('mood_before', filters.mood_range.min);
        }
        if (filters.mood_range.max !== undefined) {
          query = query.lte('mood_before', filters.mood_range.max);
        }
      }

      // Energy range filtering
      if (filters.energy_range) {
        if (filters.energy_range.min !== undefined) {
          query = query.gte('energy_before', filters.energy_range.min);
        }
        if (filters.energy_range.max !== undefined) {
          query = query.lte('energy_before', filters.energy_range.max);
        }
      }

      // Search across specified fields
      if (filters.search && filters.search_fields && filters.search_fields.length > 0) {
        const searchConditions = filters.search_fields.map(field => {
          if (field === 'activity_type') {
            return `activity_type.ilike.%${filters.search}%`;
          } else if (field === 'notes') {
            return `notes.ilike.%${filters.search}%`;
          } else if (field === 'location') {
            return `location.ilike.%${filters.search}%`;
          }
          return null;
        }).filter(Boolean);

        if (searchConditions.length > 0) {
          query = query.or(searchConditions.join(','));
        }
      }

      // Apply sorting
      const sortField = filters.sort_by || 'created_at';
      const sortOrder = filters.sort_order || 'desc';
      query = query.order(sortField, { ascending: sortOrder === 'asc' });

      // Apply pagination
      if (filters.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
      } else if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch activities: ${error.message}`);
      }

      return {
        data: data as Activity[],
        error: null,
        total: data?.length
      };
    } catch (error) {
      return {
        data: null,
        error: error as Error
      };
    }
  }

  /**
   * Search activities with relevance scoring
   */
  async searchActivitiesWithRelevance(
    userId: string,
    searchQuery: string,
    limit: number = 20
  ): Promise<RepositoryListResult<Activity>> {
    try {
      // Use PostgreSQL full-text search across multiple fields
      const { data, error } = await this.client
        .from(this.tableName)
        .select('*')
        .eq('user_id', userId)
        .or(`activity_type.ilike.%${searchQuery}%,notes.ilike.%${searchQuery}%,location.ilike.%${searchQuery}%`)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw new Error(`Failed to search activities: ${error.message}`);
      }

      return {
        data: data as Activity[],
        error: null,
        total: data?.length
      };
    } catch (error) {
      return {
        data: null,
        error: error as Error
      };
    }
  }

  /**
   * Get activity statistics by type
   */
  async getActivityStatsByType(
    userId: string,
    dateRange?: { start: string; end: string }
  ): Promise<RepositoryResult<Record<string, any>>> {
    try {
      let query = this.client
        .from(this.tableName)
        .select('activity_type, satisfaction_rating, actual_duration, status, mood_before, mood_after, energy_before, energy_after')
        .eq('user_id', userId);

      if (dateRange) {
        query = query
          .gte('started_at', dateRange.start)
          .lte('started_at', dateRange.end);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch activity stats: ${error.message}`);
      }

      // Group and calculate statistics by activity type
      const stats = (data as any[]).reduce((acc, activity) => {
        const type = activity.activity_type;
        if (!acc[type]) {
          acc[type] = {
            total_count: 0,
            completed_count: 0,
            total_duration: 0,
            satisfaction_ratings: [],
            mood_improvements: [],
            energy_changes: []
          };
        }

        acc[type].total_count++;
        if (activity.status === 'completed') {
          acc[type].completed_count++;
        }
        if (activity.actual_duration) {
          acc[type].total_duration += activity.actual_duration;
        }
        if (activity.satisfaction_rating !== null) {
          acc[type].satisfaction_ratings.push(activity.satisfaction_rating);
        }
        if (activity.mood_before !== null && activity.mood_after !== null) {
          acc[type].mood_improvements.push(activity.mood_after - activity.mood_before);
        }
        if (activity.energy_before !== null && activity.energy_after !== null) {
          acc[type].energy_changes.push(activity.energy_after - activity.energy_before);
        }

        return acc;
      }, {} as Record<string, any>);

      // Calculate averages and summary statistics
      Object.keys(stats).forEach(type => {
        const typeStats = stats[type];
        typeStats.completion_rate = typeStats.total_count > 0 ? typeStats.completed_count / typeStats.total_count : 0;
        typeStats.average_duration = typeStats.total_duration > 0 ? typeStats.total_duration / typeStats.completed_count : 0;
        typeStats.average_satisfaction = typeStats.satisfaction_ratings.length > 0
          ? typeStats.satisfaction_ratings.reduce((sum: number, rating: number) => sum + rating, 0) / typeStats.satisfaction_ratings.length
          : 0;
        typeStats.average_mood_improvement = typeStats.mood_improvements.length > 0
          ? typeStats.mood_improvements.reduce((sum: number, improvement: number) => sum + improvement, 0) / typeStats.mood_improvements.length
          : 0;
        typeStats.average_energy_change = typeStats.energy_changes.length > 0
          ? typeStats.energy_changes.reduce((sum: number, change: number) => sum + change, 0) / typeStats.energy_changes.length
          : 0;
      });

      return {
        data: stats,
        error: null
      };
    } catch (error) {
      return {
        data: null,
        error: error as Error
      };
    }
  }

  /**
   * Find activities in progress
   */
  async findActivitiesInProgress(userId: string): Promise<RepositoryListResult<Activity>> {
    return this.findActivitiesAdvanced(userId, {
      status: ['in_progress']
    });
  }

  /**
   * Find recent activities
   */
  async findRecentActivities(
    userId: string,
    days: number = 7,
    limit: number = 20
  ): Promise<RepositoryListResult<Activity>> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    return this.findActivitiesAdvanced(userId, {
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      limit
    });
  }

  /**
   * Update activity status
   */
  async updateActivityStatus(
    userId: string,
    activityId: string,
    status: Activity['status'],
    additionalData?: Partial<Activity>
  ): Promise<RepositoryResult<Activity>> {
    try {
      const updateData: Partial<Activity> = {
        status,
        updated_at: new Date().toISOString(),
        ...additionalData
      };

      // Set ended_at when completing or cancelling
      if (status === 'completed' || status === 'cancelled') {
        updateData.ended_at = new Date().toISOString();
      }

      // Set started_at when starting
      if (status === 'in_progress' && !additionalData?.started_at) {
        updateData.started_at = new Date().toISOString();
      }

      const { data, error } = await this.client
        .from(this.tableName)
        .update(updateData)
        .eq('id', activityId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update activity status: ${error.message}`);
      }

      return {
        data: data as Activity,
        error: null
      };
    } catch (error) {
      return {
        data: null,
        error: error as Error
      };
    }
  }
}