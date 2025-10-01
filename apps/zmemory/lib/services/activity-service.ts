import { BaseServiceImpl } from './base-service';
import type {
  ServiceContext,
  ServiceDependencies,
  ServiceResult
} from './types';
import type {
  Activity,
  ActivityFilterParams
} from '../database/repositories/activity-repository';

// Input types for activity operations
export interface CreateActivityInput {
  title: string;
  description?: string;
  activity_type: string;
  started_at?: string;
  ended_at?: string;
  duration_minutes?: number;
  mood_before?: number;
  mood_after?: number;
  energy_before?: number;
  energy_after?: number;
  satisfaction?: number;
  focus?: number;
  stress_level?: number;
  location?: string;
  notes?: string;
  weather?: string;
  social_context?: string;
  tags?: string[];
  category_id?: string;
  status?: 'active' | 'completed' | 'paused' | 'archived';
  intensity?: 'low' | 'medium' | 'high';
  difficulty?: 'easy' | 'medium' | 'hard';
  enjoyment?: number;
  productivity?: number;
  what_went_well?: string;
  what_could_improve?: string;
  key_insights?: string;
  intended_outcome?: string;
  actual_outcome?: string;
  goal_achieved?: boolean;
}

export interface UpdateActivityInput extends Partial<CreateActivityInput> {}

export interface ActivityQueryParams extends ActivityFilterParams {
  from?: string;
  to?: string;
  started_after?: string;
  started_before?: string;
  ended_after?: string;
  ended_before?: string;
  min_satisfaction?: number;
  max_satisfaction?: number;
  min_mood_before?: number;
  min_mood_after?: number;
  min_energy_before?: number;
  min_energy_after?: number;
  min_enjoyment?: number;
  min_duration?: number;
  max_duration?: number;
  intensity_level?: string;
}

export interface ActivityService {
  getActivities(filters?: ActivityQueryParams): Promise<ServiceResult<Activity[]>>;
  getActivity(activityId: string): Promise<ServiceResult<Activity>>;
  createActivity(data: CreateActivityInput): Promise<ServiceResult<Activity>>;
  updateActivity(activityId: string, data: UpdateActivityInput): Promise<ServiceResult<Activity>>;
  deleteActivity(activityId: string): Promise<ServiceResult<boolean>>;
}

export class ActivityServiceImpl extends BaseServiceImpl implements ActivityService {
  constructor(context: ServiceContext, dependencies: ServiceDependencies) {
    super(context, dependencies);
  }

  /**
   * Get all activities for the user with optional filtering
   */
  async getActivities(filters: ActivityQueryParams = {}): Promise<ServiceResult<Activity[]>> {
    return this.safeOperation(async () => {
      this.logOperation('info', 'getActivitiesStarted', { filters });

      // Normalize filters to ActivityFilterParams
      const repoFilters: ActivityFilterParams = {
        ...filters,
        start_date: filters.from || filters.started_after,
        end_date: filters.to || filters.started_before
      };

      // Map intensity_level to intensity for compatibility
      if (filters.intensity_level) {
        repoFilters.activity_types = repoFilters.activity_types || [];
      }

      const result = await this.dependencies.activityRepository.findActivitiesAdvanced(
        this.context.userId,
        repoFilters
      );

      if (result.error) {
        this.logOperation('error', 'getActivitiesFailed', {
          error: result.error.message
        });
        throw result.error;
      }

      this.logOperation('info', 'getActivitiesSuccess', {
        count: result.data?.length || 0,
        total: result.total
      });

      return result.data || [];
    });
  }

  /**
   * Get a single activity by ID
   */
  async getActivity(activityId: string): Promise<ServiceResult<Activity>> {
    return this.safeOperation(async () => {
      this.logOperation('info', 'getActivityStarted', { activityId });

      const result = await this.dependencies.activityRepository.findByUserAndId(
        this.context.userId,
        activityId
      );

      if (result.error) {
        this.logOperation('error', 'getActivityFailed', {
          activityId,
          error: result.error.message
        });
        throw result.error;
      }

      if (!result.data) {
        const error = new Error('Activity not found');
        (error as any).code = '404';
        throw error;
      }

      this.logOperation('info', 'getActivitySuccess', { activityId });

      return result.data;
    });
  }

