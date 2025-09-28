import { BaseRepository } from './base-repository';
import type {
  DatabaseClient,
  FilterParams,
  RepositoryResult,
  RepositoryListResult
} from '../types';
import { nowUTC } from '../client';

// Task entity type
export interface Task {
  id: string;
  user_id: string;
  type: 'task';
  content: {
    title: string;
    description?: string;
    status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    category_id?: string;
    due_date?: string;
    estimated_duration?: number;
    progress: number;
    assignee?: string;
    notes?: string;
    completion_behavior: 'manual' | 'auto_when_subtasks_complete';
    progress_calculation: 'manual' | 'average_subtasks' | 'weighted_subtasks';
    parent_task_id?: string;
    subtask_order: number;
    completion_date?: string;
  };
  tags: string[];
  metadata: Record<string, any>;
  hierarchy_level: number;
  hierarchy_path: string;
  subtask_count: number;
  created_at: string;
  updated_at: string;
}

// Task-specific filter parameters
export interface TaskFilterParams extends FilterParams {
  priority?: string;
  due_from?: string;
  due_to?: string;
  progress_min?: number;
  progress_max?: number;
  assignee?: string;
  parent_task_id?: string;
  include_subtasks?: boolean;
  hierarchy_level?: number;
  root_tasks_only?: boolean;
  completion_behavior?: string;
  progress_calculation?: string;
  overdue?: boolean;
}

// Subtask creation interface
export interface CreateSubtaskRequest {
  parent_task_id: string;
  task_data: Partial<Task>;
  subtask_order?: number;
}

// Task tree node for hierarchy operations
export interface TaskTreeNode {
  task_id: string;
  parent_task_id: string | null;
  title: string;
  status: string;
  progress: number;
  hierarchy_level: number;
  subtask_order: number;
  children?: TaskTreeNode[];
}

export class TaskRepository extends BaseRepository<Task> {
  constructor(client: DatabaseClient) {
    super(client, 'tasks', `
      *,
      is_ai_task,
      category:categories(id, name, color, icon)
    `);
  }

  /**
   * Create task with automatic hierarchy setup
   */
  async createTask(userId: string, data: Partial<Task>): Promise<RepositoryResult<Task>> {
    const taskData = { ...data };

    // Set completion date if status is completed
    if (taskData.content?.status === 'completed' && !taskData.content.completion_date) {
      taskData.content = {
        ...taskData.content,
        completion_date: nowUTC()
      };
    }

    return this.create(userId, taskData);
  }

  /**
   * Update task with status-specific logic
   */
  async updateTask(userId: string, id: string, data: Partial<Task>): Promise<RepositoryResult<Task>> {
    const taskData = { ...data };

    // Auto-set completion date when marking as completed
    if (taskData.content?.status === 'completed') {
      taskData.content = {
        ...taskData.content,
        completion_date: taskData.content.completion_date || nowUTC()
      };
    }

    // Clear completion date if status changed from completed
    if (taskData.content?.status && taskData.content.status !== 'completed') {
      taskData.content = {
        ...taskData.content,
        completion_date: undefined
      };
    }

    return this.updateByUserAndId(userId, id, taskData);
  }

  /**
   * Create subtask with proper hierarchy
   */
  async createSubtask(userId: string, request: CreateSubtaskRequest): Promise<RepositoryResult<Task>> {
    try {
      // Verify parent task exists and belongs to user
      const { data: parentTask, error: parentError } = await this.findByUserAndId(
        userId,
        request.parent_task_id
      );

      if (parentError || !parentTask) {
        return { data: null, error: new Error('Parent task not found') };
      }

      // Create subtask with hierarchy information
      const subtaskData = {
        ...request.task_data,
        content: {
          ...request.task_data.content,
          parent_task_id: request.parent_task_id,
          subtask_order: request.subtask_order || 0
        }
      };

      return this.createTask(userId, subtaskData as Partial<Task>);
    } catch (error) {
      console.error('Error creating subtask:', error);
      return { data: null, error: new Error('Failed to create subtask') };
    }
  }

