import { AxiosInstance } from 'axios';
import {
  CreateTaskParams,
  UpdateTaskParams,
  SearchTasksParams,
  TaskMemory,
  TaskStats,
  OAuthError,
  AuthState,
  Category,
} from '../../types.js';

export class TaskModule {
  constructor(
    private client: AxiosInstance,
    private authState: AuthState
  ) {}

  /**
   * Get the server's timezone for API calls
   * Agents typically run in the same environment/timezone as users
   */
  private getServerTimezone(): string {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch (error) {
      // Silently fallback to UTC to avoid JSON parsing issues in MCP
      return 'UTC';
    }
  }

  async createTask(params: CreateTaskParams): Promise<TaskMemory> {
    if (!this.isAuthenticated()) {
      throw new OAuthError('需要认证', 'authentication_required', '请先进行认证（OAuth或API密钥）');
    }

    // Handle category name to ID mapping
    let categoryId: string | undefined;
    if (params.category) {
      try {
        // Get all categories to find the matching one
        const categoriesResponse = await this.client.get('/api/categories');
        const categories: Category[] = categoriesResponse.data.categories || categoriesResponse.data;
        
        // Find category by name (case-insensitive)
        const matchedCategory = categories.find(cat => 
          cat.name.toLowerCase() === params.category!.toLowerCase()
        );
        
        if (matchedCategory) {
          categoryId = matchedCategory.id;
        } else {
          console.warn(`Category "${params.category}" not found. Available categories: ${categories.map(c => c.name).join(', ')}`);
        }
      } catch (error) {
        console.warn('Failed to fetch categories for mapping:', error);
      }
    }

    // Convert to the API format expected by zmemory
    const taskData = {
      type: 'task',
      content: {
        title: params.title,
        description: params.description,
        status: params.status,
        priority: params.priority,
        category_id: categoryId, // Use the resolved category ID
        due_date: params.due_date,
        estimated_duration: params.estimated_duration,
        assignee: params.assignee,
        notes: params.notes,
      },
      tags: params.tags || [],
    };

    // Add timezone parameter to query string if due_date is provided
    const urlSuffix = (params.due_date && !params.timezone) 
      ? `?timezone=${encodeURIComponent(this.getServerTimezone())}`
      : (params.due_date && params.timezone)
        ? `?timezone=${encodeURIComponent(params.timezone)}`
        : '';
    
    const createUrl = `/api/tasks${urlSuffix}`;
    const response = await this.client.post(createUrl, taskData);
    return response.data;
  }

  async searchTasks(params: SearchTasksParams): Promise<TaskMemory[]> {
    if (!this.isAuthenticated()) {
      throw new OAuthError('需要认证', 'authentication_required', '请先进行认证（OAuth或API密钥）');
    }

    const searchParams = new URLSearchParams();
    
    // Add all search parameters
    if (params.status) searchParams.set('status', params.status);
    if (params.priority) searchParams.set('priority', params.priority);
    if (params.category) searchParams.set('category', params.category);
    if (params.assignee) searchParams.set('assignee', params.assignee);
    if (params.keyword) searchParams.set('search', params.keyword);
    if (params.tags && params.tags.length > 0) searchParams.set('tags', params.tags.join(','));
    if (params.due_after) searchParams.set('due_after', params.due_after);
    if (params.due_before) searchParams.set('due_before', params.due_before);
    if (params.created_after) searchParams.set('created_after', params.created_after);
    if (params.created_before) searchParams.set('created_before', params.created_before);
    
    // Add timezone if any date parameters are provided and timezone is not already specified
    const hasDateParams = params.due_after || params.due_before || params.created_after || params.created_before;
    if (hasDateParams) {
      const timezone = params.timezone || this.getServerTimezone();
      searchParams.set('timezone', timezone);
    }
    
    searchParams.set('limit', params.limit.toString());
    searchParams.set('offset', params.offset.toString());
    searchParams.set('sort_by', params.sort_by);
    searchParams.set('sort_order', params.sort_order);

    const response = await this.client.get(`/api/tasks?${searchParams.toString()}`);
    return response.data;
  }

