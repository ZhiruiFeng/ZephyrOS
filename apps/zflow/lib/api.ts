import { Task, Category, TaskRelationType } from '../app/types/task'
import { supabase } from './supabase'
import { authManager } from './auth-manager'
import { toUTC } from '../app/utils/timeUtils'
import { ZMEMORY_API_ORIGIN, IS_ZMEMORY_CROSS_ORIGIN } from './zmemory-api-base'

// If NEXT_PUBLIC_API_BASE is not configured, use relative path, proxy to zmemory via Next.js rewrites
export const API_BASE = ZMEMORY_API_ORIGIN
const IS_CROSS_ORIGIN = IS_ZMEMORY_CROSS_ORIGIN

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
  // Hierarchy metadata
  hierarchy_level?: number
  hierarchy_path?: string
  subtask_count?: number
  completed_subtask_count?: number
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
    
    const authHeaders = await authManager.getAuthHeaders()
    const response = await fetch(`${API_BASE}/api/tasks?${searchParams}`, {
      ...(IS_CROSS_ORIGIN ? {} : { credentials: 'include' }),
      headers: authHeaders,
    })
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
    
    // Convert due_date to UTC if provided
    const taskWithUTC = {
      ...task,
      due_date: task.due_date ? toUTC(task.due_date) : undefined
    }
    
    const response = await fetch(`${API_BASE}/api/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify({
        type: 'task',
        content: taskWithUTC,
        tags: taskWithUTC.tags || []
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
    
    const authHeaders = await authManager.getAuthHeaders()
    const response = await fetch(`${API_BASE}/api/tasks/updated-today?${searchParams}`, {
      ...(IS_CROSS_ORIGIN ? {} : { credentials: 'include' }),
      headers: authHeaders,
    })
    if (!response.ok) throw new Error('Failed to fetch tasks updated today')
    const data = await response.json()
    return data
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
    if (!res.ok) {
      const errorText = await res.text()
      console.error('API Error Response:', errorText)
      throw new Error(`Failed to update time entry: ${res.status} ${res.statusText} - ${errorText}`)
    }
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

// Timeline Items Time Tracking API (for both tasks and activities)
export const timelineItemsApi = {
  async listTimeEntries(timelineItemId: string, params?: { from?: string; to?: string; limit?: number; offset?: number }): Promise<{ entries: TimeEntry[] }> {
    const sp = new URLSearchParams()
    if (params?.from) sp.set('from', params.from)
    if (params?.to) sp.set('to', params.to)
    if (params?.limit !== undefined) sp.set('limit', String(params.limit))
    if (params?.offset !== undefined) sp.set('offset', String(params.offset))
    const authHeaders = await authManager.getAuthHeaders()
    const res = await fetch(`${API_BASE}/api/timeline-items/${timelineItemId}/time-entries?${sp.toString()}`, {
      ...(IS_CROSS_ORIGIN ? {} : { credentials: 'include' }),
      headers: authHeaders,
    })
    if (!res.ok) throw new Error('Failed to fetch timeline item time entries')
    return res.json()
  },

  async createTimeEntry(timelineItemId: string, body: { start_at: string; end_at?: string; note?: string; source?: string }): Promise<{ entry: TimeEntry }> {
    const authHeaders = await authManager.getAuthHeaders()
    const res = await fetch(`${API_BASE}/api/timeline-items/${timelineItemId}/time-entries`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify({ ...body, source: body.source || 'manual' }),
      ...(IS_CROSS_ORIGIN ? {} : { credentials: 'include' }),
    })
    if (!res.ok) throw new Error('Failed to create timeline item time entry')
    return res.json()
  },

  async updateTimeEntry(entryId: string, body: { start_at?: string; end_at?: string; note?: string }): Promise<{ entry: TimeEntry }> {
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
    if (!res.ok) {
      const errorText = await res.text()
      console.error('API Error Response:', errorText)
      throw new Error(`Failed to update time entry: ${res.status} ${res.statusText} - ${errorText}`)
    }
    return res.json()
  },

  async removeTimeEntry(entryId: string): Promise<void> {
    const authHeaders = await authManager.getAuthHeaders()
    const res = await fetch(`${API_BASE}/api/time-entries/${entryId}`, {
      method: 'DELETE',
      ...(IS_CROSS_ORIGIN ? {} : { credentials: 'include' }),
      headers: authHeaders,
    })
    if (!res.ok) throw new Error('Failed to delete time entry')
  },
}

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
    
    const authHeaders = await authManager.getAuthHeaders()
    const response = await fetch(`${API_BASE}/api/tasks/${taskId}/tree?${searchParams}`, {
      ...(IS_CROSS_ORIGIN ? {} : { credentials: 'include' }),
      headers: authHeaders,
    })
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
    const authHeaders = await authManager.getAuthHeaders()
    const response = await fetch(`${API_BASE}/api/subtasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
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
      ...(IS_CROSS_ORIGIN ? {} : { credentials: 'include' }),
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
    const authHeaders = await authManager.getAuthHeaders()
    const response = await fetch(`${API_BASE}/api/subtasks/reorder`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify({
        parent_task_id: parentTaskId,
        subtask_orders: subtaskOrders
      }),
      ...(IS_CROSS_ORIGIN ? {} : { credentials: 'include' }),
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

// Task Statistics API
export const statsApi = {
  async getTaskStats(): Promise<any> {
    const authHeaders = await authManager.getAuthHeaders()
    const response = await fetch(`${API_BASE}/api/tasks/stats`, {
      ...(IS_CROSS_ORIGIN ? {} : { credentials: 'include' }),
      headers: authHeaders,
    })
    if (!response.ok) {
      // Graceful fallback to empty stats to avoid crashing UI
      try {
        const payload = await response.json().catch(() => null)
        console.warn('Task stats request failed:', response.status, payload)
      } catch {}
      return {
        total: 0,
        by_status: { pending: 0, in_progress: 0, completed: 0, cancelled: 0, on_hold: 0 },
        by_priority: { low: 0, medium: 0, high: 0, urgent: 0 },
        by_category: { work: 0, personal: 0, project: 0, meeting: 0, learning: 0, maintenance: 0, other: 0 },
        overdue: 0,
        due_today: 0,
        due_this_week: 0,
        completion_rate: 0,
        average_completion_time: 0,
      }
    }
    return response.json()
  }
}

// Agent Features API (for task type options)
export const agentFeaturesApi = {
  async list(params?: { is_active?: boolean; search?: string; limit?: number; offset?: number }): Promise<Array<{ id: string; name: string; description?: string }>> {
    const sp = new URLSearchParams()
    if (params) Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null) sp.append(k, String(v)) })
    const authHeaders = await authManager.getAuthHeaders()
    const res = await fetch(`${API_BASE}/api/agent-features?${sp.toString()}`, { headers: authHeaders, ...(IS_CROSS_ORIGIN ? {} : { credentials: 'include' }) })
    if (!res.ok) return []
    const data = await res.json()
    return data.features || []
  }
}