  /**
   * Find tasks with advanced filtering including hierarchy
   */
  async findTasksAdvanced(
    userId: string,
    filters: TaskFilterParams = {}
  ): Promise<RepositoryListResult<Task>> {
    try {
      let query = this.client
        .from(this.tableName)
        .select(this.defaultSelect)
        .eq('user_id', userId);

      // Apply task-specific filters
      query = this.applyTaskFilters(query, filters);

      // Apply hierarchy-specific sorting
      if (filters.parent_task_id || filters.root_tasks_only) {
        // Sort by hierarchy for tree-like display
        query = query
          .order('parent_task_id', { ascending: true, nullsFirst: true })
          .order('subtask_order', { ascending: true });
      } else {
        // Standard sorting
        const sortBy = filters.sort_by || 'created_at';
        const ascending = filters.sort_order === 'asc';
        query = query.order(sortBy, { ascending });
      }

      // Apply pagination
      if (filters.limit !== undefined && filters.offset !== undefined) {
        query = query.range(filters.offset, filters.offset + filters.limit - 1);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Database error finding tasks:', error);
        return { data: null, error: new Error('Failed to find tasks') };
      }

      return { data: data as unknown as Task[], error: null };
    } catch (error) {
      console.error('Unexpected error finding tasks:', error);
      return { data: null, error: new Error('Failed to find tasks') };
    }
  }

  /**
   * Get task hierarchy tree
   */
  async getTaskTree(
    userId: string,
    parentTaskId?: string,
    maxDepth: number = 5,
    includeCompleted: boolean = true
  ): Promise<RepositoryResult<TaskTreeNode[]>> {
    try {
      const filters: TaskFilterParams = {
        parent_task_id: parentTaskId,
        include_subtasks: true
      };

      if (!includeCompleted) {
        filters.status = 'completed';
      }

      const { data: tasks } = await this.findTasksAdvanced(userId, filters);

      if (!tasks) {
        return { data: [], error: null };
      }

      // Build tree structure
      const tree = this.buildTaskTree(tasks, parentTaskId, maxDepth);

      return { data: tree, error: null };
    } catch (error) {
      console.error('Error building task tree:', error);
      return { data: null, error: new Error('Failed to build task tree') };
    }
  }

  /**
   * Get task statistics with hierarchy information
   */
  async getTaskStatistics(
    userId: string,
    filters: TaskFilterParams = {}
  ): Promise<RepositoryResult<any>> {
    try {
      const { data: tasks } = await this.findTasksAdvanced(userId, filters);

      if (!tasks) {
        return { data: null, error: new Error('Failed to get tasks for statistics') };
      }

      const now = new Date();
      const stats = {
        total: tasks.length,
        by_status: {} as Record<string, number>,
        by_priority: {} as Record<string, number>,
        by_hierarchy_level: {} as Record<string, number>,
        completed_tasks: 0,
        overdue_tasks: 0,
        tasks_with_subtasks: 0,
        average_progress: 0,
        completion_rate: 0,
        average_completion_time: 0
      };

      let totalProgress = 0;
      let completedTasks: Task[] = [];
      let totalCompletionTime = 0;

      tasks.forEach(task => {
        const content = task.content;

        // Status distribution
        stats.by_status[content.status] = (stats.by_status[content.status] || 0) + 1;

        // Priority distribution
        stats.by_priority[content.priority] = (stats.by_priority[content.priority] || 0) + 1;

        // Hierarchy level distribution
        const level = task.hierarchy_level || 0;
        stats.by_hierarchy_level[level] = (stats.by_hierarchy_level[level] || 0) + 1;

        // Progress tracking
        totalProgress += content.progress || 0;

        // Completed tasks
        if (content.status === 'completed') {
          stats.completed_tasks++;
          completedTasks.push(task);

          // Calculate completion time
          if (content.completion_date) {
            const createdDate = new Date(task.created_at);
            const completedDate = new Date(content.completion_date);
            totalCompletionTime += (completedDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24); // days
          }
        }

        // Overdue tasks
        if (content.due_date && content.status !== 'completed') {
          const dueDate = new Date(content.due_date);
          if (dueDate < now) {
            stats.overdue_tasks++;
          }
        }

        // Tasks with subtasks
        if (task.subtask_count > 0) {
          stats.tasks_with_subtasks++;
        }
      });

      // Calculate averages
      stats.average_progress = tasks.length > 0 ? totalProgress / tasks.length : 0;
      stats.completion_rate = tasks.length > 0 ? (stats.completed_tasks / tasks.length) * 100 : 0;
      stats.average_completion_time = completedTasks.length > 0 ? totalCompletionTime / completedTasks.length : 0;

      return { data: stats, error: null };
    } catch (error) {
      console.error('Error calculating task statistics:', error);
      return { data: null, error: new Error('Failed to calculate task statistics') };
    }
  }

