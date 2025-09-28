import { BaseRepository } from './base-repository';
import type {
  DatabaseClient,
  FilterParams,
  RepositoryResult,
  RepositoryListResult
} from '../types';
import { formatPostgreSQLTstzRange, buildBoundingBox } from '../client';

// Memory entity type
export interface Memory {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  note?: string;
  memory_type: 'note' | 'link' | 'file' | 'thought' | 'quote' | 'insight';
  captured_at: string;
  happened_range?: string; // PostgreSQL tstzrange
  emotion_valence?: number;
  emotion_arousal?: number;
  energy_delta?: number;
  place_name?: string;
  latitude?: number;
  longitude?: number;
  is_highlight: boolean;
  salience_score: number;
  source?: string;
  context?: string;
  mood?: number;
  importance_level: 'low' | 'medium' | 'high';
  related_to: string[];
  category_id?: string;
  tags: string[];
  status: 'active' | 'archived' | 'deleted';
  created_at: string;
  updated_at: string;
}

// Memory-specific filter parameters
export interface MemoryFilterParams extends Omit<FilterParams, 'search_fields'> {
  memory_type?: string;
  importance_level?: string;
  is_highlight?: boolean;
  captured_from?: string;
  captured_to?: string;
  happened_from?: string;
  happened_to?: string;
  place_name?: string;
  near_lat?: number;
  near_lng?: number;
  distance_km?: number;
  min_emotion_valence?: number;
  max_emotion_valence?: number;
  min_salience?: number;
  min_mood?: number;
  related_to?: string;
  search_fields?: 'note' | 'context' | 'place_name' | 'all';
}

export class MemoryRepository extends BaseRepository<Memory> {
  constructor(client: DatabaseClient) {
    super(client, 'memories', `
      *,
      category:categories(id, name, color, icon)
    `);
  }

  /**
   * Create memory with proper happened_range formatting
   */
  async createMemory(userId: string, data: Partial<Memory>): Promise<RepositoryResult<Memory>> {
    const memoryData = { ...data };

    // Format happened_range if provided
    if (data.happened_range && typeof data.happened_range === 'object') {
      const range = data.happened_range as any;
      if (range.start) {
        memoryData.happened_range = formatPostgreSQLTstzRange(range.start, range.end);
      }
    }

    return this.create(userId, memoryData);
  }

  /**
   * Update memory with proper happened_range formatting
   */
  async updateMemory(userId: string, id: string, data: Partial<Memory>): Promise<RepositoryResult<Memory>> {
    const memoryData = { ...data };

    // Format happened_range if provided
    if (data.happened_range && typeof data.happened_range === 'object') {
      const range = data.happened_range as any;
      if (range.start) {
        memoryData.happened_range = formatPostgreSQLTstzRange(range.start, range.end);
      }
    }

    return this.updateByUserAndId(userId, id, memoryData);
  }

  /**
   * Find memories with advanced filtering including location and emotional state
   */
  async findMemoriesAdvanced(
    userId: string,
    filters: MemoryFilterParams = {}
  ): Promise<RepositoryListResult<Memory>> {
    try {
      let query = this.client
        .from(this.tableName)
        .select(this.defaultSelect)
        .eq('user_id', userId);

      // Apply memory-specific filters
      query = this.applyMemoryFilters(query, filters);

      // Apply sorting
      const sortBy = filters.sort_by || 'captured_at';
      const ascending = filters.sort_order === 'asc';
      query = query.order(sortBy, { ascending });

      // Apply pagination
      if (filters.limit !== undefined && filters.offset !== undefined) {
        query = query.range(filters.offset, filters.offset + filters.limit - 1);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Database error finding memories:', error);
        return { data: null, error: new Error('Failed to find memories') };
      }

      return { data: data as unknown as Memory[], error: null };
    } catch (error) {
      console.error('Unexpected error finding memories:', error);
      return { data: null, error: new Error('Failed to find memories') };
    }
  }

  /**
   * Search memories with relevance scoring
   */
  async searchMemoriesWithRelevance(
    userId: string,
    searchQuery: string,
    filters: MemoryFilterParams = {}
  ): Promise<RepositoryListResult<Memory>> {
    try {
      let query = this.client
        .from(this.tableName)
        .select(this.defaultSelect)
        .eq('user_id', userId);

      // Apply search conditions based on search_fields
      if (searchQuery) {
        const searchFields = filters.search_fields || 'all';
        const searchConditions: string[] = [];

        if (searchFields === 'all' || searchFields === 'note') {
          searchConditions.push(`note.ilike.%${searchQuery}%`);
        }
        if (searchFields === 'all' || searchFields === 'context') {
          searchConditions.push(`context.ilike.%${searchQuery}%`);
        }
        if (searchFields === 'all' || searchFields === 'place_name') {
          searchConditions.push(`place_name.ilike.%${searchQuery}%`);
        }

        if (searchConditions.length > 0) {
          query = query.or(searchConditions.join(','));
        }
      }

      // Apply other filters
      const filtersWithoutSearch = { ...filters };
      delete filtersWithoutSearch.search;
      delete filtersWithoutSearch.search_fields;

      query = this.applyMemoryFilters(query, filtersWithoutSearch);

      // Order by relevance (salience_score) first, then by recency
      query = query
        .order('salience_score', { ascending: false })
        .order('captured_at', { ascending: false });

      // Apply pagination
      if (filters.limit !== undefined && filters.offset !== undefined) {
        query = query.range(filters.offset, filters.offset + filters.limit - 1);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Database error searching memories:', error);
        return { data: null, error: new Error('Failed to search memories') };
      }

      return { data: data as unknown as Memory[], error: null };
    } catch (error) {
      console.error('Unexpected error searching memories:', error);
      return { data: null, error: new Error('Failed to search memories') };
    }
  }

