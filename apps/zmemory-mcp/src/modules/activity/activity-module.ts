import { AxiosInstance } from 'axios';
import {
  CreateActivityParams,
  SearchActivitiesParams,
  UpdateActivityParams,
  ActivityStats,
  OAuthError,
  AuthState,
} from '../../types.js';

export class ActivityModule {
  constructor(
    private client: AxiosInstance,
    private authState: AuthState
  ) {}

  async createActivity(params: CreateActivityParams): Promise<any> {
    if (!this.isAuthenticated()) {
      throw new OAuthError('需要认证', 'authentication_required', '请先进行OAuth认证');
    }

    const response = await this.client.post('/api/activities', params);
    return response.data;
  }

  async searchActivities(params: Partial<SearchActivitiesParams> = {}): Promise<any[]> {
    if (!this.isAuthenticated()) {
      throw new OAuthError('需要认证', 'authentication_required', '请先进行OAuth认证');
    }

    const searchParams = new URLSearchParams();
    
    if (params.activity_type) searchParams.set('activity_type', params.activity_type);
    if (params.status) searchParams.set('status', params.status);
    if (params.intensity_level) searchParams.set('intensity_level', params.intensity_level);
    if (params.min_satisfaction !== undefined) searchParams.set('min_satisfaction', params.min_satisfaction.toString());
    if (params.min_mood_after !== undefined) searchParams.set('min_mood_after', params.min_mood_after.toString());
    if (params.location) searchParams.set('location', params.location);
    if (params.from) searchParams.set('from', params.from);
    if (params.to) searchParams.set('to', params.to);
    if (params.search) searchParams.set('search', params.search);
    if (params.tags) searchParams.set('tags', params.tags);
    if (params.category_id) searchParams.set('category_id', params.category_id);
    if (params.sort_by) searchParams.set('sort_by', params.sort_by);
    if (params.sort_order) searchParams.set('sort_order', params.sort_order);
    if (params.limit !== undefined) searchParams.set('limit', params.limit.toString());
    if (params.offset !== undefined) searchParams.set('offset', params.offset.toString());

    const response = await this.client.get(`/api/activities?${searchParams.toString()}`);
    return response.data || [];
  }

  async getActivity(id: string): Promise<any> {
    if (!this.isAuthenticated()) {
      throw new OAuthError('需要认证', 'authentication_required', '请先进行OAuth认证');
    }

    const response = await this.client.get(`/api/activities/${id}`);
    return response.data;
  }

  async updateActivity(params: UpdateActivityParams): Promise<any> {
    if (!this.isAuthenticated()) {
      throw new OAuthError('需要认证', 'authentication_required', '请先进行OAuth认证');
    }

    const { id, ...updateData } = params;
    const response = await this.client.put(`/api/activities/${id}`, updateData);
    return response.data;
  }

  async getActivityStats(): Promise<ActivityStats> {
    if (!this.isAuthenticated()) {
      throw new OAuthError('需要认证', 'authentication_required', '请先进行OAuth认证');
    }

    const response = await this.client.get('/api/activities/stats');
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