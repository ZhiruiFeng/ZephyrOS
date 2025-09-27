// =====================================================
// ZFlow Shared Hooks - Barrel Export
// =====================================================

// Task management hooks
export { useTaskOperations } from './useTaskOperations'
export { useTaskActions } from './useTaskActions'

// Activity management hooks
export { useActivities, useActivity, useCreateActivity, useUpdateActivity, useDeleteActivity } from './useActivities'
export { useTimer } from './useTimer'
export { useAutoSave } from './useAutoSave'

// UI hooks
export { useCategories } from './useCategories'
export { useCelebration } from './useCelebration'
export { useModalState } from './useModalState'

// Feature-specific hooks have been moved to their respective features:
// - Task hooks: @/features/tasks/hooks  
// - Memory hooks: @/features/memory/hooks
// - Activity hooks: @/features/activities/hooks
// - Speech/Media hooks: @/features/speech/hooks