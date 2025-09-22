/**
 * AI Tasks Module
 * 
 * Handles AI task operations for agent task management
 */

import { AxiosInstance } from 'axios';
import {
  AITask,
  AITaskStats,
  AuthState,
  GetAITasksParams,
  UpdateAITaskParams,
  AcceptAITaskParams,
  ZMemoryError,
} from '../../types.js';

export class AITasksModule {
  constructor(
    private client: AxiosInstance,
    private authState: AuthState
  ) {}

  /**
   * Get AI tasks (filtered and paginated)
   */
  async getAITasks(params: Partial<GetAITasksParams> = {}): Promise<AITask[]> {
    if (!this.authState.isAuthenticated) {
      throw new ZMemoryError('Not authenticated. Please authenticate first.', 'AUTH_REQUIRED');
    }

    try {
      const queryParams = new URLSearchParams();
      
      // Add all provided params to query string
      if (params.agent_id) queryParams.append('agent_id', params.agent_id);
      if (params.agent_name) queryParams.append('agent_name', params.agent_name);
      if (params.status) queryParams.append('status', params.status);
      if (params.mode) queryParams.append('mode', params.mode);
      if (params.task_type) queryParams.append('task_type', params.task_type);
      if (params.limit !== undefined) queryParams.append('limit', params.limit.toString());
      if (params.offset !== undefined) queryParams.append('offset', params.offset.toString());
      if (params.sort_by) queryParams.append('sort_by', params.sort_by);
      if (params.sort_order) queryParams.append('sort_order', params.sort_order);

      const response = await this.client.get(`/api/ai-tasks?${queryParams}`);
      return response.data.ai_tasks || [];
    } catch (error: any) {
      if (error.response?.status === 401) {
        throw new ZMemoryError('Authentication expired. Please re-authenticate.', 'AUTH_EXPIRED');
      }
      throw new ZMemoryError(
        error.response?.data?.error || error.message || 'Failed to get AI tasks',
        'API_ERROR',
        error.response?.status
      );
    }
  }

  /**
   * Get queued AI tasks for a specific agent
   */
  async getQueuedTasksForAgent(agentName: string): Promise<AITask[]> {
    return this.getAITasks({
      agent_name: agentName,
      status: 'assigned',
      sort_by: 'assigned_at',
      sort_order: 'asc',
    });
  }

