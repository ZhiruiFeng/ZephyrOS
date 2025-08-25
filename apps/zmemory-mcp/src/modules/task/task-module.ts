import { AxiosInstance } from 'axios';
import {
  CreateTaskParams,
  UpdateTaskParams,
  SearchTasksParams,
  TaskMemory,
  TaskStats,
  OAuthError,
  AuthState,
} from '../../types.js';

export class TaskModule {
  constructor(
    private client: AxiosInstance,
    private authState: AuthState
  ) {}

  async createTask(params: CreateTaskParams): Promise<TaskMemory> {
    if (!this.isAuthenticated()) {
      throw new OAuthError('需要认证', 'authentication_required', '请先进行OAuth认证');
    }

    // Convert to the API format expected by zmemory
    const taskData = {
      type: 'task',
      content: {
        title: params.title,
        description: params.description,
        status: params.status,
        priority: params.priority,
        category: params.category,
        due_date: params.due_date,
        estimated_duration: params.estimated_duration,
        assignee: params.assignee,
        notes: params.notes,
      },
      tags: params.tags || [],
    };

    const response = await this.client.post('/api/tasks', taskData);
    return response.data;
  }

  async searchTasks(params: SearchTasksParams): Promise<TaskMemory[]> {
    if (!this.isAuthenticated()) {
      throw new OAuthError('需要认证', 'authentication_required', '请先进行OAuth认证');
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
    
    searchParams.set('limit', params.limit.toString());
    searchParams.set('offset', params.offset.toString());
    searchParams.set('sort_by', params.sort_by);
    searchParams.set('sort_order', params.sort_order);

    const response = await this.client.get(`/api/tasks?${searchParams.toString()}`);
    return response.data;
  }

  async getTask(id: string): Promise<TaskMemory> {
    if (!this.isAuthenticated()) {
      throw new OAuthError('需要认证', 'authentication_required', '请先进行OAuth认证');
    }

    const response = await this.client.get(`/api/tasks/${id}`);
    return response.data;
  }

  async updateTask(params: UpdateTaskParams): Promise<TaskMemory> {
    if (!this.isAuthenticated()) {
      throw new OAuthError('需要认证', 'authentication_required', '请先进行OAuth认证');
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

    const response = await this.client.put(`/api/tasks/${params.id}`, updateData);
    return response.data;
  }

  async getTaskStats(): Promise<TaskStats> {
    if (!this.isAuthenticated()) {
      throw new OAuthError('需要认证', 'authentication_required', '请先进行OAuth认证');
    }

    const response = await this.client.get('/api/tasks/stats');
    return response.data;
  }

  async getUpdatedTodayTasks(): Promise<TaskMemory[]> {
    if (!this.isAuthenticated()) {
      throw new OAuthError('需要认证', 'authentication_required', '请先进行OAuth认证');
    }

    const response = await this.client.get('/api/tasks/updated-today');
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