import { Task, Category, TaskRelationType } from '../app/types/task'
import { supabase } from './supabase'
import { authManager } from './auth-manager'

// If NEXT_PUBLIC_API_BASE is not configured, use relative path, proxy to zmemory via Next.js rewrites
const API_BASE = typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_BASE ? process.env.NEXT_PUBLIC_API_BASE : ''
const IS_CROSS_ORIGIN = API_BASE && API_BASE.length > 0

// Compatible type definitions (for hooks and page references)
export interface TaskContent {
  title: string
  description?: string
  status: Task['status']
  priority: Task['priority']
  category?: string
  category_id?: string
  due_date?: string
  estimated_duration?: number
  progress?: number
  assignee?: string
  completion_date?: string
  notes?: string
}

export interface TaskMemory {
  id: string
  type: 'task'
  content: TaskContent
  tags: string[]
  metadata?: Record<string, any>
  created_at: string
  updated_at: string
  // optional surfaced for UI convenience
  category_id?: string
}

export interface CreateTaskRequest {
  type: 'task'
  content: {
    title: string
    description?: string
    status: Task['status']
    priority: Task['priority']
    category_id?: string
    due_date?: string
    estimated_duration?: number
    progress?: number
    assignee?: string
    notes?: string
  }
  tags?: string[]
  metadata?: Record<string, any>
}

export interface UpdateTaskRequest {
  type?: 'task'
  content?: Partial<TaskContent>
  tags?: string[]
  metadata?: Record<string, any>
}

// ===== Time Tracking API types =====
export interface TimeEntry {
  id: string
  task_id: string
  start_at: string
  end_at?: string | null
  duration_minutes?: number | null
  note?: string | null
  source: 'timer' | 'manual' | 'import'
  // Joined fields for display
  task_title?: string
  category_name?: string
  category_color?: string
}

export interface StartTimerOptions { autoSwitch?: boolean }
export interface StopTimerOptions { overrideEndAt?: string }

// Categories API
export const categoriesApi = {
  async getAll(): Promise<Category[]> {
    const authHeaders = await authManager.getAuthHeaders()
    const response = await fetch(`${API_BASE}/api/categories`, {
      ...(IS_CROSS_ORIGIN ? {} : { credentials: 'include' }),
      headers: authHeaders,
    })
    if (!response.ok) throw new Error('Failed to fetch categories')
    const data = await response.json()
    return data.categories || []
  },

  async create(category: { name: string; description?: string; color?: string; icon?: string }): Promise<Category> {
    const authHeaders = await authManager.getAuthHeaders()
    const response = await fetch(`${API_BASE}/api/categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify(category),
      ...(IS_CROSS_ORIGIN ? {} : { credentials: 'include' }),
    })
    if (!response.ok) throw new Error('Failed to create category')
    const data = await response.json()
    return data.category
  },

  async update(id: string, category: Partial<Category>): Promise<Category> {
    const authHeaders = await authManager.getAuthHeaders()
    const response = await fetch(`${API_BASE}/api/categories/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify(category),
      ...(IS_CROSS_ORIGIN ? {} : { credentials: 'include' }),
    })
    if (!response.ok) throw new Error('Failed to update category')
    const data = await response.json()
    return data.category
  },

  async delete(id: string): Promise<void> {
    const authHeaders = await authManager.getAuthHeaders()
    const response = await fetch(`${API_BASE}/api/categories/${id}`, {
      method: 'DELETE',
      ...(IS_CROSS_ORIGIN ? {} : { credentials: 'include' }),
      headers: authHeaders,
    })
    if (!response.ok) throw new Error('Failed to delete category')
  }
}

