/**
 * ZMemory MCP Server Types
 * 
 * 定义ZMemory MCP服务器使用的所有类型
 */

import { z } from 'zod';

// 基础记忆类型定义 - 匹配ZMemory API返回的记忆对象
export const MemorySchema = z.object({
  id: z.string(),
  type: z.string().optional(), // 兼容性字段
  
  // 核心内容字段
  note: z.string().optional(),
  title: z.string().optional(),
  title_override: z.string().optional(),
  description: z.string().optional(),
  memory_type: z.enum(['note', 'link', 'file', 'thought', 'quote', 'insight']).optional(),
  
  // 情感和能量字段
  emotion_valence: z.number().optional(),
  emotion_arousal: z.number().optional(),
  energy_delta: z.number().optional(),
  
  // 位置字段
  place_name: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  
  // 重要性和状态字段
  is_highlight: z.boolean().optional(),
  salience_score: z.number().optional(),
  status: z.enum(['active', 'archived', 'deleted']).optional(),
  
  // 时间字段
  captured_at: z.string().optional(),
  happened_range: z.object({
    start: z.string(),
    end: z.string().optional()
  }).optional(),
  
  // 组织字段
  category_id: z.string().optional(),
  tags: z.array(z.string()).optional(),
  
  // 元数据和系统字段
  metadata: z.record(z.any()).optional(),
  created_at: z.string(),
  updated_at: z.string(),
  user_id: z.string().optional(),
  
  // 兼容性字段
  content: z.any().optional(),
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
  note: z.string().min(1).describe('记忆的主要内容'),
  memory_type: z.enum(['note', 'link', 'file', 'thought', 'quote', 'insight']).default('note').describe('记忆类型'),
  title: z.string().optional().describe('记忆标题（可选，用于覆盖自动生成的标题）'),
  emotion_valence: z.number().int().min(-5).max(5).optional().describe('情感效价（-5到5，负值表示消极，正值表示积极）'),
  emotion_arousal: z.number().int().min(-5).max(5).optional().describe('情感唤醒度（-5到5，负值表示平静，正值表示兴奋）'),
  energy_delta: z.number().int().min(-5).max(5).optional().describe('能量变化（-5到5，记忆对能量水平的影响）'),
  place_name: z.string().optional().describe('地点名称'),
  latitude: z.number().optional().describe('地理位置纬度'),
  longitude: z.number().optional().describe('地理位置经度'),
  is_highlight: z.boolean().default(false).describe('是否为重要记忆'),
  salience_score: z.number().min(0).max(1).optional().describe('重要性评分（0.0-1.0）'),
  category_id: z.string().optional().describe('分类ID'),
  tags: z.array(z.string()).optional().describe('标签列表'),
  happened_range: z.object({
    start: z.string().datetime().describe('事件开始时间'),
    end: z.string().datetime().optional().describe('事件结束时间')
  }).optional().describe('事件发生的时间范围'),
  captured_at: z.string().datetime().optional().describe('记录时间（默认为当前时间）'),
});

export const SearchMemoriesParamsSchema = z.object({
  memory_type: z.enum(['note', 'link', 'file', 'thought', 'quote', 'insight']).optional().describe('按记忆类型筛选'),
  status: z.enum(['active', 'archived', 'deleted']).optional().describe('按状态筛选'),
  is_highlight: z.boolean().optional().describe('只显示重要记忆'),
  search: z.string().optional().describe('全文搜索记忆内容'),
  tags: z.string().optional().describe('按标签筛选（逗号分隔）'),
  place_name: z.string().optional().describe('按地点名称筛选'),
  min_emotion_valence: z.number().int().min(-5).max(5).optional().describe('最低情感效价'),
  max_emotion_valence: z.number().int().min(-5).max(5).optional().describe('最高情感效价'),
  min_salience: z.number().min(0).max(1).optional().describe('最低重要性评分'),
  captured_from: z.string().datetime().optional().describe('记录时间起始范围'),
  captured_to: z.string().datetime().optional().describe('记录时间结束范围'),
  near_lat: z.number().optional().describe('搜索位置纬度（配合near_lng和distance_km使用）'),
  near_lng: z.number().optional().describe('搜索位置经度'),
  distance_km: z.number().optional().describe('搜索半径（公里）'),
  category_id: z.string().optional().describe('按分类ID筛选'),
  sort_by: z.enum(['captured_at', 'happened_at', 'salience_score', 'emotion_valence', 'updated_at']).default('captured_at').describe('排序字段'),
  sort_order: z.enum(['asc', 'desc']).default('desc').describe('排序方向'),
  limit: z.number().min(1).max(100).default(20).describe('返回数量限制'),
  offset: z.number().min(0).default(0).describe('分页偏移'),
}).default({});

