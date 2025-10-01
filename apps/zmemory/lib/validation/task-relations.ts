import { z } from 'zod';

/**
 * Task relation types
 */
export const TaskRelationTypeEnum = z.enum(['subtask', 'related', 'dependency', 'blocked_by'], {
  errorMap: () => ({ message: '关系类型不正确' })
});

/**
 * Validation schema for creating a task relation
 */
export const CreateTaskRelationSchema = z.object({
  parent_task_id: z.string().uuid('父任务ID格式不正确'),
  child_task_id: z.string().uuid('子任务ID格式不正确'),
  relation_type: TaskRelationTypeEnum
});

/**
 * Validation schema for task relation query parameters
 */
export const TaskRelationQuerySchema = z.object({
  task_id: z.string().uuid().optional(),
  relation_type: TaskRelationTypeEnum.optional(),
  parent_task_id: z.string().uuid().optional(),
  child_task_id: z.string().uuid().optional(),
  limit: z.string().optional().transform(v => v ? parseInt(v, 10) : undefined),
  offset: z.string().optional().transform(v => v ? parseInt(v, 10) : undefined)
});

export type CreateTaskRelationInput = z.infer<typeof CreateTaskRelationSchema>;
export type TaskRelationQueryParams = z.infer<typeof TaskRelationQuerySchema>;
