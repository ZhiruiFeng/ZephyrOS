import { z } from 'zod';

/**
 * Validation schema for creating a category
 */
export const CreateCategorySchema = z.object({
  name: z.string().min(1, 'Category name cannot be empty').max(50, 'Category name too long'),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Color format is invalid').default('#6B7280'),
  icon: z.string().optional()
});

/**
 * Validation schema for updating a category (all fields optional)
 */
export const UpdateCategorySchema = z.object({
  name: z.string().min(1, 'Category name cannot be empty').max(50, 'Category name too long').optional(),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Color format is invalid').optional(),
  icon: z.string().optional()
});

/**
 * Validation schema for category query parameters
 */
export const CategoryQuerySchema = z.object({
  name: z.string().optional(),
  color: z.string().optional(),
  search: z.string().optional(),
  limit: z.string().optional().transform(v => v ? parseInt(v, 10) : undefined),
  offset: z.string().optional().transform(v => v ? parseInt(v, 10) : undefined)
});

export type CreateCategoryInput = z.infer<typeof CreateCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof UpdateCategorySchema>;
export type CategoryQueryParams = z.infer<typeof CategoryQuerySchema>;
