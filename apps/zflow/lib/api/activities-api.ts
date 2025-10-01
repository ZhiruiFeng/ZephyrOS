import { API_BASE, authenticatedFetch } from './api-base'

// Activities API
export const activitiesApi = {
  async getAll(params?: {
    activity_type?: string;
    status?: string;
    intensity_level?: string;
    category_id?: string;
    location?: string;
    from?: string;
    to?: string;
    min_satisfaction?: number;
    min_mood_after?: number;
    limit?: number;
    offset?: number;
    sort_by?: string;
    sort_order?: string;
    search?: string;
    tags?: string;
  }): Promise<any[]> {
    const searchParams = new URLSearchParams()

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value))
        }
      })
    }

    const response = await authenticatedFetch(`${API_BASE}/activities?${searchParams}`)
    if (!response.ok) throw new Error('Failed to fetch activities')
    const data = await response.json()
    // New API wraps response in { activities: [...] }, unwrap for backward compatibility
    return data.activities || (Array.isArray(data) ? data : [])
  },

  async getById(id: string): Promise<any> {
    const response = await authenticatedFetch(`${API_BASE}/activities/${id}`)
    if (!response.ok) throw new Error('Failed to fetch activity')
    const data = await response.json()
    // New API wraps response in { activity: {...} }, unwrap for backward compatibility
    return data.activity || data
  },

  async create(activity: {
    title: string;
    description?: string;
    activity_type?: string;
    started_at?: string;
    ended_at?: string;
    duration_minutes?: number;
    mood_before?: number;
    mood_after?: number;
    energy_before?: number;
    energy_after?: number;
    satisfaction_level?: number;
    intensity_level?: string;
    location?: string;
    weather?: string;
    companions?: string[];
    notes?: string;
    insights?: string;
    gratitude?: string;
    category_id?: string;
    tags?: string[];
    status?: string;
  }): Promise<any> {
    const response = await authenticatedFetch(`${API_BASE}/activities`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(activity),
    })
    if (!response.ok) throw new Error('Failed to create activity')
    const data = await response.json()
    // New API wraps response in { activity: {...} }, unwrap for backward compatibility
    return data.activity || data
  },

  async update(id: string, updates: {
    title?: string;
    description?: string;
    activity_type?: string;
    started_at?: string;
    ended_at?: string;
    duration_minutes?: number;
    mood_before?: number;
    mood_after?: number;
    energy_before?: number;
    energy_after?: number;
    satisfaction_level?: number;
    intensity_level?: string;
    location?: string;
    weather?: string;
    companions?: string[];
    notes?: string;
    insights?: string;
    gratitude?: string;
    category_id?: string;
    tags?: string[];
    status?: string;
  }): Promise<any> {
    const response = await authenticatedFetch(`${API_BASE}/activities/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    })
    if (!response.ok) throw new Error('Failed to update activity')
    const data = await response.json()
    // New API wraps response in { activity: {...} }, unwrap for backward compatibility
    return data.activity || data
  },

  async delete(id: string): Promise<void> {
    const response = await authenticatedFetch(`${API_BASE}/activities/${id}`, {
      method: 'DELETE',
    })
    if (!response.ok) throw new Error('Failed to delete activity')
  },

  async getStats(days: number = 30): Promise<any> {
    const response = await authenticatedFetch(`${API_BASE}/activities/stats?days=${days}`)
    if (!response.ok) throw new Error('Failed to fetch activity stats')
    return response.json()
  }
}