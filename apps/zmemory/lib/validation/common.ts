import { z } from 'zod';

// ===== Common Validators =====
// ISO datetime string guard
export const isoDateTime = z.string().datetime({ offset: true, message: 'Invalid ISO datetime' });

// Emotional rating scales
export const emotionValence = z.number().int().min(-5).max(5).optional();
export const emotionArousal = z.number().int().min(0).max(5).optional();
export const energyDelta = z.number().int().min(-5).max(5).optional();
export const salienceScore = z.number().min(0.0).max(1.0).optional();

// Common enums
export const statusEnum = ['active', 'archived', 'deleted'] as const;
export const importanceLevels = ['low', 'medium', 'high'] as const;

// Location validation
export const latitudeSchema = z.number().min(-90).max(90).optional();
export const longitudeSchema = z.number().min(-180).max(180).optional();

// Common pagination and sorting schemas
export const paginationSchema = {
  limit: z.string().optional().default('50').refine(val => !isNaN(parseInt(val)), {
    message: "Invalid limit value"
  }).transform(val => parseInt(val)).pipe(z.number().int().positive().max(1000)),
  offset: z.string().optional().default('0').refine(val => !isNaN(parseInt(val)), {
    message: "Invalid offset value"
  }).transform(val => parseInt(val)).pipe(z.number().int().min(0)),
};

export const sortSchema = {
  sort_order: z.enum(['asc', 'desc']).optional().default('desc'),
};

// Date range validation
export const dateRangeSchema = {
  created_before: isoDateTime.optional(),
  created_after: isoDateTime.optional(),
  updated_before: isoDateTime.optional(),
  updated_after: isoDateTime.optional(),
};

// Tags validation
export const tagsSchema = z.array(z.string()).optional();
export const tagsQuerySchema = z.string().optional(); // comma-separated tags in query params

// Search validation
export const searchSchema = z.string().optional();

// UUID validation
export const uuidSchema = z.string().uuid();

// UUID schema that accepts null values and transforms them to undefined for optional fields
export const nullableUuidSchema = z.union([z.string().uuid(), z.null()]).transform(val => val === null ? undefined : val);