  /**
   * Find overdue tasks
   */
  async findOverdueTasks(
    userId: string,
    filters: TaskFilterParams = {}
  ): Promise<RepositoryListResult<Task>> {
    return this.findTasksAdvanced(userId, {
      ...filters,
      overdue: true
    });
  }

  /**
   * Find root tasks (no parent)
   */
  async findRootTasks(
    userId: string,
    filters: TaskFilterParams = {}
  ): Promise<RepositoryListResult<Task>> {
    return this.findTasksAdvanced(userId, {
      ...filters,
      root_tasks_only: true
    });
  }

  /**
   * Find subtasks of a parent task
   */
  async findSubtasks(
    userId: string,
    parentTaskId: string,
    filters: TaskFilterParams = {}
  ): Promise<RepositoryListResult<Task>> {
    return this.findTasksAdvanced(userId, {
      ...filters,
      parent_task_id: parentTaskId
    });
  }

  /**
   * Apply task-specific filters to query
   */
  protected applyTaskFilters(query: any, filters: TaskFilterParams): any {
    // Apply base filters first
    query = this.applyFilters(query, filters);

    // Priority filtering
    if (filters.priority) {
      query = query.eq('content->>priority', filters.priority);
    }

    // Status filtering (override base to use JSON path)
    if (filters.status) {
      query = query.eq('content->>status', filters.status);
    }

    // Due date range
    if (filters.due_from) {
      query = query.gte('content->>due_date', filters.due_from);
    }
    if (filters.due_to) {
      query = query.lte('content->>due_date', filters.due_to);
    }

    // Progress range
    if (filters.progress_min !== undefined) {
      query = query.gte('content->>progress', filters.progress_min);
    }
    if (filters.progress_max !== undefined) {
      query = query.lte('content->>progress', filters.progress_max);
    }

    // Assignee filtering
    if (filters.assignee) {
      query = query.eq('content->>assignee', filters.assignee);
    }

    // Hierarchy filtering
    if (filters.parent_task_id) {
      query = query.eq('content->>parent_task_id', filters.parent_task_id);
    }

    if (filters.root_tasks_only) {
      query = query.is('content->>parent_task_id', null);
    }

    if (filters.hierarchy_level !== undefined) {
      query = query.eq('hierarchy_level', filters.hierarchy_level);
    }

    // Completion behavior filtering
    if (filters.completion_behavior) {
      query = query.eq('content->>completion_behavior', filters.completion_behavior);
    }

    if (filters.progress_calculation) {
      query = query.eq('content->>progress_calculation', filters.progress_calculation);
    }

    // Overdue filtering
    if (filters.overdue) {
      const now = new Date().toISOString();
      query = query
        .lt('content->>due_date', now)
        .neq('content->>status', 'completed');
    }

    return query;
  }

  /**
   * Build hierarchical task tree from flat task list
   */
  private buildTaskTree(tasks: Task[], parentId?: string, maxDepth: number = 5): TaskTreeNode[] {
    if (maxDepth <= 0) return [];

    const result: TaskTreeNode[] = [];
    const parentIdToMatch = parentId || null;

    tasks.forEach(task => {
      const content = task.content;
      const taskParentId = content.parent_task_id || null;

      if (taskParentId === parentIdToMatch) {
        const node: TaskTreeNode = {
          task_id: task.id,
          parent_task_id: taskParentId,
          title: content.title,
          status: content.status,
          progress: content.progress || 0,
          hierarchy_level: task.hierarchy_level || 0,
          subtask_order: content.subtask_order || 0
        };

        // Recursively find children
        const children = this.buildTaskTree(tasks, task.id, maxDepth - 1);
        if (children.length > 0) {
          node.children = children;
        }

        result.push(node);
      }
    });

    // Sort by subtask_order
    return result.sort((a, b) => a.subtask_order - b.subtask_order);
  }
}