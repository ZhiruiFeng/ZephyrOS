import { API_BASE, authenticatedFetch, ApiError } from './api-base';
import { TaskMemory, CreateTaskRequest } from '../../types/task';

export interface SubtaskCreateRequest {
  title: string;
  description?: string;
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  due_date?: string;
  estimated_duration?: number;
  assignee?: string;
  notes?: string;
}

export interface SubtaskUpdateRequest extends Partial<SubtaskCreateRequest> {
  progress?: number;
}

export const subtasksApi = {
  // Get subtasks for a parent task
  async listByParent(parentTaskId: string, params?: {
    status?: string;
    priority?: string;
    limit?: number;
    offset?: number;
    sort_by?: string;
    sort_order?: string;
  }): Promise<TaskMemory[]> {
    const searchParams = new URLSearchParams();
    searchParams.append('parent_task_id', parentTaskId);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, value.toString());
        }
      });
    }

    const endpoint = `/tasks?${searchParams.toString()}`;
    const response = await authenticatedFetch(`${API_BASE}/api${endpoint}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to fetch subtasks' }));
      throw new ApiError(response.status, errorData.error || 'Failed to fetch subtasks');
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  },

  // Get task hierarchy/tree
  async getTaskTree(rootTaskId: string): Promise<TaskMemory[]> {
    const response = await authenticatedFetch(`${API_BASE}/api/tasks/${rootTaskId}/tree`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to fetch task tree' }));
      throw new ApiError(response.status, errorData.error || 'Failed to fetch task tree');
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  },

  // Create a subtask
  async create(parentTaskId: string, subtask: SubtaskCreateRequest): Promise<TaskMemory> {
    const taskData: CreateTaskRequest = {
      type: 'task',
      content: {
        title: subtask.title,
        description: subtask.description || '',
        status: subtask.status || 'pending',
        priority: subtask.priority || 'medium',
        due_date: subtask.due_date,
        estimated_duration: subtask.estimated_duration,
        assignee: subtask.assignee,
        notes: subtask.notes,
        parent_task_id: parentTaskId,
        progress: 0,
      },
      tags: [],
    };

    const response = await authenticatedFetch(`${API_BASE}/api/tasks`, {
      method: 'POST',
      body: JSON.stringify(taskData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to create subtask' }));
      throw new ApiError(response.status, errorData.error || 'Failed to create subtask');
    }

    return response.json();
  },

  // Update a subtask
  async update(subtaskId: string, updates: SubtaskUpdateRequest): Promise<TaskMemory> {
    const updateData: any = {};

    if (Object.keys(updates).length > 0) {
      updateData.content = {};
      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          // Allow empty strings for description, notes, assignee
          const fieldsAllowingEmpty = ['description', 'notes', 'assignee'];
          if (value === '' && !fieldsAllowingEmpty.includes(key)) {
            return;
          }
          updateData.content[key] = value;
        }
      });
    }

    const response = await authenticatedFetch(`${API_BASE}/api/tasks/${subtaskId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to update subtask' }));
      throw new ApiError(response.status, errorData.error || 'Failed to update subtask');
    }

    return response.json();
  },

  // Delete a subtask
  async delete(subtaskId: string): Promise<void> {
    const response = await authenticatedFetch(`${API_BASE}/api/tasks/${subtaskId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to delete subtask' }));
      throw new ApiError(response.status, errorData.error || 'Failed to delete subtask');
    }
  },

  // Move subtask to different parent
  async moveToParent(subtaskId: string, newParentId: string): Promise<TaskMemory> {
    return this.update(subtaskId, { parent_task_id: newParentId });
  },

  // Convert subtask to root task
  async convertToRootTask(subtaskId: string): Promise<TaskMemory> {
    const updateData = {
      content: {
        parent_task_id: null
      }
    };

    const response = await authenticatedFetch(`${API_BASE}/api/tasks/${subtaskId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to convert subtask to root task' }));
      throw new ApiError(response.status, errorData.error || 'Failed to convert subtask to root task');
    }

    return response.json();
  },

  // Get subtask completion summary for a parent task
  async getCompletionSummary(parentTaskId: string): Promise<{
    total: number;
    completed: number;
    pending: number;
    in_progress: number;
    completion_percentage: number;
  }> {
    const subtasks = await this.listByParent(parentTaskId);

    const total = subtasks.length;
    const completed = subtasks.filter(task => task.content.status === 'completed').length;
    const pending = subtasks.filter(task => task.content.status === 'pending').length;
    const in_progress = subtasks.filter(task => task.content.status === 'in_progress').length;
    const completion_percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      total,
      completed,
      pending,
      in_progress,
      completion_percentage
    };
  },

  // Convenience methods
  async getCompletedSubtasks(parentTaskId: string): Promise<TaskMemory[]> {
    return this.listByParent(parentTaskId, { status: 'completed' });
  },

  async getPendingSubtasks(parentTaskId: string): Promise<TaskMemory[]> {
    return this.listByParent(parentTaskId, { status: 'pending' });
  },

  async getActiveSubtasks(parentTaskId: string): Promise<TaskMemory[]> {
    return this.listByParent(parentTaskId, { status: 'in_progress' });
  }
};