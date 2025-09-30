import { API_BASE, authenticatedFetch, TimeEntry, StartTimerOptions, StopTimerOptions } from './api-base'

// Time tracking API client
export const timeTrackingApi = {
  async getRunning(): Promise<{ entry: Pick<TimeEntry, 'id' | 'task_id' | 'start_at'> | null }> {
    const res = await authenticatedFetch(`${API_BASE}/time-entries/running`)
    if (!res.ok) throw new Error('Failed to fetch running timer')
    return res.json()
  },

  async start(taskId: string, options?: StartTimerOptions): Promise<{ entry: Pick<TimeEntry, 'id' | 'task_id' | 'start_at'> } > {
    const res = await authenticatedFetch(`${API_BASE}/tasks/${taskId}/timer/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ autoSwitch: options?.autoSwitch ?? false }),
    })
    if (!res.ok) throw new Error('Failed to start timer')
    return res.json()
  },

  async stop(taskId: string, options?: StopTimerOptions): Promise<{ entry: TimeEntry | null }> {
    const res = await authenticatedFetch(`${API_BASE}/tasks/${taskId}/timer/stop`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ overrideEndAt: options?.overrideEndAt }),
    })
    if (!res.ok) throw new Error('Failed to stop timer')
    return res.json()
  },

  async list(taskId: string, params?: { from?: string; to?: string; limit?: number; offset?: number }): Promise<{ entries: TimeEntry[] }> {
    const sp = new URLSearchParams()
    if (params?.from) sp.set('from', params.from)
    if (params?.to) sp.set('to', params.to)
    if (params?.limit !== undefined) sp.set('limit', String(params.limit))
    if (params?.offset !== undefined) sp.set('offset', String(params.offset))
    // Set required filter parameters with default values
    sp.set('min_duration', '1')
    sp.set('max_duration', '86400') // 24 hours in seconds
    sp.set('min_productivity', '1')
    sp.set('min_focus', '1')
    sp.set('min_energy', '1')
    const res = await authenticatedFetch(`${API_BASE}/tasks/${taskId}/time-entries?${sp.toString()}`)
    if (!res.ok) throw new Error('Failed to fetch time entries')
    return res.json()
  },

  async create(taskId: string, body: { start_at: string; end_at?: string; note?: string }): Promise<{ entry: TimeEntry }> {
    const res = await authenticatedFetch(`${API_BASE}/tasks/${taskId}/time-entries`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...body, source: 'manual' }),
    })
    if (!res.ok) throw new Error('Failed to create time entry')
    return res.json()
  },

  async update(entryId: string, body: { start_at?: string; end_at?: string; note?: string }): Promise<{ entry: TimeEntry }> {
    const res = await authenticatedFetch(`${API_BASE}/time-entries/${entryId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const errorText = await res.text()
      console.error('API Error Response:', errorText)
      throw new Error(`Failed to update time entry: ${res.status} ${res.statusText} - ${errorText}`)
    }
    return res.json()
  },

  async remove(entryId: string): Promise<void> {
    const res = await authenticatedFetch(`${API_BASE}/time-entries/${entryId}`, {
      method: 'DELETE',
    })
    if (!res.ok) throw new Error('Failed to delete time entry')
  },

  async listDay(params: { from: string; to: string }): Promise<{ entries: (TimeEntry & { category?: { id: string; name: string; color: string } | null })[] }> {
    const sp = new URLSearchParams({ from: params.from, to: params.to })
    const res = await authenticatedFetch(`${API_BASE}/time-entries/day?${sp.toString()}`)
    if (!res.ok) throw new Error('Failed to fetch day entries')
    return res.json()
  },
}

// Timeline Items Time Tracking API (for both tasks and activities)
export const timelineItemsApi = {
  async listTimeEntries(timelineItemId: string, params?: { from?: string; to?: string; limit?: number; offset?: number }): Promise<{ entries: TimeEntry[] }> {
    const sp = new URLSearchParams()
    if (params?.from) sp.set('from', params.from)
    if (params?.to) sp.set('to', params.to)
    if (params?.limit !== undefined) sp.set('limit', String(params.limit))
    if (params?.offset !== undefined) sp.set('offset', String(params.offset))
    const res = await authenticatedFetch(`${API_BASE}/timeline-items/${timelineItemId}/time-entries?${sp.toString()}`)
    if (!res.ok) throw new Error('Failed to fetch timeline item time entries')
    return res.json()
  },

  async createTimeEntry(timelineItemId: string, body: { start_at: string; end_at?: string; note?: string; source?: string }): Promise<{ entry: TimeEntry }> {
    const res = await authenticatedFetch(`${API_BASE}/timeline-items/${timelineItemId}/time-entries`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...body, source: body.source || 'manual' }),
    })
    if (!res.ok) throw new Error('Failed to create timeline item time entry')
    return res.json()
  },

  async updateTimeEntry(entryId: string, body: { start_at?: string; end_at?: string; note?: string }): Promise<{ entry: TimeEntry }> {
    const res = await authenticatedFetch(`${API_BASE}/time-entries/${entryId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const errorText = await res.text()
      console.error('API Error Response:', errorText)
      throw new Error(`Failed to update time entry: ${res.status} ${res.statusText} - ${errorText}`)
    }
    return res.json()
  },

  async removeTimeEntry(entryId: string): Promise<void> {
    const res = await authenticatedFetch(`${API_BASE}/time-entries/${entryId}`, {
      method: 'DELETE',
    })
    if (!res.ok) throw new Error('Failed to delete time entry')
  },
}