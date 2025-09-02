import { z } from 'zod';

// ===== Common Validators =====
// ISO datetime string guard
const isoDateTime = z.string().datetime({ offset: true, message: 'Invalid ISO datetime' });

// ===== Memory Schemas =====
// Memory types 
const memoryTypes = ['note', 'link', 'file', 'thought', 'quote', 'insight'] as const;
const memoryStatuses = ['active', 'archived', 'deleted'] as const;
const importanceLevels = ['low', 'medium', 'high'] as const;

// Emotional rating scale (-5 to 5 for valence, 0 to 5 for arousal/energy_delta)
const emotionValence = z.number().int().min(-5).max(5).optional();
const emotionArousal = z.number().int().min(0).max(5).optional();
const energyDelta = z.number().int().min(-5).max(5).optional();
const salienceScore = z.number().min(0.0).max(1.0).optional();

// Create memory schema
export const MemoryCreateSchema = z.object({
  // Core content
  title: z.string().min(1).max(500).optional(), // Memory title
  note: z.string().min(1, 'Note content is required'),
  memory_type: z.enum(memoryTypes).default('note'),
  
  // Time semantics
  captured_at: isoDateTime.optional(), // defaults to NOW() in DB
  happened_range: z.object({
    start: isoDateTime,
    end: isoDateTime.optional()
  }).optional(),
  
  // Emotional/energy metadata
  emotion_valence: emotionValence,
  emotion_arousal: emotionArousal,
  energy_delta: energyDelta,
  
  // Location
  place_name: z.string().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  
  // Highlight/salience
  is_highlight: z.boolean().default(false),
  salience_score: salienceScore.default(0.0),
  
  // Context and relationships (these will be filtered out for DB operations)
  source: z.string().optional(),
  context: z.string().optional(), 
  mood: z.number().int().min(1).max(10).optional(),
  importance_level: z.enum(importanceLevels).default('medium'),
  related_to: z.array(z.string()).default([]),
  
  // Organization
  category_id: z.string().uuid().optional(),
  tags: z.array(z.string()).default([]),
  status: z.enum(memoryStatuses).default('active'),
});

// Update memory schema
export const MemoryUpdateSchema = MemoryCreateSchema.partial();

