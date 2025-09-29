export { default as CategorySelector } from './CategorySelector'
export { default as LanguageSelector } from './LanguageSelector'

// Task Selector Components (Legacy)
export * from './TaskSelector'

// New Shared Selector Components
// Task Selector Components
export { TaskSelectorModal } from './TaskSelectorModal'
export { TaskSelectorDropdown } from './TaskSelectorDropdown'
export { useTaskSelector, type TaskSelectorConfig } from './useTaskSelector'

// Activity Selector Components
export { ActivitySelectorModal } from './ActivitySelectorModal'
export { ActivitySelectorDropdown } from './ActivitySelectorDropdown'
export { useActivitySelector, type ActivitySelectorConfig } from './useActivitySelector'

// Memory Selector Components
export { MemorySelectorModal } from './MemorySelectorModal'
export { MemorySelectorDropdown } from './MemorySelectorDropdown'
export { useMemorySelector, type MemorySelectorConfig } from './useMemorySelector'

// Unified Timeline Item Selector
export {
  TimelineItemSelector,
  type TimelineItemType,
  type TimelineItem,
  type TimelineItemSelectorConfig,
  type TimelineItemSelectorProps
} from './TimelineItemSelector'

// Utility functions
export {
  getTaskStatusColor,
  getTaskPriorityColor
} from './useTaskSelector'

export {
  getActivitySelectorStatusColor,
  getActivitySelectorTypeColor,
  getActivitySelectorTypeIcon
} from './useActivitySelector'

export {
  getMemorySelectorStatusColor,
  getMemorySelectorTypeColor,
  getMemorySelectorTypeIcon,
  getMemorySelectorImportanceColor
} from './useMemorySelector'