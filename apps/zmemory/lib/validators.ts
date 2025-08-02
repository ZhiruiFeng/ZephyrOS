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