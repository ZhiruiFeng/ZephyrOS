// =====================================================
// Unified Type System - Master Export
// =====================================================

// Domain types (core business logic)
export * from './domain/task'
export * from './domain/memory'
export * from './domain/agent'
export * from './domain/narrative'

// UI types (forms, hooks, props)
export * from './ui/forms'
export * from './ui/hooks'

// Shared utilities
export * from './shared/common'
export * from './shared/shared-tasks'
export * from './shared/shared-activities'
export * from './shared/shared-hooks'

// Re-export for convenience
export type {
  // Task domain
  Task,
  Category,
  TaskStatus,
  TaskPriority,
  TaskStats,
} from './domain/task'

export type {
  // Memory domain
  Memory,
  MemoryType,
  MemorySearchResult,
  WeeklyReview,
} from './domain/memory'

export type {
  // Agent domain
  Agent,
  AgentMessage,
  ChatSession,
  ToolCall,
} from './domain/agent'

export type {
  // Forms
  TaskForm,
  MemoryForm,
  CreateInitiativeForm,
} from './ui/forms'

export type {
  // Common utilities
  ID,
  Timestamp,
  ApiResponse,
  LoadingState,
} from './shared/common'