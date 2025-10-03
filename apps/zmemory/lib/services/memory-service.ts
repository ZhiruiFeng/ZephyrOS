import { BaseServiceImpl } from './base-service';
import type {
  ServiceContext,
  ServiceDependencies,
  ServiceResult,
  ServiceListResult
} from './types';
import type { Memory, MemoryFilterParams } from '@/database';

// Query parameters from API routes
// Note: importance_level, context fields removed - do not exist in database schema
export interface MemoryQueryParams {
  memory_type?: string;
  status?: string;
  is_highlight?: boolean;
  search?: string;
  search_fields?: 'note' | 'place_name' | 'all';
  tags?: string;
  place_name?: string;
  near_lat?: number;
  near_lng?: number;
  distance_km?: number;
  min_emotion_valence?: number;
  max_emotion_valence?: number;
  min_salience?: number;
  category_id?: string;
  captured_from?: string;
  captured_to?: string;
  happened_from?: string;
  happened_to?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface MemoryService {
  findMemories(filters: MemoryQueryParams): Promise<ServiceListResult<Memory>>;
  findMemoryById(memoryId: string): Promise<ServiceResult<Memory>>;
  createMemory(data: Partial<Memory>): Promise<ServiceResult<Memory>>;
  updateMemory(memoryId: string, updates: Partial<Memory>): Promise<ServiceResult<Memory>>;
  deleteMemory(memoryId: string): Promise<ServiceResult<void>>;
  searchMemories(query: string, filters: MemoryQueryParams): Promise<ServiceListResult<Memory>>;
  getMemoryStatistics(filters: MemoryQueryParams): Promise<ServiceResult<any>>;
}

export class MemoryServiceImpl extends BaseServiceImpl implements MemoryService {

  constructor(context: ServiceContext, dependencies: ServiceDependencies) {
    super(context, dependencies);
  }

  /**
   * Find memories with comprehensive filtering
   */
  async findMemories(filters: MemoryQueryParams): Promise<ServiceListResult<Memory>> {
    return this.safeListOperation(async () => {
      this.validateUserAccess();

      // Map query params to repository filters
      // Note: importance_level does not exist in database, removed from filters
      const repoFilters: MemoryFilterParams = {
        memory_type: filters.memory_type,
        status: filters.status,
        is_highlight: filters.is_highlight,
        search: filters.search,
        search_fields: filters.search_fields,
        place_name: filters.place_name,
        near_lat: filters.near_lat,
        near_lng: filters.near_lng,
        distance_km: filters.distance_km,
        min_emotion_valence: filters.min_emotion_valence,
        max_emotion_valence: filters.max_emotion_valence,
        min_salience: filters.min_salience,
        category_id: filters.category_id,
        captured_from: filters.captured_from,
        captured_to: filters.captured_to,
        happened_from: filters.happened_from,
        happened_to: filters.happened_to,
        sort_by: filters.sort_by || 'captured_at',
        sort_order: filters.sort_order || 'desc',
        limit: filters.limit || 50,
        offset: filters.offset || 0
      };

      // Parse tags if provided as comma-separated string
      if (filters.tags) {
        repoFilters.tags = filters.tags.split(',').map(t => t.trim());
      }

      // Use MemoryRepository.findMemoriesAdvanced for all filtering
      const result = await this.dependencies.memoryRepository.findMemoriesAdvanced(
        this.context.userId,
        repoFilters
      );

      if (result.error) {
        throw result.error;
      }

      return {
        items: result.data || [],
        total: result.data?.length || 0
      };
    });
  }

  /**
   * Find memory by ID
   */
  async findMemoryById(memoryId: string): Promise<ServiceResult<Memory>> {
    return this.safeOperation(async () => {
      this.validateUserAccess();
      this.validateRequired(memoryId, 'memoryId');

      const result = await this.dependencies.memoryRepository.findByUserAndId(
        this.context.userId,
        memoryId
      );

      if (result.error) {
        throw result.error;
      }

      if (!result.data) {
        throw new Error('Memory not found');
      }

      return result.data;
    });
  }

