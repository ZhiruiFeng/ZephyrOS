import { BaseServiceImpl } from './base-service';
import type {
  ServiceContext,
  ServiceDependencies,
  ServiceResult,
  ServiceListResult
} from './types';
import type { Task, TaskFilterParams } from '@/database';
import { NotFoundError, ValidationError } from './types';
import { nowUTC } from '@/database/client';

// Extended filter params to match TaskQuerySchema
interface TaskQueryParams extends Omit<TaskFilterParams, 'sort_order'> {
  due_before?: string;
  due_after?: string;
  category?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

/**
 * TaskService interface for CRUD operations
 */
export interface TaskService {
  findTasks(filters: TaskQueryParams): Promise<ServiceListResult<Task>>;
  findTaskById(taskId: string): Promise<ServiceResult<Task>>;
  createTask(data: Partial<Task>): Promise<ServiceResult<Task>>;
  updateTask(taskId: string, updates: Partial<Task>): Promise<ServiceResult<Task>>;
  deleteTask(taskId: string): Promise<ServiceResult<void>>;
  getCategoryIdByName(categoryName: string): Promise<ServiceResult<string | null>>;
}

/**
 * TaskService implementation for CRUD operations
 * Separate from TaskWorkflowService which handles workflow/status logic
 */
export class TaskServiceImpl extends BaseServiceImpl implements TaskService {
  constructor(context: ServiceContext, dependencies: ServiceDependencies) {
    super(context, dependencies);
  }

  /**
   * Find tasks with advanced filtering
   */
  async findTasks(filters: TaskQueryParams): Promise<ServiceListResult<Task>> {
    return this.safeListOperation(async () => {
      this.validateUserAccess();

      // Map TaskQuerySchema parameters to TaskFilterParams
      const repoFilters: TaskFilterParams = {
        status: filters.status,
        tags: filters.tags,
        search: filters.search,
        limit: filters.limit || 50,
        offset: filters.offset || 0,
        sort_by: filters.sort_by || 'created_at',
        sort_order: filters.sort_order || 'desc',
        // Date filters
        created_after: filters.created_after,
        created_before: filters.created_before,
        // Task-specific filters
        priority: filters.priority,
        due_from: filters.due_after,
        due_to: filters.due_before,
        assignee: filters.assignee,
        // Hierarchy filters
        parent_task_id: filters.parent_task_id,
        root_tasks_only: filters.root_tasks_only,
        hierarchy_level: filters.hierarchy_level,
      };

      this.logOperation('info', 'findTasks', { filters: repoFilters });

      // Use findTasksAdvanced which handles task-specific filters like root_tasks_only
      const result = await this.dependencies.taskRepository.findTasksAdvanced(
        this.context.userId,
        repoFilters
      );

      if (result.error) throw result.error;

      this.logOperation('info', 'findTasksComplete', {
        count: result.data?.length || 0,
        filters: repoFilters
      });

      return {
        items: result.data || [],
        total: result.data?.length
      };
    });
  }

  /**
   * Find task by ID
   */
  async findTaskById(taskId: string): Promise<ServiceResult<Task>> {
    return this.safeOperation(async () => {
      this.validateUserAccess();
      this.validateRequired(taskId, 'taskId');

      this.logOperation('info', 'findTaskById', { taskId });

      const result = await this.dependencies.taskRepository.findByUserAndId(
        this.context.userId,
        taskId
      );

      if (result.error) throw result.error;
      if (!result.data) throw new NotFoundError('Task', taskId);

      return result.data;
    });
  }

