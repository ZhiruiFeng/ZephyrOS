import { AxiosInstance } from 'axios';
import {
  Memory,
  SearchMemoriesParams,
  OAuthError,
  AuthState,
} from '../../types.js';

export class SearchModule {
  constructor(
    private client: AxiosInstance,
    private authState: AuthState
  ) {}

  async searchMemories(params: Partial<SearchMemoriesParams> = {}): Promise<Memory[]> {
    if (!this.isAuthenticated()) {
      throw new OAuthError('需要认证', 'authentication_required', '请先进行OAuth认证');
    }

    const searchParams = new URLSearchParams();
    
    // Enhanced parameters that match ZMemory API
    if (params.memory_type) searchParams.set('memory_type', params.memory_type);
    if (params.status) searchParams.set('status', params.status);
    if (params.is_highlight !== undefined) searchParams.set('is_highlight', params.is_highlight.toString());
    if (params.search) searchParams.set('search', params.search);
    if (params.tags) searchParams.set('tags', params.tags);
    if (params.place_name) searchParams.set('place_name', params.place_name);
    if (params.min_emotion_valence !== undefined) searchParams.set('min_emotion_valence', params.min_emotion_valence.toString());
    if (params.max_emotion_valence !== undefined) searchParams.set('max_emotion_valence', params.max_emotion_valence.toString());
    if (params.min_salience !== undefined) searchParams.set('min_salience', params.min_salience.toString());
    if (params.captured_from) searchParams.set('captured_from', params.captured_from);
    if (params.captured_to) searchParams.set('captured_to', params.captured_to);
    if (params.near_lat !== undefined) searchParams.set('near_lat', params.near_lat.toString());
    if (params.near_lng !== undefined) searchParams.set('near_lng', params.near_lng.toString());
    if (params.distance_km !== undefined) searchParams.set('distance_km', params.distance_km.toString());
    if (params.category_id) searchParams.set('category_id', params.category_id);
    if (params.sort_by) searchParams.set('sort_by', params.sort_by);
    if (params.sort_order) searchParams.set('sort_order', params.sort_order);
    if (params.limit !== undefined) searchParams.set('limit', params.limit.toString());
    if (params.offset !== undefined) searchParams.set('offset', params.offset.toString());
    
    const response = await this.client.get(`/api/memories?${searchParams.toString()}`);
    return response.data || [];
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