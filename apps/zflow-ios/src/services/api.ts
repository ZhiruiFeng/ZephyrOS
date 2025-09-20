import { Task, CreateTaskRequest, UpdateTaskRequest, TaskParams, ApiResponse } from '../types/Task';

// API配置
const API_BASE_URL = __DEV__ 
  ? 'http://localhost:3001'  // 开发环境
  : 'https://your-production-api.com'; // 生产环境

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseURL}${endpoint}`;
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      console.error('API request failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // 获取任务列表
  async getTasks(params?: TaskParams): Promise<ApiResponse<Task[]>> {
    const queryParams = new URLSearchParams();
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }

    const endpoint = `/api/tasks${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.request<Task[]>(endpoint);
  }

  // 获取单个任务
  async getTask(id: string): Promise<ApiResponse<Task>> {
    return this.request<Task>(`/api/tasks/${id}`);
  }

  // 创建任务
  async createTask(task: CreateTaskRequest): Promise<ApiResponse<Task>> {
    return this.request<Task>('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(task),
    });
  }

  // 更新任务
  async updateTask(id: string, task: UpdateTaskRequest): Promise<ApiResponse<Task>> {
    return this.request<Task>(`/api/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(task),
    });
  }

  // 更新任务状态
  async updateTaskStatus(
    id: string, 
    status: string, 
    notes?: string, 
    progress?: number
  ): Promise<ApiResponse<Task>> {
    return this.request<Task>(`/api/tasks/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, notes, progress }),
    });
  }

  // 删除任务
  async deleteTask(id: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/api/tasks/${id}`, {
      method: 'DELETE',
    });
  }

  // 获取任务统计
  async getTaskStats(): Promise<ApiResponse<any>> {
    return this.request<any>('/api/tasks/stats');
  }

  // 健康检查
  async healthCheck(): Promise<ApiResponse<any>> {
    return this.request<any>('/api/health');
  }
}

// 导出单例实例
export const apiClient = new ApiClient();
export default apiClient;
