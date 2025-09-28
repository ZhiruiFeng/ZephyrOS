import { z } from 'zod';

/**
 * Validation schema for agent features GET request query parameters
 */
export const agentFeaturesQuerySchema = z.object({
  category: z.string().optional(),
  is_active: z.string().optional().transform(v => v === 'true' ? true : v === 'false' ? false : undefined),
  group_by_category: z.string().optional().transform(v => v === 'true')
});

export type AgentFeaturesQueryParams = z.infer<typeof agentFeaturesQuerySchema>;