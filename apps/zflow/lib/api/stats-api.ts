import { API_BASE, authenticatedFetch } from './api-base'

// Task Statistics API
export const statsApi = {
  async getTaskStats(): Promise<any> {
    const response = await authenticatedFetch(`${API_BASE}/tasks/stats`)
    if (!response.ok) {
      // Graceful fallback to empty stats to avoid crashing UI
      try {
        const payload = await response.json().catch(() => null)
        console.warn('Task stats request failed:', response.status, payload)
      } catch {}
      return {
        total: 0,
        by_status: { pending: 0, in_progress: 0, completed: 0, cancelled: 0, on_hold: 0 },
        by_priority: { low: 0, medium: 0, high: 0, urgent: 0 },
        by_category: { work: 0, personal: 0, project: 0, meeting: 0, learning: 0, maintenance: 0, other: 0 },
        overdue: 0,
        due_today: 0,
        due_this_week: 0,
        completion_rate: 0,
        average_completion_time: 0,
      }
    }
    return response.json()
  }
}