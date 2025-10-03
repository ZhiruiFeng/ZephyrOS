import { z } from 'zod';
import { isoDateTime, paginationSchema, sortSchema, dateRangeSchema, searchSchema, uuidSchema } from './common';

// AI task types
export const aiTaskTypes = [
  'generation', 'analysis', 'summarization', 'classification',
  'translation', 'conversation', 'coding', 'reasoning', 'other'
] as const;

// AI task statuses
export const aiTaskStatuses = ['pending', 'assigned', 'in_progress', 'paused', 'completed', 'failed', 'cancelled'] as const;

// AI task priorities
export const aiTaskPriorities = ['low', 'medium', 'high', 'urgent'] as const;

// AI task creation schema
export const AITaskCreateSchema = z.object({
  // Core fields aligned with existing client payload
  objective: z.string().min(1, 'Objective is required'),
  deliverables: z.string().optional(),
  context: z.string().optional(),
  acceptance_criteria: z.string().optional(),
  task_type: z.enum(aiTaskTypes),
  priority: z.enum(aiTaskPriorities).optional(),
  status: z.enum(aiTaskStatuses).optional(),
  mode: z.enum(['plan_only', 'dry_run', 'execute']).optional(),
  dependencies: z.array(z.string()).optional(),
  guardrails: z.object({
    costCapUSD: z.number().nullable().optional(),
    timeCapMin: z.number().nullable().optional(),
    requiresHumanApproval: z.boolean().optional(),
    dataScopes: z.array(z.string()).optional()
  }).optional(),
  metadata: z.record(z.any()).optional(),

  // Legacy/new fields (kept optional for backward compatibility)
  title: z.string().optional(),
  description: z.string().optional(),

  // AI configuration
  model: z.string().optional(),
  provider: z.string().optional(),
  prompt: z.string().optional(),
  system_prompt: z.string().optional(),

  // Parameters
  max_tokens: z.number().int().positive().optional(),
  temperature: z.number().min(0).max(2).optional(),
  top_p: z.number().min(0).max(1).optional(),

  // Input/Output
  input_data: z.record(z.any()).optional(),
  expected_output_format: z.string().optional(),

  // Execution scheduling
  deadline: isoDateTime.optional(),
  retry_count: z.number().int().min(0).optional(),
  max_retries: z.number().int().min(0).optional(),

  // Related entities
  task_id: uuidSchema,
  agent_id: uuidSchema,

  // Additional organisation
  tags: z.array(z.string()).optional(),
  category: z.string().optional(),

  // Estimates
  estimated_cost: z.number().positive().optional(),
  estimated_cost_usd: z.number().positive().optional(),
  estimated_duration_seconds: z.number().int().positive().optional(),
  estimated_duration_min: z.number().int().positive().optional(),

  // Executor workspace association
  is_local_task: z.boolean().optional(),
  executor_workspace_id: uuidSchema.nullable().optional(),
}).passthrough();

// AI task update schema
export const AITaskUpdateSchema = AITaskCreateSchema.partial();

// AI task query schema
export const AITasksQuerySchema = z.object({
  // Basic filters
  task_type: z.enum(aiTaskTypes).optional(),
  status: z.enum(aiTaskStatuses).optional(),
  priority: z.enum(aiTaskPriorities).optional(),

  // AI configuration filters
  model: z.string().optional(),
  provider: z.string().optional(),
  mode: z.enum(['plan_only', 'dry_run', 'execute']).optional(),

  // Assignment filters
  assigned_from: isoDateTime.optional(),
  assigned_to: isoDateTime.optional(),

  // Related items
  task_id: uuidSchema.optional(),
  agent_id: uuidSchema.optional(),
  parent_task_id: uuidSchema.optional(),
  related_memory_id: uuidSchema.optional(),
  related_conversation_id: uuidSchema.optional(),

  // Date filters
  deadline_after: isoDateTime.optional(),
  deadline_before: isoDateTime.optional(),
  due_from: isoDateTime.optional(),
  due_to: isoDateTime.optional(),

  // Organization
  category: z.string().optional(),
  tags: z.string().optional(), // comma-separated
  search: searchSchema,

  // Execution filters
  retry_count_min: z.string().optional().transform(v => v ? parseInt(v) : undefined).pipe(z.number().int().min(0).optional()),
  retry_count_max: z.string().optional().transform(v => v ? parseInt(v) : undefined).pipe(z.number().int().min(0).optional()),

  // Cost filters
  min_cost: z.string().optional().transform(v => v ? parseFloat(v) : undefined).pipe(z.number().positive().optional()),
  max_cost: z.string().optional().transform(v => v ? parseFloat(v) : undefined).pipe(z.number().positive().optional()),

  // Executor workspace filters
  is_local_task: z.string().optional().transform(v => v ? v === 'true' : undefined).pipe(z.boolean().optional()),
  executor_workspace_id: uuidSchema.optional(),

  // Date range filters
  ...dateRangeSchema,

  // Pagination and sorting
  ...paginationSchema,
  sort_by: z.enum([
    'created_at', 'updated_at', 'deadline', 'due_at',
    'priority', 'status', 'objective', 'estimated_cost', 'assigned_at'
  ]).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
});

// AI task execution result schema
export const AITaskResultSchema = z.object({
  success: z.boolean(),
  output_data: z.record(z.any()).optional(),
  error_message: z.string().optional(),
  tokens_used: z.number().int().min(0).optional(),
  actual_cost: z.number().positive().optional(),
  execution_time_seconds: z.number().positive().optional(),
  model_used: z.string().optional(),
  provider_used: z.string().optional(),
});

// Type exports
export type AITaskCreateBody = z.infer<typeof AITaskCreateSchema>;
export type AITaskUpdateBody = z.infer<typeof AITaskUpdateSchema>;
export type AITasksQuery = z.infer<typeof AITasksQuerySchema>;
export type AITaskResult = z.infer<typeof AITaskResultSchema>;
