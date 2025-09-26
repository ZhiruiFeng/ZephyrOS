/**
 * =====================================================
 * Focus Feature - Public API
 * =====================================================
 * 
 * This feature provides comprehensive focus management including:
 * - Work mode for intensive task focus
 * - Activity focus for time-boxed sessions
 * - Memory focus for context-aware work
 * - Kanban view integration
 */

// Hooks (business logic)
export { useWorkModeState } from './hooks/useWorkModeState'
export { useTaskOperations } from './hooks/useTaskOperations'

// Types (domain models)
export type {
  FocusViewMode,
  TaskViewMode,
  TaskWithCategory,
  TaskInfo,
  WorkModeState,
  ConversationMessage,
  GroupedTasks,
  TaskOperations,
  FocusPageProps,
  WorkModeViewProps,
  ActivityFocusViewProps,
  MemoryFocusViewProps
} from './types/focus'

// Components
export { default as TaskSidebar } from './components/TaskSidebar'

// Page components
export { default as FocusPage } from './FocusPage'
