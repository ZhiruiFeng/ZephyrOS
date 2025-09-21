import Constants from 'expo-constants';
import { supabase } from '../utils/api';
import { TaskMemory, CreateTaskRequest, Category } from '../types/task';

// API Configuration
const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl || process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';
const API_BASE = API_BASE_URL.replace(/\/api$/, ''); // Remove /api suffix if present

console.log('🔗 ZMemory API Base URL:', API_BASE);

// Auth Token Manager
class AuthTokenManager {
  private cachedToken: string | null = null;
  private tokenExpiry: number = 0;
  private pendingRefresh: Promise<string | null> | null = null;

  async getValidToken(): Promise<string | null> {
    const now = Date.now();

    // Return cached token if still valid
    if (this.cachedToken && now < this.tokenExpiry) {
      return this.cachedToken;
    }

    // If already refreshing, wait for it
    if (this.pendingRefresh) {
      return this.pendingRefresh;
    }

    // Start refresh process
    this.pendingRefresh = this.refreshToken();
    const token = await this.pendingRefresh;
    this.pendingRefresh = null;

    return token;
  }

  private async refreshToken(): Promise<string | null> {
    try {
      if (!supabase) return null;

      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      if (token) {
        this.cachedToken = token;
        // Cache for 55 minutes (tokens typically expire in 60 minutes)
        this.tokenExpiry = Date.now() + (55 * 60 * 1000);
        console.log('🔐 Auth token cached successfully');
      } else {
        this.cachedToken = null;
        this.tokenExpiry = 0;
      }

      return token || null;
    } catch (error) {
      console.error('Failed to refresh auth token:', error);
      this.cachedToken = null;
      this.tokenExpiry = 0;
      return null;
    }
  }

  async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await this.getValidToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  clearCache(): void {
    this.cachedToken = null;
    this.tokenExpiry = 0;
    this.pendingRefresh = null;
  }
}

const authManager = new AuthTokenManager();


// Base API Client
class ZMemoryApiClient {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {

    const url = `${API_BASE}/api${endpoint}`;
    const authHeaders = await authManager.getAuthHeaders();


    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...authHeaders,
          ...options.headers,
        },
      });

      const contentType = response.headers.get('content-type');
      const isJson = contentType?.includes('application/json');

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

        if (isJson) {
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorData.message || errorMessage;
          } catch (e) {
            // Ignore JSON parsing errors for error responses
          }
        } else {
          try {
            const errorText = await response.text();
            if (errorText) errorMessage = errorText;
          } catch (e) {
            // Ignore text parsing errors
          }
        }

        console.error(`❌ API Error: ${errorMessage}`);
        throw new Error(errorMessage);
      }

      if (isJson) {
        const data = await response.json();
        return data as T;
      }

      // For non-JSON responses (like DELETE), return empty object
      return {} as T;
    } catch (error) {
      console.error(`❌ API Request Failed: ${url}`, error);
      throw error;
    }
  }

  // Task API Methods
  async getTasks(params?: {
    status?: string;
    priority?: string;
    category_id?: string;
    search?: string;
    limit?: number;
    offset?: number;
    sort_by?: string;
    sort_order?: string;
    root_tasks_only?: boolean;
    due_before?: string;
    due_after?: string;
  }): Promise<TaskMemory[]> {
    const searchParams = new URLSearchParams();

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, value.toString());
        }
      });
    }

    const endpoint = `/tasks${searchParams.toString() ? `?${searchParams}` : ''}`;
    const response = await this.request<TaskMemory[]>(endpoint);
    return Array.isArray(response) ? response : [];
  }

  async getTask(id: string): Promise<TaskMemory> {
    return this.request<TaskMemory>(`/tasks/${id}`);
  }

  async createTask(task: CreateTaskRequest): Promise<TaskMemory> {
    // Ensure the task follows the proper format
    const taskData = {
      type: 'task',
      content: {
        title: task.content.title,
        description: task.content.description || '',
        status: task.content.status || 'pending',
        priority: task.content.priority || 'medium',
        category_id: task.content.category_id,
        due_date: task.content.due_date,
        estimated_duration: task.content.estimated_duration,
        progress: task.content.progress || 0,
        assignee: task.content.assignee,
        notes: task.content.notes,
        parent_task_id: task.content.parent_task_id,
      },
      tags: task.tags || [],
    };

    return this.request<TaskMemory>('/tasks', {
      method: 'POST',
      body: JSON.stringify(taskData),
    });
  }

  async updateTask(id: string, updates: Partial<CreateTaskRequest>): Promise<TaskMemory> {
    const updateData: any = {};

    if (updates.content) {
      updateData.content = {};
      Object.entries(updates.content).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          // Allow empty strings for description, notes, assignee
          const fieldsAllowingEmpty = ['description', 'notes', 'assignee'];
          if (value === '' && !fieldsAllowingEmpty.includes(key)) {
            return;
          }
          updateData.content[key] = value;
        }
      });
    }

    if (updates.tags !== undefined) {
      updateData.tags = updates.tags;
    }

    return this.request<TaskMemory>(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  }

  async deleteTask(id: string): Promise<void> {
    await this.request(`/tasks/${id}`, {
      method: 'DELETE',
    });
  }

  // Category API Methods
  async getCategories(): Promise<Category[]> {
    const response = await this.request<{ categories: Category[] }>('/categories');
    return response.categories || [];
  }

  async createCategory(category: {
    name: string;
    description?: string;
    color?: string;
    icon?: string;
  }): Promise<Category> {
    const response = await this.request<{ category: Category }>('/categories', {
      method: 'POST',
      body: JSON.stringify(category),
    });
    return response.category;
  }

  async updateCategory(id: string, updates: Partial<Category>): Promise<Category> {
    const response = await this.request<{ category: Category }>(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return response.category;
  }

  async deleteCategory(id: string): Promise<void> {
    await this.request(`/categories/${id}`, {
      method: 'DELETE',
    });
  }

  // Timer API Methods
  async startTimer(taskId: string, options?: { autoSwitch?: boolean }): Promise<any> {
    return this.request(`/tasks/${taskId}/timer/start`, {
      method: 'POST',
      body: JSON.stringify(options || {}),
    });
  }

  async stopTimer(taskId: string, options?: { overrideEndAt?: string }): Promise<any> {
    return this.request(`/tasks/${taskId}/timer/stop`, {
      method: 'POST',
      body: JSON.stringify(options || {}),
    });
  }

  async getTaskTimeEntries(taskId: string): Promise<any[]> {
    const response = await this.request<any[]>(`/tasks/${taskId}/time-entries`);
    return Array.isArray(response) ? response : [];
  }

  // Clear auth cache (useful for logout)
  clearAuthCache(): void {
    authManager.clearCache();
  }
}

// Export singleton instance
export const zmemoryApi = new ZMemoryApiClient();

// Export types for convenience
export type { TaskMemory, CreateTaskRequest, Category };