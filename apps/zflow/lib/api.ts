// API 基础配置
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// 类型定义
export interface TaskContent {
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category?: 'work' | 'personal' | 'project' | 'meeting' | 'learning' | 'maintenance' | 'other';
  due_date?: string;
  estimated_duration?: number;
  progress?: number;
  assignee?: string;
  dependencies?: string[];
  subtasks?: string[];
  notes?: string;
  completion_date?: string;
}

export interface TaskMemory {
  id: string;
  type: 'task';
  content: TaskContent;
  tags: string[];
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface CreateTaskRequest {
  type: 'task';
  content: TaskContent;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface UpdateTaskRequest {
  type?: 'task';
  content?: Partial<TaskContent>;
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

  // 获取任务列表（支持丰富筛选）
  async getTasks(params?: {
    status?: TaskContent['status'];
    priority?: TaskContent['priority'];
    category?: TaskContent['category'];
    assignee?: string;
    tags?: string; // comma separated
    search?: string;
    due_before?: string;
    due_after?: string;
    created_before?: string;
    created_after?: string;
    limit?: number;
    offset?: number;
    sort_by?: 'created_at' | 'updated_at' | 'due_date' | 'priority' | 'title';
    sort_order?: 'asc' | 'desc';
  }): Promise<TaskMemory[]> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) searchParams.append(k, String(v));
      });
    }
    const queryString = searchParams.toString();
    const endpoint = `/api/tasks${queryString ? `?${queryString}` : ''}`;
    return this.request<TaskMemory[]>(endpoint);
  }

  // 获取单个任务
  async getTask(id: string): Promise<TaskMemory> {
    return this.request<TaskMemory>(`/api/tasks/${id}`);
  }

  // 创建任务
  async createTask(data: CreateTaskRequest): Promise<TaskMemory> {
    return this.request<TaskMemory>('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // 更新任务
  async updateTask(id: string, data: UpdateTaskRequest): Promise<TaskMemory> {
    return this.request<TaskMemory>(`/api/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // 更新任务状态（便捷）
  async updateTaskStatus(id: string, payload: { status: TaskContent['status']; notes?: string; progress?: number; }): Promise<TaskMemory> {
    return this.request<TaskMemory>(`/api/tasks/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  // 删除任务
  async deleteTask(id: string): Promise<{ message: string; id: string }> {
    return this.request<{ message: string; id: string }>(`/api/tasks/${id}`, {
      method: 'DELETE',
    });
  }

  // 任务统计
  async getTaskStats(params?: { from_date?: string; to_date?: string; assignee?: string; }): Promise<{
    total: number;
    by_status: Record<string, number>;
    by_priority: Record<string, number>;
    by_category: Record<string, number>;
    overdue: number;
    due_today: number;
    due_this_week: number;
    completion_rate: number;
    average_completion_time: number;
  }> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) searchParams.append(k, String(v));
      });
    }
    const queryString = searchParams.toString();
    const endpoint = `/api/tasks/stats${queryString ? `?${queryString}` : ''}`;
    return this.request(endpoint);
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