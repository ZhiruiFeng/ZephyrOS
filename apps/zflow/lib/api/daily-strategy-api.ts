import { API_BASE, authenticatedFetch } from './api-base'
import { tasksApi } from './tasks-api'

// =====================================================
// DAILY STRATEGY API TYPES
// =====================================================

export type StrategyType = 
  | 'priority'
  | 'planning' 
  | 'reflection'
  | 'adventure'
  | 'learning'
  | 'milestone'
  | 'insight'
  | 'routine'

export type DailyStrategyStatus = 
  | 'planned'
  | 'in_progress'
  | 'completed'
  | 'deferred'
  | 'cancelled'

export type ImportanceLevel = 'low' | 'medium' | 'high' | 'critical'
export type PlannedTimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night' | 'flexible'
export type MoodImpact = 'positive' | 'neutral' | 'negative'

export interface DailyStrategyItem {
  id: string
  user_id: string
  local_date: string // YYYY-MM-DD
  tz: string
  timeline_item_id: string
  timeline_item_type: string
  strategy_type: StrategyType
  title: string
  description?: string
  status: DailyStrategyStatus
  importance_level: ImportanceLevel
  priority_order?: number
  planned_time_of_day?: PlannedTimeOfDay
  planned_duration_minutes?: number
  required_energy_level?: number
  actual_energy_used?: number
  mood_impact?: MoodImpact
  completion_notes?: string
  season_id?: string
  initiative_id?: string
  created_at: string
  updated_at: string
  completed_at?: string
}

export interface DailyStrategyItemWithDetails extends DailyStrategyItem {
  timeline_item?: {
    id: string
    type: string
    title: string
    description?: string
    status: string
    priority?: string
    category?: string
    tags: string[]
    metadata: Record<string, any>
  }
  season?: any
  initiative?: any
}

export interface CreateDailyStrategyRequest {
  timeline_item_id: string
  strategy_type: StrategyType
  title: string
  description?: string
  local_date: string
  tz?: string
  importance_level?: ImportanceLevel
  priority_order?: number
  planned_time_of_day?: PlannedTimeOfDay
  planned_duration_minutes?: number
  required_energy_level?: number
  mood_impact?: MoodImpact
  season_id?: string
  initiative_id?: string
}

export interface UpdateDailyStrategyRequest {
  title?: string
  description?: string
  strategy_type?: StrategyType
  status?: DailyStrategyStatus
  importance_level?: ImportanceLevel
  priority_order?: number
  planned_time_of_day?: PlannedTimeOfDay
  planned_duration_minutes?: number
  required_energy_level?: number
  actual_energy_used?: number
  mood_impact?: MoodImpact
  completion_notes?: string
  season_id?: string
  initiative_id?: string
}

export interface UpdateDailyStrategyStatusRequest {
  status: DailyStrategyStatus
  completion_notes?: string
  actual_energy_used?: number
  mood_impact?: MoodImpact
}

export interface DailyStrategyQuery {
  date?: string
  timezone?: string
  strategy_type?: StrategyType
  status?: DailyStrategyStatus
  importance_level?: ImportanceLevel
  include_timeline_item?: boolean
  include_season?: boolean
  include_initiative?: boolean
}

export interface DailyStrategyOverview {
  date: string
  timezone: string
  priorities: DailyStrategyItemWithDetails[]
  planning_items: DailyStrategyItemWithDetails[]
  reflections: DailyStrategyItemWithDetails[]
  adventures: DailyStrategyItemWithDetails[]
  energy_summary: {
    total_planned_energy: number
    total_used_energy: number
    energy_efficiency?: number
  }
  completion_stats: {
    total_items: number
    completed_items: number
    in_progress_items: number
    deferred_items: number
    completion_rate: number
  }
}

// =====================================================
// API FUNCTIONS
// =====================================================

/**
 * Get daily strategy items with filtering
 */
