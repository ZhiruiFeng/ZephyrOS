import { z } from 'zod';
import { paginationSchema, sortSchema, searchSchema } from './common';

// Person validation schemas
export const PersonCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  email: z.string().email().optional(),
  phone: z.string().max(50).optional(),
  avatar_url: z.string().url().optional(),
  notes: z.string().optional(),
  company: z.string().max(255).optional(),
  job_title: z.string().max(255).optional(),
  location: z.string().max(255).optional(),
  social_linkedin: z.string().max(255).optional(),
  social_twitter: z.string().max(255).optional(),
});

export const PersonUpdateSchema = PersonCreateSchema.partial();

export const PersonQuerySchema = z.object({
  search: searchSchema,
  company: z.string().optional(),
  location: z.string().optional(),
  ...paginationSchema,
  sort_by: z.enum(['name', 'company', 'created_at', 'updated_at']).optional().default('name'),
  sort_order: z.enum(['asc', 'desc']).optional().default('asc'),
});

// Relationship profile validation schemas
export const RelationshipProfileCreateSchema = z.object({
  person_id: z.string().uuid(),
  tier: z.number().int().min(1).max(5).default(3),
  health_score: z.number().int().min(0).max(100).default(50),
  cadence_days: z.number().int().positive().optional(),
  last_contact_at: z.string().datetime().optional(),
  reason_for_tier: z.string().optional(),
  relationship_context: z.string().optional(),
  is_dormant: z.boolean().default(false),
});

export const RelationshipProfileUpdateSchema = RelationshipProfileCreateSchema.partial().omit({ person_id: true });

// Touchpoint validation schemas
export const TouchpointCreateSchema = z.object({
  person_id: z.string().uuid(),
  interaction_type: z.enum(['call', 'email', 'meeting', 'text', 'social', 'other']),
  subject: z.string().max(255).optional(),
  notes: z.string().optional(),
  occurred_at: z.string().datetime(),
  duration_minutes: z.number().int().positive().optional(),
  sentiment: z.enum(['positive', 'neutral', 'negative']).optional(),
  follow_up_needed: z.boolean().default(false),
  follow_up_date: z.string().datetime().optional(),
});

export const TouchpointUpdateSchema = TouchpointCreateSchema.partial().omit({ person_id: true });

export const TouchpointQuerySchema = z.object({
  person_id: z.string().uuid().optional(),
  interaction_type: z.enum(['call', 'email', 'meeting', 'text', 'social', 'other']).optional(),
  sentiment: z.enum(['positive', 'neutral', 'negative']).optional(),
  follow_up_needed: z.enum(['true', 'false']).transform(val => val === 'true').optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
  ...paginationSchema,
  sort_by: z.enum(['occurred_at', 'created_at', 'sentiment']).default('occurred_at'),
  ...sortSchema,
});

// Type exports
export type PersonCreateBody = z.infer<typeof PersonCreateSchema>;
export type PersonUpdateBody = z.infer<typeof PersonUpdateSchema>;
export type PersonQuery = z.infer<typeof PersonQuerySchema>;
export type RelationshipProfileCreateBody = z.infer<typeof RelationshipProfileCreateSchema>;
export type RelationshipProfileUpdateBody = z.infer<typeof RelationshipProfileUpdateSchema>;
export type TouchpointCreateBody = z.infer<typeof TouchpointCreateSchema>;
export type TouchpointUpdateBody = z.infer<typeof TouchpointUpdateSchema>;
export type TouchpointQuery = z.infer<typeof TouchpointQuerySchema>;