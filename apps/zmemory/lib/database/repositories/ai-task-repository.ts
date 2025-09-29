import { BaseRepository } from './base-repository';
import type {
  DatabaseClient,
  RepositoryResult,
  RepositoryListResult,
  AITask,
  AITaskFilterParams
} from '../types';
import { RepositoryError } from '../types';

export interface AITaskRepository {
  findByUserAndId(userId: string, taskId: string): Promise<RepositoryResult<AITask>>;
  findAITasksAdvanced(userId: string, filters: AITaskFilterParams): Promise<RepositoryListResult<AITask>>;
  createAITask(userId: string, data: Partial<AITask>): Promise<RepositoryResult<AITask>>;
  updateAITask(userId: string, taskId: string, updates: Partial<AITask>): Promise<RepositoryResult<AITask>>;
  deleteAITask(userId: string, taskId: string): Promise<RepositoryResult<boolean>>;
  updateTaskStatus(userId: string, taskId: string, status: AITask['status'], result?: Record<string, any>): Promise<RepositoryResult<AITask>>;
  findTasksByAgent(userId: string, agentId: string): Promise<RepositoryListResult<AITask>>;
  findTasksByParent(userId: string, parentTaskId: string): Promise<RepositoryListResult<AITask>>;
  getTaskStatistics(userId: string): Promise<RepositoryResult<any>>;
}

export class AITaskRepositoryImpl extends BaseRepository<AITask> implements AITaskRepository {
  constructor(client: DatabaseClient) {
    super(client, 'ai_tasks', '*');
  }