  /**
   * Create new memory
   */
  async createMemory(data: Partial<Memory>): Promise<ServiceResult<Memory>> {
    return this.safeOperation(async () => {
      this.validateUserAccess();
      this.validateRequired(data.title || data.note, 'title or note');

      // Set defaults and exclude fields that don't exist in database schema
      // Note: importance_level, mood, source, context, related_to do NOT exist in memories table
      const memoryData: any = {
        title: data.title || data.note?.substring(0, 100) || 'Untitled',
        description: data.description,
        note: data.note,
        memory_type: data.memory_type || 'note',
        captured_at: data.captured_at,
        happened_range: data.happened_range,
        emotion_valence: data.emotion_valence,
        emotion_arousal: data.emotion_arousal,
        energy_delta: data.energy_delta,
        place_name: data.place_name,
        latitude: data.latitude,
        longitude: data.longitude,
        is_highlight: data.is_highlight ?? false,
        salience_score: data.salience_score ?? 0.5,
        category_id: data.category_id,
        tags: data.tags || [],
        status: data.status || 'active'
      };

      // Use MemoryRepository.createMemory which handles happened_range formatting
      const result = await this.dependencies.memoryRepository.createMemory(
        this.context.userId,
        memoryData
      );

      if (result.error) {
        throw result.error;
      }

      this.logOperation('info', 'createMemory', {
        memoryId: result.data?.id,
        memoryType: memoryData.memory_type
      });

      return result.data!;
    });
  }

  /**
   * Update memory
   */
  async updateMemory(memoryId: string, updates: Partial<Memory>): Promise<ServiceResult<Memory>> {
    return this.safeOperation(async () => {
      this.validateUserAccess();
      this.validateRequired(memoryId, 'memoryId');

      // Verify memory exists and belongs to user
      const existing = await this.findMemoryById(memoryId);
      if (existing.error) {
        throw existing.error;
      }

      // Use MemoryRepository.updateMemory which handles happened_range formatting
      const result = await this.dependencies.memoryRepository.updateMemory(
        this.context.userId,
        memoryId,
        updates
      );

      if (result.error) {
        throw result.error;
      }

      this.logOperation('info', 'updateMemory', {
        memoryId,
        updatedFields: Object.keys(updates)
      });

      return result.data!;
    });
  }

  /**
   * Delete memory (soft delete by setting status to 'deleted')
   */
  async deleteMemory(memoryId: string): Promise<ServiceResult<void>> {
    return this.safeOperation(async () => {
      this.validateUserAccess();
      this.validateRequired(memoryId, 'memoryId');

      // Verify memory exists and belongs to user
      const existing = await this.findMemoryById(memoryId);
      if (existing.error) {
        throw existing.error;
      }

      // Soft delete by updating status
      const result = await this.dependencies.memoryRepository.updateMemory(
        this.context.userId,
        memoryId,
        { status: 'deleted' }
      );

      if (result.error) {
        throw result.error;
      }

      this.logOperation('info', 'deleteMemory', { memoryId });

      return undefined;
    });
  }

  /**
   * Search memories with relevance scoring
   */
  async searchMemories(query: string, filters: MemoryQueryParams): Promise<ServiceListResult<Memory>> {
    return this.safeListOperation(async () => {
      this.validateUserAccess();
      this.validateRequired(query, 'search query');

      // Map query params to repository filters
      const repoFilters: MemoryFilterParams = {
        memory_type: filters.memory_type,
        status: filters.status,
        is_highlight: filters.is_highlight,
        search_fields: filters.search_fields || 'all',
        place_name: filters.place_name,
        category_id: filters.category_id,
        captured_from: filters.captured_from,
        captured_to: filters.captured_to,
        limit: filters.limit || 50,
        offset: filters.offset || 0
      };

      // Parse tags if provided
      if (filters.tags) {
        repoFilters.tags = filters.tags.split(',').map(t => t.trim());
      }

      // Use MemoryRepository.searchMemoriesWithRelevance
      const result = await this.dependencies.memoryRepository.searchMemoriesWithRelevance(
        this.context.userId,
        query,
        repoFilters
      );

      if (result.error) {
        throw result.error;
      }

      return {
        items: result.data || [],
        total: result.data?.length || 0
      };
    });
  }

  /**
   * Get memory statistics
   */
  async getMemoryStatistics(filters: MemoryQueryParams): Promise<ServiceResult<any>> {
    return this.safeOperation(async () => {
      this.validateUserAccess();

      // Map query params to repository filters
      const repoFilters: MemoryFilterParams = {
        memory_type: filters.memory_type,
        status: filters.status,
        category_id: filters.category_id,
        captured_from: filters.captured_from,
        captured_to: filters.captured_to
      };

      // Use MemoryRepository.getMemoryStatistics
      const result = await this.dependencies.memoryRepository.getMemoryStatistics(
        this.context.userId,
        repoFilters
      );

      if (result.error) {
        throw result.error;
      }

      return result.data!;
    });
  }
}
