import { BaseServiceImpl } from './base-service';
import type {
  ServiceContext,
  ServiceDependencies,
  ServiceResult,
  ServiceListResult
} from './types';
import type {
  DailyStrategyItem,
  DailyStrategyFilterParams
} from '@/database/repositories/daily-strategy-repository';
import type {
  DailyStrategyQuery,
  CreateDailyStrategy,
  UpdateDailyStrategy,
  UpdateDailyStrategyStatus,
  DailyStrategyItemWithDetails
} from '@/lib/types/daily-strategy-types';
import { nowUTC } from '@/lib/utils/time-utils';

export interface DailyStrategyService {
  listStrategies(query: DailyStrategyQuery): Promise<ServiceListResult<DailyStrategyItemWithDetails>>;
  getStrategyById(id: string): Promise<ServiceResult<DailyStrategyItemWithDetails>>;
  createStrategy(data: CreateDailyStrategy): Promise<ServiceResult<DailyStrategyItemWithDetails>>;
  updateStrategy(id: string, updates: UpdateDailyStrategy): Promise<ServiceResult<DailyStrategyItemWithDetails>>;
  deleteStrategy(id: string): Promise<ServiceResult<void>>;
  updateStatus(id: string, statusUpdate: UpdateDailyStrategyStatus): Promise<ServiceResult<DailyStrategyItemWithDetails>>;
  getStrategiesByDate(date: string): Promise<ServiceListResult<DailyStrategyItemWithDetails>>;
}

export class DailyStrategyServiceImpl extends BaseServiceImpl implements DailyStrategyService {

  constructor(context: ServiceContext, dependencies: ServiceDependencies) {
    super(context, dependencies);
  }

  /**
   * List daily strategy items with filtering and pagination
   */
  async listStrategies(query: DailyStrategyQuery): Promise<ServiceListResult<DailyStrategyItemWithDetails>> {
    return this.safeListOperation(async () => {
      this.validateUserAccess();

      if (!this.dependencies.dailyStrategyRepository) {
        throw new Error('DailyStrategyRepository not available');
      }

      const filters: DailyStrategyFilterParams = {
        date: query.date,
        date_from: query.date_from,
        date_to: query.date_to,
        strategy_type: query.strategy_type,
        importance_level: query.importance_level as any,
        status: query.status,
        planned_time_of_day: query.planned_time_of_day,
        timeline_item_type: query.timeline_item_type,
        timeline_item_id: query.timeline_item_id,
        season_id: query.season_id,
        initiative_id: query.initiative_id,
        search: query.search,
        tags: query.tags,
        include_season: query.include_season,
        include_initiative: query.include_initiative,
        include_timeline_item: query.include_timeline_item,
        sort_by: query.sort_by || 'priority_order',
        sort_order: query.sort_order || 'asc',
        limit: query.limit || 50,
        offset: query.offset || 0
      };

      const result = await this.dependencies.dailyStrategyRepository.findStrategiesAdvanced(
        this.context.userId,
        filters
      );

      if (result.error) throw result.error;

      // Map database rows to DailyStrategyItemWithDetails format
      const items = (result.data || []).map(this.mapToItemWithDetails);

      return {
        items,
        total: result.total
      };
    });
  }

  /**
   * Get a single daily strategy item by ID
   */
  async getStrategyById(id: string): Promise<ServiceResult<DailyStrategyItemWithDetails>> {
    return this.safeOperation(async () => {
      this.validateUserAccess();

      if (!this.dependencies.dailyStrategyRepository) {
        throw new Error('DailyStrategyRepository not available');
      }

      const result = await this.dependencies.dailyStrategyRepository.findById(
        this.context.userId,
        id
      );

      if (result.error) throw result.error;
      if (!result.data) {
        throw new Error('Daily strategy item not found');
      }

      return this.mapToItemWithDetails(result.data);
    });
  }