  /**
   * Find memories by location with bounding box
   */
  async findMemoriesByLocation(
    userId: string,
    lat: number,
    lng: number,
    distanceKm: number = 10,
    filters: MemoryFilterParams = {}
  ): Promise<RepositoryListResult<Memory>> {
    const boundingBox = buildBoundingBox(lat, lng, distanceKm);

    const locationFilters: MemoryFilterParams = {
      ...filters,
      near_lat: lat,
      near_lng: lng,
      distance_km: distanceKm
    };

    return this.findMemoriesAdvanced(userId, locationFilters);
  }

  /**
   * Find highlighted memories
   */
  async findHighlightedMemories(
    userId: string,
    filters: MemoryFilterParams = {}
  ): Promise<RepositoryListResult<Memory>> {
    return this.findMemoriesAdvanced(userId, {
      ...filters,
      is_highlight: true
    });
  }

  /**
   * Find memories by emotional state
   */
  async findMemoriesByEmotion(
    userId: string,
    minValence?: number,
    maxValence?: number,
    filters: MemoryFilterParams = {}
  ): Promise<RepositoryListResult<Memory>> {
    return this.findMemoriesAdvanced(userId, {
      ...filters,
      min_emotion_valence: minValence,
      max_emotion_valence: maxValence
    });
  }

  /**
   * Get memory statistics by type, emotion, location, etc.
   */
  async getMemoryStatistics(
    userId: string,
    filters: MemoryFilterParams = {}
  ): Promise<RepositoryResult<any>> {
    try {
      const { data: memories } = await this.findMemoriesAdvanced(userId, filters);

      if (!memories) {
        return { data: null, error: new Error('Failed to get memories for statistics') };
      }

      const stats = {
        total: memories.length,
        by_type: {} as Record<string, number>,
        by_importance: {} as Record<string, number>,
        by_status: {} as Record<string, number>,
        highlights: memories.filter(m => m.is_highlight).length,
        with_location: memories.filter(m => m.latitude && m.longitude).length,
        with_emotion: memories.filter(m => m.emotion_valence !== null).length,
        average_salience: memories.length > 0
          ? memories.reduce((sum, m) => sum + (m.salience_score || 0), 0) / memories.length
          : 0,
        emotion_distribution: {
          positive: memories.filter(m => (m.emotion_valence || 0) > 0).length,
          neutral: memories.filter(m => (m.emotion_valence || 0) === 0).length,
          negative: memories.filter(m => (m.emotion_valence || 0) < 0).length
        }
      };

      // Count by type
      memories.forEach(memory => {
        stats.by_type[memory.memory_type] = (stats.by_type[memory.memory_type] || 0) + 1;
        stats.by_importance[memory.importance_level] = (stats.by_importance[memory.importance_level] || 0) + 1;
        stats.by_status[memory.status] = (stats.by_status[memory.status] || 0) + 1;
      });

      return { data: stats, error: null };
    } catch (error) {
      console.error('Error calculating memory statistics:', error);
      return { data: null, error: new Error('Failed to calculate memory statistics') };
    }
  }

  /**
   * Apply memory-specific filters to query
   */
  protected applyMemoryFilters(query: any, filters: MemoryFilterParams): any {
    // Apply base filters first (excluding memory-specific search_fields)
    const baseFilters = { ...filters };
    delete baseFilters.search_fields;
    query = this.applyFilters(query, baseFilters as FilterParams);

    // Memory type filtering
    if (filters.memory_type) {
      query = query.eq('memory_type', filters.memory_type);
    }

    // Importance level filtering
    if (filters.importance_level) {
      query = query.eq('importance_level', filters.importance_level);
    }

    // Highlight filtering
    if (filters.is_highlight !== undefined) {
      query = query.eq('is_highlight', filters.is_highlight);
    }

    // Captured date range
    if (filters.captured_from) {
      query = query.gte('captured_at', filters.captured_from);
    }
    if (filters.captured_to) {
      query = query.lte('captured_at', filters.captured_to);
    }

    // Happened date range (would need custom SQL for tstzrange)
    if (filters.happened_from || filters.happened_to) {
      // This would require custom SQL for proper tstzrange filtering
      console.warn('Happened date range filtering not yet implemented for tstzrange');
    }

    // Location filtering
    if (filters.place_name) {
      query = query.ilike('place_name', `%${filters.place_name}%`);
    }

    // Geographic bounding box
    if (filters.near_lat !== undefined && filters.near_lng !== undefined && filters.distance_km) {
      const { minLat, maxLat, minLng, maxLng } = buildBoundingBox(
        filters.near_lat,
        filters.near_lng,
        filters.distance_km
      );

      query = query
        .gte('latitude', minLat)
        .lte('latitude', maxLat)
        .gte('longitude', minLng)
        .lte('longitude', maxLng);
    }

    // Emotional filtering
    if (filters.min_emotion_valence !== undefined) {
      query = query.gte('emotion_valence', filters.min_emotion_valence);
    }
    if (filters.max_emotion_valence !== undefined) {
      query = query.lte('emotion_valence', filters.max_emotion_valence);
    }

    // Salience filtering
    if (filters.min_salience !== undefined) {
      query = query.gte('salience_score', filters.min_salience);
    }

    // Mood filtering
    if (filters.min_mood !== undefined) {
      query = query.gte('mood', filters.min_mood);
    }

    // Related content filtering
    if (filters.related_to) {
      query = query.contains('related_to', [filters.related_to]);
    }

    return query;
  }
}