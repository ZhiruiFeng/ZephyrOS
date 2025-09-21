import { API_BASE, authenticatedFetch, ApiError } from './api-base';

export interface TimeEntry {
  id: string;
  task_id?: string;
  timeline_item_id?: string;
  timeline_item_type?: string;
  start_at: string;
  end_at?: string;
  duration_seconds?: number;
  notes?: string;
  source: 'timer' | 'manual' | 'import';
  created_at: string;
  updated_at: string;
}

export interface TimeEntryCreateRequest {
  task_id?: string;
  timeline_item_id?: string;
  timeline_item_type?: string;
  start_at: string;
  end_at?: string;
  notes?: string;
  source?: 'timer' | 'manual' | 'import';
}

export interface TimeEntryUpdateRequest {
  start_at?: string;
  end_at?: string;
  notes?: string;
}

export interface RunningTimerResponse {
  entry?: TimeEntry;
  isRunning: boolean;
}

export const timeTrackingApi = {
  // Timer operations
  async start(taskId: string, options?: { autoSwitch?: boolean }): Promise<{ entry: TimeEntry }> {
    const response = await authenticatedFetch(`${API_BASE}/tasks/${taskId}/timer/start`, {
      method: 'POST',
      body: JSON.stringify(options || {}),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to start timer' }));
      throw new ApiError(response.status, errorData.error || 'Failed to start timer');
    }

    return response.json();
  },

  async stop(taskId: string, options?: { overrideEndAt?: string }): Promise<{ entry: TimeEntry }> {
    const response = await authenticatedFetch(`${API_BASE}/tasks/${taskId}/timer/stop`, {
      method: 'POST',
      body: JSON.stringify(options || {}),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to stop timer' }));
      throw new ApiError(response.status, errorData.error || 'Failed to stop timer');
    }

    return response.json();
  },

  async getRunning(): Promise<RunningTimerResponse> {
    const response = await authenticatedFetch(`${API_BASE}/time-entries/running`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to get running timer' }));
      throw new ApiError(response.status, errorData.error || 'Failed to get running timer');
    }

    return response.json();
  },

  // Time entries CRUD
  async listTimeEntries(params?: {
    task_id?: string;
    timeline_item_id?: string;
    start_date?: string;
    end_date?: string;
    limit?: number;
    offset?: number;
  }): Promise<TimeEntry[]> {
    const searchParams = new URLSearchParams();

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, value.toString());
        }
      });
    }

    const endpoint = `/time-entries${searchParams.toString() ? `?${searchParams}` : ''}`;
    const response = await authenticatedFetch(`${API_BASE}${endpoint}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to fetch time entries' }));
      throw new ApiError(response.status, errorData.error || 'Failed to fetch time entries');
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  },

  async getTimeEntry(id: string): Promise<TimeEntry> {
    const response = await authenticatedFetch(`${API_BASE}/time-entries/${id}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to fetch time entry' }));
      throw new ApiError(response.status, errorData.error || 'Failed to fetch time entry');
    }

    return response.json();
  },

  async createTimeEntry(data: TimeEntryCreateRequest): Promise<TimeEntry> {
    const response = await authenticatedFetch(`${API_BASE}/time-entries`, {
      method: 'POST',
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to create time entry' }));
      throw new ApiError(response.status, errorData.error || 'Failed to create time entry');
    }

    return response.json();
  },

  async updateTimeEntry(id: string, data: TimeEntryUpdateRequest): Promise<TimeEntry> {
    const response = await authenticatedFetch(`${API_BASE}/time-entries/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to update time entry' }));
      throw new ApiError(response.status, errorData.error || 'Failed to update time entry');
    }

    return response.json();
  },

  async deleteTimeEntry(id: string): Promise<void> {
    const response = await authenticatedFetch(`${API_BASE}/time-entries/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to delete time entry' }));
      throw new ApiError(response.status, errorData.error || 'Failed to delete time entry');
    }
  },

  // Task-specific time entries
  async getTaskTimeEntries(taskId: string): Promise<TimeEntry[]> {
    return this.listTimeEntries({ task_id: taskId });
  },

  // Timeline item-specific time entries
  async getTimelineItemTimeEntries(timelineItemId: string): Promise<TimeEntry[]> {
    return this.listTimeEntries({ timeline_item_id: timelineItemId });
  },

  // Activity timer operations
  async startActivity(activityId: string): Promise<TimeEntry> {
    const response = await authenticatedFetch(`${API_BASE}/timeline-items/${activityId}/time-entries`, {
      method: 'POST',
      body: JSON.stringify({
        start_at: new Date().toISOString(),
        source: 'timer'
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to start activity timer' }));
      throw new ApiError(response.status, errorData.error || 'Failed to start activity timer');
    }

    return response.json();
  },

  async stopActivity(timeEntryId: string): Promise<TimeEntry> {
    const response = await authenticatedFetch(`${API_BASE}/time-entries/${timeEntryId}`, {
      method: 'PUT',
      body: JSON.stringify({
        end_at: new Date().toISOString()
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to stop activity timer' }));
      throw new ApiError(response.status, errorData.error || 'Failed to stop activity timer');
    }

    return response.json();
  }
};