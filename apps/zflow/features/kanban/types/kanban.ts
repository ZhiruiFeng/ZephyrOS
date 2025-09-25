// =====================================================
// Kanban Feature Types
// =====================================================

import type { TaskContent, TaskMemory } from '@/lib/api/api-base'

// Re-export core task types for convenience
export type { TaskContent, TaskMemory }

// =====================================================
// Kanban-specific Types
// =====================================================

export type StatusKey = TaskContent['status']

export interface KanbanColumn {
  key: StatusKey
  title: string
  hint?: string
}

export interface KanbanTask extends TaskMemory {
  // Enhanced task properties for kanban view
  isDragging?: boolean
  isOverdue?: boolean
  displayDate?: string
  formattedTags?: string
}

// =====================================================
// Kanban State Types
// =====================================================

export interface KanbanFilters {
  search: string
  filterPriority: string | null
  hideCompleted: boolean
  selectedCategory: string | null
  sortMode: string
}

export interface KanbanDragState {
  draggingId: string | null
  touchDraggingId: string | null
  touchDragTitle: string
  touchPos: { x: number; y: number } | null
  hoveredStatus: StatusKey | null
  isLongPressActive: boolean
}

export interface KanbanUIState {
  editorOpen: boolean
  selectedTask: any | null
  showMobileFilters: boolean
  energyReviewOpen: boolean
  energyReviewEntry: any | null
}

// =====================================================
// Kanban Hook Return Types
// =====================================================

export interface UseKanbanTasksReturn {
  tasks: KanbanTask[]
  isLoading: boolean
  error: any
  refetch: () => void
}

export interface UseKanbanColumnsReturn {
  columns: KanbanColumn[]
  getTasksByStatus: (status: StatusKey) => KanbanTask[]
  filteredTasks: KanbanTask[]
}

export interface UseKanbanDragReturn {
  dragState: KanbanDragState
  startDrag: (taskId: string) => void
  endDrag: () => void
  updateDragPosition: (position: { x: number; y: number }) => void
  setHoveredStatus: (status: StatusKey | null) => void
  handleTaskDrop: (taskId: string, newStatus: StatusKey) => Promise<void>
}

export interface UseKanbanFiltersReturn {
  filters: KanbanFilters
  setSearch: (search: string) => void
  setFilterPriority: (priority: string | null) => void
  setHideCompleted: (hide: boolean) => void
  setSelectedCategory: (category: string | null) => void
  setSortMode: (mode: string) => void
  clearFilters: () => void
}

// =====================================================
// Kanban Component Props
// =====================================================

export interface KanbanBoardProps {
  tasks: KanbanTask[]
  columns: KanbanColumn[]
  isLoading?: boolean
  onTaskDrop: (taskId: string, newStatus: StatusKey) => Promise<void>
  onTaskSelect: (task: KanbanTask) => void
  onTaskEdit: (task: KanbanTask) => void
  onTaskDelete: (taskId: string) => Promise<void>
}

export interface KanbanColumnProps {
  column: KanbanColumn
  tasks: KanbanTask[]
  onTaskDrop: (taskId: string) => Promise<void>
  onTaskSelect: (task: KanbanTask) => void
  onTaskEdit: (task: KanbanTask) => void
  onTaskDelete: (taskId: string) => Promise<void>
  isDragOver?: boolean
}

export interface KanbanTaskCardProps {
  task: KanbanTask
  onSelect: () => void
  onEdit: () => void
  onDelete: () => Promise<void>
  isDragging?: boolean
  isDragOver?: boolean
}

// =====================================================
// Kanban Constants
// =====================================================

export const KANBAN_COLUMN_CONFIG = {
  pending: {
    key: 'pending' as const,
    title: 'Todo',
    hint: 'Tasks to be started'
  },
  in_progress: {
    key: 'in_progress' as const,
    title: 'In Progress',
    hint: 'Currently active tasks'
  },
  completed: {
    key: 'completed' as const,
    title: 'Done (24h)',
    hint: 'Recently completed tasks'
  }
}

export const KANBAN_FILTER_OPTIONS = {
  priorities: [
    { value: 'high', label: 'High Priority' },
    { value: 'medium', label: 'Medium Priority' },
    { value: 'low', label: 'Low Priority' }
  ],
  sortModes: [
    { value: 'created', label: 'Created Date' },
    { value: 'due', label: 'Due Date' },
    { value: 'priority', label: 'Priority' },
    { value: 'title', label: 'Title' }
  ]
}

// =====================================================
// Kanban Utility Types
// =====================================================

export interface KanbanTaskUpdate {
  id: string
  status?: StatusKey
  priority?: TaskContent['priority']
  due_date?: string
  progress?: number
  notes?: string
  tags?: string[]
}

export interface KanbanStats {
  totalTasks: number
  pendingTasks: number
  inProgressTasks: number
  completedTasks: number
  overdueTasks: number
  averageProgress: number
}
