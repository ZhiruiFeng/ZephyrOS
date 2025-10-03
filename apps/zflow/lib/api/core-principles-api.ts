import { API_BASE, authenticatedFetch } from './api-base'
import { ZMEMORY_API_BASE } from './zmemory-api-base'

// =====================================================
// TYPES
// =====================================================

export type CorePrincipleCategory =
  | 'work_principles'
  | 'life_principles'
  | 'decision_making'
  | 'relationships'
  | 'learning'
  | 'leadership'
  | 'custom'

export type CorePrincipleStatus = 'active' | 'deprecated' | 'archived'

export type CorePrincipleSource = 'ray_dalio' | 'user_custom'

export interface CorePrincipleContent {
  title: string
  description?: string
  category: CorePrincipleCategory
  status: CorePrincipleStatus
  is_default: boolean
  source: CorePrincipleSource
  trigger_questions: string[]
  application_examples: string[]
  personal_notes?: string
  importance_level: number
  application_count: number
  last_applied_at?: string
  deprecated_at?: string
  deprecation_reason?: string
}

export interface CorePrinciple {
  id: string
  type: 'core_principle'
  content: CorePrincipleContent
  metadata?: Record<string, any>
  created_at: string
  updated_at: string
  user_id: string
}

export interface CorePrincipleQuery {
  category?: CorePrincipleCategory
  status?: CorePrincipleStatus
  source?: CorePrincipleSource
  is_default?: boolean
  importance_level?: number
  search?: string
  limit?: number
  offset?: number
  sort_by?: 'created_at' | 'updated_at' | 'title' | 'importance_level' | 'application_count' | 'last_applied_at'
  sort_order?: 'asc' | 'desc'
}

export interface CreateCorePrincipleInput {
  type: 'core_principle'
  content: {
    title: string
    description?: string
    category: CorePrincipleCategory
    status?: CorePrincipleStatus
    trigger_questions?: string[]
    application_examples?: string[]
    personal_notes?: string
    importance_level?: number
  }
  metadata?: Record<string, any>
}

export interface UpdateCorePrincipleInput {
  content?: Partial<CorePrincipleContent>
  metadata?: Record<string, any>
}

export interface CorePrincipleStats {
  total: number
  by_category: Record<CorePrincipleCategory, number>
  by_status: Record<CorePrincipleStatus, number>
  by_source: Record<CorePrincipleSource, number>
  most_applied: CorePrinciple[]
  least_applied: CorePrinciple[]
  average_importance_level: number
  total_applications: number
}

// =====================================================
// API ERROR CLASS
// =====================================================

class CorePrincipleAPIError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'CorePrincipleAPIError'
  }
}

// =====================================================
// HELPER FUNCTION
// =====================================================