  /**
   * Create new task with category lookup and hierarchy handling
   */
  async createTask(data: Partial<Task>): Promise<ServiceResult<Task>> {
    return this.safeOperation(async () => {
      this.validateUserAccess();
      this.validateRequired(data.content, 'task content');
      this.validateRequired(data.content?.title, 'task title');

      // Handle category lookup if category name provided (from metadata or external source)
      let categoryId = data.content?.category_id;

      // If category name is provided in metadata, look it up
      if (!categoryId && data.metadata?.category) {
        const categoryResult = await this.getCategoryIdByName(data.metadata.category as string);
        if (categoryResult.data) {
          categoryId = categoryResult.data;
        }
      }

      const taskData: Partial<Task> = {
        ...data,
        content: {
          ...data.content!,
          category_id: categoryId,
          status: data.content?.status || 'pending',
          priority: data.content?.priority || 'medium',
          progress: data.content?.progress || 0,
          subtask_order: data.content?.subtask_order || 0,
          completion_behavior: data.content?.completion_behavior || 'manual',
          progress_calculation: data.content?.progress_calculation || 'manual',
        },
        tags: data.tags || [],
        metadata: data.metadata || {},
      };

      // Set completion date if creating with completed status
      if (taskData.content!.status === 'completed' && !taskData.content!.completion_date) {
        taskData.content!.completion_date = nowUTC();
      }

      this.logOperation('info', 'createTask', {
        title: taskData.content!.title,
        status: taskData.content!.status,
        priority: taskData.content!.priority,
      });

      const result = await this.dependencies.taskRepository.createTask(
        this.context.userId,
        taskData
      );

      if (result.error) throw result.error;
      if (!result.data) throw new Error('Failed to create task');

      this.logOperation('info', 'createTaskComplete', { taskId: result.data.id });

      return result.data;
    });
  }

  /**
   * Update existing task
   */
  async updateTask(taskId: string, updates: Partial<Task>): Promise<ServiceResult<Task>> {
    return this.safeOperation(async () => {
      this.validateUserAccess();
      this.validateRequired(taskId, 'taskId');

      // Verify task exists and user has access
      const existing = await this.findTaskById(taskId);
      if (existing.error) throw existing.error;

      // Handle category lookup if category name provided in metadata
      let categoryId = updates.content?.category_id;
      if (!categoryId && updates.metadata?.category) {
        const categoryResult = await this.getCategoryIdByName(updates.metadata.category as string);
        if (categoryResult.data) {
          categoryId = categoryResult.data;
        }
      }

      const updateData: Partial<Task> = {
        ...updates,
        content: updates.content ? {
          ...existing.data!.content,
          ...updates.content,
          category_id: categoryId || updates.content.category_id,
        } : undefined,
      };

      // Handle completion date on status changes
      if (updateData.content?.status === 'completed' && !updateData.content.completion_date) {
        updateData.content.completion_date = nowUTC();
      } else if (updateData.content?.status && updateData.content.status !== 'completed') {
        updateData.content.completion_date = undefined;
      }

      this.logOperation('info', 'updateTask', { taskId, updates: Object.keys(updates) });

      const result = await this.dependencies.taskRepository.updateTask(
        this.context.userId,
        taskId,
        updateData
      );

      if (result.error) throw result.error;
      if (!result.data) throw new NotFoundError('Task', taskId);

      this.logOperation('info', 'updateTaskComplete', { taskId });

      return result.data;
    });
  }

  /**
   * Delete task
   */
  async deleteTask(taskId: string): Promise<ServiceResult<void>> {
    return this.safeOperation(async () => {
      this.validateUserAccess();
      this.validateRequired(taskId, 'taskId');

      // Verify task exists and user has access
      const existing = await this.findTaskById(taskId);
      if (existing.error) throw existing.error;

      this.logOperation('info', 'deleteTask', { taskId });

      const result = await this.dependencies.taskRepository.deleteByUserAndId(
        this.context.userId,
        taskId
      );

      if (result.error) throw result.error;

      this.logOperation('info', 'deleteTaskComplete', { taskId });

      return undefined;
    });
  }

  /**
   * Get category ID by name for current user
   */
  async getCategoryIdByName(categoryName: string): Promise<ServiceResult<string | null>> {
    return this.safeOperation(async () => {
      this.validateUserAccess();
      this.validateRequired(categoryName, 'categoryName');

      // Use category repository if available
      if (this.dependencies.categoryRepository) {
        const result = await this.dependencies.categoryRepository.findByUser(
          this.context.userId,
          { search: categoryName, limit: 1, offset: 0 }
        );

        if (result.error) throw result.error;
        if (result.data && result.data.length > 0) {
          // Exact match on name
          const exactMatch = result.data.find(
            (cat: any) => cat.name.toLowerCase() === categoryName.toLowerCase()
          );
          return exactMatch?.id || null;
        }
      }

      return null;
    });
  }
}
