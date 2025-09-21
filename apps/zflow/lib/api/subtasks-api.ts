import { Task } from '../../app/types/task'
import { API_BASE, authenticatedFetch, TaskMemory } from './api-base'
import { tasksApi } from './tasks-api'

// Subtasks API
export const subtasksApi = {
  async getTaskTree(taskId: string, params?: {
    max_depth?: number;
    include_completed?: boolean;
    format?: 'flat' | 'nested';
  }): Promise<{
    task: TaskMemory;
    subtasks?: TaskMemory[];
    tree_stats: {
      total_subtasks: number;
      completed_subtasks: number;
      pending_subtasks: number;
      in_progress_subtasks: number;
      completion_percentage: number;
      max_depth: number;
    };
  }> {
    const searchParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.append(key, value.toString())
      })
    }

    const response = await authenticatedFetch(`${API_BASE}/tasks/${taskId}/tree?${searchParams}`)
    if (!response.ok) throw new Error('Failed to fetch task tree')

    // API returns array of tasks, we need to transform it
    const tasks: TaskMemory[] = await response.json()

    // Find the root task and separate subtasks
    const rootTask = tasks.find(task => task.id === taskId)
    const subtasks = tasks.filter(task => task.id !== taskId)

    if (!rootTask) {
      throw new Error('Root task not found in response')
    }

    // Calculate tree stats
    const totalSubtasks = subtasks.length
    const completedSubtasks = subtasks.filter(task => task.content.status === 'completed').length
    const pendingSubtasks = subtasks.filter(task => task.content.status === 'pending').length
    const inProgressSubtasks = subtasks.filter(task => task.content.status === 'in_progress').length
    const completionPercentage = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0
    const maxDepth = Math.max(0, ...subtasks.map(task => task.hierarchy_level || 0))

    return {
      task: rootTask,
      subtasks: subtasks,
      tree_stats: {
        total_subtasks: totalSubtasks,
        completed_subtasks: completedSubtasks,
        pending_subtasks: pendingSubtasks,
        in_progress_subtasks: inProgressSubtasks,
        completion_percentage: completionPercentage,
        max_depth: maxDepth
      }
    }
  },

  async create(parentTaskId: string, subtask: {
    title: string;
    description?: string;
    status?: Task['status'];
    priority?: Task['priority'];
    category_id?: string;
    due_date?: string;
    estimated_duration?: number;
    progress?: number;
    assignee?: string;
    notes?: string;
    tags?: string[];
    subtask_order?: number;
  }): Promise<TaskMemory> {
    const response = await authenticatedFetch(`${API_BASE}/subtasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        parent_task_id: parentTaskId,
        task_data: {
          type: 'task',
          content: {
            title: subtask.title,
            description: subtask.description,
            status: subtask.status || 'pending',
            priority: subtask.priority || 'medium',
            category_id: subtask.category_id,
            due_date: subtask.due_date,
            estimated_duration: subtask.estimated_duration,
            progress: subtask.progress || 0,
            assignee: subtask.assignee,
            notes: subtask.notes,
            completion_behavior: 'manual',
            progress_calculation: 'manual'
          },
          tags: subtask.tags || []
        },
        subtask_order: subtask.subtask_order
      }),
    })
    if (!response.ok) throw new Error('Failed to create subtask')
    return response.json()
  },

  async reorder(parentTaskId: string, subtaskOrders: Array<{
    task_id: string;
    new_order: number;
  }>): Promise<{
    message: string;
    parent_task_id: string;
    reordered_count: number;
  }> {
    const response = await authenticatedFetch(`${API_BASE}/subtasks/reorder`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        parent_task_id: parentTaskId,
        subtask_orders: subtaskOrders
      }),
    })
    if (!response.ok) throw new Error('Failed to reorder subtasks')
    return response.json()
  },

  async update(subtaskId: string, updates: {
    title?: string;
    description?: string;
    status?: Task['status'];
    priority?: Task['priority'];
    category_id?: string;
    due_date?: string;
    estimated_duration?: number;
    progress?: number;
    assignee?: string;
    notes?: string;
    tags?: string[];
  }): Promise<TaskMemory> {
    // Use the main tasks API for updating subtasks
    return tasksApi.update(subtaskId, updates)
  },

  async delete(subtaskId: string): Promise<{ message: string; id: string } | void> {
    // Use the main tasks API for deleting subtasks
    return tasksApi.delete(subtaskId)
  }
}