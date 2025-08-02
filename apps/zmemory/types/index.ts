// API 响应类型
export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}

// 记忆类型
export interface Memory {
  id: string;
  type: string;
  content: any;
  tags?: string[];
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// 创建记忆请求
export interface CreateMemoryRequest {
  type: string;
  content: any;
  tags?: string[];
  metadata?: Record<string, any>;
}

// 更新记忆请求
export interface UpdateMemoryRequest {
  type?: string;
  content?: any;
  tags?: string[];
  metadata?: Record<string, any>;
}

// 查询参数
export interface QueryParams {
  type?: string;
  limit?: number;
  offset?: number;
}

// 健康检查响应
export interface HealthResponse {
  status: string;
  timestamp: string;
  service: string;
  version: string;
} 