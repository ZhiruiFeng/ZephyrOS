/**
 * ZMemory API Client
 * 
 * 负责与ZMemory API通信的客户端
 */

import axios, { AxiosInstance } from 'axios';
import {
  Memory,
  MemoryStats,
  ZMemoryConfig,
  ZMemoryError,
  OAuthError,
  AddMemoryParams,
  SearchMemoriesParams,
  UpdateMemoryParams,
  OAuthTokens,
  UserInfo,
  AuthState,
  AuthenticateParams,
  RefreshTokenParams,
} from './types.js';

export class ZMemoryClient {
  private client: AxiosInstance;
  private authState: AuthState = { isAuthenticated: false };

  constructor(private config: ZMemoryConfig) {
    this.client = axios.create({
      baseURL: config.apiUrl,
      timeout: config.timeout || 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // 响应拦截器，统一处理错误
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        const message = error.response?.data?.error || error.message || 'Unknown error';
        const status = error.response?.status;
        const code = error.response?.data?.code;
        
        // 处理 OAuth 错误
        if (status === 401 && error.response?.data?.error) {
          throw new OAuthError(message, error.response.data.error, error.response.data.error_description);
        }
        
        throw new ZMemoryError(message, code, status);
      }
    );

    // 请求拦截器，自动添加认证头
    this.client.interceptors.request.use(
      (config) => {
        if (this.authState.tokens?.access_token) {
          config.headers.Authorization = `Bearer ${this.authState.tokens.access_token}`;
        } else if (this.config.apiKey) {
          config.headers.Authorization = `Bearer ${this.config.apiKey}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );
  }

  /**
   * OAuth 认证流程
   */
  async authenticate(params: AuthenticateParams): Promise<{ authUrl: string; state: string }> {
    const state = params.state || this.generateRandomString(32);
    const scope = params.scope || this.config.oauth?.scope || 'tasks.write';
    
    const authUrl = new URL(`${this.config.apiUrl}/oauth/authorize`);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', params.client_id);
    authUrl.searchParams.set('redirect_uri', params.redirect_uri || this.config.oauth?.redirectUri || 'http://localhost:3000/callback');
    authUrl.searchParams.set('scope', scope);
    authUrl.searchParams.set('state', state);

    return { authUrl: authUrl.toString(), state };
  }

  /**
   * 使用授权码交换访问令牌
   */
  async exchangeCodeForToken(code: string, redirectUri: string, codeVerifier?: string): Promise<OAuthTokens> {
    const tokenData: any = {
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: this.config.oauth?.clientId || 'zmemory-mcp',
    };

    if (codeVerifier) {
      tokenData.code_verifier = codeVerifier;
    }

    const response = await this.client.post('/oauth/token', tokenData);
    const tokens: OAuthTokens = response.data;
    
    this.authState = {
      isAuthenticated: true,
      tokens,
      expiresAt: Date.now() + (tokens.expires_in * 1000),
    };

    return tokens;
  }

  /**
   * 刷新访问令牌
   */
  async refreshToken(refreshToken: string): Promise<OAuthTokens> {
    const tokenData: RefreshTokenParams = { refresh_token: refreshToken };
    
    const response = await this.client.post('/oauth/token', {
      grant_type: 'refresh_token',
      ...tokenData,
    });
    
    const tokens: OAuthTokens = response.data;
    
    this.authState = {
      isAuthenticated: true,
      tokens,
      expiresAt: Date.now() + (tokens.expires_in * 1000),
    };

    return tokens;
  }

  /**
   * 获取用户信息
   */
  async getUserInfo(): Promise<UserInfo> {
    const response = await this.client.get('/oauth/userinfo');
    const userInfo: UserInfo = response.data;
    
    this.authState.userInfo = userInfo;
    return userInfo;
  }

  /**
   * 检查认证状态
   */
  isAuthenticated(): boolean {
    if (!this.authState.isAuthenticated || !this.authState.tokens) {
      return false;
    }

    // 检查令牌是否过期
    if (this.authState.expiresAt && Date.now() >= this.authState.expiresAt) {
      return false;
    }

    return true;
  }

  /**
   * 获取认证状态
   */
  getAuthState(): AuthState {
    return { ...this.authState };
  }

  /**
   * 设置访问令牌（用于手动设置）
   */
  setAccessToken(accessToken: string): void {
    this.authState = {
      isAuthenticated: true,
      tokens: {
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: 3600,
      },
      expiresAt: Date.now() + (3600 * 1000),
    };
  }

  /**
   * 清除认证状态
   */
  clearAuth(): void {
    this.authState = { isAuthenticated: false };
  }

  /**
   * 添加新记忆
   */
  async addMemory(params: AddMemoryParams): Promise<Memory> {
    // 确保已认证
    if (!this.isAuthenticated()) {
      throw new OAuthError('需要认证', 'authentication_required', '请先进行OAuth认证');
    }

    const response = await this.client.post('/api/memories', {
      type: params.type,
      content: params.content,
      tags: params.tags,
      metadata: params.metadata,
    });
    return response.data;
  }

  /**
   * 搜索记忆
   */
  async searchMemories(params: Partial<SearchMemoriesParams> = {}): Promise<Memory[]> {
    // 确保已认证
    if (!this.isAuthenticated()) {
      throw new OAuthError('需要认证', 'authentication_required', '请先进行OAuth认证');
    }

    const searchParams = new URLSearchParams();
    
    if (params.type) searchParams.set('type', params.type);
    if (params.limit) searchParams.set('limit', params.limit.toString());
    if (params.offset) searchParams.set('offset', params.offset.toString());
    
    // 对于复杂搜索，我们可能需要发送POST请求到专门的搜索端点
    // 但目前使用现有的GET接口
    const response = await this.client.get(`/api/memories?${searchParams.toString()}`);
    let memories: Memory[] = response.data;

    // 客户端过滤（如果API不支持所有过滤选项）
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

  /**
   * 获取特定记忆
   */
  async getMemory(id: string): Promise<Memory> {
    // 确保已认证
    if (!this.isAuthenticated()) {
      throw new OAuthError('需要认证', 'authentication_required', '请先进行OAuth认证');
    }

    const response = await this.client.get(`/api/memories/${id}`);
    return response.data;
  }

  /**
   * 更新记忆
   */
  async updateMemory(params: UpdateMemoryParams): Promise<Memory> {
    // 确保已认证
    if (!this.isAuthenticated()) {
      throw new OAuthError('需要认证', 'authentication_required', '请先进行OAuth认证');
    }

    const updateData: any = {};
    if (params.content !== undefined) updateData.content = params.content;
    if (params.tags !== undefined) updateData.tags = params.tags;
    if (params.metadata !== undefined) updateData.metadata = params.metadata;

    const response = await this.client.put(`/api/memories/${params.id}`, updateData);
    return response.data;
  }

  /**
   * 删除记忆
   */
  async deleteMemory(id: string): Promise<boolean> {
    // 确保已认证
    if (!this.isAuthenticated()) {
      throw new OAuthError('需要认证', 'authentication_required', '请先进行OAuth认证');
    }

    await this.client.delete(`/api/memories/${id}`);
    return true;
  }

  /**
   * 获取统计信息
   */
  async getStats(): Promise<MemoryStats> {
    // 确保已认证
    if (!this.isAuthenticated()) {
      throw new OAuthError('需要认证', 'authentication_required', '请先进行OAuth认证');
    }

    try {
      // 尝试使用专门的统计端点
      const response = await this.client.get('/api/tasks/stats');
      return response.data || this.getDefaultStats();
    } catch (error) {
      try {
        // 如果没有统计端点，则基于所有记忆计算统计
        const memories = await this.searchMemories({ limit: 1000, offset: 0 });
        return this.calculateStats(memories);
      } catch (searchError) {
        // 如果搜索也失败，返回默认统计
        return this.getDefaultStats();
      }
    }
  }

  private getDefaultStats(): MemoryStats {
    return {
      total: 0,
      by_type: {},
      by_status: {},
      by_priority: {},
      recent_count: 0,
    };
  }

  /**
   * 计算统计信息
   */
  private calculateStats(memories: Memory[]): MemoryStats {
    const stats: MemoryStats = {
      total: memories.length,
      by_type: {},
      by_status: {},
      by_priority: {},
      recent_count: 0,
    };

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    memories.forEach(memory => {
      // 按类型统计
      stats.by_type[memory.type] = (stats.by_type[memory.type] || 0) + 1;
      
      // 按状态统计
      const status = memory.content?.status || 'unknown';
      stats.by_status[status] = (stats.by_status[status] || 0) + 1;
      
      // 按优先级统计
      const priority = memory.content?.priority || 'unknown';
      stats.by_priority[priority] = (stats.by_priority[priority] || 0) + 1;
      
      // 最近创建数量
      if (new Date(memory.created_at) > oneDayAgo) {
        stats.recent_count++;
      }
    });

    return stats;
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.get('/api/health');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 生成随机字符串
   */
  private generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}
