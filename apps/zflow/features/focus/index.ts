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
export { useFocusTaskOperations } from './hooks/useFocusTaskOperations'

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

// Work Mode Types
export type { Message } from './components/work-mode'

// Components
export { default as TaskSidebar } from './components/TaskSidebar'

// Work Mode Components
export {
  TaskSidebar as WorkModeTaskSidebar,
  WorkModeEditor,
  WorkModeEditorHeader,
  TaskInfoPanel,
  TaskHeader,
  ConversationPanel,
  ChatMessage,
  ChatInput,
  ConversationButton,
  ResizeHandle
} from './components/work-mode'

// Page components
export { default as FocusPage } from './FocusPage'
export { default as WorkModeView } from './WorkModeView'
export { default as ActivityFocusView } from './ActivityFocusView'
export { default as MemoryFocusView } from './MemoryFocusView'
