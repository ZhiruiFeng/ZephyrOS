import { z } from 'zod';
import { isoDateTime, paginationSchema, sortSchema, dateRangeSchema, tagsQuerySchema, searchSchema } from './common';

// Activity types
export const activityTypes = [
  'exercise', 'meditation', 'reading', 'music', 'socializing',
  'gaming', 'walking', 'cooking', 'rest', 'creative', 'learning', 'other'
] as const;

// Activity status
export const activityStatuses = ['active', 'completed', 'paused', 'archived'] as const;

// Rating scales (1-10)
const ratingSchema = z.number().int().min(1).max(10).optional();

// Activity creation schema
export const ActivityCreateSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500),
  description: z.string().optional(),
  activity_type: z.enum(activityTypes),

  // Time tracking
  started_at: isoDateTime.optional(),
  ended_at: isoDateTime.optional(),
  duration_minutes: z.number().int().positive().optional(),

  // Mood and satisfaction tracking
  mood_before: ratingSchema,
  mood_after: ratingSchema,
  energy_before: ratingSchema,
  energy_after: ratingSchema,
  satisfaction: ratingSchema,
  focus: ratingSchema,
  stress_level: ratingSchema,

  // Location and context
  location: z.string().optional(),
  notes: z.string().optional(),
  weather: z.string().optional(),
  social_context: z.enum(['alone', 'family', 'friends', 'colleagues', 'strangers', 'mixed']).optional(),

  // Organization
  tags: z.array(z.string()).default([]),
  category_id: z.string().uuid().optional(),
  status: z.enum(activityStatuses).default('active'),

  // Experience tracking
  intensity: z.enum(['low', 'medium', 'high']).optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  enjoyment: ratingSchema,
  productivity: ratingSchema,

  // Reflection
  what_went_well: z.string().optional(),
  what_could_improve: z.string().optional(),
  key_insights: z.string().optional(),

  // Goals and intentions
  intended_outcome: z.string().optional(),
  actual_outcome: z.string().optional(),
  goal_achieved: z.boolean().optional(),
});

// Activity update schema
export const ActivityUpdateSchema = ActivityCreateSchema.partial();

// Activity query schema
export const ActivitiesQuerySchema = z.object({
  activity_type: z.enum(activityTypes).optional(),
  status: z.enum(activityStatuses).optional(),

  // Date filters
  from: isoDateTime.optional(),
  to: isoDateTime.optional(),
  started_after: isoDateTime.optional(),
  started_before: isoDateTime.optional(),
  ended_after: isoDateTime.optional(),
  ended_before: isoDateTime.optional(),

  // Rating filters
  min_satisfaction: z.string().transform(v => v ? parseInt(v) : undefined).pipe(ratingSchema),
  max_satisfaction: z.string().transform(v => v ? parseInt(v) : undefined).pipe(ratingSchema),
  min_mood_before: z.string().transform(v => v ? parseInt(v) : undefined).pipe(ratingSchema),
  min_mood_after: z.string().transform(v => v ? parseInt(v) : undefined).pipe(ratingSchema),
  min_energy_before: z.string().transform(v => v ? parseInt(v) : undefined).pipe(ratingSchema),
  min_energy_after: z.string().transform(v => v ? parseInt(v) : undefined).pipe(ratingSchema),
  min_enjoyment: z.string().transform(v => v ? parseInt(v) : undefined).pipe(ratingSchema),

  // Duration filters
  min_duration: z.string().transform(v => v ? parseInt(v) : undefined).pipe(z.number().int().positive().optional()),
  max_duration: z.string().transform(v => v ? parseInt(v) : undefined).pipe(z.number().int().positive().optional()),

  // Location and context
  location: z.string().optional(),
  social_context: z.enum(['alone', 'family', 'friends', 'colleagues', 'strangers', 'mixed']).optional(),
  intensity: z.enum(['low', 'medium', 'high']).optional(),
  intensity_level: z.enum(['low', 'medium', 'high']).optional(), // Alternative field name used in some routes
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),

  // Organization
  category_id: z.string().uuid().optional(),
  tags: tagsQuerySchema,
  search: searchSchema,

  // Pagination and sorting
  ...paginationSchema,
  sort_by: z.enum([
    'started_at', 'ended_at', 'created_at', 'updated_at',
    'duration_minutes', 'satisfaction', 'satisfaction_level',
    'mood_after', 'energy_after', 'enjoyment', 'title'
  ]).default('started_at'),
  ...sortSchema,
});

// Type exports
export type ActivityCreateBody = z.infer<typeof ActivityCreateSchema>;
export type ActivityUpdateBody = z.infer<typeof ActivityUpdateSchema>;
export type ActivitiesQuery = z.infer<typeof ActivitiesQuerySchema>;