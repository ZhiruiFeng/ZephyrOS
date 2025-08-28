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

// 任务记忆类型（扩展Memory）
export interface TaskMemory extends Memory {
  type: 'task';
  content: TaskContent;
  // 额外的任务相关字段
  category_id?: string;
  hierarchy_level?: number;
  hierarchy_path?: string;
  subtask_count?: number;
  completed_subtask_count?: number;
  subtasks?: TaskMemory[];
}

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

// 任务管理相关类型
export const TaskContentSchema = z.object({
  title: z.string().describe('任务标题'),
  description: z.string().optional().describe('任务描述'),
  status: z.enum(['pending', 'in_progress', 'completed', 'on_hold', 'cancelled']).optional().describe('任务状态'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional().describe('任务优先级'),
  category: z.string().optional().describe('任务分类'),
  due_date: z.string().optional().describe('截止日期 (ISO 8601格式)'),
  estimated_duration: z.number().optional().describe('预计耗时(分钟)'),
  progress: z.number().min(0).max(100).optional().describe('完成进度(0-100)'),
  assignee: z.string().optional().describe('任务负责人'),
  notes: z.string().optional().describe('任务备注'),
}).passthrough();

export const CreateTaskParamsSchema = z.object({
  title: z.string().describe('任务标题'),
  description: z.string().optional().describe('任务描述（可选，但建议提供）'),
  status: z.enum(['pending', 'in_progress', 'completed', 'on_hold', 'cancelled']).default('pending').describe('任务状态，默认为pending（与数据库默认值一致）'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium').describe('任务优先级，默认为medium（与数据库默认值一致）'),
  category: z.string().optional().describe('任务分类名称（如"工作"、"个人"、"学习"等，系统会自动查找对应的category_id）'),
  due_date: z.string().optional().describe('截止日期 (YYYY-MM-DD 或 ISO 8601格式)'),
  timezone: z.string().optional().describe('时区标识符，用于解释due_date。如 "America/New_York" 或 "Asia/Shanghai"'),
  estimated_duration: z.number().optional().describe('预计耗时(分钟)'),
  assignee: z.string().optional().describe('任务负责人'),
  tags: z.array(z.string()).optional().describe('任务标签'),
  notes: z.string().optional().describe('任务备注'),
});

export const SearchTasksParamsSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'completed', 'on_hold', 'cancelled']).optional().describe('按状态筛选'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional().describe('按优先级筛选'),
  category: z.string().optional().describe('按分类筛选'),
  assignee: z.string().optional().describe('按负责人筛选'),
  keyword: z.string().optional().describe('在标题和描述中搜索关键词'),
  tags: z.array(z.string()).optional().describe('按标签筛选'),
  due_after: z.string().optional().describe('截止日期在此日期之后 (YYYY-MM-DD格式)'),
  due_before: z.string().optional().describe('截止日期在此日期之前 (YYYY-MM-DD格式)'),
  created_after: z.string().optional().describe('创建日期在此日期之后 (YYYY-MM-DD格式)'),
  created_before: z.string().optional().describe('创建日期在此日期之前 (YYYY-MM-DD格式)'),
  timezone: z.string().optional().describe('时区标识符，如 "America/New_York" 或 "Asia/Shanghai"。如果不提供，使用服务器本地时区'),
  updated_today: z.boolean().optional().describe('只显示今天更新的任务'),
  overdue: z.boolean().optional().describe('只显示过期任务'),
  limit: z.number().min(1).max(100).default(20).describe('返回数量限制'),
  offset: z.number().min(0).default(0).describe('分页偏移'),
  sort_by: z.enum(['created_at', 'updated_at', 'due_date', 'priority', 'title']).default('created_at').describe('排序字段'),
  sort_order: z.enum(['asc', 'desc']).default('desc').describe('排序方向'),
}).default({});

