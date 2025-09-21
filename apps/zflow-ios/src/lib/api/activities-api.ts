import { API_BASE, authenticatedFetch, ApiError } from './api-base';

// Activity Types
export interface Activity {
  id: string;
  type: 'activity';
  title: string;
  description?: string;
  activity_type: 'routine' | 'habit' | 'goal' | 'project' | 'event' | 'meeting' | 'break' | 'commute' | 'exercise' | 'meal' | 'social' | 'learning' | 'entertainment' | 'work' | 'personal' | 'other';
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category_id?: string;
  tags: string[];
  start_time?: string;
  end_time?: string;
  duration_minutes?: number;
  location?: string;
  participants?: string[];
  notes?: string;
  energy_level?: number; // 1-10
  mood_before?: number; // 1-10
  mood_after?: number; // 1-10
  completion_percentage?: number; // 0-100
  recurring_pattern?: {
    type: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number;
    days_of_week?: number[]; // 0=Sunday, 1=Monday, etc.
    day_of_month?: number;
    end_date?: string;
  };
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface ActivityCreateRequest {
  title: string;
  description?: string;
  activity_type: Activity['activity_type'];
  status?: Activity['status'];
  priority?: Activity['priority'];
  category_id?: string;
  tags?: string[];
  start_time?: string;
  end_time?: string;
  duration_minutes?: number;
  location?: string;
  participants?: string[];
  notes?: string;
  energy_level?: number;
  mood_before?: number;
  completion_percentage?: number;
  recurring_pattern?: Activity['recurring_pattern'];
}

export interface ActivityUpdateRequest {
  title?: string;
  description?: string;
  activity_type?: Activity['activity_type'];
  status?: Activity['status'];
  priority?: Activity['priority'];
  category_id?: string;
  tags?: string[];
  start_time?: string;
  end_time?: string;
  duration_minutes?: number;
  location?: string;
  participants?: string[];
  notes?: string;
  energy_level?: number;
  mood_before?: number;
  mood_after?: number;
  completion_percentage?: number;
  recurring_pattern?: Activity['recurring_pattern'];
}

export interface ActivityQueryParams {
  activity_type?: Activity['activity_type'];
  status?: Activity['status'];
  priority?: Activity['priority'];
  category_id?: string;
  tags?: string[];
  search?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  include_recurring?: boolean;
}

export const activitiesApi = {
  async list(params?: ActivityQueryParams): Promise<Activity[]> {
    const searchParams = new URLSearchParams();

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            searchParams.append(key, value.join(','));
          } else {
            searchParams.append(key, value.toString());
          }
        }
      });
    }

    const endpoint = `/activities${searchParams.toString() ? `?${searchParams}` : ''}`;
    const response = await authenticatedFetch(`${API_BASE}${endpoint}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to fetch activities' }));
      throw new ApiError(response.status, errorData.error || 'Failed to fetch activities');
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  },

  async get(id: string): Promise<Activity> {
    const response = await authenticatedFetch(`${API_BASE}/activities/${id}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to fetch activity' }));
      throw new ApiError(response.status, errorData.error || 'Failed to fetch activity');
    }

    return response.json();
  },

  async create(data: ActivityCreateRequest): Promise<Activity> {
    const activityData = {
      type: 'activity',
      ...data,
      status: data.status || 'active',
      priority: data.priority || 'medium',
      tags: data.tags || [],
      completion_percentage: data.completion_percentage || 0,
    };

    const response = await authenticatedFetch(`${API_BASE}/activities`, {
      method: 'POST',
      body: JSON.stringify(activityData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to create activity' }));
      throw new ApiError(response.status, errorData.error || 'Failed to create activity');
    }

    return response.json();
  },

  async update(id: string, data: ActivityUpdateRequest): Promise<Activity> {
    const response = await authenticatedFetch(`${API_BASE}/activities/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to update activity' }));
      throw new ApiError(response.status, errorData.error || 'Failed to update activity');
    }

    return response.json();
  },

  async delete(id: string): Promise<void> {
    const response = await authenticatedFetch(`${API_BASE}/activities/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to delete activity' }));
      throw new ApiError(response.status, errorData.error || 'Failed to delete activity');
    }
  },

  // Convenience methods for common queries
  async getActive(): Promise<Activity[]> {
    return this.list({
      status: 'active',
      sort_by: 'start_time',
      sort_order: 'asc',
    });
  },

  async getCompleted(limit: number = 20): Promise<Activity[]> {
    return this.list({
      status: 'completed',
      sort_by: 'end_time',
      sort_order: 'desc',
      limit,
    });
  },

  async getByType(activityType: Activity['activity_type']): Promise<Activity[]> {
    return this.list({
      activity_type: activityType,
      sort_by: 'start_time',
      sort_order: 'desc',
    });
  },

  async getByCategory(categoryId: string): Promise<Activity[]> {
    return this.list({
      category_id: categoryId,
      sort_by: 'start_time',
      sort_order: 'desc',
    });
  },

  async getByDateRange(startDate: string, endDate: string): Promise<Activity[]> {
    return this.list({
      start_date: startDate,
      end_date: endDate,
      sort_by: 'start_time',
      sort_order: 'asc',
    });
  },

  async getUpcoming(limit: number = 10): Promise<Activity[]> {
    const now = new Date().toISOString();
    return this.list({
      start_date: now,
      status: 'active',
      sort_by: 'start_time',
      sort_order: 'asc',
      limit,
    });
  },

  async search(query: string): Promise<Activity[]> {
    return this.list({
      search: query,
      sort_by: 'updated_at',
      sort_order: 'desc',
    });
  },

  // Status update shortcuts
  async markCompleted(id: string, moodAfter?: number): Promise<Activity> {
    const updateData: ActivityUpdateRequest = {
      status: 'completed',
      completion_percentage: 100,
      end_time: new Date().toISOString(),
    };

    if (moodAfter !== undefined) {
      updateData.mood_after = moodAfter;
    }

    return this.update(id, updateData);
  },

  async markPaused(id: string): Promise<Activity> {
    return this.update(id, {
      status: 'paused',
    });
  },

  async markCancelled(id: string): Promise<Activity> {
    return this.update(id, {
      status: 'cancelled',
      end_time: new Date().toISOString(),
    });
  },

  async resume(id: string): Promise<Activity> {
    return this.update(id, {
      status: 'active',
    });
  },

  // Progress tracking
  async updateProgress(id: string, percentage: number): Promise<Activity> {
    return this.update(id, {
      completion_percentage: Math.max(0, Math.min(100, percentage)),
    });
  },

  async addProgress(id: string, increment: number): Promise<Activity> {
    const activity = await this.get(id);
    const currentProgress = activity.completion_percentage || 0;
    const newProgress = Math.max(0, Math.min(100, currentProgress + increment));

    return this.update(id, {
      completion_percentage: newProgress,
    });
  },

  // Recurring activities
  async getRecurring(): Promise<Activity[]> {
    return this.list({
      include_recurring: true,
      sort_by: 'created_at',
      sort_order: 'desc',
    });
  },

  async createRecurringInstance(parentId: string, instanceDate: string): Promise<Activity> {
    const response = await authenticatedFetch(`${API_BASE}/activities/${parentId}/instances`, {
      method: 'POST',
      body: JSON.stringify({ instance_date: instanceDate }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to create recurring instance' }));
      throw new ApiError(response.status, errorData.error || 'Failed to create recurring instance');
    }

    return response.json();
  },

  async updateRecurringPattern(id: string, pattern: Activity['recurring_pattern']): Promise<Activity> {
    return this.update(id, {
      recurring_pattern: pattern,
    });
  },

  // Time tracking integration
  async startTimer(id: string): Promise<any> {
    const response = await authenticatedFetch(`${API_BASE}/activities/${id}/timer/start`, {
      method: 'POST',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to start activity timer' }));
      throw new ApiError(response.status, errorData.error || 'Failed to start activity timer');
    }

    return response.json();
  },

  async stopTimer(id: string): Promise<any> {
    const response = await authenticatedFetch(`${API_BASE}/activities/${id}/timer/stop`, {
      method: 'POST',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to stop activity timer' }));
      throw new ApiError(response.status, errorData.error || 'Failed to stop activity timer');
    }

    return response.json();
  },

  // Analytics and insights
  async getStats(params?: {
    start_date?: string;
    end_date?: string;
    activity_type?: Activity['activity_type'];
    category_id?: string;
  }): Promise<{
    total_activities: number;
    completed_activities: number;
    total_time_minutes: number;
    avg_completion_rate: number;
    by_type: Record<string, number>;
    by_category: Record<string, number>;
    mood_trends: {
      avg_mood_before: number;
      avg_mood_after: number;
      mood_improvement: number;
    };
  }> {
    const searchParams = new URLSearchParams();

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, value.toString());
        }
      });
    }

    const endpoint = `/activities/stats${searchParams.toString() ? `?${searchParams}` : ''}`;
    const response = await authenticatedFetch(`${API_BASE}${endpoint}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to fetch activity stats' }));
      throw new ApiError(response.status, errorData.error || 'Failed to fetch activity stats');
    }

    return response.json();
  }
};