  /**
   * Create a new activity
   */
  async createActivity(data: CreateActivityInput): Promise<ServiceResult<Activity>> {
    return this.safeOperation(async () => {
      this.logOperation('info', 'createActivityStarted', {
        type: data.activity_type,
        title: data.title
      });

      // Validate required fields
      if (!data.title || data.title.trim().length === 0) {
        const error = new Error('Title is required');
        (error as any).code = '400';
        throw error;
      }

      if (!data.activity_type) {
        const error = new Error('Activity type is required');
        (error as any).code = '400';
        throw error;
      }

      // Prepare activity data for database
      // Note: Spreading all validated data to ensure all fields are passed through
      const activityData: any = {
        ...data,
        user_id: this.context.userId
      };

      // Map convenience field names to database column names
      if (data.satisfaction !== undefined) {
        activityData.satisfaction_level = data.satisfaction;
        delete activityData.satisfaction;
      }
      if (data.intensity !== undefined) {
        activityData.intensity_level = data.intensity;
        delete activityData.intensity;
      }

      const result = await this.dependencies.activityRepository.create(
        this.context.userId,
        activityData
      );

      if (result.error) {
        this.logOperation('error', 'createActivityFailed', {
          type: data.activity_type,
          error: result.error.message
        });
        throw result.error;
      }

      this.logOperation('info', 'createActivitySuccess', {
        activityId: result.data?.id,
        type: data.activity_type
      });

      return result.data!;
    });
  }

  /**
   * Update an existing activity
   */
  async updateActivity(
    activityId: string,
    data: UpdateActivityInput
  ): Promise<ServiceResult<Activity>> {
    return this.safeOperation(async () => {
      this.logOperation('info', 'updateActivityStarted', {
        activityId,
        updates: Object.keys(data)
      });

      // Validate that at least one field is being updated
      if (Object.keys(data).length === 0) {
        const error = new Error('No update fields provided');
        (error as any).code = '400';
        throw error;
      }

      // First verify the activity exists and user owns it
      const existing = await this.getActivity(activityId);
      if (existing.error || !existing.data) {
        throw existing.error || new Error('Activity not found');
      }

      // Spread all validated data and add field mappings
      const updateData: any = {
        ...data
      };

      // Map convenience field names to database column names
      if (data.satisfaction !== undefined) {
        updateData.satisfaction_level = data.satisfaction;
        delete updateData.satisfaction;
      }
      if (data.intensity !== undefined) {
        updateData.intensity_level = data.intensity;
        delete updateData.intensity;
      }

      const result = await this.dependencies.activityRepository.updateByUserAndId(
        this.context.userId,
        activityId,
        updateData
      );

      if (result.error) {
        this.logOperation('error', 'updateActivityFailed', {
          activityId,
          error: result.error.message
        });
        throw result.error;
      }

      if (!result.data) {
        const error = new Error('Activity not found or update failed');
        (error as any).code = '404';
        throw error;
      }

      this.logOperation('info', 'updateActivitySuccess', { activityId });

      return result.data;
    });
  }

  /**
   * Delete an activity
   */
  async deleteActivity(activityId: string): Promise<ServiceResult<boolean>> {
    return this.safeOperation(async () => {
      this.logOperation('info', 'deleteActivityStarted', { activityId });

      // First verify the activity exists and user owns it
      const existing = await this.getActivity(activityId);
      if (existing.error || !existing.data) {
        throw existing.error || new Error('Activity not found');
      }

      const result = await this.dependencies.activityRepository.deleteByUserAndId(
        this.context.userId,
        activityId
      );

      if (result.error) {
        this.logOperation('error', 'deleteActivityFailed', {
          activityId,
          error: result.error.message
        });
        throw result.error;
      }

      if (!result.data) {
        const error = new Error('Activity not found or delete failed');
        (error as any).code = '404';
        throw error;
      }

      this.logOperation('info', 'deleteActivitySuccess', { activityId });

      return true;
    });
  }
}
