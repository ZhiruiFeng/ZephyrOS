/**
 * Focus Feature - Type Definitions
 * 
 * This module defines all types and interfaces used by the Focus feature,
 * including work mode, activity focus, and memory focus functionality.
 */

import type { TaskMemory, TaskContent } from '@/lib/api'
import type { Category } from '@/types/domain/task'

/**
 * View modes for the focus feature
 */
export type FocusViewMode = 'kanban' | 'work'

/**
 * Task view modes for filtering
 */
export type TaskViewMode = 'current' | 'backlog'

/**
 * Extended task type with category information
 */
export interface TaskWithCategory extends TaskMemory {
  category?: Category
  category_id?: string
}

/**
 * Task information for editing
 */
export interface TaskInfo {
  title: string
  description: string
  status: TaskContent['status']
  priority: TaskContent['priority']
  progress: number
  due_date: string
  estimated_duration: number
  assignee: string
  tags: string[]
}

/**
 * Work mode state interface
 */
export interface WorkModeState {
  // Main task state
  selectedTask: TaskWithCategory | null
  selectedSubtask: TaskMemory | null
  expandedCategories: Set<string>
  notes: string
  isSaving: boolean
  originalNotes: string
  viewMode: TaskViewMode
  
  // UI state
  showTaskInfo: boolean
  showSubtasks: boolean
  editingTaskInfo: boolean
  sidebarVisible: boolean
  mobileSidebarOpen: boolean
  taskInfo: TaskInfo
  expandedDescriptions: Set<string>
  
  // Memory anchoring
  showMemories: boolean
  memoryModalOpen: boolean
  
  // Energy review
  energyReviewOpen: boolean
  energyReviewEntry: any
  
  // Conversation sidebar
  conversationOpen: boolean
  conversationMinimized: boolean
  conversationWidth: number
}

/**
 * Conversation message type for work mode chat
 */
export interface ConversationMessage {
  id: string
  type: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  agent?: string
}

/**
 * Grouped tasks structure
 */
export interface GroupedTasks {
  grouped: Record<string, TaskWithCategory[]>
  uncategorized: TaskWithCategory[]
}

/**
 * Task operations interface
 */
export interface TaskOperations {
  handleTaskSelect: (task: TaskWithCategory) => void
  handleSubtaskSelect: (subtask: TaskMemory) => void
  handleSaveNotes: () => Promise<void>
  handleSaveTaskInfo: () => Promise<void>
  addTag: (tag: string) => Promise<void>
  removeTag: (tag: string) => Promise<void>
}

/**
 * Focus page props
 */
export interface FocusPageProps {
  initialView?: FocusViewMode
}

/**
 * Work mode view props
 */
export interface WorkModeViewProps {
  taskId?: string
  subtaskId?: string
  returnTo?: string
  from?: string
}

/**
 * Activity focus view props
 */
export interface ActivityFocusViewProps {
  activityId?: string
}

/**
 * Memory focus view props
 */
export interface MemoryFocusViewProps {
  memoryId?: string
}