  async getTask(id: string): Promise<TaskMemory> {
    if (!this.isAuthenticated()) {
      throw new OAuthError('需要认证', 'authentication_required', '请先进行认证（OAuth或API密钥）');
    }

    const response = await this.client.get(`/api/tasks/${id}`);
    return response.data;
  }

  async updateTask(params: UpdateTaskParams): Promise<TaskMemory> {
    if (!this.isAuthenticated()) {
      throw new OAuthError('需要认证', 'authentication_required', '请先进行认证（OAuth或API密钥）');
    }

    const updateData: any = { type: 'task' };
    
    // Build content object with only provided fields
    if (params.title || params.description || params.status || params.priority || 
        params.category || params.due_date || params.estimated_duration || 
        params.progress || params.assignee || params.notes) {
      updateData.content = {};
      
      if (params.title !== undefined) updateData.content.title = params.title;
      if (params.description !== undefined) updateData.content.description = params.description;
      if (params.status !== undefined) updateData.content.status = params.status;
      if (params.priority !== undefined) updateData.content.priority = params.priority;
      if (params.category !== undefined) updateData.content.category = params.category;
      if (params.due_date !== undefined) updateData.content.due_date = params.due_date;
      if (params.estimated_duration !== undefined) updateData.content.estimated_duration = params.estimated_duration;
      if (params.progress !== undefined) updateData.content.progress = params.progress;
      if (params.assignee !== undefined) updateData.content.assignee = params.assignee;
      if (params.notes !== undefined) updateData.content.notes = params.notes;
    }

    if (params.tags !== undefined) {
      updateData.tags = params.tags;
    }

    // Add timezone parameter to query string if due_date is being updated
    const urlSuffix = (params.due_date && !params.timezone) 
      ? `?timezone=${encodeURIComponent(this.getServerTimezone())}`
      : (params.due_date && params.timezone)
        ? `?timezone=${encodeURIComponent(params.timezone)}`
        : '';
    
    const updateUrl = `/api/tasks/${params.id}${urlSuffix}`;
    const response = await this.client.put(updateUrl, updateData);
    return response.data;
  }

  async getTaskStats(): Promise<TaskStats> {
    if (!this.isAuthenticated()) {
      throw new OAuthError('需要认证', 'authentication_required', '请先进行认证（OAuth或API密钥）');
    }

    const response = await this.client.get('/api/tasks/stats');
    return response.data;
  }

  async getTaskUpdatesForToday(timezone?: string): Promise<{ tasks: TaskMemory[], total: number, date_range: { start: string, end: string } }> {
    if (!this.isAuthenticated()) {
      throw new OAuthError('需要认证', 'authentication_required', '请先进行认证（OAuth或API密钥）');
    }

    // Use provided timezone or detect server timezone
    const tz = timezone || this.getServerTimezone();
    const searchParams = new URLSearchParams();
    searchParams.set('timezone', tz);

    const response = await this.client.get(`/api/tasks/updated-today?${searchParams.toString()}`);
    return response.data;
  }

  async getTaskUpdatesForDate(date: string, timezone?: string): Promise<{ tasks: TaskMemory[], total: number, date_range: { start: string, end: string } }> {
    if (!this.isAuthenticated()) {
      throw new OAuthError('需要认证', 'authentication_required', '请先进行认证（OAuth或API密钥）');
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new Error('日期格式无效，请使用 YYYY-MM-DD 格式（如 "2023-08-27"）');
    }

    // Use provided timezone or detect server timezone
    const tz = timezone || this.getServerTimezone();
    const searchParams = new URLSearchParams();
    searchParams.set('start_date', date);
    searchParams.set('end_date', date);
    searchParams.set('timezone', tz);

    const response = await this.client.get(`/api/tasks/updated-today?${searchParams.toString()}`);
    return response.data;
  }

  private isAuthenticated(): boolean {
    if (!this.authState.isAuthenticated || !this.authState.tokens) {
      return false;
    }

    if (this.authState.expiresAt && Date.now() >= this.authState.expiresAt) {
      return false;
    }

    return true;
  }
}