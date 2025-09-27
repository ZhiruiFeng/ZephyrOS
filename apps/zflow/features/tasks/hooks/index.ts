// =====================================================
// Task Hooks - Barrel Export
// =====================================================

// Base Task Operations (CRUD)
export {
  useTasks,
  useTask,
  useCreateTask,
  useUpdateTask,
  useDeleteTask
} from './useBaseTasks'

// AI Task Synchronization
export {
  useAITaskSync,
  getAITaskProgress,
  cancelAITask,
  pauseAITask,
  resumeAITask
} from './useAITaskSync'

// Subtask Management
export {
  useSubtasks,
  useSubtaskActions,
  type SubtaskTreeData
} from './useSubtasks'

// Task Filtering and Views
export {
  useTaskFiltering,
  type ViewKey
} from './useTaskFiltering'