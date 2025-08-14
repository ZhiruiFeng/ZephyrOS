import { z } from 'zod';

// 记忆数据验证模式
export const MemorySchema = z.object({
  type: z.string().min(1, 'Type is required'),
  content: z.any(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
});

export const MemoryUpdateSchema = MemorySchema.partial();

// 查询参数验证模式
export const QueryParamsSchema = z.object({
  type: z.string().optional(),
  limit: z.string().optional().transform(val => parseInt(val || '50')),
  offset: z.string().optional().transform(val => parseInt(val || '0')),
});

export type MemoryData = z.infer<typeof MemorySchema>;
export type MemoryUpdateData = z.infer<typeof MemoryUpdateSchema>;
export type QueryParams = z.infer<typeof QueryParamsSchema>; 

// ===== Time Tracking Schemas =====
// ISO datetime string guard
const isoDateTime = z.string().datetime({ offset: true, message: 'Invalid ISO datetime' });

// Start timer
export const TimerStartSchema = z.object({
  autoSwitch: z.boolean().optional().default(false),
});

// Stop timer
export const TimerStopSchema = z.object({
  overrideEndAt: isoDateTime.optional(),
});

// Create manual time entry (for a task)
export const TimeEntryCreateSchema = z.object({
  start_at: isoDateTime,
  end_at: isoDateTime.optional(),
  note: z.string().max(2000).optional(),
  source: z.literal('manual').optional(),
});

// Update a time entry
export const TimeEntryUpdateSchema = z.object({
  start_at: isoDateTime.optional(),
  end_at: isoDateTime.optional(),
  note: z.string().max(2000).optional(),
});

// Query time entries for a task
export const TimeEntriesQuerySchema = z.object({
  from: isoDateTime.optional(),
  to: isoDateTime.optional(),
  limit: z.string().optional().transform(v => parseInt(v || '50')),
  offset: z.string().optional().transform(v => parseInt(v || '0')),
});

export type TimerStartBody = z.infer<typeof TimerStartSchema>;
export type TimerStopBody = z.infer<typeof TimerStopSchema>;
export type TimeEntryCreateBody = z.infer<typeof TimeEntryCreateSchema>;
export type TimeEntryUpdateBody = z.infer<typeof TimeEntryUpdateSchema>;
export type TimeEntriesQuery = z.infer<typeof TimeEntriesQuerySchema>;