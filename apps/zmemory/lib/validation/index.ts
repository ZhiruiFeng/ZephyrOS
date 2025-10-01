// ===== Unified Validation Exports =====
// This file provides a central export point for all validation schemas
// and maintains backward compatibility with existing imports

// Re-export all validation schemas by domain
export * from './common';
export * from './memories';
export * from './tasks';
export * from './relations';
export * from './activities';
export * from './time-entries';
export * from './ai-tasks';
export * from './timers';
export * from './categories';
export * from './task-relations';

// Backward compatibility exports - these maintain the exact same export names
// that were previously available from lib/validators.ts and lib/task-types.ts

// From lib/validators.ts
export {
  MemoryCreateSchema,
  MemoryUpdateSchema,
  MemoriesQuerySchema,
  MemoryAnchorCreateSchema,
  MemoryAnchorUpdateSchema,
  MemoryAnchorsQuerySchema,
  MemoryEpisodeAnchorCreateSchema,
  MemoryEpisodeAnchorUpdateSchema,
  MemoryEpisodeAnchorsQuerySchema,
  AssetCreateSchema,
  AssetUpdateSchema,
  MemoryAssetCreateSchema,
  MemoryAssetUpdateSchema,
  AssetsQuerySchema,
  // Types
  type MemoryCreateBody,
  type MemoryUpdateBody,
  type MemoriesQuery,
  type MemoryAnchorCreateBody,
  type MemoryAnchorUpdateBody,
  type MemoryAnchorsQuery,
  type MemoryEpisodeAnchorCreateBody,
  type MemoryEpisodeAnchorUpdateBody,
  type MemoryEpisodeAnchorsQuery,
  type AssetCreateBody,
  type AssetUpdateBody,
  type AssetsQuery,
  type MemoryAssetCreateBody,
  type MemoryAssetUpdateBody
} from './memories';

// From lib/task-types.ts
export {
  TaskStatus,
  TaskPriority,
  TaskCategory,
  CompletionBehavior,
  ProgressCalculation,
  TaskContentSchema,
  CreateTaskSchema,
  UpdateTaskSchema,
  TaskQuerySchema,
  // Types
  type TaskStatus as TaskStatusType,
  type TaskPriority as TaskPriorityType,
  type TaskCategory as TaskCategoryType,
  type CompletionBehavior as CompletionBehaviorType,
  type ProgressCalculation as ProgressCalculationType,
  type TaskContent,
  type CreateTaskRequest,
  type UpdateTaskRequest,
  type TaskQuery,
  type TaskMemory,
  type SubtaskTreeNode,
  type CreateSubtaskRequest,
  type TaskStats
} from './tasks';

// Relations exports
export {
  PersonCreateSchema,
  PersonUpdateSchema,
  PersonQuerySchema,
  RelationshipProfileCreateSchema,
  RelationshipProfileUpdateSchema,
  TouchpointCreateSchema,
  TouchpointUpdateSchema,
  TouchpointQuerySchema,
  // Types
  type PersonCreateBody,
  type PersonUpdateBody,
  type PersonQuery,
  type RelationshipProfileCreateBody,
  type RelationshipProfileUpdateBody,
  type TouchpointCreateBody,
  type TouchpointUpdateBody,
  type TouchpointQuery
} from './relations';