// Task Relations API
export const taskRelationsApi = {
  async getByTask(taskId: string): Promise<any[]> {
    const authHeaders = await authManager.getAuthHeaders()
    const response = await fetch(`${API_BASE}/api/task-relations?task_id=${taskId}`, {
      ...(IS_CROSS_ORIGIN ? {} : { credentials: 'include' }),
      headers: authHeaders,
    })
    if (!response.ok) throw new Error('Failed to fetch task relations')
    const data = await response.json()
    return data.relations || []
  },

  async create(relation: { parent_task_id: string; child_task_id: string; relation_type: TaskRelationType }): Promise<any> {
    const authHeaders = await authManager.getAuthHeaders()
    const response = await fetch(`${API_BASE}/api/task-relations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify(relation),
      ...(IS_CROSS_ORIGIN ? {} : { credentials: 'include' }),
    })
    if (!response.ok) throw new Error('Failed to create task relation')
    const data = await response.json()
    return data.relation
  },

  async delete(id: string): Promise<void> {
    const authHeaders = await authManager.getAuthHeaders()
    const response = await fetch(`${API_BASE}/api/task-relations/${id}`, {
      method: 'DELETE',
      ...(IS_CROSS_ORIGIN ? {} : { credentials: 'include' }),
      headers: authHeaders,
    })
    if (!response.ok) throw new Error('Failed to delete task relation')
  }
}

// Tasks API (via zmemory HTTP API)
export const tasksApi = {
  async getAll(params?: {
    status?: string;
    priority?: string;
    category?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<TaskMemory[]> {
    const searchParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.append(key, value.toString())
      })
    }
    
    const authHeaders = await authManager.getAuthHeaders()
    const response = await fetch(`${API_BASE}/api/tasks?${searchParams}`, {
      ...(IS_CROSS_ORIGIN ? {} : { credentials: 'include' }),
      headers: authHeaders,
    })
    if (!response.ok) throw new Error('Failed to fetch tasks')
    const data = await response.json()
    return data as TaskMemory[]
  },

  async getById(id: string): Promise<TaskMemory> {
    const authHeaders = await authManager.getAuthHeaders()
    const response = await fetch(`${API_BASE}/api/tasks/${id}`, {
      ...(IS_CROSS_ORIGIN ? {} : { credentials: 'include' }),
      headers: authHeaders,
    })
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
    const authHeaders = await authManager.getAuthHeaders()
    const response = await fetch(`${API_BASE}/api/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify({
        type: 'task',
        content: task,
        tags: task.tags || []
      }),
      ...(IS_CROSS_ORIGIN ? {} : { credentials: 'include' }),
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
        cleanContent[key] = value
      }
    })
    
    const payload = {
      content: cleanContent,
      tags: updates.tags
    };
    
    const authHeaders = await authManager.getAuthHeaders()
    const response = await fetch(`${API_BASE}/api/tasks/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify(payload),
      ...(IS_CROSS_ORIGIN ? {} : { credentials: 'include' }),
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
    const authHeaders = await authManager.getAuthHeaders()
    const response = await fetch(`${API_BASE}/api/tasks/${id}`, {
      method: 'DELETE',
      ...(IS_CROSS_ORIGIN ? {} : { credentials: 'include' }),
      headers: authHeaders,
    })
    if (!response.ok) throw new Error('Failed to delete task')
    try {
      return await response.json()
    } catch {
      return
    }
  }
}

// Time tracking API client
export const timeTrackingApi = {
  async getRunning(): Promise<{ entry: Pick<TimeEntry, 'id' | 'task_id' | 'start_at'> | null }> {
    const authHeaders = await authManager.getAuthHeaders()
    const res = await fetch(`${API_BASE}/api/time-entries/running`, {
      ...(IS_CROSS_ORIGIN ? {} : { credentials: 'include' }),
      headers: authHeaders,
    })
    if (!res.ok) throw new Error('Failed to fetch running timer')
    return res.json()
  },

  async start(taskId: string, options?: StartTimerOptions): Promise<{ entry: Pick<TimeEntry, 'id' | 'task_id' | 'start_at'> } > {
    const authHeaders = await authManager.getAuthHeaders()
    const res = await fetch(`${API_BASE}/api/tasks/${taskId}/timer/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify({ autoSwitch: options?.autoSwitch ?? false }),
      ...(IS_CROSS_ORIGIN ? {} : { credentials: 'include' }),
    })
    if (!res.ok) throw new Error('Failed to start timer')
    return res.json()
  },

  async stop(taskId: string, options?: StopTimerOptions): Promise<{ entry: TimeEntry | null }> {
    const authHeaders = await authManager.getAuthHeaders()
    const res = await fetch(`${API_BASE}/api/tasks/${taskId}/timer/stop`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify({ overrideEndAt: options?.overrideEndAt }),
      ...(IS_CROSS_ORIGIN ? {} : { credentials: 'include' }),
    })
    if (!res.ok) throw new Error('Failed to stop timer')
    return res.json()
  },

  async list(taskId: string, params?: { from?: string; to?: string; limit?: number; offset?: number }): Promise<{ entries: TimeEntry[] }> {
    const sp = new URLSearchParams()
    if (params?.from) sp.set('from', params.from)
    if (params?.to) sp.set('to', params.to)
    if (params?.limit !== undefined) sp.set('limit', String(params.limit))
    if (params?.offset !== undefined) sp.set('offset', String(params.offset))
    const authHeaders = await authManager.getAuthHeaders()
    const res = await fetch(`${API_BASE}/api/tasks/${taskId}/time-entries?${sp.toString()}`, {
      ...(IS_CROSS_ORIGIN ? {} : { credentials: 'include' }),
      headers: authHeaders,
    })
    if (!res.ok) throw new Error('Failed to fetch time entries')
    return res.json()
  },

  async create(taskId: string, body: { start_at: string; end_at?: string; note?: string }): Promise<{ entry: TimeEntry }> {
    const authHeaders = await authManager.getAuthHeaders()
    const res = await fetch(`${API_BASE}/api/tasks/${taskId}/time-entries`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify({ ...body, source: 'manual' }),
      ...(IS_CROSS_ORIGIN ? {} : { credentials: 'include' }),
    })
    if (!res.ok) throw new Error('Failed to create time entry')
    return res.json()
  },

  async update(entryId: string, body: { start_at?: string; end_at?: string; note?: string }): Promise<{ entry: TimeEntry }> {
    const authHeaders = await authManager.getAuthHeaders()
    const res = await fetch(`${API_BASE}/api/time-entries/${entryId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify(body),
      ...(IS_CROSS_ORIGIN ? {} : { credentials: 'include' }),
    })
    if (!res.ok) throw new Error('Failed to update time entry')
    return res.json()
  },

  async remove(entryId: string): Promise<void> {
    const authHeaders = await authManager.getAuthHeaders()
    const res = await fetch(`${API_BASE}/api/time-entries/${entryId}`, {
      method: 'DELETE',
      ...(IS_CROSS_ORIGIN ? {} : { credentials: 'include' }),
      headers: authHeaders,
    })
    if (!res.ok) throw new Error('Failed to delete time entry')
  },

  async listDay(params: { from: string; to: string }): Promise<{ entries: (TimeEntry & { category?: { id: string; name: string; color: string } | null })[] }> {
    const authHeaders = await authManager.getAuthHeaders()
    const sp = new URLSearchParams({ from: params.from, to: params.to })
    const res = await fetch(`${API_BASE}/api/time-entries/day?${sp.toString()}`, {
      ...(IS_CROSS_ORIGIN ? {} : { credentials: 'include' }),
      headers: authHeaders,
    })
    if (!res.ok) throw new Error('Failed to fetch day entries')
    return res.json()
  },
}

// Compatible export: maintain apiClient interface for legacy hooks
export const apiClient = {
  getTasks: (params?: Parameters<typeof tasksApi.getAll>[0]) => tasksApi.getAll(params),
  getTask: (id: string) => tasksApi.getById(id),
  createTask: (data: CreateTaskRequest) => tasksApi.create({ ...(data.content), tags: data.tags }),
  updateTask: (id: string, data: UpdateTaskRequest) => tasksApi.update(id, { ...data.content, tags: data.tags }),
  deleteTask: (id: string) => tasksApi.delete(id),
} 