// =====================================================
// Task Domain Types - Unified
// =====================================================

// Core enums and types
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'
export type TaskRelationType = 'subtask' | 'related' | 'dependency' | 'blocked_by'

// Category type definition
export interface Category {
  id: string
  name: string
  description?: string
  color: string
  icon?: string
  user_id?: string
  task_count?: number
  created_at: string
  updated_at: string
}

// Task relation type
export interface TaskRelation {
  id: string
  parent_task_id: string
  child_task_id: string
  relation_type: TaskRelationType
  created_at: string
}

// Core Task interface
export interface Task {
  id: string
  title: string
  description?: string
  status: TaskStatus
  priority: TaskPriority
  category_id?: string
  category?: Category
  user_id?: string
  created_at: string
  updated_at: string
  due_date?: string
  estimated_duration?: number // minutes
  progress: number // 0-100
  assignee?: string
  completion_date?: string
  notes?: string
  tags?: string[]
  // Relations
  subtasks?: Task[]
  related_tasks?: Task[]
  dependencies?: Task[]
  blocked_by?: Task[]
}

// Filter types
export type FilterStatus = 'all' | TaskStatus
export type FilterPriority = 'all' | TaskPriority
export type FilterCategory = 'all' | string

// View configuration
export type ViewMode = 'list' | 'grid' | 'kanban'

// Statistics
export interface TaskStats {
  total: number
  by_status: Record<TaskStatus, number>
  by_priority: Record<TaskPriority, number>
  by_category: Record<string, number>
  overdue: number
  due_today: number
  due_this_week: number
  completion_rate: number
  average_completion_time: number // days
}