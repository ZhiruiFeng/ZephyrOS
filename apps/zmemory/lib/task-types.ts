import { z } from 'zod';

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

// Zod schemas for validation
export const TaskContentSchema = z.object({
  title: z.string().min(1, 'Task title is required').max(200, 'Title too long'),
  description: z.string().optional(),
  status: z.enum([
    TaskStatus.PENDING,
    TaskStatus.IN_PROGRESS,
    TaskStatus.COMPLETED,
    TaskStatus.CANCELLED,
    TaskStatus.ON_HOLD
  ]),
  priority: z.enum([
    TaskPriority.LOW,
    TaskPriority.MEDIUM,
    TaskPriority.HIGH,
    TaskPriority.URGENT
  ]),
  category: z.enum([
    TaskCategory.WORK,
    TaskCategory.PERSONAL,
    TaskCategory.PROJECT,
    TaskCategory.MEETING,
    TaskCategory.LEARNING,
    TaskCategory.MAINTENANCE,
    TaskCategory.OTHER
  ]).optional(),
  due_date: z.string().datetime().optional(),
  estimated_duration: z.number().positive().optional(), // minutes
  progress: z.number().min(0).max(100).default(0),
  assignee: z.string().optional(),
  dependencies: z.array(z.string()).optional(), // Array of task IDs
  subtasks: z.array(z.string()).optional(), // Array of subtask IDs
  notes: z.string().optional(),
  completion_date: z.string().datetime().optional()
});

export const CreateTaskSchema = z.object({
  type: z.literal('task'),
  content: TaskContentSchema,
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional()
});

export const UpdateTaskSchema = z.object({
  type: z.literal('task').optional(),
  content: TaskContentSchema.partial(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional()
});

export const TaskQuerySchema = z.object({
  status: z.enum([
    TaskStatus.PENDING,
    TaskStatus.IN_PROGRESS,
    TaskStatus.COMPLETED,
    TaskStatus.CANCELLED,
    TaskStatus.ON_HOLD
  ]).optional(),
  priority: z.enum([
    TaskPriority.LOW,
    TaskPriority.MEDIUM,
    TaskPriority.HIGH,
    TaskPriority.URGENT
  ]).optional(),
  category: z.enum([
    TaskCategory.WORK,
    TaskCategory.PERSONAL,
    TaskCategory.PROJECT,
    TaskCategory.MEETING,
    TaskCategory.LEARNING,
    TaskCategory.MAINTENANCE,
    TaskCategory.OTHER
  ]).optional(),
  assignee: z.string().optional(),
  tags: z.string().optional(), // Comma-separated tags
  search: z.string().optional(), // Search in title and description
  due_before: z.string().datetime().optional(),
  due_after: z.string().datetime().optional(),
  created_before: z.string().datetime().optional(),
  created_after: z.string().datetime().optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).default('50'),
  offset: z.string().regex(/^\d+$/).transform(Number).default('0'),
  sort_by: z.enum(['created_at', 'updated_at', 'due_date', 'priority', 'title']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc')
});

// TypeScript types
export type TaskStatus = typeof TaskStatus[keyof typeof TaskStatus];
export type TaskPriority = typeof TaskPriority[keyof typeof TaskPriority];
export type TaskCategory = typeof TaskCategory[keyof typeof TaskCategory];
export type TaskContent = z.infer<typeof TaskContentSchema>;
export type CreateTaskRequest = z.infer<typeof CreateTaskSchema>;
export type UpdateTaskRequest = z.infer<typeof UpdateTaskSchema>;
export type TaskQuery = z.infer<typeof TaskQuerySchema>;

// Task memory interface
export interface TaskMemory {
  id: string;
  type: 'task';
  content: TaskContent;
  tags: string[];
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
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