// AI Agents (read-only for selection)
export const aiAgentsApi = {
  async list(params?: { vendor_id?: string; service_id?: string; feature_id?: string; is_active?: boolean; is_favorite?: boolean; search?: string; limit?: number; offset?: number; sort_by?: string; sort_order?: 'asc' | 'desc' }): Promise<any[]> {
    const sp = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) sp.append(k, String(v))
      })
    }
    const authHeaders = await authManager.getAuthHeaders()
    const res = await fetch(`${API_BASE}/api/ai-agents?${sp.toString()}` , { headers: authHeaders, ...(IS_CROSS_ORIGIN ? {} : { credentials: 'include' }) })
    if (!res.ok) return []
    const data = await res.json()
    return data.agents || []
  }
}

// AI Tasks API
export type AITask = {
  id: string
  task_id: string
  agent_id: string
  objective: string
  deliverables?: string | null
  context?: string | null
  acceptance_criteria?: string | null
  task_type: string
  dependencies?: string[]
  mode: 'plan_only' | 'dry_run' | 'execute'
  guardrails?: { costCapUSD?: number | null; timeCapMin?: number | null; requiresHumanApproval?: boolean; dataScopes?: string[] }
  metadata?: { priority?: 'low' | 'medium' | 'high' | 'urgent'; tags?: string[] }
  status?: 'pending' | 'assigned' | 'in_progress' | 'paused' | 'completed' | 'failed' | 'cancelled'
  history?: any[]
  assigned_at?: string
  started_at?: string | null
  completed_at?: string | null
  due_at?: string | null
}

