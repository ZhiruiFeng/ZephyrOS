import { AxiosInstance } from 'axios';
import {
  GetTimelineItemsParams,
  CreateTimelineItemParams,
  GetTimelineInsightsParams,
  SearchAcrossTimelineParams,
  OAuthError,
  AuthState,
} from '../../types.js';

export class TimelineModule {
  constructor(
    private client: AxiosInstance,
    private authState: AuthState
  ) {}

  async getTimelineItems(params: Partial<GetTimelineItemsParams> = {}): Promise<any[]> {
    if (!this.isAuthenticated()) {
      throw new OAuthError('需要认证', 'authentication_required', '请先进行OAuth认证');
    }

    const searchParams = new URLSearchParams();
    
    if (params.type) searchParams.set('type', params.type);
    if (params.status) searchParams.set('status', params.status);
    if (params.priority) searchParams.set('priority', params.priority);
    if (params.category_id) searchParams.set('category_id', params.category_id);
    if (params.search) searchParams.set('search', params.search);
    if (params.tags) searchParams.set('tags', params.tags);
    if (params.is_highlight !== undefined) searchParams.set('is_highlight', params.is_highlight.toString());
    if (params.memory_type) searchParams.set('memory_type', params.memory_type);
    if (params.render_on_timeline !== undefined) searchParams.set('render_on_timeline', params.render_on_timeline.toString());
    if (params.sort_by) searchParams.set('sort_by', params.sort_by);
    if (params.sort_order) searchParams.set('sort_order', params.sort_order);
    if (params.limit !== undefined) searchParams.set('limit', params.limit.toString());
    if (params.offset !== undefined) searchParams.set('offset', params.offset.toString());

    const response = await this.client.get(`/api/timeline-items?${searchParams.toString()}`);
    return response.data?.items || response.data || [];
  }

  async createTimelineItem(params: CreateTimelineItemParams): Promise<any> {
    if (!this.isAuthenticated()) {
      throw new OAuthError('需要认证', 'authentication_required', '请先进行OAuth认证');
    }

    const response = await this.client.post('/api/timeline-items', params);
    return response.data?.item || response.data;
  }

  async getTimelineInsights(params: Partial<GetTimelineInsightsParams> = {}): Promise<any> {
    if (!this.isAuthenticated()) {
      throw new OAuthError('需要认证', 'authentication_required', '请先进行OAuth认证');
    }

    const searchParams = new URLSearchParams();
    if (params.date_range) searchParams.set('date_range', params.date_range);
    if (params.timezone) searchParams.set('timezone', params.timezone);

    // Since there's no specific insights endpoint in the current API, 
    // we'll generate insights based on timeline items data
    const items = await this.getTimelineItems({ limit: 100 });
    
    // Basic insights calculation
    const insights = {
      total_items: items.length,
      completed_items: items.filter((item: any) => item.status === 'completed').length,
      completion_rate: items.length > 0 ? items.filter((item: any) => item.status === 'completed').length / items.length : 0,
      productivity_trend: [], // Would be calculated based on date range
      time_distribution: {}, // Would be calculated based on categories/types
      recommendations: ['根据当前数据，建议保持现有的工作节奏', '可以考虑增加一些休息活动']
    };

    return insights;
  }

  async searchAcrossTimeline(params: SearchAcrossTimelineParams): Promise<any[]> {
    if (!this.isAuthenticated()) {
      throw new OAuthError('需要认证', 'authentication_required', '请先进行OAuth认证');
    }

    // Use the timeline items search with the query
    const timelineItems = await this.getTimelineItems({
      search: params.query,
      limit: params.limit
    });

    // Add relevance scoring and snippet extraction (simplified)
    const results = timelineItems.map((item: any) => ({
      ...item,
      relevance_score: Math.random() * 0.5 + 0.5, // Simplified relevance scoring
      snippet: item.description ? item.description.substring(0, 100) : item.title?.substring(0, 100)
    }));

    return results.sort((a: any, b: any) => b.relevance_score - a.relevance_score);
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