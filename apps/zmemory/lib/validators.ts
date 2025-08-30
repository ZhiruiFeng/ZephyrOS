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

// Create time entry (for any timeline item)
export const TimeEntryCreateSchema = z.object({
  start_at: isoDateTime,
  end_at: isoDateTime.optional(),
  note: z.string().max(2000).optional(),
  source: z.enum(['manual', 'timer']).optional().default('manual'),
  // timeline_item_id is handled by the API route from the URL param
});

// Update a time entry
export const TimeEntryUpdateSchema = z.object({
  start_at: isoDateTime.optional(),
  end_at: isoDateTime.optional(),
  note: z.string().max(2000).optional(),
});

// Query time entries for any timeline item
export const TimeEntriesQuerySchema = z.object({
  from: isoDateTime.optional(),
  to: isoDateTime.optional(),
  limit: z.string().optional().transform(v => parseInt(v || '50')),
  offset: z.string().optional().transform(v => parseInt(v || '0')),
});

// ===== Timeline Items Schemas =====
// Timeline item types
const timelineItemTypes = ['task', 'activity', 'routine', 'habit', 'memory'] as const;
const timelineItemStatuses = ['active', 'inactive', 'completed', 'cancelled', 'archived'] as const;
const priorities = ['low', 'medium', 'high', 'urgent'] as const;

// Create timeline item
export const TimelineItemCreateSchema = z.object({
  type: z.enum(timelineItemTypes),
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  start_time: isoDateTime.optional(),
  end_time: isoDateTime.optional(),
  category_id: z.string().uuid().optional(),
  tags: z.array(z.string()).default([]),
  status: z.enum(timelineItemStatuses).default('active'),
  priority: z.enum(priorities).default('medium'),
  metadata: z.record(z.any()).default({}),
});

// Update timeline item
export const TimelineItemUpdateSchema = TimelineItemCreateSchema.partial().omit({ type: true });

// Query timeline items
export const TimelineItemsQuerySchema = z.object({
  type: z.enum(timelineItemTypes).optional(),
  status: z.enum(timelineItemStatuses).optional(),
  priority: z.enum(priorities).optional(),
  category_id: z.string().uuid().optional(),
  limit: z.string().optional().transform(v => parseInt(v || '50')),
  offset: z.string().optional().transform(v => parseInt(v || '0')),
  sort_by: z.enum(['created_at', 'updated_at', 'title', 'priority']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().optional(),
  tags: z.string().optional(), // comma-separated
});

export type TimerStartBody = z.infer<typeof TimerStartSchema>;
export type TimerStopBody = z.infer<typeof TimerStopSchema>;
export type TimeEntryCreateBody = z.infer<typeof TimeEntryCreateSchema>;
export type TimeEntryUpdateBody = z.infer<typeof TimeEntryUpdateSchema>;
export type TimeEntriesQuery = z.infer<typeof TimeEntriesQuerySchema>;
export type TimelineItemCreateBody = z.infer<typeof TimelineItemCreateSchema>;
export type TimelineItemUpdateBody = z.infer<typeof TimelineItemUpdateSchema>;
export type TimelineItemsQuery = z.infer<typeof TimelineItemsQuerySchema>;

// ===== Activities Schemas =====
// Activity types
const activityTypes = [
  'exercise', 'meditation', 'reading', 'music', 'socializing', 
  'gaming', 'walking', 'cooking', 'rest', 'creative', 'learning', 'other'
] as const;

const intensityLevels = ['low', 'moderate', 'high'] as const;
const activityStatuses = ['active', 'completed', 'cancelled'] as const;

// Mood/energy scale (1-10)
const scaleRating = z.number().int().min(1).max(10).optional();

// Create activity
export const ActivityCreateSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  activity_type: z.enum(activityTypes).default('other'),
  
  // Time fields
  started_at: isoDateTime.optional(),
  ended_at: isoDateTime.optional(),
  duration_minutes: z.number().int().positive().optional(),
  
  // Mood and energy tracking
  mood_before: scaleRating,
  mood_after: scaleRating,
  energy_before: scaleRating,
  energy_after: scaleRating,
  
  // Experience tracking
  satisfaction_level: scaleRating,
  intensity_level: z.enum(intensityLevels).default('moderate'),
  
  // Context
  location: z.string().optional(),
  weather: z.string().optional(),
  companions: z.array(z.string()).default([]),
  
  // Reflection
  notes: z.string().optional(),
  insights: z.string().optional(),
  gratitude: z.string().optional(),
  
  // Organization
  category_id: z.string().uuid().optional(),
  tags: z.array(z.string()).default([]),
  status: z.enum(activityStatuses).default('active'),
});

// Update activity
export const ActivityUpdateSchema = ActivityCreateSchema.partial();

// Query activities
export const ActivitiesQuerySchema = z.object({
  activity_type: z.enum(activityTypes).optional(),
  status: z.enum(activityStatuses).optional(),
  intensity_level: z.enum(intensityLevels).optional(),
  category_id: z.string().uuid().optional(),
  location: z.string().optional(),
  
  // Date range
  from: isoDateTime.optional(),
  to: isoDateTime.optional(),
  
  // Rating filters
  min_satisfaction: z.string().optional().transform(v => v ? parseInt(v) : undefined),
  min_mood_after: z.string().optional().transform(v => v ? parseInt(v) : undefined),
  
  // Pagination
  limit: z.string().optional().transform(v => parseInt(v || '50')),
  offset: z.string().optional().transform(v => parseInt(v || '0')),
  
  // Sorting
  sort_by: z.enum(['created_at', 'started_at', 'satisfaction_level', 'mood_after', 'title']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
  
  // Search
  search: z.string().optional(),
  tags: z.string().optional(), // comma-separated
});

export type ActivityCreateBody = z.infer<typeof ActivityCreateSchema>;
export type ActivityUpdateBody = z.infer<typeof ActivityUpdateSchema>;
export type ActivitiesQuery = z.infer<typeof ActivitiesQuerySchema>;