export async function getDailyStrategyItems(params?: DailyStrategyQuery): Promise<DailyStrategyItemWithDetails[]> {
  const searchParams = new URLSearchParams()
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, String(value))
      }
    })
  }

  const url = `${API_BASE}/daily-strategy${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
  const response = await authenticatedFetch(url)

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(errorData.error || `Failed to fetch daily strategy items: ${response.status}`)
  }

  const data = await response.json()
  return data.items || []
}

/**
 * Get daily strategy items for a specific date
 */
export async function getDailyStrategyItemsByDate(date: string, params?: Omit<DailyStrategyQuery, 'date'>): Promise<DailyStrategyItemWithDetails[]> {
  const searchParams = new URLSearchParams()
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, String(value))
      }
    })
  }

  const url = `${API_BASE}/daily-strategy/date/${date}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
  const response = await authenticatedFetch(url)

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(errorData.error || `Failed to fetch daily strategy items for date: ${response.status}`)
  }

  const data = await response.json()
  return data.items || []
}

/**
 * Get daily strategy overview for a specific date
 */
export async function getDailyStrategyOverview(date?: string, timezone?: string): Promise<DailyStrategyOverview> {
  const searchParams = new URLSearchParams()
  if (date) searchParams.append('date', date)
  if (timezone) searchParams.append('timezone', timezone)

  const url = `${API_BASE}/daily-strategy/overview${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
  const response = await authenticatedFetch(url)

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(errorData.error || `Failed to fetch daily strategy overview: ${response.status}`)
  }

  return response.json()
}

/**
 * Create a new daily strategy item
 */
export async function createDailyStrategyItem(request: CreateDailyStrategyRequest): Promise<DailyStrategyItemWithDetails> {
  const response = await authenticatedFetch(`${API_BASE}/daily-strategy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(errorData.error || `Failed to create daily strategy item: ${response.status}`)
  }

  const data = await response.json()
  return data.item
}

/**
 * Update a daily strategy item
 */
export async function updateDailyStrategyItem(id: string, request: UpdateDailyStrategyRequest): Promise<DailyStrategyItemWithDetails> {
  const response = await authenticatedFetch(`${API_BASE}/daily-strategy/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(errorData.error || `Failed to update daily strategy item: ${response.status}`)
  }

  const data = await response.json()
  return data.item
}

/**
 * Update daily strategy item status
 */
export async function updateDailyStrategyStatus(id: string, request: UpdateDailyStrategyStatusRequest): Promise<DailyStrategyItemWithDetails> {
  const response = await authenticatedFetch(`${API_BASE}/daily-strategy/${id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(errorData.error || `Failed to update daily strategy status: ${response.status}`)
  }

  const data = await response.json()
  return data.item
}

/**
 * Get a specific daily strategy item
 */
export async function getDailyStrategyItem(id: string, includeDetails = false): Promise<DailyStrategyItemWithDetails> {
  const searchParams = new URLSearchParams()
  if (includeDetails) {
    searchParams.append('include_timeline_item', 'true')
    searchParams.append('include_season', 'true')
    searchParams.append('include_initiative', 'true')
  }

  const url = `${API_BASE}/daily-strategy/${id}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
  const response = await authenticatedFetch(url)

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(errorData.error || `Failed to fetch daily strategy item: ${response.status}`)
  }

  const data = await response.json()
  return data.item
}

/**
 * Delete a daily strategy item
 */
export async function deleteDailyStrategyItem(id: string): Promise<void> {
  const response = await authenticatedFetch(`${API_BASE}/daily-strategy/${id}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(errorData.error || `Failed to delete daily strategy item: ${response.status}`)
  }
}

// =====================================================
// CONVENIENCE FUNCTIONS
// =====================================================

/**
 * Create a daily intention (planning item)
 */
