import { z } from 'zod';
import {
  isoDateTime,
  emotionValence,
  emotionArousal,
  energyDelta,
  salienceScore,
  importanceLevels,
  statusEnum,
  latitudeSchema,
  longitudeSchema
} from './common';

// ===== Memory Schemas =====
// Memory types
export const memoryTypes = ['note', 'link', 'file', 'thought', 'quote', 'insight'] as const;

// Create memory schema
export const MemoryCreateSchema = z.object({
  // Core content
  title: z.string().min(1, 'Title is required').max(500), // Memory title (required)
  description: z.string().optional(), // Optional short description, distinct from note
  note: z.string().min(1).optional(), // Content optional; if provided, must be non-empty
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
  latitude: latitudeSchema,
  longitude: longitudeSchema,

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
  status: z.enum(statusEnum).default('active'),
});

// Update memory schema
export const MemoryUpdateSchema = MemoryCreateSchema.partial();

// Memory query schema
export const MemoriesQuerySchema = z.object({
  memory_type: z.enum(memoryTypes).optional(),
  status: z.enum(statusEnum).optional(),
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
export const relationTypes = [
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

// ===== Memory ↔ Episode Anchors Schemas =====
export const MemoryEpisodeAnchorCreateSchema = z.object({
  episode_id: z.string().uuid(),
  relation_type: z.enum(relationTypes),
  local_time_range: z.object({
    start: isoDateTime,
    end: isoDateTime.optional()
  }).optional(),
  weight: z.number().min(0.0).max(10.0).default(1.0),
  notes: z.string().optional(),
});

export const MemoryEpisodeAnchorUpdateSchema = MemoryEpisodeAnchorCreateSchema.partial().omit({ episode_id: true });

export const MemoryEpisodeAnchorsQuerySchema = z.object({
  relation_type: z.enum(relationTypes).optional(),
  min_weight: z.number().min(0.0).max(10.0).optional(),
  limit: z.string().optional().transform(v => parseInt(v || '50')),
  offset: z.string().optional().transform(v => parseInt(v || '0')),
});

// ===== Assets Schemas =====
export const assetKinds = ['image', 'audio', 'video', 'document', 'link'] as const;

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
export type MemoryEpisodeAnchorCreateBody = z.infer<typeof MemoryEpisodeAnchorCreateSchema>;
export type MemoryEpisodeAnchorUpdateBody = z.infer<typeof MemoryEpisodeAnchorUpdateSchema>;
export type MemoryEpisodeAnchorsQuery = z.infer<typeof MemoryEpisodeAnchorsQuerySchema>;
export type AssetCreateBody = z.infer<typeof AssetCreateSchema>;
export type AssetUpdateBody = z.infer<typeof AssetUpdateSchema>;
export type AssetsQuery = z.infer<typeof AssetsQuerySchema>;
export type MemoryAssetCreateBody = z.infer<typeof MemoryAssetCreateSchema>;
export type MemoryAssetUpdateBody = z.infer<typeof MemoryAssetUpdateSchema>;