  /**
   * Create a new daily strategy item
   */
  async createStrategy(data: CreateDailyStrategy): Promise<ServiceResult<DailyStrategyItemWithDetails>> {
    return this.safeOperation(async () => {
      this.validateUserAccess();

      if (!this.dependencies.dailyStrategyRepository) {
        throw new Error('DailyStrategyRepository not available');
      }

      // Verify that the timeline item exists and belongs to the user
      // Try each repository in sequence
      let found = false;

      try {
        const timelineItemResult = await this.dependencies.memoryRepository?.findByUserAndId(
          this.context.userId,
          data.timeline_item_id
        );
        if (timelineItemResult?.data) found = true;
      } catch (e) {
        // Continue to next check
      }

      if (!found) {
        try {
          const taskResult = await this.dependencies.taskRepository?.findByUserAndId(
            this.context.userId,
            data.timeline_item_id
          );
          if (taskResult?.data) found = true;
        } catch (e) {
          // Continue to next check
        }
      }

      if (!found) {
        try {
          const activityResult = await this.dependencies.activityRepository?.findByUserAndId(
            this.context.userId,
            data.timeline_item_id
          );
          if (activityResult?.data) found = true;
        } catch (e) {
          // Item not found in any repository
        }
      }

      if (!found) {
        throw new Error(`Timeline item ${data.timeline_item_id} not found or access denied`);
      }

      // Use the RPC function to create the strategy item
      const createResult = await this.dependencies.dailyStrategyRepository.createWithRPC(
        this.context.userId,
        {
          timeline_item_id: data.timeline_item_id,
          strategy_type: data.strategy_type,
          local_date: data.local_date,
          importance_level: data.importance_level as any,
          priority_order: data.priority_order,
          planned_duration_minutes: data.planned_duration_minutes,
          planned_time_of_day: data.planned_time_of_day,
          required_energy_level: data.required_energy_level,
          tags: data.tags,
          metadata: data.metadata
        }
      );

      if (createResult.error || !createResult.data) {
        throw createResult.error || new Error('Failed to create daily strategy item');
      }

      // Fetch the created item with full details
      const newItemId = createResult.data;
      const fetchResult = await this.dependencies.dailyStrategyRepository.findById(
        this.context.userId,
        newItemId
      );

      if (fetchResult.error || !fetchResult.data) {
        throw new Error('Item created but failed to fetch details');
      }

      return this.mapToItemWithDetails(fetchResult.data);
    });
  }

  /**
   * Update an existing daily strategy item
   */
  async updateStrategy(id: string, updates: UpdateDailyStrategy): Promise<ServiceResult<DailyStrategyItemWithDetails>> {
    return this.safeOperation(async () => {
      this.validateUserAccess();

      if (!this.dependencies.dailyStrategyRepository) {
        throw new Error('DailyStrategyRepository not available');
      }

      const updateData: Partial<DailyStrategyItem> = {};

      if (updates.strategy_type !== undefined) updateData.strategy_type = updates.strategy_type as any;
      if (updates.importance_level !== undefined) updateData.importance_level = updates.importance_level as any;
      if (updates.priority_order !== undefined) updateData.priority_order = updates.priority_order;
      if (updates.planned_duration_minutes !== undefined) updateData.planned_duration_minutes = updates.planned_duration_minutes;
      if (updates.planned_time_of_day !== undefined) updateData.planned_time_of_day = updates.planned_time_of_day;
      if (updates.status !== undefined) updateData.status = updates.status as any;
      if (updates.completion_notes !== undefined) updateData.completion_notes = updates.completion_notes;
      if (updates.required_energy_level !== undefined) updateData.required_energy_level = updates.required_energy_level;
      if (updates.actual_energy_used !== undefined) updateData.actual_energy_used = updates.actual_energy_used;
      if (updates.mood_impact !== undefined) updateData.metadata = { ...updateData.metadata, mood_impact: updates.mood_impact };
      if (updates.season_id !== undefined) updateData.season_id = updates.season_id;
      if (updates.initiative_id !== undefined) updateData.initiative_id = updates.initiative_id;
      if (updates.tags !== undefined) updateData.tags = updates.tags;
      if (updates.metadata !== undefined) updateData.metadata = { ...updateData.metadata, ...updates.metadata };
      if (updates.reflection_notes !== undefined) updateData.reflection_notes = updates.reflection_notes;
      if (updates.lessons_learned !== undefined) updateData.metadata = { ...updateData.metadata, lessons_learned: updates.lessons_learned };
      if (updates.next_actions !== undefined) updateData.metadata = { ...updateData.metadata, next_actions: updates.next_actions };

      updateData.updated_at = nowUTC();

      const result = await this.dependencies.dailyStrategyRepository.update(
        this.context.userId,
        id,
        updateData
      );

      if (result.error) throw result.error;
      if (!result.data) throw new Error('Daily strategy item not found or unauthorized');

      return this.mapToItemWithDetails(result.data);
    });
  }

