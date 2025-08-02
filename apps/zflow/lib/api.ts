// API 基础配置
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// 类型定义
export interface Memory {
  id: string;
  type: string;
  content: any;
  tags?: string[];
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface CreateMemoryRequest {
  type: string;
  content: any;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface UpdateMemoryRequest {
  type?: string;
  content?: any;
  tags?: string[];
  metadata?: Record<string, any>;
}

// API 客户端类
class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // 获取记忆列表
  async getMemories(params?: {
    type?: string;
    limit?: number;
    offset?: number;
  }): Promise<Memory[]> {
    const searchParams = new URLSearchParams();
    if (params?.type) searchParams.append('type', params.type);
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.offset) searchParams.append('offset', params.offset.toString());

    const queryString = searchParams.toString();
    const endpoint = `/api/memories${queryString ? `?${queryString}` : ''}`;
    
    return this.request<Memory[]>(endpoint);
  }

  // 获取单个记忆
  async getMemory(id: string): Promise<Memory> {
    return this.request<Memory>(`/api/memories/${id}`);
  }

  // 创建记忆
  async createMemory(data: CreateMemoryRequest): Promise<Memory> {
    return this.request<Memory>('/api/memories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // 更新记忆
  async updateMemory(id: string, data: UpdateMemoryRequest): Promise<Memory> {
    return this.request<Memory>(`/api/memories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // 删除记忆
  async deleteMemory(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/api/memories/${id}`, {
      method: 'DELETE',
    });
  }

  // 健康检查
  async healthCheck(): Promise<{
    status: string;
    timestamp: string;
    service: string;
    version: string;
  }> {
    return this.request('/api/health');
  }
}

// 导出 API 客户端实例
export const apiClient = new ApiClient(API_BASE_URL); 