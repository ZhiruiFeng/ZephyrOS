import { z } from 'zod';

// Core principle category enumeration
export const CorePrincipleCategory = {
  WORK_PRINCIPLES: 'work_principles',
  LIFE_PRINCIPLES: 'life_principles',
  DECISION_MAKING: 'decision_making',
  RELATIONSHIPS: 'relationships',
  LEARNING: 'learning',
  LEADERSHIP: 'leadership',
  CUSTOM: 'custom'
} as const;

// Core principle status enumeration
export const CorePrincipleStatus = {
  ACTIVE: 'active',
  DEPRECATED: 'deprecated',
  ARCHIVED: 'archived'
} as const;

// Core principle source enumeration
export const CorePrincipleSource = {
  RAY_DALIO: 'ray_dalio',
  USER_CUSTOM: 'user_custom'
} as const;

// Application type enumeration for timeline mappings
export const ApplicationType = {
  PRE_DECISION: 'pre_decision',
  POST_REFLECTION: 'post_reflection',
  LEARNING: 'learning',
  VALIDATION: 'validation'
} as const;

// Zod schemas for validation
export const CorePrincipleContentSchema = z.object({
  title: z.string().min(1, 'Principle title is required').max(200, 'Title too long'),
  description: z.string().optional(),
  category: z.enum([
    CorePrincipleCategory.WORK_PRINCIPLES,
    CorePrincipleCategory.LIFE_PRINCIPLES,
    CorePrincipleCategory.DECISION_MAKING,
    CorePrincipleCategory.RELATIONSHIPS,
    CorePrincipleCategory.LEARNING,
    CorePrincipleCategory.LEADERSHIP,
    CorePrincipleCategory.CUSTOM
  ]),
  status: z.enum([
    CorePrincipleStatus.ACTIVE,
    CorePrincipleStatus.DEPRECATED,
    CorePrincipleStatus.ARCHIVED
  ]).default(CorePrincipleStatus.ACTIVE),
  is_default: z.boolean().default(false),
  source: z.enum([
    CorePrincipleSource.RAY_DALIO,
    CorePrincipleSource.USER_CUSTOM
  ]).default(CorePrincipleSource.USER_CUSTOM),
  trigger_questions: z.array(z.string()).default([]),
  application_examples: z.array(z.string()).default([]),
  personal_notes: z.string().optional(),
  importance_level: z.number().int().min(1).max(5).default(1),
  application_count: z.number().int().min(0).default(0),
  last_applied_at: z.string().datetime().optional(),
  deprecated_at: z.string().datetime().optional(),
  deprecation_reason: z.string().optional()
});

export const CreateCorePrincipleSchema = z.object({
  type: z.literal('core_principle'),
  content: CorePrincipleContentSchema,
  metadata: z.record(z.any()).optional()
});

export const UpdateCorePrincipleSchema = z.object({
  type: z.literal('core_principle').optional(),
  content: CorePrincipleContentSchema.partial().optional(),
  metadata: z.record(z.any()).optional()
});

