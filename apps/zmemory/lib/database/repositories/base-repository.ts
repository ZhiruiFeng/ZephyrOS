import type {
  DatabaseClient,
  BaseEntity,
  FilterParams,
  RepositoryResult,
  RepositoryListResult,
  JoinConfig,
  AggregationResult,
  PaginationParams,
  SortParams
} from '../types';
import {
  RepositoryError,
  NotFoundError,
  ValidationError,
  UnauthorizedError
} from '../types';
import { nowUTC } from '../client';

export abstract class BaseRepository<T extends BaseEntity> {
  protected client: DatabaseClient;
  protected tableName: string;
  protected defaultSelect: string;

  constructor(client: DatabaseClient, tableName: string, defaultSelect = '*') {
    this.client = client;
    this.tableName = tableName;
    this.defaultSelect = defaultSelect;
  }

  /**
   * Create a new entity
   */
  async create(userId: string, data: Partial<T>): Promise<RepositoryResult<T>> {
    try {
      const insertPayload = {
        ...data,
        user_id: userId,
        created_at: nowUTC(),
        updated_at: nowUTC()
      };

      const { data: result, error } = await this.client
        .from(this.tableName)
        .insert(insertPayload)
        .select(this.defaultSelect)
        .single();

      if (error) {
        console.error(`Database error creating ${this.tableName}:`, error);
        return { data: null, error: new RepositoryError(`Failed to create ${this.tableName}`) };
      }

      return { data: result as unknown as T, error: null };
    } catch (error) {
      console.error(`Unexpected error creating ${this.tableName}:`, error);
      return { data: null, error: new RepositoryError(`Failed to create ${this.tableName}`) };
    }
  }

