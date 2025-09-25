// =====================================================
// Kanban Feature - Public API
// =====================================================

// Kanban Hooks
export { 
  useKanbanTasks, 
  useKanbanColumns, 
  useKanbanDrag, 
  useKanbanFilters 
} from './hooks'

// Kanban API
export { kanbanApi } from './api/kanban-api'

// Kanban Types
export type {
  StatusKey,
  KanbanColumn,
  KanbanTask,
  KanbanFilters,
  KanbanDragState,
  KanbanUIState,
  UseKanbanTasksReturn,
  UseKanbanColumnsReturn,
  UseKanbanDragReturn,
  UseKanbanFiltersReturn,
  KanbanBoardProps,
  KanbanColumnProps,
  KanbanTaskCardProps,
  KanbanTaskUpdate,
  KanbanStats
} from './types/kanban'

// Re-export core task types
export type { TaskContent, TaskMemory } from './types/kanban'

// Kanban Constants
export { KANBAN_COLUMN_CONFIG, KANBAN_FILTER_OPTIONS } from './types/kanban'

// Kanban Components
export { KanbanPage } from './KanbanPage'