  /**
   * Get a single AI task by ID
   */
  async getAITask(id: string): Promise<AITask> {
    if (!this.authState.isAuthenticated) {
      throw new ZMemoryError('Not authenticated. Please authenticate first.', 'AUTH_REQUIRED');
    }

    try {
      const response = await this.client.get(`/api/ai-tasks/${id}`);
      return response.data.ai_task;
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new ZMemoryError('AI task not found', 'NOT_FOUND', 404);
      }
      throw new ZMemoryError(
        error.response?.data?.error || error.message || 'Failed to get AI task',
        'API_ERROR',
        error.response?.status
      );
    }
  }

  /**
   * Accept an AI task assignment
   */
  async acceptAITask(params: AcceptAITaskParams): Promise<AITask> {
    if (!this.authState.isAuthenticated) {
      throw new ZMemoryError('Not authenticated. Please authenticate first.', 'AUTH_REQUIRED');
    }

    try {
      const updateData: any = {
        status: 'in_progress',
      };
      
      if (params.estimated_cost_usd !== undefined) {
        updateData.estimated_cost_usd = params.estimated_cost_usd;
      }
      
      if (params.estimated_duration_min !== undefined) {
        updateData.estimated_duration_min = params.estimated_duration_min;
      }

      const response = await this.client.put(`/api/ai-tasks/${params.id}`, updateData);
      return response.data.ai_task;
    } catch (error: any) {
      throw new ZMemoryError(
        error.response?.data?.error || error.message || 'Failed to accept AI task',
        'API_ERROR',
        error.response?.status
      );
    }
  }

  /**
   * Update an AI task (report progress, results, etc.)
   */
  async updateAITask(params: UpdateAITaskParams): Promise<AITask> {
    if (!this.authState.isAuthenticated) {
      throw new ZMemoryError('Not authenticated. Please authenticate first.', 'AUTH_REQUIRED');
    }

    try {
      const { id, ...updateData } = params;
      
      // If there's a progress message but no execution result, create one
      if (params.progress_message && !params.execution_result) {
        updateData.execution_result = {
          logs: [params.progress_message],
        };
      }
      
      // If there's an error message, set status to failed
      if (params.error_message) {
        updateData.status = 'failed';
        updateData.execution_result = {
          ...updateData.execution_result,
          output: params.error_message,
        };
      }

      const response = await this.client.put(`/api/ai-tasks/${id}`, updateData);
      return response.data.ai_task;
    } catch (error: any) {
      throw new ZMemoryError(
        error.response?.data?.error || error.message || 'Failed to update AI task',
        'API_ERROR',
        error.response?.status
      );
    }
  }

  /**
   * Mark an AI task as completed with results
   */
  async completeAITask(
    id: string, 
    result: {
      output?: string;
      artifacts?: Array<{type: string; name: string; content: any}>;
      logs?: string[];
      metrics?: Record<string, any>;
      actual_cost_usd?: number;
      actual_duration_min?: number;
    }
  ): Promise<AITask> {
    return this.updateAITask({
      id,
      status: 'completed',
      execution_result: {
        output: result.output,
        artifacts: result.artifacts,
        logs: result.logs,
        metrics: result.metrics,
      },
      actual_cost_usd: result.actual_cost_usd,
      actual_duration_min: result.actual_duration_min,
    });
  }

  /**
   * Mark an AI task as failed with error
   */
  async failAITask(id: string, errorMessage: string): Promise<AITask> {
    return this.updateAITask({
      id,
      status: 'failed',
      error_message: errorMessage,
    });
  }

  /**
   * Get AI tasks statistics
   */
  async getAITaskStats(): Promise<AITaskStats> {
    if (!this.authState.isAuthenticated) {
      throw new ZMemoryError('Not authenticated. Please authenticate first.', 'AUTH_REQUIRED');
    }

    try {
      const response = await this.client.get('/api/ai-tasks/stats');
      return response.data.stats;
    } catch (error: any) {
      // If stats endpoint doesn't exist, calculate from tasks list
      if (error.response?.status === 404) {
        const tasks = await this.getAITasks({ limit: 100 });
        return this.calculateStats(tasks);
      }
      throw new ZMemoryError(
        error.response?.data?.error || error.message || 'Failed to get AI task stats',
        'API_ERROR',
        error.response?.status
      );
    }
  }

  /**
   * Calculate stats from tasks list
   */
  private calculateStats(tasks: AITask[]): AITaskStats {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const stats: AITaskStats = {
      total: tasks.length,
      by_status: {},
      by_mode: {},
      by_task_type: {},
      pending_for_agent: 0,
      in_progress: 0,
      completed_today: 0,
      failed_today: 0,
      avg_completion_time: 0,
      total_cost_today: 0,
    };

    let totalCompletionTime = 0;
    let completionCount = 0;

    for (const task of tasks) {
      // Count by status
      stats.by_status[task.status] = (stats.by_status[task.status] || 0) + 1;
      
      // Count by mode
      stats.by_mode[task.mode] = (stats.by_mode[task.mode] || 0) + 1;
      
      // Count by task type
      stats.by_task_type[task.task_type] = (stats.by_task_type[task.task_type] || 0) + 1;
      
      // Count specific statuses
      if (task.status === 'assigned') stats.pending_for_agent++;
      if (task.status === 'in_progress') stats.in_progress++;
      
      // Check if task was completed/failed today
      if (task.completed_at) {
        const completedDate = new Date(task.completed_at);
        if (completedDate >= todayStart) {
          if (task.status === 'completed') {
            stats.completed_today++;
            if (task.actual_cost_usd) {
              stats.total_cost_today += task.actual_cost_usd;
            }
          } else if (task.status === 'failed') {
            stats.failed_today++;
          }
        }
        
        // Calculate average completion time
        if (task.actual_duration_min) {
          totalCompletionTime += task.actual_duration_min;
          completionCount++;
        }
      }
    }

    if (completionCount > 0) {
      stats.avg_completion_time = totalCompletionTime / completionCount;
    }

    return stats;
  }
}