export const UpdateTaskParamsSchema = z.object({
  id: z.string().describe('任务ID'),
  title: z.string().optional().describe('任务标题'),
  description: z.string().optional().describe('任务描述'),
  status: z.enum(['pending', 'in_progress', 'completed', 'on_hold', 'cancelled']).optional().describe('任务状态'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional().describe('任务优先级'),
  category: z.string().optional().describe('任务分类'),
  due_date: z.string().optional().describe('截止日期 (YYYY-MM-DD格式)'),
  timezone: z.string().optional().describe('时区标识符，用于解释due_date。如 "America/New_York" 或 "Asia/Shanghai"'),
  estimated_duration: z.number().optional().describe('预计耗时(分钟)'),
  progress: z.number().min(0).max(100).optional().describe('完成进度(0-100)'),
  assignee: z.string().optional().describe('任务负责人'),
  tags: z.array(z.string()).optional().describe('任务标签'),
  notes: z.string().optional().describe('任务备注'),
});

// 时间跟踪相关类型
export const GetDayTimeEntriesParamsSchema = z.object({
  date: z.string().describe('日期 (YYYY-MM-DD格式)'),
  timezone: z.string().optional().describe('时区标识符，如 "America/New_York" 或 "Asia/Shanghai"'),
  user_id: z.string().optional().describe('用户ID (可选，默认为当前用户)'),
});

export const GetTaskTimeEntriesParamsSchema = z.object({
  task_id: z.string().describe('任务ID'),
  start_date: z.string().optional().describe('开始日期 (YYYY-MM-DD格式)'),
  end_date: z.string().optional().describe('结束日期 (YYYY-MM-DD格式)'),
  timezone: z.string().optional().describe('时区标识符，用于解释日期参数'),
});

export const StartTaskTimerParamsSchema = z.object({
  task_id: z.string().describe('要开始计时的任务ID'),
  description: z.string().optional().describe('时间条目描述'),
});

export const StopTaskTimerParamsSchema = z.object({
  task_id: z.string().describe('要停止计时的任务ID'),
});

// 分类管理相关类型
export const GetCategoriesParamsSchema = z.object({}).default({});

export const CreateCategoryParamsSchema = z.object({
  name: z.string().min(1).max(50).describe('分类名称'),
  description: z.string().optional().describe('分类描述'),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).default('#6B7280').describe('分类颜色 (十六进制格式)'),
  icon: z.string().optional().describe('分类图标'),
});

// OAuth 认证相关类型
export const AuthenticateParamsSchema = z.object({
  client_id: z.string().describe('OAuth客户端ID'),
  redirect_uri: z.string().optional().describe('重定向URI'),
  scope: z.string().optional().describe('请求的权限范围'),
  state: z.string().optional().describe('状态参数'),
});

export const RefreshTokenParamsSchema = z.object({
  refresh_token: z.string().describe('刷新令牌'),
});

export type AddMemoryParams = z.infer<typeof AddMemoryParamsSchema>;
export type SearchMemoriesParams = z.infer<typeof SearchMemoriesParamsSchema>;
export type UpdateMemoryParams = z.infer<typeof UpdateMemoryParamsSchema>;
export type GetMemoryParams = z.infer<typeof GetMemoryParamsSchema>;
export type DeleteMemoryParams = z.infer<typeof DeleteMemoryParamsSchema>;
export type AuthenticateParams = z.infer<typeof AuthenticateParamsSchema>;
export type RefreshTokenParams = z.infer<typeof RefreshTokenParamsSchema>;

// 任务管理类型
export type TaskContent = z.infer<typeof TaskContentSchema>;
export type CreateTaskParams = z.infer<typeof CreateTaskParamsSchema>;
export type SearchTasksParams = z.infer<typeof SearchTasksParamsSchema>;
export type UpdateTaskParams = z.infer<typeof UpdateTaskParamsSchema>;

// 时间跟踪类型
export type GetDayTimeEntriesParams = z.infer<typeof GetDayTimeEntriesParamsSchema>;
export type GetTaskTimeEntriesParams = z.infer<typeof GetTaskTimeEntriesParamsSchema>;
export type StartTaskTimerParams = z.infer<typeof StartTaskTimerParamsSchema>;
export type StopTaskTimerParams = z.infer<typeof StopTaskTimerParamsSchema>;

// 分类管理类型
export type GetCategoriesParams = z.infer<typeof GetCategoriesParamsSchema>;
export type CreateCategoryParams = z.infer<typeof CreateCategoryParamsSchema>;

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

// 任务统计类型
export interface TaskStats {
  total: number;
  by_status: Record<string, number>;
  by_priority: Record<string, number>;
  by_category: Record<string, number>;
  overdue: number;
  due_today: number;
  due_this_week: number;
  completion_rate: number;
  average_completion_time: number;
}

// 时间条目类型
export interface TimeEntry {
  id: string;
  task_id: string;
  user_id: string;
  start_time: string;
  end_time?: string;
  duration?: number; // minutes
  description?: string;
  created_at: string;
  updated_at: string;
}

// 日期时间汇总类型
export interface DayTimeSpending {
  date: string;
  total_time: number; // minutes
  entries: TimeEntry[];
  task_breakdown: {
    task_id: string;
    task_title: string;
    total_time: number;
    entries: TimeEntry[];
  }[];
}

// 分类类型
export interface Category {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon?: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

// OAuth 令牌信息
export interface OAuthTokens {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
  scope?: string;
}

// 用户信息
export interface UserInfo {
  sub: string;
  email: string;
  name?: string;
}

// ZMemory API客户端配置
export interface ZMemoryConfig {
  apiUrl: string;
  apiKey?: string;
  timeout?: number;
  oauth?: {
    clientId: string;
    clientSecret?: string;
    redirectUri?: string;
    scope?: string;
  };
}

// 认证状态
export interface AuthState {
  isAuthenticated: boolean;
  tokens?: OAuthTokens;
  userInfo?: UserInfo;
  expiresAt?: number;
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

// OAuth 错误类型
export class OAuthError extends Error {
  constructor(
    message: string,
    public error: string,
    public errorDescription?: string
  ) {
    super(message);
    this.name = 'OAuthError';
  }
}
