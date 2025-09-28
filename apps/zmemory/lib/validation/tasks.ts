import { z } from 'zod';
import { isoDateTime, paginationSchema, sortSchema, dateRangeSchema, tagsQuerySchema, searchSchema, uuidSchema, nullableUuidSchema } from './common';

// Task status enumeration
export const TaskStatus = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  ON_HOLD: 'on_hold'
} as const;

// Task priority enumeration
export const TaskPriority = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent'
} as const;

// Task category enumeration
export const TaskCategory = {
  WORK: 'work',
  PERSONAL: 'personal',
  PROJECT: 'project',
  MEETING: 'meeting',
  LEARNING: 'learning',
  MAINTENANCE: 'maintenance',
  OTHER: 'other'
} as const;

// Subtasks behavior enumerations
export const CompletionBehavior = {
  MANUAL: 'manual',
  AUTO_WHEN_SUBTASKS_COMPLETE: 'auto_when_subtasks_complete'
} as const;

export const ProgressCalculation = {
  MANUAL: 'manual',
  AVERAGE_SUBTASKS: 'average_subtasks',
  WEIGHTED_SUBTASKS: 'weighted_subtasks'
} as const;

// Task status values as array for zod enum
const taskStatusValues = Object.values(TaskStatus);
const taskPriorityValues = Object.values(TaskPriority);
const taskCategoryValues = Object.values(TaskCategory);
const completionBehaviorValues = Object.values(CompletionBehavior);
const progressCalculationValues = Object.values(ProgressCalculation);

// Zod schemas for validation
export const TaskContentSchema = z.object({
  title: z.string().min(1, 'Task title is required').max(200, 'Title too long'),
  description: z.string().optional(),
  status: z.enum(taskStatusValues as [string, ...string[]]),
  priority: z.enum(taskPriorityValues as [string, ...string[]]),
  category: z.enum(taskCategoryValues as [string, ...string[]]).optional(),
  category_id: z.string().optional(),
  due_date: isoDateTime.optional(),
  estimated_duration: z.number().positive().optional(), // minutes
  progress: z.number().min(0).max(100).default(0),
  assignee: z.string().optional(),
  dependencies: z.array(z.string()).optional(), // Array of task IDs
  subtasks: z.array(z.string()).optional(), // Array of subtask IDs
  notes: z.string().optional(),
  completion_date: isoDateTime.optional(),

  // Subtasks hierarchy fields
  parent_task_id: nullableUuidSchema.optional(),
  subtask_order: z.number().int().min(0).default(0),
  completion_behavior: z.enum(completionBehaviorValues as [string, ...string[]]).default(CompletionBehavior.MANUAL),
  progress_calculation: z.enum(progressCalculationValues as [string, ...string[]]).default(ProgressCalculation.MANUAL)
});

export const CreateTaskSchema = z.object({
  type: z.literal('task'),
  content: TaskContentSchema,
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional()
});

export const UpdateTaskSchema = z.object({
  type: z.literal('task').optional(),
  content: TaskContentSchema.partial().optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional()
});

export const TaskQuerySchema = z.object({
  status: z.enum(taskStatusValues as [string, ...string[]]).optional(),
  priority: z.enum(taskPriorityValues as [string, ...string[]]).optional(),
  category: z.enum(taskCategoryValues as [string, ...string[]]).optional(),
  assignee: z.string().optional(),
  tags: tagsQuerySchema, // Comma-separated tags
  search: searchSchema, // Search in title and description
  due_before: isoDateTime.optional(),
  due_after: isoDateTime.optional(),
  ...dateRangeSchema,
  timezone: z.string().optional().describe('Timezone for date parameters (e.g., "America/New_York", "Asia/Shanghai"). Defaults to UTC if not provided.'),

  // Subtasks filtering
  parent_task_id: nullableUuidSchema.optional(), // Filter by parent task
  include_subtasks: z.enum(['true', 'false']).transform(val => val === 'true').default('true'),
  hierarchy_level: z.string().regex(/^\d+$/).transform(Number).optional(), // Filter by hierarchy level
  root_tasks_only: z.enum(['true', 'false']).transform(val => val === 'true').default('false'), // Show only root tasks

  ...paginationSchema,
  sort_by: z.enum(['created_at', 'updated_at', 'due_date', 'priority', 'title', 'hierarchy_level', 'subtask_order']).default('created_at'),
  ...sortSchema
});

// TypeScript types
export type TaskStatus = typeof TaskStatus[keyof typeof TaskStatus];
export type TaskPriority = typeof TaskPriority[keyof typeof TaskPriority];
export type TaskCategory = typeof TaskCategory[keyof typeof TaskCategory];
export type CompletionBehavior = typeof CompletionBehavior[keyof typeof CompletionBehavior];
export type ProgressCalculation = typeof ProgressCalculation[keyof typeof ProgressCalculation];
export type TaskContent = z.infer<typeof TaskContentSchema>;
export type CreateTaskRequest = z.infer<typeof CreateTaskSchema>;
export type UpdateTaskRequest = z.infer<typeof UpdateTaskSchema>;
export type TaskQuery = z.infer<typeof TaskQuerySchema>;

// Task memory interface with hierarchy support
export interface TaskMemory {
  id: string;
  type: 'task';
  content: TaskContent;
  tags: string[];
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;

  // Hierarchy metadata (populated from database fields)
  hierarchy_level?: number;
  hierarchy_path?: string;
  subtask_count?: number;
  completed_subtask_count?: number;

  // Optional populated subtasks for tree responses
  subtasks?: TaskMemory[];
}

// Subtask tree node interface
export interface SubtaskTreeNode {
  task_id: string;
  parent_task_id: string | null;
  title: string;
  status: TaskStatus;
  progress: number;
  hierarchy_level: number;
  subtask_order: number;
}

// Create subtask request
export interface CreateSubtaskRequest {
  parent_task_id: string;
  task_data: CreateTaskRequest;
  subtask_order?: number;
}

// Task statistics interface
export interface TaskStats {
  total: number;
  by_status: Record<TaskStatus, number>;
  by_priority: Record<TaskPriority, number>;
  by_category: Record<TaskCategory, number>;
  overdue: number;
  due_today: number;
  due_this_week: number;
  completion_rate: number;
  average_completion_time: number; // in days
}