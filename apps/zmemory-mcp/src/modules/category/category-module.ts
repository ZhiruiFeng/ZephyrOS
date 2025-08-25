import { AxiosInstance } from 'axios';
import {
  GetCategoriesParams,
  CreateCategoryParams,
  Category,
  OAuthError,
  AuthState,
} from '../../types.js';

export class CategoryModule {
  constructor(
    private client: AxiosInstance,
    private authState: AuthState
  ) {}

  async getCategories(params: GetCategoriesParams = {}): Promise<Category[]> {
    if (!this.isAuthenticated()) {
      throw new OAuthError('需要认证', 'authentication_required', '请先进行OAuth认证');
    }

    const response = await this.client.get('/api/categories');
    return response.data.categories || response.data;
  }

  async createCategory(params: CreateCategoryParams): Promise<Category> {
    if (!this.isAuthenticated()) {
      throw new OAuthError('需要认证', 'authentication_required', '请先进行OAuth认证');
    }

    const response = await this.client.post('/api/categories', params);
    return response.data.category || response.data;
  }

  async getCategory(id: string): Promise<Category> {
    if (!this.isAuthenticated()) {
      throw new OAuthError('需要认证', 'authentication_required', '请先进行OAuth认证');
    }

    const response = await this.client.get(`/api/categories/${id}`);
    return response.data.category || response.data;
  }

  async updateCategory(id: string, updates: Partial<CreateCategoryParams>): Promise<Category> {
    if (!this.isAuthenticated()) {
      throw new OAuthError('需要认证', 'authentication_required', '请先进行OAuth认证');
    }

    const response = await this.client.put(`/api/categories/${id}`, updates);
    return response.data.category || response.data;
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