import { Task } from 'types'
import { toUTC } from '../../app/utils/timeUtils'
import { API_BASE, authenticatedFetch, TaskMemory } from './api-base'

// Tasks API (via zmemory HTTP API)
export const tasksApi = {
  async getAll(params?: {
    status?: string;
    priority?: string;
    category?: string;
    search?: string;
    limit?: number;
    offset?: number;
    root_tasks_only?: boolean;
    hierarchy_level?: number;
    sort_by?: string;
    sort_order?: string;
  }): Promise<TaskMemory[]> {
    const searchParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.append(key, value.toString())
      })
    }

    const response = await authenticatedFetch(`${API_BASE}/tasks?${searchParams}`)
    if (!response.ok) {
      // Graceful fallback to avoid breaking UI in development or when backend not ready
      const errorText = await response.text().catch(() => '')
      console.warn('Tasks fetch failed:', response.status, response.statusText, errorText)
      return [] as TaskMemory[]
    }
    const data = await response.json()
    return data as TaskMemory[]
  },

  async getById(id: string): Promise<TaskMemory> {
    const response = await authenticatedFetch(`${API_BASE}/tasks/${id}`)
    if (!response.ok) throw new Error('Failed to fetch task')
    const data = await response.json()
    return data as TaskMemory
  },

  async create(task: {
    title: string;
    description?: string;
    status: Task['status'];
    priority: Task['priority'];
    category_id?: string;
    due_date?: string;
    estimated_duration?: number;
    progress?: number;
    assignee?: string;
    notes?: string;
    tags?: string[];
  }): Promise<TaskMemory> {
    // Convert due_date to UTC if provided
    const taskWithUTC = {
      ...task,
      due_date: task.due_date ? toUTC(task.due_date) : undefined
    }

    const response = await authenticatedFetch(`${API_BASE}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'task',
        content: taskWithUTC,
        tags: taskWithUTC.tags || []
      }),
    })
    if (!response.ok) throw new Error('Failed to create task')
    const data = await response.json()
    return data as TaskMemory
  },

  async update(id: string, updates: {
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
    // Clean up the content object to remove undefined and null values
    // Allow empty strings for fields that can be cleared (description, notes, assignee)
    const fieldsAllowingEmpty = ['description', 'notes', 'assignee']
    const cleanContent: any = {}
    Object.entries(updates).forEach(([key, value]) => {
      if (key === 'tags') return // Skip tags as it's handled separately
      if (value !== undefined && value !== null) {
        // Allow empty strings for specific fields, reject them for others
        if (value === '' && !fieldsAllowingEmpty.includes(key)) {
          return
        }
        // Convert due_date to UTC if it's being updated
        if (key === 'due_date' && typeof value === 'string') {
          cleanContent[key] = toUTC(value)
        } else {
          cleanContent[key] = value
        }
      }
    })

    const payload = {
      content: cleanContent,
      tags: updates.tags
    };

    const response = await authenticatedFetch(`${API_BASE}/tasks/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Update failed:', response.status, response.statusText, errorText);
      throw new Error(`Failed to update task: ${response.status} ${response.statusText}`);
    }

    const data = await response.json()
    return data as TaskMemory
  },

  async delete(id: string): Promise<{ message: string; id: string } | void> {
    const response = await authenticatedFetch(`${API_BASE}/tasks/${id}`, {
      method: 'DELETE',
    })
    if (!response.ok) throw new Error('Failed to delete task')
    try {
      return await response.json()
    } catch {
      return
    }
  },

  async getUpdatedToday(params?: {
    status?: string;
    priority?: string;
    category?: string;
    limit?: number;
    offset?: number;
    start_date?: string;
    end_date?: string;
    timezone?: string;
  }): Promise<{ tasks: TaskMemory[]; total: number; date_range: { start: string; end: string } }> {
    const searchParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.append(key, value.toString())
      })
    }

    const response = await authenticatedFetch(`${API_BASE}/tasks/updated-today?${searchParams}`)
    if (!response.ok) throw new Error('Failed to fetch tasks updated today')
    const data = await response.json()
    return data
  }
}