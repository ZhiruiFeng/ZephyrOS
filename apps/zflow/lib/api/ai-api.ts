import { API_BASE, authenticatedFetch } from './api-base'

// Agent Features API (for task type options)
export const agentFeaturesApi = {
  async list(params?: { is_active?: boolean; search?: string; limit?: number; offset?: number }): Promise<Array<{ id: string; name: string; description?: string }>> {
    const sp = new URLSearchParams()
    if (params) Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null) sp.append(k, String(v)) })
    const res = await authenticatedFetch(`${API_BASE}/agent-features?${sp.toString()}`)
    if (!res.ok) return []
    const data = await res.json()
    return data.features || []
  }
}

// AI Agents (read-only for selection)
export const aiAgentsApi = {
  async list(params?: { vendor_id?: string; service_id?: string; feature_id?: string; is_active?: boolean; is_favorite?: boolean; search?: string; limit?: number; offset?: number; sort_by?: string; sort_order?: 'asc' | 'desc' }): Promise<any[]> {
    const sp = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) sp.append(k, String(v))
      })
    }
    const res = await authenticatedFetch(`${API_BASE}/ai-agents?${sp.toString()}`)
    if (!res.ok) return []
    const data = await res.json()
    return data.agents || []
  }
}

// AI Tasks API
export type AITask = {
  id: string
  task_id: string
  agent_id: string
  objective: string
  deliverables?: string | null
  context?: string | null
  acceptance_criteria?: string | null
  task_type: string
  dependencies?: string[]
  mode: 'plan_only' | 'dry_run' | 'execute'
  guardrails?: { costCapUSD?: number | null; timeCapMin?: number | null; requiresHumanApproval?: boolean; dataScopes?: string[] }
  metadata?: { priority?: 'low' | 'medium' | 'high' | 'urgent'; tags?: string[] }
  status?: 'pending' | 'assigned' | 'in_progress' | 'paused' | 'completed' | 'failed' | 'cancelled'
  history?: any[]
  assigned_at?: string
  started_at?: string | null
  completed_at?: string | null
  due_at?: string | null
}

export const aiTasksApi = {
  async list(params?: { task_id?: string; agent_id?: string; task_type?: string; mode?: string; status?: string; search?: string; assigned_from?: string; assigned_to?: string; due_from?: string; due_to?: string; limit?: number; offset?: number; sort_by?: string; sort_order?: 'asc' | 'desc' }): Promise<AITask[]> {
    const sp = new URLSearchParams()
    if (params) Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null) sp.append(k, String(v)) })
    const res = await authenticatedFetch(`${API_BASE}/ai-tasks?${sp.toString()}`)
    if (!res.ok) return []
    const data = await res.json()
    return data.ai_tasks || []
  },
  async create(body: Omit<AITask, 'id' | 'assigned_at' | 'started_at' | 'completed_at'>): Promise<AITask> {
    const res = await authenticatedFetch(`${API_BASE}/ai-tasks`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (!res.ok) throw new Error('Failed to create ai_task')
    const data = await res.json()
    return data.ai_task
  },
  async get(id: string): Promise<AITask> {
    const res = await authenticatedFetch(`${API_BASE}/ai-tasks/${id}`)
    if (!res.ok) throw new Error('Failed to get ai_task')
    const data = await res.json()
    return data.ai_task
  },
  async update(id: string, updates: Partial<AITask>): Promise<AITask> {
    const res = await authenticatedFetch(`${API_BASE}/ai-tasks/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates) })
    if (!res.ok) throw new Error('Failed to update ai_task')
    const data = await res.json()
    return data.ai_task
  },
  async remove(id: string): Promise<void> {
    const res = await authenticatedFetch(`${API_BASE}/ai-tasks/${id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Failed to delete ai_task')
  }
}