import { z } from 'zod';
import { isoDateTime, paginationSchema, sortSchema, dateRangeSchema, searchSchema, uuidSchema } from './common';

// Time entry types
export const timeEntryTypes = [
  'work', 'break', 'meeting', 'focus', 'admin', 'learning', 'travel', 'other'
] as const;

// Time entry statuses
export const timeEntryStatuses = ['running', 'stopped', 'paused'] as const;

// Time entry creation schema
export const TimeEntryCreateSchema = z.object({
  // Related items
  task_id: uuidSchema.optional(),
  activity_id: uuidSchema.optional(),
  timeline_item_id: uuidSchema.optional(),

  // Time tracking
  started_at: isoDateTime.optional(),
  start_at: isoDateTime.optional(), // Alternative field name
  ended_at: isoDateTime.optional(),
  end_at: isoDateTime.optional(), // Alternative field name
  duration_seconds: z.number().int().positive().optional(),

  // Entry details
  entry_type: z.enum(timeEntryTypes).default('work'),
  status: z.enum(timeEntryStatuses).default('stopped'),

  // Content
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().optional(),
  notes: z.string().optional(),
  note: z.string().optional(), // Alternative field name

  // Location and context
  location: z.string().optional(),
  device: z.string().optional(),

  // Productivity tracking
  productivity_rating: z.number().int().min(1).max(10).optional(),
  focus_rating: z.number().int().min(1).max(10).optional(),
  energy_level: z.number().int().min(1).max(10).optional(),
  interruptions: z.number().int().min(0).optional(),

  // Organization
  tags: z.array(z.string()).default([]),
  billable: z.boolean().default(false),
  hourly_rate: z.number().positive().optional(),

  // Auto-tracking data
  auto_tracked: z.boolean().default(false),
  source: z.enum(['manual', 'timer', 'import', 'sync']).default('manual'),
  external_id: z.string().optional(),
}).refine(data => {
  // Ensure either started_at or start_at is provided
  return data.started_at || data.start_at;
}, {
  message: "Either started_at or start_at must be provided",
  path: ["start_at"]
}).transform(data => {
  // Normalize start_at and end_at fields
  const normalized = { ...data };
  if (data.started_at && !data.start_at) {
    normalized.start_at = data.started_at;
  }
  if (data.ended_at && !data.end_at) {
    normalized.end_at = data.ended_at;
  }
  if (data.notes && !data.note) {
    normalized.note = data.notes;
  }
  return normalized;
});

// Time entry update schema - define separately since create schema has transforms
export const TimeEntryUpdateSchema = z.object({
  // Related items
  task_id: uuidSchema.optional(),
  activity_id: uuidSchema.optional(),
  timeline_item_id: uuidSchema.optional(),

  // Time tracking
  started_at: isoDateTime.optional(),
  start_at: isoDateTime.optional(),
  ended_at: isoDateTime.optional(),
  end_at: isoDateTime.optional(),
  duration_seconds: z.number().int().positive().optional(),

  // Entry details
  entry_type: z.enum(timeEntryTypes).optional(),
  status: z.enum(timeEntryStatuses).optional(),

  // Content
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
  note: z.string().optional(),

  // Location and context
  location: z.string().optional(),
  device: z.string().optional(),

  // Productivity tracking
  productivity_rating: z.number().int().min(1).max(10).optional(),
  focus_rating: z.number().int().min(1).max(10).optional(),
  energy_level: z.number().int().min(1).max(10).optional(),
  interruptions: z.number().int().min(0).optional(),

  // Organization
  tags: z.array(z.string()).optional(),
  billable: z.boolean().optional(),
  hourly_rate: z.number().positive().optional(),

  // Auto-tracking data
  auto_tracked: z.boolean().optional(),
  source: z.enum(['manual', 'timer', 'import', 'sync']).optional(),
  external_id: z.string().optional(),
});

// Time entry query schema
export const TimeEntriesQuerySchema = z.object({
  // Related items
  task_id: uuidSchema.optional(),
  activity_id: uuidSchema.optional(),
  timeline_item_id: uuidSchema.optional(),

  // Entry filters
  entry_type: z.enum(timeEntryTypes).optional(),
  status: z.enum(timeEntryStatuses).optional(),
  billable: z.enum(['true', 'false']).transform(val => val === 'true').optional(),
  auto_tracked: z.enum(['true', 'false']).transform(val => val === 'true').optional(),
  source: z.enum(['manual', 'timer', 'import', 'sync']).optional(),

  // Date filters
  from: isoDateTime.optional(),
  to: isoDateTime.optional(),
  started_after: isoDateTime.optional(),
  started_before: isoDateTime.optional(),
  ended_after: isoDateTime.optional(),
  ended_before: isoDateTime.optional(),
  date: z.string().optional(), // Filter by specific date (YYYY-MM-DD)

  // Duration filters
  min_duration: z.string().transform(v => v ? parseInt(v) : undefined).pipe(z.number().int().positive().optional()),
  max_duration: z.string().transform(v => v ? parseInt(v) : undefined).pipe(z.number().int().positive().optional()),

  // Rating filters
  min_productivity: z.string().transform(v => v ? parseInt(v) : undefined).pipe(z.number().int().min(1).max(10).optional()),
  min_focus: z.string().transform(v => v ? parseInt(v) : undefined).pipe(z.number().int().min(1).max(10).optional()),
  min_energy: z.string().transform(v => v ? parseInt(v) : undefined).pipe(z.number().int().min(1).max(10).optional()),

  // Location and context
  location: z.string().optional(),
  device: z.string().optional(),

  // Organization
  tags: z.string().optional(), // comma-separated
  search: searchSchema,

  // Date range filters
  ...dateRangeSchema,

  // Pagination and sorting
  ...paginationSchema,
  sort_by: z.enum([
    'started_at', 'ended_at', 'created_at', 'updated_at',
    'duration_seconds', 'productivity_rating', 'focus_rating',
    'energy_level', 'title'
  ]).default('started_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
});

// Time entry statistics schema
export const TimeEntryStatsQuerySchema = z.object({
  // Date range for stats
  from: isoDateTime.optional(),
  to: isoDateTime.optional(),

  // Grouping options
  group_by: z.enum(['day', 'week', 'month', 'entry_type', 'task', 'activity']).default('day'),

  // Filters
  entry_type: z.enum(timeEntryTypes).optional(),
  task_id: uuidSchema.optional(),
  activity_id: uuidSchema.optional(),
  billable: z.enum(['true', 'false']).transform(val => val === 'true').optional(),
});

// Type exports
export type TimeEntryCreateBody = z.infer<typeof TimeEntryCreateSchema>;
export type TimeEntryUpdateBody = z.infer<typeof TimeEntryUpdateSchema>;
export type TimeEntriesQuery = z.infer<typeof TimeEntriesQuerySchema>;
export type TimeEntryStatsQuery = z.infer<typeof TimeEntryStatsQuerySchema>;