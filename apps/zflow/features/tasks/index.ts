// =====================================================
// Tasks Feature - Public API
// =====================================================

// Main components
export { default as TasksHome } from './containers/TasksHome'

// View components
export { default as CurrentView } from './components/views/CurrentView'
export { default as FutureView } from './components/views/FutureView'
export { default as ArchiveView } from './components/views/ArchiveView'

// Form components
export { default as TaskForm } from './forms/TaskForm'
export type { TaskFormValue } from './forms/TaskForm'

// API
export { tasksApi, subtasksApi } from './api/tasks-api'
export type { 
  TaskMemory, 
  TaskContent, 
  CreateTaskRequest, 
  UpdateTaskRequest 
} from './api/tasks-api'

// Hooks
export { useTaskFiltering } from './hooks/useTaskFiltering'
export type { ViewKey } from './hooks/useTaskFiltering'

// Types
export type { 
  DisplayMode,
  TaskViewProps,
  CurrentViewProps,
  FutureViewProps,
  ArchiveViewProps
} from './types/tasks'