  /**
   * Find AI task by user and ID
   */
  async findByUserAndId(userId: string, taskId: string): Promise<RepositoryResult<AITask>> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select(this.defaultSelect)
        .eq('user_id', userId)
        .eq('id', taskId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return { data: null, error: null };
        }
        console.error(`Database error finding AI task:`, error);
        return { data: null, error: new RepositoryError('Failed to find AI task', error.code) };
      }

      return { data: data as unknown as AITask, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  /**
   * Advanced AI task search with filtering, sorting, and pagination
   */
  async findAITasksAdvanced(userId: string, filters: AITaskFilterParams): Promise<RepositoryListResult<AITask>> {
    try {
      let query = this.client
        .from(this.tableName)
        .select(this.defaultSelect, { count: 'exact' })
        .eq('user_id', userId);

      // Apply filters
      if (filters.task_type) {
        query = query.eq('task_type', filters.task_type);
      }

      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      if (filters.priority) {
        query = query.eq('metadata->>priority', filters.priority);
      }

      if (filters.mode) {
        query = query.eq('mode', filters.mode);
      }

      if (filters.agent_id) {
        query = query.eq('agent_id', filters.agent_id);
      }

      if (filters.task_id) {
        query = query.eq('task_id', filters.task_id);
      }

      // Date range filters
      if (filters.assigned_from) {
        query = query.gte('assigned_at', filters.assigned_from);
      }

      if (filters.assigned_to) {
        query = query.lte('assigned_at', filters.assigned_to);
      }

      if (filters.due_from) {
        query = query.gte('due_at', filters.due_from);
      }

      if (filters.due_to) {
        query = query.lte('due_at', filters.due_to);
      }

      if (filters.deadline_after) {
        query = query.gte('due_at', filters.deadline_after);
      }

      if (filters.deadline_before) {
        query = query.lte('due_at', filters.deadline_before);
      }

      // Cost filters
      if (filters.min_cost) {
        query = query.gte('estimated_cost_usd', filters.min_cost);
      }

      if (filters.max_cost) {
        query = query.lte('estimated_cost_usd', filters.max_cost);
      }

      // Tag filter via metadata tags array
      const rawTags = filters.tags as unknown;
      if (Array.isArray(rawTags) ? rawTags.length > 0 : typeof rawTags === 'string' && rawTags.length > 0) {
        const tagList = Array.isArray(rawTags)
          ? (rawTags as string[])
          : String(rawTags)
              .split(',')
              .map((tag: string) => tag.trim());
        const cleanedTags = tagList.filter((tag: string) => Boolean(tag));
        if (cleanedTags.length > 0) {
          query = query.contains('metadata->tags', cleanedTags);
        }
      }

      // Search functionality
      if (filters.search) {
        const searchTerm = filters.search.trim();
        if (searchTerm) {
          query = query.or(
            `objective.ilike.%${searchTerm}%,deliverables.ilike.%${searchTerm}%,context.ilike.%${searchTerm}%`
          );
        }
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

      // Sorting
      const sortBy = filters.sort_by || 'created_at';
      const sortOrder = filters.sort_order || 'desc';
      const ascending = sortOrder === 'asc';

      let orderColumn = sortBy;
      switch (sortBy) {
        case 'assigned_at':
        case 'created_at':
        case 'updated_at':
        case 'completed_at':
        case 'due_at':
        case 'objective':
        case 'status':
          orderColumn = sortBy;
          break;
        case 'deadline':
          orderColumn = 'due_at';
          break;
        case 'estimated_cost':
          orderColumn = 'estimated_cost_usd';
          break;
        case 'priority':
          orderColumn = 'metadata->>priority';
          break;
        default:
          orderColumn = 'created_at';
      }

      query = query.order(orderColumn, { ascending });

      // Pagination
      const limit = filters.limit || 50;
      const offset = filters.offset || 0;
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        console.error(`Database error finding AI tasks:`, error);
        return { data: null, error: new RepositoryError('Failed to find AI tasks', error.code) };
      }

      return {
        data: (data as unknown as AITask[]) || [],
        error: null,
        total: count || 0
      };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  /**
   * Create new AI task
   */
  async createAITask(userId: string, data: Partial<AITask>): Promise<RepositoryResult<AITask>> {
    const guardrails: Record<string, any> = data.guardrails
      ? { ...data.guardrails }
      : {
          costCapUSD: null,
          timeCapMin: null,
          requiresHumanApproval: true,
          dataScopes: [] as string[]
        };

    if (!Array.isArray(guardrails.dataScopes)) {
      guardrails.dataScopes = [];
    }

    guardrails.dataScopes = (guardrails.dataScopes as string[])
      .map((scope: string) => String(scope).trim())
      .filter((scope: string) => scope.length > 0);

    const metadata: Record<string, any> = data.metadata
      ? { ...data.metadata }
      : {
          priority: 'medium',
          tags: [] as string[]
        };

    if (metadata.priority === undefined) {
      metadata.priority = 'medium';
    }

    if (!Array.isArray(metadata.tags)) {
      metadata.tags = [];
    }

    metadata.tags = (metadata.tags as string[])
      .map((tag: string) => String(tag).trim())
      .filter((tag: string) => tag.length > 0);
    if (metadata.category !== undefined && metadata.category !== null) {
      metadata.category = String(metadata.category).trim();
    }

    const dependencies = Array.isArray(data.dependencies)
      ? (data.dependencies as string[])
          .map((dep: string) => String(dep).trim())
          .filter((dep: string) => dep.length > 0)
      : [];

    return this.create(userId, {
      ...data,
      guardrails,
      metadata,
      dependencies,
      status: data.status || 'pending'
    });
  }

  /**
   * Update AI task
   */
  async updateAITask(userId: string, taskId: string, updates: Partial<AITask>): Promise<RepositoryResult<AITask>> {
    return this.updateByUserAndId(userId, taskId, updates);
  }

  /**
   * Delete AI task
   */
  async deleteAITask(userId: string, taskId: string): Promise<RepositoryResult<boolean>> {
    return this.deleteByUserAndId(userId, taskId);
  }

  /**
   * Update task status and execution results
   */
  async updateTaskStatus(
    userId: string,
    taskId: string,
    status: AITask['status'],
    result?: Record<string, any>
  ): Promise<RepositoryResult<AITask>> {
    try {
      const { data: currentTask, error } = await this.findByUserAndId(userId, taskId);
      if (error) {
        return { data: null, error };
      }
      if (!currentTask) {
        return { data: null, error: new RepositoryError('Failed to find AI task') };
      }

      const updates: Partial<AITask> = { status };

      let executionResult = currentTask.execution_result ? { ...currentTask.execution_result } : {};
    const metadata: Record<string, any> = currentTask.metadata ? { ...currentTask.metadata } : {};
      let metadataChanged = false;

      if (status === 'in_progress' && !currentTask.started_at) {
        updates.started_at = new Date().toISOString();
      }

      if ((status === 'completed' || status === 'failed' || status === 'cancelled') && !currentTask.completed_at) {
        updates.completed_at = new Date().toISOString();
      }

      if (result) {
        executionResult = {
          ...executionResult,
          ...result
        };

        if (result.actual_cost !== undefined) {
          updates.actual_cost_usd = result.actual_cost;
        }

        if (result.execution_time_seconds !== undefined) {
          updates.actual_duration_min = Math.round(result.execution_time_seconds / 60);
        }

        if (result.model_used) {
          metadata.last_model_used = result.model_used;
          metadataChanged = true;
        }

        if (result.provider_used) {
          metadata.last_provider_used = result.provider_used;
          metadataChanged = true;
        }
      }

      if (status === 'failed') {
        const retryCount = Number(metadata.retry_count ?? 0) + 1;
        metadata.retry_count = retryCount;
        metadataChanged = true;
      }

      if (result) {
        updates.execution_result = executionResult;
      }

      if (metadataChanged) {
        if (!Array.isArray(metadata.tags)) {
          metadata.tags = [];
        }
        metadata.tags = (metadata.tags as string[])
          .map((tag: string) => String(tag).trim())
          .filter((tag: string) => tag.length > 0);
        if (metadata.category !== undefined && metadata.category !== null) {
          metadata.category = String(metadata.category).trim();
        }
        updates.metadata = metadata;
      }

      return this.updateByUserAndId(userId, taskId, updates);
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  /**
   * Find tasks by agent ID
   */
  async findTasksByAgent(userId: string, agentId: string): Promise<RepositoryListResult<AITask>> {
    return this.findAITasksAdvanced(userId, { agent_id: agentId });
  }

  /**
   * Find tasks by parent task ID
   */
  async findTasksByParent(userId: string, parentTaskId: string): Promise<RepositoryListResult<AITask>> {
    return this.findAITasksAdvanced(userId, { parent_task_id: parentTaskId });
  }

  /**
   * Get AI task statistics
   */
  async getTaskStatistics(userId: string): Promise<RepositoryResult<any>> {
    try {
      // Get status counts
      const { data: statusCounts, error: statusError } = await this.client
        .from(this.tableName)
        .select('status', { count: 'exact' })
        .eq('user_id', userId);

      if (statusError) {
        return { data: null, error: new RepositoryError('Failed to get status statistics', statusError.code) };
      }

      // Get type counts
      const { data: typeCounts, error: typeError } = await this.client
        .from(this.tableName)
        .select('task_type', { count: 'exact' })
        .eq('user_id', userId);

      if (typeError) {
        return { data: null, error: new RepositoryError('Failed to get type statistics', typeError.code) };
      }

      // Get cost statistics
      const { data: costStats, error: costError } = await this.client
        .from(this.tableName)
        .select('actual_cost_usd, estimated_cost_usd')
        .eq('user_id', userId)
        .not('actual_cost_usd', 'is', null);

      if (costError) {
        return { data: null, error: new RepositoryError('Failed to get cost statistics', costError.code) };
      }

      const totalActualCost = costStats?.reduce((sum, task) => sum + (task.actual_cost_usd || 0), 0) || 0;
      const totalEstimatedCost = costStats?.reduce((sum, task) => sum + (task.estimated_cost_usd || 0), 0) || 0;

      const statistics = {
        status_counts: statusCounts || [],
        type_counts: typeCounts || [],
        cost_statistics: {
          total_actual_cost: totalActualCost,
          total_estimated_cost: totalEstimatedCost,
          completed_tasks_with_cost: costStats?.length || 0
        }
      };

      return { data: statistics, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }
}
