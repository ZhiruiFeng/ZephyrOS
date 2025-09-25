import { Task } from 'types'
import { authManager } from '../auth-manager'
import { ZMEMORY_API_BASE, IS_ZMEMORY_CROSS_ORIGIN } from './zmemory-api-base'

// If NEXT_PUBLIC_API_BASE is not configured, use relative path, proxy to zmemory via Next.js rewrites
export const API_BASE = ZMEMORY_API_BASE
export const IS_CROSS_ORIGIN = IS_ZMEMORY_CROSS_ORIGIN

// Common fetch utility with auth
export async function authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const authHeaders = await authManager.getAuthHeaders()
  return fetch(url, {
    ...options,
    headers: {
      ...authHeaders,
      ...options.headers,
    },
    ...(IS_CROSS_ORIGIN ? {} : { credentials: 'include' }),
  })
}

// Common types used across multiple APIs
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
  // AI task flag
  is_ai_task?: boolean
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

// Time Tracking API types
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