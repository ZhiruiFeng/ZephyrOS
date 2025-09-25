// =====================================================
// UI Form Types - Unified
// =====================================================

import type { Task, TaskStatus, TaskPriority } from '../domain/task'
import type { Category } from '../domain/task'

// Task form types
export interface TaskForm {
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  category_id?: string
  due_date: string
  estimated_duration?: number
  progress?: number
  assignee?: string
  notes?: string
  tags: string
}

export interface TaskEditorProps {
  isOpen: boolean
  onClose: () => void
  task: Task | null
  categories: Category[]
  onSave: (taskId: string, data: {
    content: {
      title: string
      description: string
      status: TaskStatus
      priority: TaskPriority
      category_id?: string
      due_date?: string
      estimated_duration?: number
      progress?: number
      assignee?: string
      notes?: string
    }
    tags: string[]
  }) => Promise<void>
  title?: string
}

// Memory form types
export interface MemoryForm {
  title: string
  note: string
  description?: string
  memory_type?: 'note' | 'link' | 'file' | 'thought' | 'quote' | 'insight'
  importance_level?: 'low' | 'medium' | 'high'
  category_id?: string
  tags?: string[]
  is_highlight?: boolean
}

// Strategy form types (from lib/types/strategy.ts)
export interface CreateInitiativeForm {
  title: string
  description: string
  outcome: string
  themes: string[]
  priority: 'low' | 'medium' | 'high'
  deadline?: string
  status: 'active' | 'on_hold' | 'completed' | 'cancelled'
}

export interface StrategyReflectionForm {
  date: string
  reflection: string
  insights: string[]
  challenges: string[]
  achievements: string[]
  next_actions: string[]
}

export interface TaskDelegationForm {
  task_id: string
  agent_id: string
  delegation_note?: string
  expected_outcome: string
  deadline?: string
}

// Season/Episode form types
export interface CreateSeasonForm {
  title: string
  intention?: string
  theme: 'spring' | 'summer' | 'autumn' | 'winter'
  start_date?: string
  end_date?: string
}

export interface CreateEpisodeForm {
  title: string
  description?: string
  season_id: string
  mood?: string
  location?: string
}