export const CorePrincipleQuerySchema = z.object({
  category: z.enum([
    CorePrincipleCategory.WORK_PRINCIPLES,
    CorePrincipleCategory.LIFE_PRINCIPLES,
    CorePrincipleCategory.DECISION_MAKING,
    CorePrincipleCategory.RELATIONSHIPS,
    CorePrincipleCategory.LEARNING,
    CorePrincipleCategory.LEADERSHIP,
    CorePrincipleCategory.CUSTOM
  ]).optional(),
  status: z.enum([
    CorePrincipleStatus.ACTIVE,
    CorePrincipleStatus.DEPRECATED,
    CorePrincipleStatus.ARCHIVED
  ]).optional(),
  source: z.enum([
    CorePrincipleSource.RAY_DALIO,
    CorePrincipleSource.USER_CUSTOM
  ]).optional(),
  is_default: z.enum(['true', 'false']).transform(val => val === 'true').optional(),
  importance_level: z.string().regex(/^\d+$/).transform(Number).optional(),
  search: z.string().optional(), // Search in title and description

  limit: z.string().regex(/^\d+$/).transform(Number).default('50'),
  offset: z.string().regex(/^\d+$/).transform(Number).default('0'),
  sort_by: z.enum(['created_at', 'updated_at', 'title', 'importance_level', 'application_count', 'last_applied_at']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc')
});

// Timeline mapping schemas
export const TimelineMappingContentSchema = z.object({
  principle_id: z.string().uuid(),
  timeline_item_id: z.string().uuid(),
  application_type: z.enum([
    ApplicationType.PRE_DECISION,
    ApplicationType.POST_REFLECTION,
    ApplicationType.LEARNING,
    ApplicationType.VALIDATION
  ]),
  reflection_notes: z.string().optional(),
  effectiveness_rating: z.number().int().min(1).max(5).optional(),
  lessons_learned: z.string().optional(),
  decision_context: z.string().optional(),
  outcome_observed: z.string().optional(),
  would_apply_again: z.boolean().optional(),
  applied_at: z.string().datetime().optional()
});

export const CreateTimelineMappingSchema = z.object({
  type: z.literal('principle_timeline_mapping'),
  content: TimelineMappingContentSchema
});

export const UpdateTimelineMappingSchema = z.object({
  type: z.literal('principle_timeline_mapping').optional(),
  content: TimelineMappingContentSchema.partial().optional()
});

export const TimelineMappingQuerySchema = z.object({
  principle_id: z.string().uuid().optional(),
  timeline_item_id: z.string().uuid().optional(),
  application_type: z.enum([
    ApplicationType.PRE_DECISION,
    ApplicationType.POST_REFLECTION,
    ApplicationType.LEARNING,
    ApplicationType.VALIDATION
  ]).optional(),
  effectiveness_rating: z.string().regex(/^\d+$/).transform(Number).optional(),
  applied_before: z.string().datetime().optional(),
  applied_after: z.string().datetime().optional(),
  would_apply_again: z.enum(['true', 'false']).transform(val => val === 'true').optional(),

  limit: z.string().regex(/^\d+$/).transform(Number).default('50'),
  offset: z.string().regex(/^\d+$/).transform(Number).default('0'),
  sort_by: z.enum(['applied_at', 'created_at', 'effectiveness_rating']).default('applied_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc')
});

// TypeScript types
export type CorePrincipleCategory = typeof CorePrincipleCategory[keyof typeof CorePrincipleCategory];
export type CorePrincipleStatus = typeof CorePrincipleStatus[keyof typeof CorePrincipleStatus];
export type CorePrincipleSource = typeof CorePrincipleSource[keyof typeof CorePrincipleSource];
export type ApplicationType = typeof ApplicationType[keyof typeof ApplicationType];

export type CorePrincipleContent = z.infer<typeof CorePrincipleContentSchema>;
export type CreateCorePrincipleRequest = z.infer<typeof CreateCorePrincipleSchema>;
export type UpdateCorePrincipleRequest = z.infer<typeof UpdateCorePrincipleSchema>;
export type CorePrincipleQuery = z.infer<typeof CorePrincipleQuerySchema>;

export type TimelineMappingContent = z.infer<typeof TimelineMappingContentSchema>;
export type CreateTimelineMappingRequest = z.infer<typeof CreateTimelineMappingSchema>;
export type UpdateTimelineMappingRequest = z.infer<typeof UpdateTimelineMappingSchema>;
export type TimelineMappingQuery = z.infer<typeof TimelineMappingQuerySchema>;

// Core principle memory interface
export interface CorePrincipleMemory {
  id: string;
  type: 'core_principle';
  content: CorePrincipleContent;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
  user_id: string;
}

// Timeline mapping memory interface
export interface TimelineMappingMemory {
  id: string;
  type: 'principle_timeline_mapping';
  content: TimelineMappingContent;
  created_at: string;
  updated_at: string;
  user_id: string;

  // Populated relations for convenience
  principle?: CorePrincipleMemory;
  timeline_item?: any; // Would need timeline item type definition
}

// Core principle statistics interface
export interface CorePrincipleStats {
  total: number;
  by_category: Record<CorePrincipleCategory, number>;
  by_status: Record<CorePrincipleStatus, number>;
  by_source: Record<CorePrincipleSource, number>;
  most_applied: CorePrincipleMemory[];
  least_applied: CorePrincipleMemory[];
  average_importance_level: number;
  total_applications: number;
}