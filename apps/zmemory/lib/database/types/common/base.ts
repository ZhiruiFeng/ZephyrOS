import type { SupabaseClient } from '@supabase/supabase-js';

// Base interfaces for repository operations
export interface BaseEntity {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface PaginationParams {
  limit?: number;
  offset?: number;
}

export interface SortParams {
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface DateRangeParams {
  from_date?: string;
  to_date?: string;
  created_after?: string;
  created_before?: string;
  updated_after?: string;
  updated_before?: string;
}

export interface SearchParams {
  search?: string;
  search_fields?: string[];
}

export interface FilterParams extends PaginationParams, SortParams, DateRangeParams, SearchParams {
  status?: string;
  tags?: string[];
  category_id?: string;
  [key: string]: any;
}

export interface RepositoryResult<T> {
  data: T | null;
  error: Error | null;
}

export interface RepositoryListResult<T> {
  data: T[] | null;
  error: Error | null;
  total?: number;
}

export interface JoinConfig {
  table: string;
  select: string;
  alias?: string;
}

export interface AggregationResult {
  [key: string]: number | string;
}

// Database client type
export type DatabaseClient = SupabaseClient;