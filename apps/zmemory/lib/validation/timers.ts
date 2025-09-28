import { z } from 'zod';
import { isoDateTime, uuidSchema } from './common';

// Timer start schema
export const TimerStartSchema = z.object({
  // Optional custom start time (defaults to now)
  started_at: isoDateTime.optional(),

  // Timer behavior
  autoSwitch: z.boolean().optional().default(false),

  // Optional initial time entry data
  title: z.string().optional(),
  description: z.string().optional(),
  entry_type: z.enum(['work', 'break', 'meeting', 'focus', 'admin', 'learning', 'travel', 'other']).optional(),

  // Location and context
  location: z.string().optional(),
  notes: z.string().optional(),

  // Related items
  activity_id: uuidSchema.optional(),
  timeline_item_id: uuidSchema.optional(),

  // Organization
  tags: z.array(z.string()).optional(),
  billable: z.boolean().optional(),
});

// Timer stop schema
export const TimerStopSchema = z.object({
  // Optional custom end time (defaults to now)
  ended_at: isoDateTime.optional(),
  overrideEndAt: isoDateTime.optional(), // Alternative field name

  // Final time entry data
  title: z.string().optional(),
  description: z.string().optional(),
  notes: z.string().optional(),

  // Productivity tracking
  productivity_rating: z.number().int().min(1).max(10).optional(),
  focus_rating: z.number().int().min(1).max(10).optional(),
  energy_level: z.number().int().min(1).max(10).optional(),
  interruptions: z.number().int().min(0).optional(),

  // Organization
  tags: z.array(z.string()).optional(),
  billable: z.boolean().optional(),
  hourly_rate: z.number().positive().optional(),

  // Auto-save time entry
  save_time_entry: z.boolean().default(true),
});

// Timer status schema
export const TimerStatusSchema = z.object({
  is_running: z.boolean(),
  started_at: isoDateTime.optional(),
  elapsed_seconds: z.number().int().min(0).optional(),
  current_task_id: uuidSchema.optional(),
});

// Type exports
export type TimerStartBody = z.infer<typeof TimerStartSchema>;
export type TimerStopBody = z.infer<typeof TimerStopSchema>;
export type TimerStatus = z.infer<typeof TimerStatusSchema>;