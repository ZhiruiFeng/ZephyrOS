import { Task, Category, TaskRelationType } from '../app/types/task'
import { supabase } from './supabase'

// If NEXT_PUBLIC_API_BASE is not configured, use relative path, proxy to zmemory via Next.js rewrites
const API_BASE = typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_BASE ? process.env.NEXT_PUBLIC_API_BASE : ''

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
  content?: Partial<CreateTaskRequest['content']>
  tags?: string[]
  metadata?: Record<string, any>
}

// Categories API
export const categoriesApi = {
  async getAll(): Promise<Category[]> {
    const token = (await supabase?.auth.getSession())?.data.session?.access_token
    const response = await fetch(`${API_BASE}/api/categories`, {
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })
    if (!response.ok) throw new Error('Failed to fetch categories')
    const data = await response.json()
    return data.categories || []
  },

  async create(category: { name: string; description?: string; color?: string; icon?: string }): Promise<Category> {
    const token = (await supabase?.auth.getSession())?.data.session?.access_token
    const response = await fetch(`${API_BASE}/api/categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(category),
      credentials: 'include',
    })
    if (!response.ok) throw new Error('Failed to create category')
    const data = await response.json()
    return data.category
  },

  async update(id: string, category: Partial<Category>): Promise<Category> {
    const token = (await supabase?.auth.getSession())?.data.session?.access_token
    const response = await fetch(`${API_BASE}/api/categories/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(category),
      credentials: 'include',
    })
    if (!response.ok) throw new Error('Failed to update category')
    const data = await response.json()
    return data.category
  },

  async delete(id: string): Promise<void> {
    const token = (await supabase?.auth.getSession())?.data.session?.access_token
    const response = await fetch(`${API_BASE}/api/categories/${id}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })
    if (!response.ok) throw new Error('Failed to delete category')
  }
}

// Task Relations API
export const taskRelationsApi = {
  async getByTask(taskId: string): Promise<any[]> {
    const token = (await supabase?.auth.getSession())?.data.session?.access_token
    const response = await fetch(`${API_BASE}/api/task-relations?task_id=${taskId}`, {
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })
    if (!response.ok) throw new Error('Failed to fetch task relations')
    const data = await response.json()
    return data.relations || []
  },

  async create(relation: { parent_task_id: string; child_task_id: string; relation_type: TaskRelationType }): Promise<any> {
    const token = (await supabase?.auth.getSession())?.data.session?.access_token
    const response = await fetch(`${API_BASE}/api/task-relations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(relation),
      credentials: 'include',
    })
    if (!response.ok) throw new Error('Failed to create task relation')
    const data = await response.json()
    return data.relation
  },

  async delete(id: string): Promise<void> {
    const token = (await supabase?.auth.getSession())?.data.session?.access_token
    const response = await fetch(`${API_BASE}/api/task-relations/${id}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
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
    
    const token = (await supabase?.auth.getSession())?.data.session?.access_token
    const response = await fetch(`${API_BASE}/api/tasks?${searchParams}`, {
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })
    if (!response.ok) throw new Error('Failed to fetch tasks')
    const data = await response.json()
    return data as TaskMemory[]
  },

  async getById(id: string): Promise<TaskMemory> {
    const token = (await supabase?.auth.getSession())?.data.session?.access_token
    const response = await fetch(`${API_BASE}/api/tasks/${id}`, {
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
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
    const token = (await supabase?.auth.getSession())?.data.session?.access_token
    const response = await fetch(`${API_BASE}/api/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        type: 'task',
        content: task,
        tags: task.tags || []
      }),
      credentials: 'include',
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
    const payload = {
      content: updates,
      tags: updates.tags
    };
    
    console.log('Updating task:', id, 'with payload:', JSON.stringify(payload, null, 2));
    
    const token = (await supabase?.auth.getSession())?.data.session?.access_token
    const response = await fetch(`${API_BASE}/api/tasks/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
      credentials: 'include',
    })
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Update failed:', response.status, response.statusText, errorText);
      throw new Error(`Failed to update task: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json()
    console.log('Update successful:', data);
    return data as TaskMemory
  },

  async delete(id: string): Promise<{ message: string; id: string } | void> {
    const token = (await supabase?.auth.getSession())?.data.session?.access_token
    const response = await fetch(`${API_BASE}/api/tasks/${id}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })
    if (!response.ok) throw new Error('Failed to delete task')
    try {
      return await response.json()
    } catch {
      return
    }
  }
}

// Compatible export: maintain apiClient interface for legacy hooks
export const apiClient = {
  getTasks: (params?: Parameters<typeof tasksApi.getAll>[0]) => tasksApi.getAll(params),
  getTask: (id: string) => tasksApi.getById(id),
  createTask: (data: CreateTaskRequest) => tasksApi.create({ ...(data.content), tags: data.tags }),
  updateTask: (id: string, data: UpdateTaskRequest) => tasksApi.update(id, { ...data.content, tags: data.tags }),
  deleteTask: (id: string) => tasksApi.delete(id),
} 