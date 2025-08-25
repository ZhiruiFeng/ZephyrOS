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
    
    if (params.type) searchParams.set('type', params.type);
    if (params.limit) searchParams.set('limit', params.limit.toString());
    if (params.offset) searchParams.set('offset', params.offset.toString());
    
    const response = await this.client.get(`/api/memories?${searchParams.toString()}`);
    let memories: Memory[] = response.data;

    if (params.status || params.priority || params.category || params.tags || params.keyword) {
      memories = memories.filter(memory => {
        if (params.status && memory.content?.status !== params.status) return false;
        if (params.priority && memory.content?.priority !== params.priority) return false;
        if (params.category && memory.content?.category !== params.category) return false;
        
        if (params.tags && params.tags.length > 0) {
          const memoryTags = memory.tags || [];
          if (!params.tags.some(tag => memoryTags.includes(tag))) return false;
        }
        
        if (params.keyword) {
          const keyword = params.keyword.toLowerCase();
          const title = (memory.content?.title || '').toLowerCase();
          const description = (memory.content?.description || '').toLowerCase();
          if (!title.includes(keyword) && !description.includes(keyword)) return false;
        }
        
        return true;
      });
    }

    return memories;
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