  /**
   * Delete a daily strategy item
   */
  async deleteStrategy(id: string): Promise<ServiceResult<void>> {
    return this.safeOperation(async () => {
      this.validateUserAccess();

      if (!this.dependencies.dailyStrategyRepository) {
        throw new Error('DailyStrategyRepository not available');
      }

      const result = await this.dependencies.dailyStrategyRepository.delete(
        this.context.userId,
        id
      );

      if (result.error) throw result.error;

      return undefined;
    });
  }

  /**
   * Update the status of a daily strategy item
   */
  async updateStatus(id: string, statusUpdate: UpdateDailyStrategyStatus): Promise<ServiceResult<DailyStrategyItemWithDetails>> {
    return this.safeOperation(async () => {
      this.validateUserAccess();

      if (!this.dependencies.dailyStrategyRepository) {
        throw new Error('DailyStrategyRepository not available');
      }

      const result = await this.dependencies.dailyStrategyRepository.updateStatus(
        this.context.userId,
        id,
        statusUpdate.status,
        statusUpdate.completion_notes
      );

      if (result.error) throw result.error;
      if (!result.data) throw new Error('Daily strategy item not found or unauthorized');

      // Update additional fields if provided
      if (statusUpdate.actual_energy_used || statusUpdate.mood_impact || statusUpdate.reflection_notes || statusUpdate.lessons_learned || statusUpdate.next_actions) {
        const updateData: Partial<DailyStrategyItem> = {};

        if (statusUpdate.actual_energy_used !== undefined) updateData.actual_energy_used = statusUpdate.actual_energy_used;
        if (statusUpdate.reflection_notes !== undefined) updateData.reflection_notes = statusUpdate.reflection_notes;

        const metadata: Record<string, any> = result.data.metadata || {};
        if (statusUpdate.mood_impact !== undefined) metadata.mood_impact = statusUpdate.mood_impact;
        if (statusUpdate.lessons_learned !== undefined) metadata.lessons_learned = statusUpdate.lessons_learned;
        if (statusUpdate.next_actions !== undefined) metadata.next_actions = statusUpdate.next_actions;
        updateData.metadata = metadata;

        const finalResult = await this.dependencies.dailyStrategyRepository.update(
          this.context.userId,
          id,
          updateData
        );

        if (finalResult.error) throw finalResult.error;
        if (!finalResult.data) throw new Error('Failed to update strategy item');

        return this.mapToItemWithDetails(finalResult.data);
      }

      return this.mapToItemWithDetails(result.data);
    });
  }

  /**
   * Get all daily strategy items for a specific date
   */
  async getStrategiesByDate(date: string): Promise<ServiceListResult<DailyStrategyItemWithDetails>> {
    return this.listStrategies({
      date,
      limit: 100,
      offset: 0,
      sort_by: 'priority_order',
      sort_order: 'asc',
      include_timeline_item: true,
      include_season: false,
      include_initiative: false
    });
  }

  /**
   * Map database row to DailyStrategyItemWithDetails format
   */
  private mapToItemWithDetails(row: DailyStrategyItem): DailyStrategyItemWithDetails {
    const item = row as any;

    // Extract timeline item data
    const timelineItemData = Array.isArray(item.timeline_item)
      ? item.timeline_item[0]
      : item.timeline_item;

    const seasonData = Array.isArray(item.season)
      ? item.season[0]
      : item.season;

    const initiativeData = Array.isArray(item.initiative)
      ? item.initiative[0]
      : item.initiative;

    return {
      ...item,
      timeline_item: timelineItemData ? {
        id: timelineItemData.id,
        type: timelineItemData.type,
        title: timelineItemData.title,
        description: timelineItemData.description,
        status: timelineItemData.status,
        priority: timelineItemData.priority,
        category: timelineItemData.category,
        tags: timelineItemData.tags || [],
        metadata: timelineItemData.metadata || {}
      } : undefined,
      season: seasonData || undefined,
      initiative: initiativeData || undefined
    };
  }
}