export const aiTasksApi = {
  async list(params?: { task_id?: string; agent_id?: string; task_type?: string; mode?: string; status?: string; search?: string; assigned_from?: string; assigned_to?: string; due_from?: string; due_to?: string; limit?: number; offset?: number; sort_by?: string; sort_order?: 'asc' | 'desc' }): Promise<AITask[]> {
    const sp = new URLSearchParams()
    if (params) Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null) sp.append(k, String(v)) })
    const authHeaders = await authManager.getAuthHeaders()
    const res = await fetch(`${API_BASE}/api/ai-tasks?${sp.toString()}`, { headers: authHeaders, ...(IS_CROSS_ORIGIN ? {} : { credentials: 'include' }) })
    if (!res.ok) return []
    const data = await res.json()
    return data.ai_tasks || []
  },
  async create(body: Omit<AITask, 'id' | 'assigned_at' | 'started_at' | 'completed_at'>): Promise<AITask> {
    const authHeaders = await authManager.getAuthHeaders()
    const res = await fetch(`${API_BASE}/api/ai-tasks`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders }, body: JSON.stringify(body), ...(IS_CROSS_ORIGIN ? {} : { credentials: 'include' }) })
    if (!res.ok) throw new Error('Failed to create ai_task')
    const data = await res.json()
    return data.ai_task
  },
  async get(id: string): Promise<AITask> {
    const authHeaders = await authManager.getAuthHeaders()
    const res = await fetch(`${API_BASE}/api/ai-tasks/${id}`, { headers: authHeaders, ...(IS_CROSS_ORIGIN ? {} : { credentials: 'include' }) })
    if (!res.ok) throw new Error('Failed to get ai_task')
    const data = await res.json()
    return data.ai_task
  },
  async update(id: string, updates: Partial<AITask>): Promise<AITask> {
    const authHeaders = await authManager.getAuthHeaders()
    const res = await fetch(`${API_BASE}/api/ai-tasks/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', ...authHeaders }, body: JSON.stringify(updates), ...(IS_CROSS_ORIGIN ? {} : { credentials: 'include' }) })
    if (!res.ok) throw new Error('Failed to update ai_task')
    const data = await res.json()
    return data.ai_task
  },
  async remove(id: string): Promise<void> {
    const authHeaders = await authManager.getAuthHeaders()
    const res = await fetch(`${API_BASE}/api/ai-tasks/${id}`, { method: 'DELETE', headers: authHeaders, ...(IS_CROSS_ORIGIN ? {} : { credentials: 'include' }) })
    if (!res.ok) throw new Error('Failed to delete ai_task')
  }
}
// Energy Days API
export type EnergyDay = {
  user_id: string
  local_date: string
  tz: string
  curve: number[]
  edited_mask: boolean[]
  last_checked_index?: number | null
  last_checked_at?: string | null
  source: 'simulated' | 'user_edited' | 'merged'
  metadata?: Record<string, any>
  created_at?: string
  updated_at?: string
}

export const energyDaysApi = {
  async list(params?: { start?: string; end?: string; limit?: number }): Promise<EnergyDay[]> {
    const sp = new URLSearchParams()
    if (params?.start) sp.set('start', params.start)
    if (params?.end) sp.set('end', params.end)
    if (params?.limit !== undefined) sp.set('limit', String(params.limit))
    const authHeaders = await authManager.getAuthHeaders()
    const res = await fetch(`${API_BASE}/api/energy-days?${sp.toString()}`, {
      ...(IS_CROSS_ORIGIN ? {} : { credentials: 'include' }),
      headers: authHeaders,
    })
    if (!res.ok) throw new Error('Failed to list energy days')
    return res.json()
  },

  async get(date: string): Promise<EnergyDay | null> {
    const authHeaders = await authManager.getAuthHeaders()
    const res = await fetch(`${API_BASE}/api/energy-days/${date}`, {
      ...(IS_CROSS_ORIGIN ? {} : { credentials: 'include' }),
      headers: authHeaders,
    })
    if (!res.ok) throw new Error('Failed to get energy day')
    return res.json()
  },

  async upsert(day: Partial<EnergyDay> & { local_date: string; curve: number[]; tz?: string; source?: EnergyDay['source'] }): Promise<EnergyDay> {
    const authHeaders = await authManager.getAuthHeaders()
    const res = await fetch(`${API_BASE}/api/energy-days`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify(day),
      ...(IS_CROSS_ORIGIN ? {} : { credentials: 'include' }),
    })
    if (!res.ok) throw new Error('Failed to upsert energy day')
    return res.json()
  },

  async update(date: string, updates: Partial<Pick<EnergyDay, 'curve' | 'edited_mask' | 'last_checked_index' | 'last_checked_at' | 'tz' | 'source' | 'metadata'>>): Promise<EnergyDay> {
    const authHeaders = await authManager.getAuthHeaders()
    const res = await fetch(`${API_BASE}/api/energy-days/${date}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify(updates),
      ...(IS_CROSS_ORIGIN ? {} : { credentials: 'include' }),
    })
    if (!res.ok) throw new Error('Failed to update energy day')
    return res.json()
  },

  async setSegment(date: string, index: number, value: number): Promise<EnergyDay> {
    const authHeaders = await authManager.getAuthHeaders()
    const res = await fetch(`${API_BASE}/api/energy-days/${date}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({ op: 'set_segment', index, value }),
      ...(IS_CROSS_ORIGIN ? {} : { credentials: 'include' }),
    })
    if (!res.ok) throw new Error('Failed to set energy segment')
    return res.json()
  }
}

// Activities API
export const activitiesApi = {
  async getAll(params?: {
    activity_type?: string;
    status?: string;
    intensity_level?: string;
    category_id?: string;
    location?: string;
    from?: string;
    to?: string;
    min_satisfaction?: number;
    min_mood_after?: number;
    limit?: number;
    offset?: number;
    sort_by?: string;
    sort_order?: string;
    search?: string;
    tags?: string;
  }): Promise<any[]> {
    const authHeaders = await authManager.getAuthHeaders()
    const searchParams = new URLSearchParams()
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value))
        }
      })
    }
    
    const response = await fetch(`${API_BASE}/api/activities?${searchParams}`, {
      headers: authHeaders,
      ...(IS_CROSS_ORIGIN ? {} : { credentials: 'include' }),
    })
    if (!response.ok) throw new Error('Failed to fetch activities')
    const data = await response.json()
    return Array.isArray(data) ? data : []
  },

  async getById(id: string): Promise<any> {
    const authHeaders = await authManager.getAuthHeaders()
    const response = await fetch(`${API_BASE}/api/activities/${id}`, {
      headers: authHeaders,
      ...(IS_CROSS_ORIGIN ? {} : { credentials: 'include' }),
    })
    if (!response.ok) throw new Error('Failed to fetch activity')
    return response.json()
  },

  async create(activity: {
    title: string;
    description?: string;
    activity_type?: string;
    started_at?: string;
    ended_at?: string;
    duration_minutes?: number;
    mood_before?: number;
    mood_after?: number;
    energy_before?: number;
    energy_after?: number;
    satisfaction_level?: number;
    intensity_level?: string;
    location?: string;
    weather?: string;
    companions?: string[];
    notes?: string;
    insights?: string;
    gratitude?: string;
    category_id?: string;
    tags?: string[];
    status?: string;
  }): Promise<any> {
    const authHeaders = await authManager.getAuthHeaders()
    
    const response = await fetch(`${API_BASE}/api/activities`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify(activity),
      ...(IS_CROSS_ORIGIN ? {} : { credentials: 'include' }),
    })
    if (!response.ok) throw new Error('Failed to create activity')
    return response.json()
  },

  async update(id: string, updates: {
    title?: string;
    description?: string;
    activity_type?: string;
    started_at?: string;
    ended_at?: string;
    duration_minutes?: number;
    mood_before?: number;
    mood_after?: number;
    energy_before?: number;
    energy_after?: number;
    satisfaction_level?: number;
    intensity_level?: string;
    location?: string;
    weather?: string;
    companions?: string[];
    notes?: string;
    insights?: string;
    gratitude?: string;
    category_id?: string;
    tags?: string[];
    status?: string;
  }): Promise<any> {
    const authHeaders = await authManager.getAuthHeaders()
    const response = await fetch(`${API_BASE}/api/activities/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify(updates),
      ...(IS_CROSS_ORIGIN ? {} : { credentials: 'include' }),
    })
    if (!response.ok) throw new Error('Failed to update activity')
    return response.json()
  },

  async delete(id: string): Promise<void> {
    const authHeaders = await authManager.getAuthHeaders()
    const response = await fetch(`${API_BASE}/api/activities/${id}`, {
      method: 'DELETE',
      headers: authHeaders,
      ...(IS_CROSS_ORIGIN ? {} : { credentials: 'include' }),
    })
    if (!response.ok) throw new Error('Failed to delete activity')
  },

  async getStats(days: number = 30): Promise<any> {
    const authHeaders = await authManager.getAuthHeaders()
    const response = await fetch(`${API_BASE}/api/activities/stats?days=${days}`, {
      headers: authHeaders,
      ...(IS_CROSS_ORIGIN ? {} : { credentials: 'include' }),
    })
    if (!response.ok) throw new Error('Failed to fetch activity stats')
    return response.json()
  }
}

// Compatible export: maintain apiClient interface for legacy hooks
export const apiClient = {
  getTasks: (params?: Parameters<typeof tasksApi.getAll>[0]) => tasksApi.getAll(params),
  getTask: (id: string) => tasksApi.getById(id),
  createTask: (data: CreateTaskRequest) => tasksApi.create({ ...(data.content), tags: data.tags }),
  updateTask: (id: string, data: UpdateTaskRequest) => tasksApi.update(id, { ...data.content, tags: data.tags }),
  deleteTask: (id: string) => tasksApi.delete(id),
  // Activities
  getActivities: (params?: Parameters<typeof activitiesApi.getAll>[0]) => activitiesApi.getAll(params),
  getActivity: (id: string) => activitiesApi.getById(id),
  createActivity: (data: Parameters<typeof activitiesApi.create>[0]) => activitiesApi.create(data),
  updateActivity: (id: string, data: Parameters<typeof activitiesApi.update>[1]) => activitiesApi.update(id, data),
  deleteActivity: (id: string) => activitiesApi.delete(id),
} 