  /**
   * Find entity by ID with user ownership check
   */
  async findByUserAndId(userId: string, id: string, select?: string): Promise<RepositoryResult<T>> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select(select || this.defaultSelect)
        .eq('id', id)
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return { data: null, error: new NotFoundError(this.tableName, id) };
        }
        console.error(`Database error finding ${this.tableName}:`, error);
        return { data: null, error: new RepositoryError(`Failed to find ${this.tableName}`) };
      }

      return { data: data as unknown as T, error: null };
    } catch (error) {
      console.error(`Unexpected error finding ${this.tableName}:`, error);
      return { data: null, error: new RepositoryError(`Failed to find ${this.tableName}`) };
    }
  }

  /**
   * Update entity by ID with user ownership check
   */
  async updateByUserAndId(userId: string, id: string, data: Partial<T>): Promise<RepositoryResult<T>> {
    try {
      const updatePayload = {
        ...data,
        updated_at: nowUTC()
      };

      const { data: result, error } = await this.client
        .from(this.tableName)
        .update(updatePayload)
        .eq('id', id)
        .eq('user_id', userId)
        .select(this.defaultSelect)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return { data: null, error: new NotFoundError(this.tableName, id) };
        }
        console.error(`Database error updating ${this.tableName}:`, error);
        return { data: null, error: new RepositoryError(`Failed to update ${this.tableName}`) };
      }

      return { data: result as unknown as T, error: null };
    } catch (error) {
      console.error(`Unexpected error updating ${this.tableName}:`, error);
      return { data: null, error: new RepositoryError(`Failed to update ${this.tableName}`) };
    }
  }

  /**
   * Soft delete entity by ID with user ownership check
   */
  async softDeleteByUserAndId(userId: string, id: string): Promise<RepositoryResult<T>> {
    return this.updateByUserAndId(userId, id, {
      status: 'archived'
    } as unknown as Partial<T>);
  }

  /**
   * Hard delete entity by ID with user ownership check
   */
  async deleteByUserAndId(userId: string, id: string): Promise<RepositoryResult<boolean>> {
    try {
      const { error } = await this.client
        .from(this.tableName)
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) {
        console.error(`Database error deleting ${this.tableName}:`, error);
        return { data: null, error: new RepositoryError(`Failed to delete ${this.tableName}`) };
      }

      return { data: true, error: null };
    } catch (error) {
      console.error(`Unexpected error deleting ${this.tableName}:`, error);
      return { data: null, error: new RepositoryError(`Failed to delete ${this.tableName}`) };
    }
  }

  /**
   * Find entities with filtering, pagination, and sorting
   */
  async findByUser(
    userId: string,
    filters: FilterParams = {},
    select?: string
  ): Promise<RepositoryListResult<T>> {
    try {
      let query = this.client
        .from(this.tableName)
        .select(select || this.defaultSelect)
        .eq('user_id', userId);

      // Apply filters
      query = this.applyFilters(query, filters);

      // Apply sorting
      if (filters.sort_by) {
        const ascending = filters.sort_order === 'asc';
        query = query.order(filters.sort_by, { ascending });
      }

      // Apply pagination
      if (filters.limit !== undefined && filters.offset !== undefined) {
        query = query.range(filters.offset, filters.offset + filters.limit - 1);
      }

      const { data, error } = await query;

      if (error) {
        console.error(`Database error finding ${this.tableName}:`, error);
        return { data: null, error: new RepositoryError(`Failed to find ${this.tableName}`) };
      }

      return { data: data as unknown as T[], error: null };
    } catch (error) {
      console.error(`Unexpected error finding ${this.tableName}:`, error);
      return { data: null, error: new RepositoryError(`Failed to find ${this.tableName}`) };
    }
  }

  /**
   * Count entities with filtering
   */
  async countByUser(userId: string, filters: FilterParams = {}): Promise<RepositoryResult<number>> {
    try {
      let query = this.client
        .from(this.tableName)
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      // Apply filters (without pagination)
      const filtersWithoutPagination = { ...filters };
      delete filtersWithoutPagination.limit;
      delete filtersWithoutPagination.offset;

      query = this.applyFilters(query, filtersWithoutPagination);

      const { count, error } = await query;

      if (error) {
        console.error(`Database error counting ${this.tableName}:`, error);
        return { data: null, error: new RepositoryError(`Failed to count ${this.tableName}`) };
      }

      return { data: count || 0, error: null };
    } catch (error) {
      console.error(`Unexpected error counting ${this.tableName}:`, error);
      return { data: null, error: new RepositoryError(`Failed to count ${this.tableName}`) };
    }
  }

  /**
   * Find entities with joins
   */
  async findWithJoins(
    userId: string,
    joins: JoinConfig[],
    filters: FilterParams = {}
  ): Promise<RepositoryListResult<T>> {
    try {
      // Build select string with joins
      const joinSelects = joins.map(join => {
        const alias = join.alias || join.table;
        return `${alias}:${join.table}(${join.select})`;
      });

      const selectString = `${this.defaultSelect},${joinSelects.join(',')}`;

      return this.findByUser(userId, filters, selectString);
    } catch (error) {
      console.error(`Unexpected error finding ${this.tableName} with joins:`, error);
      return { data: null, error: new RepositoryError(`Failed to find ${this.tableName} with joins`) };
    }
  }

  /**
   * Search entities across multiple text fields
   */
  async searchByUser(
    userId: string,
    searchQuery: string,
    searchFields: string[],
    filters: FilterParams = {}
  ): Promise<RepositoryListResult<T>> {
    try {
      let query = this.client
        .from(this.tableName)
        .select(this.defaultSelect)
        .eq('user_id', userId);

      // Apply search conditions
      if (searchQuery && searchFields.length > 0) {
        const searchConditions = searchFields.map(field =>
          `${field}.ilike.%${searchQuery}%`
        );
        query = query.or(searchConditions.join(','));
      }

      // Apply other filters
      const filtersWithoutSearch = { ...filters };
      delete filtersWithoutSearch.search;
      delete filtersWithoutSearch.search_fields;

      query = this.applyFilters(query, filtersWithoutSearch);

      // Apply sorting (default to relevance if searching)
      if (filters.sort_by) {
        const ascending = filters.sort_order === 'asc';
        query = query.order(filters.sort_by, { ascending });
      }

      // Apply pagination
      if (filters.limit !== undefined && filters.offset !== undefined) {
        query = query.range(filters.offset, filters.offset + filters.limit - 1);
      }

      const { data, error } = await query;

      if (error) {
        console.error(`Database error searching ${this.tableName}:`, error);
        return { data: null, error: new RepositoryError(`Failed to search ${this.tableName}`) };
      }

      return { data: data as unknown as T[], error: null };
    } catch (error) {
      console.error(`Unexpected error searching ${this.tableName}:`, error);
      return { data: null, error: new RepositoryError(`Failed to search ${this.tableName}`) };
    }
  }

  /**
   * Apply common filters to a query
   * This can be overridden by specific repositories for custom filtering
   */
  protected applyFilters(query: any, filters: FilterParams): any {
    // Status filtering
    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    // Date range filtering
    if (filters.created_after) {
      query = query.gte('created_at', filters.created_after);
    }
    if (filters.created_before) {
      query = query.lte('created_at', filters.created_before);
    }
    if (filters.updated_after) {
      query = query.gte('updated_at', filters.updated_after);
    }
    if (filters.updated_before) {
      query = query.lte('updated_at', filters.updated_before);
    }

    // Category filtering
    if (filters.category_id) {
      query = query.eq('category_id', filters.category_id);
    }

    // Tag filtering (if entity has tags array)
    if (filters.tags && filters.tags.length > 0) {
      query = query.overlaps('tags', filters.tags);
    }

    return query;
  }

  /**
   * Check if user has access to resource
   */
  async checkUserAccess(userId: string, entityId: string): Promise<boolean> {
    const { data } = await this.client
      .from(this.tableName)
      .select('id')
      .eq('id', entityId)
      .eq('user_id', userId)
      .single();

    return !!data;
  }

  /**
   * Get aggregated statistics for user's data
   */
  async getStatsByUser(
    userId: string,
    groupField: string,
    filters: FilterParams = {}
  ): Promise<RepositoryResult<AggregationResult[]>> {
    try {
      const { data } = await this.findByUser(userId, filters);

      if (!data) {
        return { data: [], error: null };
      }

      // Perform aggregation in application (since Supabase doesn't have full GROUP BY)
      const aggregated: { [key: string]: number } = {};

      data.forEach((item: any) => {
        const key = item[groupField] || 'unknown';
        aggregated[key] = (aggregated[key] || 0) + 1;
      });

      const result = Object.entries(aggregated).map(([key, count]) => ({
        [groupField]: key,
        count
      }));

      return { data: result, error: null };
    } catch (error) {
      console.error(`Unexpected error getting stats for ${this.tableName}:`, error);
      return { data: null, error: new RepositoryError(`Failed to get stats for ${this.tableName}`) };
    }
  }
}