export const UpdateMemoryParamsSchema = z.object({
  id: z.string().describe('记忆ID'),
  note: z.string().optional().describe('记忆内容'),
  title: z.string().optional().describe('记忆标题'),
  memory_type: z.enum(['note', 'link', 'file', 'thought', 'quote', 'insight']).optional().describe('记忆类型'),
  emotion_valence: z.number().int().min(-5).max(5).optional().describe('情感效价'),
  emotion_arousal: z.number().int().min(-5).max(5).optional().describe('情感唤醒度'),
  energy_delta: z.number().int().min(-5).max(5).optional().describe('能量变化'),
  place_name: z.string().optional().describe('地点名称'),
  is_highlight: z.boolean().optional().describe('是否为重要记忆'),
  salience_score: z.number().min(0).max(1).optional().describe('重要性评分'),
  tags: z.array(z.string()).optional().describe('标签列表'),
  category_id: z.string().optional().describe('分类ID'),
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

// 活动管理相关类型
export const CreateActivityParamsSchema = z.object({
  title: z.string().max(500).describe('活动标题'),
  description: z.string().optional().describe('活动描述'),
  activity_type: z.enum(['exercise', 'meditation', 'reading', 'music', 'socializing', 'gaming', 'walking', 'cooking', 'rest', 'creative', 'learning', 'other']).describe('活动类型'),
  started_at: z.string().datetime().optional().describe('活动开始时间'),
  ended_at: z.string().datetime().optional().describe('活动结束时间'),
  duration_minutes: z.number().optional().describe('持续时间（分钟）'),
  mood_before: z.number().int().min(1).max(10).optional().describe('活动前心情（1-10）'),
  mood_after: z.number().int().min(1).max(10).optional().describe('活动后心情（1-10）'),
  energy_before: z.number().int().min(1).max(10).optional().describe('活动前能量水平（1-10）'),
  energy_after: z.number().int().min(1).max(10).optional().describe('活动后能量水平（1-10）'),
  satisfaction_level: z.number().int().min(1).max(10).optional().describe('满意度（1-10）'),
  intensity_level: z.enum(['low', 'moderate', 'high']).optional().describe('强度水平'),
  location: z.string().optional().describe('地点'),
  weather: z.string().optional().describe('天气情况'),
  companions: z.array(z.string()).optional().describe('同伴列表'),
  notes: z.string().optional().describe('活动备注'),
  insights: z.string().optional().describe('活动感悟或收获'),
  gratitude: z.string().optional().describe('感恩记录'),
  status: z.enum(['active', 'completed', 'cancelled']).default('completed').describe('活动状态'),
  tags: z.array(z.string()).optional().describe('标签列表'),
  category_id: z.string().optional().describe('分类ID'),
});

export const SearchActivitiesParamsSchema = z.object({
  activity_type: z.enum(['exercise', 'meditation', 'reading', 'music', 'socializing', 'gaming', 'walking', 'cooking', 'rest', 'creative', 'learning', 'other']).optional().describe('按活动类型筛选'),
  status: z.enum(['active', 'completed', 'cancelled']).optional().describe('按活动状态筛选'),
  intensity_level: z.enum(['low', 'moderate', 'high']).optional().describe('按强度水平筛选'),
  min_satisfaction: z.number().int().min(1).max(10).optional().describe('最低满意度'),
  min_mood_after: z.number().int().min(1).max(10).optional().describe('活动后最低心情'),
  location: z.string().optional().describe('按地点筛选'),
  from: z.string().datetime().optional().describe('活动开始时间晚于此时间'),
  to: z.string().datetime().optional().describe('活动开始时间早于此时间'),
  search: z.string().optional().describe('在标题、描述、备注中搜索关键词'),
  tags: z.string().optional().describe('按标签筛选（逗号分隔）'),
  category_id: z.string().optional().describe('按分类ID筛选'),
  sort_by: z.enum(['started_at', 'satisfaction_level', 'mood_after', 'title', 'created_at']).default('started_at').describe('排序字段'),
  sort_order: z.enum(['asc', 'desc']).default('desc').describe('排序方向'),
  limit: z.number().min(1).max(100).default(20).describe('返回数量限制'),
  offset: z.number().min(0).default(0).describe('分页偏移'),
}).default({});

export const GetActivityParamsSchema = z.object({
  id: z.string().describe('活动ID'),
});

export const UpdateActivityParamsSchema = z.object({
  id: z.string().describe('活动ID'),
  title: z.string().optional().describe('活动标题'),
  description: z.string().optional().describe('活动描述'),
  activity_type: z.enum(['exercise', 'meditation', 'reading', 'music', 'socializing', 'gaming', 'walking', 'cooking', 'rest', 'creative', 'learning', 'other']).optional().describe('活动类型'),
  ended_at: z.string().datetime().optional().describe('活动结束时间'),
  mood_after: z.number().int().min(1).max(10).optional().describe('活动后心情'),
  energy_after: z.number().int().min(1).max(10).optional().describe('活动后能量水平'),
  satisfaction_level: z.number().int().min(1).max(10).optional().describe('满意度'),
  intensity_level: z.enum(['low', 'moderate', 'high']).optional().describe('强度水平'),
  notes: z.string().optional().describe('活动备注'),
  insights: z.string().optional().describe('活动感悟'),
  gratitude: z.string().optional().describe('感恩记录'),
  status: z.enum(['active', 'completed', 'cancelled']).optional().describe('活动状态'),
  tags: z.array(z.string()).optional().describe('标签列表'),
});

// 时间线系统相关类型
export const GetTimelineItemsParamsSchema = z.object({
  type: z.enum(['task', 'activity', 'routine', 'habit', 'memory']).optional().describe('按条目类型筛选'),
  status: z.enum(['active', 'inactive', 'completed', 'cancelled', 'archived']).optional().describe('按状态筛选'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional().describe('按优先级筛选'),
  category_id: z.string().optional().describe('按分类ID筛选'),
  search: z.string().optional().describe('跨所有类型的全文搜索'),
  tags: z.string().optional().describe('按标签筛选（逗号分隔）'),
  is_highlight: z.boolean().optional().describe('只显示重要条目（适用于记忆）'),
  memory_type: z.enum(['note', 'link', 'file', 'thought', 'quote', 'insight']).optional().describe('记忆类型筛选'),
  render_on_timeline: z.boolean().optional().describe('是否在时间线上显示'),
  sort_by: z.enum(['created_at', 'updated_at', 'title', 'priority', 'captured_at', 'salience_score']).default('created_at').describe('排序字段'),
  sort_order: z.enum(['asc', 'desc']).default('desc').describe('排序方向'),
  limit: z.number().min(1).max(100).default(50).describe('返回数量限制'),
  offset: z.number().min(0).default(0).describe('分页偏移'),
}).default({});

export const CreateTimelineItemParamsSchema = z.object({
  type: z.enum(['task', 'activity', 'routine', 'habit', 'memory']).describe('条目类型'),
  title: z.string().min(1).max(500).describe('标题'),
  description: z.string().optional().describe('描述'),
  start_time: z.string().datetime().optional().describe('开始时间'),
  end_time: z.string().datetime().optional().describe('结束时间'),
  category_id: z.string().optional().describe('分类ID'),
  tags: z.array(z.string()).default([]).describe('标签列表'),
  status: z.enum(['active', 'inactive', 'completed', 'cancelled', 'archived']).default('active').describe('状态'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium').describe('优先级'),
  metadata: z.record(z.any()).default({}).describe('额外元数据'),
});

export const GetTimelineInsightsParamsSchema = z.object({
  date_range: z.enum(['today', 'week', 'month', 'quarter', 'year']).default('week').describe('分析时间范围'),
  timezone: z.string().optional().describe('时区标识符'),
}).default({});

export const SearchAcrossTimelineParamsSchema = z.object({
  query: z.string().describe('搜索查询（支持自然语言）'),
  include_types: z.array(z.enum(['task', 'activity', 'routine', 'habit', 'memory'])).optional().describe('包含的条目类型'),
  date_from: z.string().datetime().optional().describe('搜索起始日期'),
  date_to: z.string().datetime().optional().describe('搜索结束日期'),
  context_depth: z.number().int().min(1).max(5).default(2).describe('上下文深度（相关度搜索范围）'),
  limit: z.number().min(1).max(100).default(20).describe('返回数量限制'),
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

// 活动管理类型
export type CreateActivityParams = z.infer<typeof CreateActivityParamsSchema>;
export type SearchActivitiesParams = z.infer<typeof SearchActivitiesParamsSchema>;
export type GetActivityParams = z.infer<typeof GetActivityParamsSchema>;
export type UpdateActivityParams = z.infer<typeof UpdateActivityParamsSchema>;

// 时间线系统类型
export type GetTimelineItemsParams = z.infer<typeof GetTimelineItemsParamsSchema>;
export type CreateTimelineItemParams = z.infer<typeof CreateTimelineItemParamsSchema>;
export type GetTimelineInsightsParams = z.infer<typeof GetTimelineInsightsParamsSchema>;
export type SearchAcrossTimelineParams = z.infer<typeof SearchAcrossTimelineParamsSchema>;

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
  by_emotion?: Record<string, number>;
  recent_count: number;
  highlights?: number;
}

// 活动统计类型
export interface ActivityStats {
  total: number;
  by_type: Record<string, number>;
  by_status: Record<string, number>;
  by_intensity?: Record<string, number>;
  recent_count: number;
  avg_satisfaction?: number;
  avg_mood_improvement?: number;
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
  start_at: string;
  end_at?: string | null;
  duration_minutes?: number | null;
  note?: string | null;
  source: 'timer' | 'manual' | 'import';
  // Joined fields for display
  task_title?: string;
  category_name?: string;
  category_color?: string;
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
  // Preferred server locale for responses. 'auto' attempts to detect from tool arguments.
  locale?: 'en' | 'zh' | 'auto';
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

// ===== AI Tasks Types =====
// AI task guardrails
export const AITaskGuardrailsSchema = z.object({
  costCapUSD: z.number().nonnegative().nullable().optional().describe('Cost cap in USD'),
  timeCapMin: z.number().int().nonnegative().nullable().optional().describe('Time cap in minutes'),
  requiresHumanApproval: z.boolean().default(true).describe('Requires human approval before execution'),
  dataScopes: z.array(z.string()).default([]).describe('Data access scopes allowed'),
});

// AI task metadata
export const AITaskMetadataSchema = z.object({
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium').describe('Task priority'),
  tags: z.array(z.string()).default([]).describe('Task tags'),
});

// AI task execution result
export const AITaskExecutionResultSchema = z.object({
  output: z.string().optional().describe('Task output/result text'),
  artifacts: z.array(z.object({
    type: z.string().describe('Artifact type (file, url, etc)'),
    name: z.string().describe('Artifact name'),
    content: z.any().describe('Artifact content or reference'),
  })).optional().describe('Generated artifacts'),
  logs: z.array(z.string()).optional().describe('Execution logs'),
  metrics: z.record(z.any()).optional().describe('Execution metrics'),
});

// Get AI tasks params (for fetching queued tasks)
export const GetAITasksParamsSchema = z.object({
  agent_id: z.string().optional().describe('Filter by agent ID'),
  agent_name: z.string().optional().describe('Filter by agent name (e.g., "claude", "gpt-4")'),
  status: z.enum(['pending', 'assigned', 'in_progress', 'paused', 'completed', 'failed', 'cancelled']).optional().describe('Filter by status'),
  mode: z.enum(['plan_only', 'dry_run', 'execute']).optional().describe('Filter by execution mode'),
  task_type: z.string().optional().describe('Filter by task type (e.g., "coding", "research")'),
  limit: z.number().min(1).max(100).default(20).describe('Number of tasks to return'),
  offset: z.number().min(0).default(0).describe('Pagination offset'),
  sort_by: z.enum(['assigned_at', 'due_at', 'priority', 'updated_at']).default('assigned_at').describe('Sort field'),
  sort_order: z.enum(['asc', 'desc']).default('desc').describe('Sort order'),
}).default({});

// Get single AI task params
export const GetAITaskParamsSchema = z.object({
  id: z.string().describe('AI task ID'),
});

// Update AI task params (for agents to report progress/results)
export const UpdateAITaskParamsSchema = z.object({
  id: z.string().describe('AI task ID'),
  status: z.enum(['in_progress', 'completed', 'failed', 'paused']).optional().describe('Update task status'),
  execution_result: AITaskExecutionResultSchema.optional().describe('Task execution results'),
  actual_cost_usd: z.number().nonnegative().optional().describe('Actual cost incurred'),
  actual_duration_min: z.number().int().nonnegative().optional().describe('Actual duration in minutes'),
  progress_message: z.string().optional().describe('Progress update message'),
  error_message: z.string().optional().describe('Error message if failed'),
});

// Accept AI task params (for agents to accept assignment)
export const AcceptAITaskParamsSchema = z.object({
  id: z.string().describe('AI task ID to accept'),
  estimated_cost_usd: z.number().nonnegative().optional().describe('Estimated cost'),
  estimated_duration_min: z.number().int().nonnegative().optional().describe('Estimated duration'),
});

// AI Task type
export interface AITask {
  id: string;
  task_id: string;
  agent_id: string;
  objective: string;
  deliverables?: string;
  context?: string;
  acceptance_criteria?: string;
  task_type: string;
  dependencies: string[];
  mode: 'plan_only' | 'dry_run' | 'execute';
  guardrails: z.infer<typeof AITaskGuardrailsSchema>;
  metadata: z.infer<typeof AITaskMetadataSchema>;
  status: 'pending' | 'assigned' | 'in_progress' | 'paused' | 'completed' | 'failed' | 'cancelled';
  execution_result?: z.infer<typeof AITaskExecutionResultSchema>;
  estimated_cost_usd?: number;
  actual_cost_usd?: number;
  estimated_duration_min?: number;
  actual_duration_min?: number;
  assigned_at: string;
  started_at?: string;
  completed_at?: string;
  due_at?: string;
  created_at: string;
  updated_at: string;
  // Related task info (from join)
  task_title?: string;
  task_status?: string;
  // Agent info (from join)
  agent_name?: string;
  agent_vendor?: string;
}

// AI Tasks statistics
export interface AITaskStats {
  total: number;
  by_status: Record<string, number>;
  by_mode: Record<string, number>;
  by_task_type: Record<string, number>;
  pending_for_agent: number;
  in_progress: number;
  completed_today: number;
  failed_today: number;
  avg_completion_time: number;
  total_cost_today: number;
}

// Export param types
export type GetAITasksParams = z.infer<typeof GetAITasksParamsSchema>;
export type GetAITaskParams = z.infer<typeof GetAITaskParamsSchema>;
export type UpdateAITaskParams = z.infer<typeof UpdateAITaskParamsSchema>;
export type AcceptAITaskParams = z.infer<typeof AcceptAITaskParamsSchema>;