// Memory query schema
export const MemoriesQuerySchema = z.object({
  memory_type: z.enum(memoryTypes).optional(),
  status: z.enum(memoryStatuses).optional(),
  importance_level: z.enum(importanceLevels).optional(),
  is_highlight: z.string().transform((val) => val === 'true').optional(),
  
  // Date ranges
  captured_from: isoDateTime.optional(),
  captured_to: isoDateTime.optional(),
  happened_from: isoDateTime.optional(),
  happened_to: isoDateTime.optional(),
  
  // Location filters
  place_name: z.string().optional(),
  near_lat: z.string().optional().transform(v => v ? parseFloat(v) : undefined).pipe(z.number().min(-90).max(90).optional()),
  near_lng: z.string().optional().transform(v => v ? parseFloat(v) : undefined).pipe(z.number().min(-180).max(180).optional()),
  distance_km: z.string().optional().transform(v => v ? parseFloat(v) : 10).pipe(z.number().positive().optional().default(10)),
  
  // Emotional/rating filters
  min_emotion_valence: z.string().optional().transform(v => v ? parseInt(v) : undefined).pipe(z.number().int().min(-5).max(5).optional()),
  max_emotion_valence: z.string().optional().transform(v => v ? parseInt(v) : undefined).pipe(z.number().int().min(-5).max(5).optional()),
  min_salience: z.string().optional().transform(v => v ? parseFloat(v) : undefined).pipe(z.number().min(0.0).max(1.0).optional()),
  min_mood: z.string().optional().transform(v => v ? parseInt(v) : undefined).pipe(z.number().int().min(1).max(10).optional()),
  
  // Category and tags
  category_id: z.string().uuid().optional(),
  tags: z.string().optional(), // comma-separated
  related_to: z.string().optional(), // search in related_to array
  
  // Full-text search
  search: z.string().optional(),
  search_fields: z.enum(['note', 'context', 'place_name', 'all']).default('all'),
  
  // Pagination and sorting
  limit: z.string().optional().transform(v => parseInt(v || '50')),
  offset: z.string().optional().transform(v => parseInt(v || '0')),
  sort_by: z.enum(['captured_at', 'happened_at', 'salience_score', 'emotion_valence', 'mood', 'updated_at']).default('captured_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
});

// ===== Memory Anchors Schemas =====
const relationTypes = [
  'context_of', 'result_of', 'insight_from', 'about', 
  'co_occurred', 'triggered_by', 'reflects_on'
] as const;

// Create memory anchor
export const MemoryAnchorCreateSchema = z.object({
  anchor_item_id: z.string().uuid(),
  relation_type: z.enum(relationTypes),
  local_time_range: z.object({
    start: isoDateTime,
    end: isoDateTime.optional()
  }).optional(),
  weight: z.number().min(0.0).max(10.0).default(1.0),
  notes: z.string().optional(),
});

// Update memory anchor
export const MemoryAnchorUpdateSchema = MemoryAnchorCreateSchema.partial().omit({ anchor_item_id: true });

// Query memory anchors
export const MemoryAnchorsQuerySchema = z.object({
  relation_type: z.enum(relationTypes).optional(),
  anchor_item_type: z.enum(['task', 'activity', 'routine', 'habit']).optional(),
  min_weight: z.number().min(0.0).max(10.0).optional(),
  limit: z.string().optional().transform(v => parseInt(v || '50')),
  offset: z.string().optional().transform(v => parseInt(v || '0')),
});

// ===== Assets Schemas =====
const assetKinds = ['image', 'audio', 'video', 'document', 'link'] as const;

// Create asset
export const AssetCreateSchema = z.object({
  url: z.string().url(),
  mime_type: z.string(),
  kind: z.enum(assetKinds),
  duration_seconds: z.number().int().positive().optional(),
  file_size_bytes: z.number().int().positive().optional(),
  hash_sha256: z.string().optional(),
});

// Update asset
export const AssetUpdateSchema = AssetCreateSchema.partial().omit({ hash_sha256: true });

// Create memory asset relationship
export const MemoryAssetCreateSchema = z.object({
  asset_id: z.string().uuid(),
  order_index: z.number().int().min(0).default(0),
  caption: z.string().optional(),
});

// Update memory asset
export const MemoryAssetUpdateSchema = z.object({
  order_index: z.number().int().min(0).optional(),
  caption: z.string().optional(),
});

// Query assets
export const AssetsQuerySchema = z.object({
  kind: z.enum(assetKinds).optional(),
  mime_type: z.string().optional(),
  limit: z.string().optional().transform(v => parseInt(v || '50')),
  offset: z.string().optional().transform(v => parseInt(v || '0')),
  sort_by: z.enum(['created_at', 'file_size_bytes', 'kind']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
});

// Type exports for Memory schemas
export type MemoryCreateBody = z.infer<typeof MemoryCreateSchema>;
export type MemoryUpdateBody = z.infer<typeof MemoryUpdateSchema>;
export type MemoriesQuery = z.infer<typeof MemoriesQuerySchema>;
export type MemoryAnchorCreateBody = z.infer<typeof MemoryAnchorCreateSchema>;
export type MemoryAnchorUpdateBody = z.infer<typeof MemoryAnchorUpdateSchema>;
export type MemoryAnchorsQuery = z.infer<typeof MemoryAnchorsQuerySchema>;
export type AssetCreateBody = z.infer<typeof AssetCreateSchema>;
export type AssetUpdateBody = z.infer<typeof AssetUpdateSchema>;
export type MemoryAssetCreateBody = z.infer<typeof MemoryAssetCreateSchema>;
export type MemoryAssetUpdateBody = z.infer<typeof MemoryAssetUpdateSchema>;
export type AssetsQuery = z.infer<typeof AssetsQuerySchema>;

// Legacy schemas for backward compatibility
// 查询参数验证模式
export const QueryParamsSchema = z.object({
  type: z.string().optional(),
  limit: z.string().optional().transform(val => parseInt(val || '50')),
  offset: z.string().optional().transform(val => parseInt(val || '0')),
});

export type MemoryData = z.infer<typeof MemoryCreateSchema>;
export type MemoryUpdateData = z.infer<typeof MemoryUpdateSchema>;
export type QueryParams = z.infer<typeof QueryParamsSchema>; 

// ===== Time Tracking Schemas =====

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