/**
 * ZMemory MCP Server Types
 * 
 * 定义ZMemory MCP服务器使用的所有类型
 */

import { z } from 'zod';

// 基础记忆类型定义
export const MemorySchema = z.object({
  id: z.string(),
  type: z.string(),
  content: z.any(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
  created_at: z.string(),
  updated_at: z.string(),
  user_id: z.string().optional(),
});

export type Memory = z.infer<typeof MemorySchema>;

// MCP工具参数类型
export const AddMemoryParamsSchema = z.object({
  type: z.string().describe('记忆类型，如 task, note, bookmark 等'),
  content: z.object({
    title: z.string().describe('标题'),
    description: z.string().optional().describe('详细描述'),
    status: z.enum(['pending', 'in_progress', 'completed', 'on_hold', 'cancelled']).optional().describe('状态'),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional().describe('优先级'),
    category: z.string().optional().describe('分类'),
  }).passthrough().describe('记忆内容'),
  tags: z.array(z.string()).optional().describe('标签列表'),
  metadata: z.record(z.any()).optional().describe('额外元数据'),
});

export const SearchMemoriesParamsSchema = z.object({
  type: z.string().optional().describe('按类型筛选'),
  status: z.string().optional().describe('按状态筛选'),
  priority: z.string().optional().describe('按优先级筛选'),
  category: z.string().optional().describe('按分类筛选'),
  tags: z.array(z.string()).optional().describe('按标签筛选'),
  keyword: z.string().optional().describe('关键词搜索'),
  limit: z.number().optional().describe('返回数量限制'),
  offset: z.number().optional().describe('分页偏移'),
}).default({});

export const UpdateMemoryParamsSchema = z.object({
  id: z.string().describe('记忆ID'),
  content: z.any().optional().describe('要更新的内容'),
  tags: z.array(z.string()).optional().describe('要更新的标签'),
  metadata: z.record(z.any()).optional().describe('要更新的元数据'),
});

export const GetMemoryParamsSchema = z.object({
  id: z.string().describe('记忆ID'),
});

export const DeleteMemoryParamsSchema = z.object({
  id: z.string().describe('要删除的记忆ID'),
});

export type AddMemoryParams = z.infer<typeof AddMemoryParamsSchema>;
export type SearchMemoriesParams = z.infer<typeof SearchMemoriesParamsSchema>;
export type UpdateMemoryParams = z.infer<typeof UpdateMemoryParamsSchema>;
export type GetMemoryParams = z.infer<typeof GetMemoryParamsSchema>;
export type DeleteMemoryParams = z.infer<typeof DeleteMemoryParamsSchema>;

// API响应类型
export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}

// 统计信息类型
export interface MemoryStats {
  total: number;
  by_type: Record<string, number>;
  by_status: Record<string, number>;
  by_priority: Record<string, number>;
  recent_count: number;
}

// ZMemory API客户端配置
export interface ZMemoryConfig {
  apiUrl: string;
  apiKey?: string;
  timeout?: number;
}

// 错误类型
export class ZMemoryError extends Error {
  constructor(
    message: string,
    public code?: string,
    public status?: number
  ) {
    super(message);
    this.name = 'ZMemoryError';
  }
}
