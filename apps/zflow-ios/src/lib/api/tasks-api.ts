import { API_BASE, authenticatedFetch, ApiError } from './api-base';
import { TaskMemory, CreateTaskRequest, Category } from '../../types/task';

export interface TaskQueryParams {
  status?: string;
  priority?: string;
  category_id?: string;
  search?: string;
  limit?: number;
  offset?: number;
  sort_by?: string;
  sort_order?: string;
  root_tasks_only?: boolean;
  due_before?: string;
  due_after?: string;
}

export const tasksApi = {
  async list(params?: TaskQueryParams): Promise<TaskMemory[]> {
    const searchParams = new URLSearchParams();

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, value.toString());
        }
      });
    }

    const endpoint = `/tasks${searchParams.toString() ? `?${searchParams}` : ''}`;
    const response = await authenticatedFetch(`${API_BASE}/api${endpoint}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to fetch tasks' }));
      throw new ApiError(response.status, errorData.error || 'Failed to fetch tasks');
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  },

  async get(id: string): Promise<TaskMemory> {
    const response = await authenticatedFetch(`${API_BASE}/api/tasks/${id}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to fetch task' }));
      throw new ApiError(response.status, errorData.error || 'Failed to fetch task');
    }

    return response.json();
  },

  async create(task: CreateTaskRequest): Promise<TaskMemory> {
    // Ensure the task follows the proper format
    const taskData = {
      type: 'task',
      content: {
        title: task.content.title,
        description: task.content.description || '',
        status: task.content.status || 'pending',
        priority: task.content.priority || 'medium',
        category_id: task.content.category_id,
        due_date: task.content.due_date,
        estimated_duration: task.content.estimated_duration,
        progress: task.content.progress || 0,
        assignee: task.content.assignee,
        notes: task.content.notes,
        parent_task_id: task.content.parent_task_id,
      },
      tags: task.tags || [],
    };

    const response = await authenticatedFetch(`${API_BASE}/api/tasks`, {
      method: 'POST',
      body: JSON.stringify(taskData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to create task' }));
      throw new ApiError(response.status, errorData.error || 'Failed to create task');
    }

    return response.json();
  },

  async update(id: string, updates: Partial<CreateTaskRequest>): Promise<TaskMemory> {
    const updateData: any = {};

    if (updates.content) {
      updateData.content = {};
      Object.entries(updates.content).forEach(([key, value]) => {
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

    if (updates.tags !== undefined) {
      updateData.tags = updates.tags;
    }

    const response = await authenticatedFetch(`${API_BASE}/api/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to update task' }));
      throw new ApiError(response.status, errorData.error || 'Failed to update task');
    }

    return response.json();
  },

  async delete(id: string): Promise<void> {
    const response = await authenticatedFetch(`${API_BASE}/api/tasks/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to delete task' }));
      throw new ApiError(response.status, errorData.error || 'Failed to delete task');
    }
  },

  // Convenience methods for common operations
  async updateStatus(id: string, status: string): Promise<TaskMemory> {
    return this.update(id, {
      content: { status }
    });
  },

  async getUpdatedToday(): Promise<TaskMemory[]> {
    const response = await authenticatedFetch(`${API_BASE}/api/tasks/updated-today`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to fetch updated tasks' }));
      throw new ApiError(response.status, errorData.error || 'Failed to fetch updated tasks');
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  },

  async getTree(id: string): Promise<TaskMemory[]> {
    const response = await authenticatedFetch(`${API_BASE}/api/tasks/${id}/tree`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to fetch task tree' }));
      throw new ApiError(response.status, errorData.error || 'Failed to fetch task tree');
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  },

  // Query shortcuts
  async getActive(): Promise<TaskMemory[]> {
    return this.list({
      status: 'in_progress',
      sort_by: 'updated_at',
      sort_order: 'desc',
    });
  },

  async getPending(): Promise<TaskMemory[]> {
    return this.list({
      status: 'pending',
      sort_by: 'created_at',
      sort_order: 'desc',
    });
  },

  async getCompleted(limit: number = 20): Promise<TaskMemory[]> {
    return this.list({
      status: 'completed',
      sort_by: 'completion_date',
      sort_order: 'desc',
      limit,
    });
  },

  async getRootTasks(): Promise<TaskMemory[]> {
    return this.list({
      root_tasks_only: true,
      sort_by: 'updated_at',
      sort_order: 'desc',
      limit: 500,
    });
  },

  async getOverdue(): Promise<TaskMemory[]> {
    const now = new Date().toISOString();
    return this.list({
      due_before: now,
      status: 'pending',
      sort_by: 'due_date',
      sort_order: 'asc',
    });
  },

  async search(query: string): Promise<TaskMemory[]> {
    return this.list({
      search: query,
      sort_by: 'updated_at',
      sort_order: 'desc',
    });
  },

  async getByCategory(categoryId: string): Promise<TaskMemory[]> {
    return this.list({
      category_id: categoryId,
      sort_by: 'updated_at',
      sort_order: 'desc',
    });
  },

  async getByPriority(priority: string): Promise<TaskMemory[]> {
    return this.list({
      priority,
      sort_by: 'due_date',
      sort_order: 'asc',
    });
  }
};