export async function createDailyIntention(
  timelineItemId: string,
  title: string,
  description: string,
  date: string,
  seasonId?: string
): Promise<DailyStrategyItemWithDetails> {
  return createDailyStrategyItem({
    timeline_item_id: timelineItemId,
    strategy_type: 'planning',
    title,
    description,
    local_date: date,
    importance_level: 'medium',
    season_id: seasonId,
  })
}

/**
 * Create a daily adventure
 */
export async function createDailyAdventure(
  timelineItemId: string,
  title: string,
  description: string,
  date: string,
  seasonId?: string
): Promise<DailyStrategyItemWithDetails> {
  return createDailyStrategyItem({
    timeline_item_id: timelineItemId,
    strategy_type: 'adventure',
    title,
    description,
    local_date: date,
    importance_level: 'medium',
    season_id: seasonId,
  })
}

/**
 * Create a daily reflection item
 */
export async function createDailyReflection(
  timelineItemId: string,
  title: string,
  description: string,
  date: string,
  reflectionType: 'learning' | 'milestone' | 'insight' | 'reflection' | 'gratitude',
  seasonId?: string
): Promise<DailyStrategyItemWithDetails> {
  // Map reflection types to strategy types
  const strategyTypeMap = {
    'learning': 'learning' as StrategyType,
    'milestone': 'milestone' as StrategyType,
    'insight': 'insight' as StrategyType,
    'reflection': 'reflection' as StrategyType,
    'gratitude': 'reflection' as StrategyType, // Use reflection strategy type for gratitude
  }

  return createDailyStrategyItem({
    timeline_item_id: timelineItemId,
    strategy_type: strategyTypeMap[reflectionType],
    title,
    description,
    local_date: date,
    importance_level: 'medium',
    season_id: seasonId,
  })
}

/**
 * Create a priority task
 */
export async function createPriorityTask(
  timelineItemId: string,
  title: string,
  description: string,
  date: string,
  priorityOrder: number,
  importanceLevel: ImportanceLevel = 'high',
  seasonId?: string
): Promise<DailyStrategyItemWithDetails> {
  return createDailyStrategyItem({
    timeline_item_id: timelineItemId,
    strategy_type: 'priority',
    title,
    description,
    local_date: date,
    importance_level: importanceLevel,
    priority_order: priorityOrder,
    season_id: seasonId,
  })
}

/**
 * Link an existing task to daily priority
 */
export async function linkExistingTaskToPriority(
  existingTaskId: string,
  date: string,
  priorityOrder: number,
  importanceLevel: ImportanceLevel = 'high',
  seasonId?: string
): Promise<DailyStrategyItemWithDetails> {
  // Get the existing task details first
  const task = await tasksApi.getById(existingTaskId)
  
  return createDailyStrategyItem({
    timeline_item_id: existingTaskId,
    strategy_type: 'priority',
    title: task.content.title,
    description: task.content.description || '',
    local_date: date,
    importance_level: importanceLevel,
    priority_order: priorityOrder,
    season_id: seasonId,
  })
}

/**
 * Get daily strategy items grouped by type for a specific date
 */
export async function getDailyStrategyByType(date: string, timezone?: string) {
  const overview = await getDailyStrategyOverview(date, timezone)
  
  return {
    intention: overview.planning_items[0] || null, // Only one planning item allowed
    adventure: overview.adventures[0] || null,     // Only one adventure allowed
    priorities: overview.priorities.slice(0, 3),   // Max 3 priorities
  }
}

// Export the API object for consistency
export const dailyStrategyApi = {
  getDailyStrategyItems,
  getDailyStrategyItemsByDate,
  getDailyStrategyOverview,
  createDailyStrategyItem,
  updateDailyStrategyItem,
  updateDailyStrategyStatus,
  getDailyStrategyItem,
  deleteDailyStrategyItem,
  createDailyIntention,
  createDailyAdventure,
  createDailyReflection,
  createPriorityTask,
  linkExistingTaskToPriority,
  getDailyStrategyByType,
}