async function corePrincipleApiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${ZMEMORY_API_BASE}/core-principles${endpoint}`
  console.log('[CorePrinciplesAPI] Requesting:', url)

  const response = await authenticatedFetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  })

  console.log('[CorePrinciplesAPI] Response status:', response.status)

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
    console.error('[CorePrinciplesAPI] Error response:', errorData)
    throw new CorePrincipleAPIError(response.status, errorData.error || 'Request failed')
  }

  const data = await response.json()
  console.log('[CorePrinciplesAPI] Success, data length:', Array.isArray(data) ? data.length : 'N/A')
  return data
}

// =====================================================
// API CLIENT
// =====================================================

export const corePrinciplesApi = {
  /**
   * List core principles with optional filtering
   */
  async list(query: CorePrincipleQuery = {}): Promise<CorePrinciple[]> {
    const searchParams = new URLSearchParams()

    // Add query parameters
    if (query.category) searchParams.append('category', query.category)
    if (query.status) searchParams.append('status', query.status)
    if (query.source) searchParams.append('source', query.source)
    if (query.is_default !== undefined) searchParams.append('is_default', query.is_default.toString())
    if (query.importance_level) searchParams.append('importance_level', query.importance_level.toString())
    if (query.search) searchParams.append('search', query.search)
    if (query.limit) searchParams.append('limit', query.limit.toString())
    if (query.offset) searchParams.append('offset', query.offset.toString())
    if (query.sort_by) searchParams.append('sort_by', query.sort_by)
    if (query.sort_order) searchParams.append('sort_order', query.sort_order)

    const queryString = searchParams.toString()
    const endpoint = queryString ? `?${queryString}` : ''

    return corePrincipleApiRequest(endpoint)
  },

  /**
   * Get a specific core principle by ID
   */
  async getById(id: string): Promise<CorePrinciple> {
    return corePrincipleApiRequest(`/${id}`)
  },

  /**
   * Create a new core principle
   */
  async create(data: CreateCorePrincipleInput): Promise<CorePrinciple> {
    return corePrincipleApiRequest('', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  /**
   * Update a core principle
   */
  async update(id: string, data: UpdateCorePrincipleInput): Promise<CorePrinciple> {
    return corePrincipleApiRequest(`/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  /**
   * Delete a core principle (only non-default principles can be deleted)
   */
  async delete(id: string): Promise<{ message: string }> {
    return corePrincipleApiRequest(`/${id}`, {
      method: 'DELETE',
    })
  },

  /**
   * Get active principles (convenience method)
   */
  async getActive(limit = 50): Promise<CorePrinciple[]> {
    return this.list({
      status: 'active',
      limit,
      sort_by: 'importance_level',
      sort_order: 'desc',
    })
  },

  /**
   * Get default principles (Ray Dalio's principles)
   */
  async getDefaults(): Promise<CorePrinciple[]> {
    return this.list({
      is_default: true,
      status: 'active',
    })
  },

  /**
   * Get user's custom principles
   */
  async getCustom(): Promise<CorePrinciple[]> {
    return this.list({
      source: 'user_custom',
      status: 'active',
    })
  },

  /**
   * Get principles by category
   */
  async getByCategory(category: CorePrincipleCategory): Promise<CorePrinciple[]> {
    return this.list({
      category,
      status: 'active',
      sort_by: 'importance_level',
      sort_order: 'desc',
    })
  },

  /**
   * Search principles by text
   */
  async search(searchText: string, limit = 20): Promise<CorePrinciple[]> {
    return this.list({
      search: searchText,
      status: 'active',
      limit,
    })
  },

  /**
   * Get most applied principles
   */
  async getMostApplied(limit = 10): Promise<CorePrinciple[]> {
    return this.list({
      status: 'active',
      limit,
      sort_by: 'application_count',
      sort_order: 'desc',
    })
  },

  /**
   * Create a mapping between a principle and a timeline item (task)
   */
  async createTimelineMapping(
    principleId: string,
    timelineItemId: string,
    applicationType: 'pre_decision' | 'post_reflection' | 'learning' | 'validation' = 'pre_decision'
  ): Promise<any> {
    return corePrincipleApiRequest(`/${principleId}/timeline-mappings`, {
      method: 'POST',
      body: JSON.stringify({
        type: 'principle_timeline_mapping',
        content: {
          principle_id: principleId,
          timeline_item_id: timelineItemId,
          application_type: applicationType,
        }
      }),
    })
  },

  /**
   * Get timeline mappings for a specific timeline item (task)
   */
  async getTimelineMappings(principleId: string, timelineItemId?: string): Promise<any[]> {
    const searchParams = new URLSearchParams()
    if (timelineItemId) {
      searchParams.append('timeline_item_id', timelineItemId)
    }
    const queryString = searchParams.toString()
    const endpoint = `/${principleId}/timeline-mappings${queryString ? `?${queryString}` : ''}`
    return corePrincipleApiRequest(endpoint)
  },

  /**
   * Delete a timeline mapping
   */
  async deleteTimelineMapping(principleId: string, mappingId: string): Promise<{ message: string }> {
    return corePrincipleApiRequest(`/${principleId}/timeline-mappings/${mappingId}`, {
      method: 'DELETE',
    })
  },

  /**
   * Get all principles mapped to a specific timeline item
   */
  async getPrinciplesForTimelineItem(timelineItemId: string): Promise<CorePrinciple[]> {
    // We need to fetch all principles and their mappings
    // This is a helper method to get principles for a specific timeline item
    const url = `${ZMEMORY_API_BASE}/timeline-items/${timelineItemId}/principles`
    const response = await authenticatedFetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new CorePrincipleAPIError(response.status, errorData.error || 'Failed to fetch principles for timeline item')
    }

    return response.json()
  },
}

// Export default
export default corePrinciplesApi
