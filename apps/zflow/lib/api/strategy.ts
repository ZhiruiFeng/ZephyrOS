import { API_BASE, authenticatedFetch } from './api-base'

// =====================================================
// Strategy API Client
// =====================================================

// Custom API Error class for better error handling
export class APIError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'APIError'
  }
}

export class StrategyApiClient {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retryCount = 0
  ): Promise<T> {
    const response = await authenticatedFetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))

      // Handle rate limiting with exponential backoff
      if (response.status === 429 && retryCount < 3) {
        const delay = Math.pow(2, retryCount) * 1000 + Math.random() * 1000 // 1s, 2s, 4s + jitter
        console.log(`Rate limited, retrying in ${delay}ms (attempt ${retryCount + 1})`)
        await new Promise(resolve => setTimeout(resolve, delay))
        return this.request(endpoint, options, retryCount + 1)
      }

      throw new APIError(response.status, errorData.error || errorData.message || `API Error: ${response.status}`)
    }

    return response.json()
  }

  // =====================================================
  // Dashboard API
  // =====================================================

  async getDashboard() {
    return this.request('/strategy/dashboard')
  }

  // =====================================================
  // Initiatives API
  // =====================================================

  async getInitiatives(params?: {
    status?: string
    priority?: string
    season_id?: string
    search?: string
    tags?: string
    limit?: number
    offset?: number
    sort_by?: string
    sort_order?: 'asc' | 'desc'
  }) {
    const searchParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, String(value))
        }
      })
    }

    const queryString = searchParams.toString()
    const url = `/strategy/initiatives${queryString ? `?${queryString}` : ''}`
    return this.request(url)
  }

  async getInitiative(id: string) {
    return this.request(`/strategy/initiatives/${id}`)
  }

  async createInitiative(data: {
    title: string
    description?: string
    anchor_goal?: string
    success_metric?: string
    status?: 'planning' | 'active' | 'completed' | 'paused' | 'cancelled'
    priority?: 'low' | 'medium' | 'high' | 'critical'
    progress?: number
    progress_calculation?: 'manual' | 'task_based' | 'weighted_tasks'
    start_date?: string
    due_date?: string
    season_id?: string
    category_id?: string
    tags?: string[]
    metadata?: Record<string, any>
  }) {
    return this.request('/strategy/initiatives', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateInitiative(id: string, data: Partial<{
    title: string
    description: string
    anchor_goal: string
    success_metric: string
    status: 'planning' | 'active' | 'completed' | 'paused' | 'cancelled'
    priority: 'low' | 'medium' | 'high' | 'critical'
    progress: number
    progress_calculation: 'manual' | 'task_based' | 'weighted_tasks'
    start_date: string
    due_date: string
    season_id: string
    category_id: string
    tags: string[]
    metadata: Record<string, any>
  }>) {
    return this.request(`/strategy/initiatives/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteInitiative(id: string) {
    return this.request(`/strategy/initiatives/${id}`, {
      method: 'DELETE',
    })
  }

  // =====================================================
  // Strategic Tasks API
  // =====================================================

  async getStrategyTasks(params?: {
    initiative_id?: string
    status?: string
    priority?: string
    assignee?: string
    strategic_importance?: string
    search?: string
    tags?: string
    due_before?: string
    due_after?: string
    limit?: number
    offset?: number
    sort_by?: string
    sort_order?: 'asc' | 'desc'
  }) {
    const searchParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, String(value))
        }
      })
    }

    const queryString = searchParams.toString()
    const url = `/strategy/tasks${queryString ? `?${queryString}` : ''}`
    return this.request(url)
  }

  async createStrategyTask(data: {
    initiative_id: string
    task_id?: string
    title: string
    description?: string
    status?: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'blocked'
    priority?: 'low' | 'medium' | 'high' | 'urgent'
    progress?: number
    estimated_duration?: number
    assignee?: string
    due_date?: string
    tags?: string[]
    strategic_importance?: 'low' | 'medium' | 'high' | 'critical'
    initiative_contribution_weight?: number
    metadata?: Record<string, any>
  }) {
    return this.request('/strategy/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async delegateStrategyTask(taskId: string, data: {
    agent_id: string
    objective: string
    mode?: 'plan_only' | 'dry_run' | 'execute'
    guardrails?: Record<string, any>
  }) {
    return this.request(`/strategy/tasks/${taskId}/delegate`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async revokeDelegation(taskId: string) {
    return this.request(`/strategy/tasks/${taskId}/delegate`, {
      method: 'DELETE',
    })
  }

  // =====================================================
  // Strategic Memories API
  // =====================================================

  async getStrategyMemories(params?: {
    initiative_id?: string
    season_id?: string
    memory_type?: string
    importance_level?: string
    is_highlight?: boolean
    is_shareable?: boolean
    search?: string
    tags?: string
    limit?: number
    offset?: number
    sort_by?: string
    sort_order?: 'asc' | 'desc'
  }) {
    const searchParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, String(value))
        }
      })
    }

    const queryString = searchParams.toString()
    const url = `/strategy/memories${queryString ? `?${queryString}` : ''}`
    return this.request(url)
  }

  async createStrategyMemory(data: {
    initiative_id?: string
    season_id?: string
    memory_id?: string
    title: string
    content: string
    memory_type: 'insight' | 'reflection' | 'lesson_learned' | 'milestone' | 'retrospective' | 'planning_note'
    importance_level?: 'low' | 'medium' | 'high' | 'critical'
    is_highlight?: boolean
    is_shareable?: boolean
    tags?: string[]
    context_data?: Record<string, any>
  }) {
    return this.request('/strategy/memories', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }
}

// Export a singleton instance
export const strategyApi = new StrategyApiClient()

// =====================================================
// Response Types (matching our API responses)
// =====================================================

export interface ApiInitiative {
  id: string
  user_id: string
  season_id: string | null
  title: string
  description: string | null
  anchor_goal: string | null
  success_metric: string | null
  status: 'planning' | 'active' | 'completed' | 'paused' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'critical'
  progress: number
  progress_calculation: 'manual' | 'task_based' | 'weighted_tasks'
  start_date: string | null
  due_date: string | null
  completion_date: string | null
  tags: string[]
  category_id: string | null
  metadata: Record<string, any>
  created_at: string
  updated_at: string
  season?: { id: string; title: string; theme: string } | null
  category?: { id: string; name: string; color: string; icon: string } | null
  task_count?: number
  completed_task_count?: number
}

export interface ApiStrategyTask {
  id: string
  user_id: string
  initiative_id: string
  task_id: string | null
  title: string
  description: string | null
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'blocked'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  progress: number
  estimated_duration: number | null
  actual_duration: number | null
  assignee: string | null
  due_date: string | null
  completion_date: string | null
  tags: string[]
  strategic_importance: 'low' | 'medium' | 'high' | 'critical'
  initiative_contribution_weight: number
  metadata: Record<string, any>
  created_at: string
  updated_at: string
  initiative?: { id: string; title: string; status: string } | null
  regular_task?: { id: string; title: string; status: string } | null
  ai_delegation?: {
    ai_task_id: string
    agent_name: string
    agent_vendor: string
    status: string
    mode: string
    assigned_at: string
    started_at?: string
    completed_at?: string
  } | null
}

export interface ApiStrategyMemory {
  id: string
  user_id: string
  initiative_id: string | null
  season_id: string | null
  memory_id: string | null
  title: string
  content: string
  memory_type: 'insight' | 'reflection' | 'lesson_learned' | 'milestone' | 'retrospective' | 'planning_note'
  importance_level: 'low' | 'medium' | 'high' | 'critical'
  is_highlight: boolean
  is_shareable: boolean
  tags: string[]
  context_data: Record<string, any>
  created_at: string
  updated_at: string
  initiative?: { id: string; title: string; status: string } | null
  season?: { id: string; title: string; theme: string } | null
  regular_memory?: { id: string; title: string; type: string } | null
}

export interface ApiStrategyDashboard {
  active_season: {
    id: string
    title: string
    intention: string
    theme: string
    progress: number
  } | null
  active_initiatives: Array<{
    id: string
    title: string
    description: string
    status: string
    priority: string
    progress: number
    due_date: string | null
    task_count: number
    completed_task_count: number
  }>
  recent_memories: Array<{
    id: string
    title: string
    content: string
    memory_type: string
    importance_level: string
    is_highlight: boolean
    created_at: string
  }>
  agent_workload: Array<{
    agent_id: string
    agent_name: string
    active_assignments: number
    completed_assignments: number
    avg_satisfaction: number | null
  }>
}