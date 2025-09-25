// =====================================================
// Narrative API Client
// Centralized API client for Seasons and Episodes
// =====================================================

import { API_BASE, authenticatedFetch } from './api-base'
import type {
  Season,
  Episode,
  SeasonWithEpisodes,
  CreateSeasonRequest,
  UpdateSeasonRequest,
  CreateEpisodeRequest,
  UpdateEpisodeRequest,
  SeasonsResponse,
  EpisodesResponse,
  SeasonRecapResponse
} from 'types'

// =====================================================
// Utility Functions
// =====================================================

class NarrativeAPIError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'NarrativeAPIError'
  }
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}/narrative${endpoint}`

  const response = await authenticatedFetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new NarrativeAPIError(response.status, errorData.error || errorData.message || `API Error: ${response.status}`)
  }

  return response.json()
}

// =====================================================
// Season API Functions
// =====================================================

export const seasonApi = {
  /**
   * Get all seasons for the current user
   */
  async list(params?: {
    status?: string
    limit?: number
    offset?: number
  }): Promise<SeasonsResponse> {
    const query = new URLSearchParams()
    if (params?.status) query.set('status', params.status)
    if (params?.limit) query.set('limit', params.limit.toString())
    if (params?.offset) query.set('offset', params.offset.toString())

    const queryString = query.toString()
    return apiRequest<SeasonsResponse>(`/seasons${queryString ? `?${queryString}` : ''}`)
  },

  /**
   * Get a specific season by ID
   */
  async get(id: string, includeEpisodes = false): Promise<SeasonWithEpisodes> {
    const query = includeEpisodes ? '?include_episodes=true' : ''
    return apiRequest<SeasonWithEpisodes>(`/seasons/${id}${query}`)
  },

  /**
   * Create a new season
   */
  async create(data: CreateSeasonRequest): Promise<Season> {
    return apiRequest<Season>('/seasons', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  /**
   * Update an existing season
   */
  async update(id: string, data: UpdateSeasonRequest): Promise<Season> {
    return apiRequest<Season>(`/seasons/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  /**
   * Delete a season
   */
  async delete(id: string): Promise<void> {
    await apiRequest<void>(`/seasons/${id}`, {
      method: 'DELETE',
    })
  },

  /**
   * Get the current active season
   */
  async getCurrent(): Promise<Season | null> {
    try {
      return await apiRequest<Season>('/seasons/current')
    } catch (error) {
      // Return null if no active season found
      if (error instanceof Error &&
          (error.message.includes('404') ||
           error.message.includes('No active season found'))) {
        return null
      }
      throw error
    }
  },

  /**
   * Generate a recap for a season
   */
  async generateRecap(id: string): Promise<SeasonRecapResponse> {
    return apiRequest<SeasonRecapResponse>(`/seasons/${id}/recap`, {
      method: 'POST',
    })
  }
}

// =====================================================
// Episode API Functions
// =====================================================

export const episodeApi = {
  /**
   * Get episodes, optionally filtered by season
   */
  async list(params?: {
    season_id?: string
    limit?: number
    offset?: number
    date_from?: string
    date_to?: string
  }): Promise<EpisodesResponse> {
    const query = new URLSearchParams()
    if (params?.season_id) query.set('season_id', params.season_id)
    if (params?.limit) query.set('limit', params.limit.toString())
    if (params?.offset) query.set('offset', params.offset.toString())
    if (params?.date_from) query.set('date_from', params.date_from)
    if (params?.date_to) query.set('date_to', params.date_to)

    const queryString = query.toString()
    return apiRequest<EpisodesResponse>(`/episodes${queryString ? `?${queryString}` : ''}`)
  },

  /**
   * Get a specific episode by ID
   */
  async get(id: string): Promise<Episode> {
    return apiRequest<Episode>(`/episodes/${id}`)
  },

  /**
   * Create a new episode
   */
  async create(data: CreateEpisodeRequest): Promise<Episode> {
    return apiRequest<Episode>('/episodes', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  /**
   * Update an existing episode
   */
  async update(id: string, data: UpdateEpisodeRequest): Promise<Episode> {
    return apiRequest<Episode>(`/episodes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  /**
   * Delete an episode
   */
  async delete(id: string): Promise<void> {
    await apiRequest<void>(`/episodes/${id}`, {
      method: 'DELETE',
    })
  },

  /**
   * Get episodes for a specific date range
   */
  async getByDateRange(startDate: string, endDate: string): Promise<Episode[]> {
    const response = await this.list({
      date_from: startDate,
      date_to: endDate
    })
    return response.episodes
  }
}

// =====================================================
// Combined API Functions
// =====================================================

export const narrativeApi = {
  /**
   * Get complete narrative overview
   */
  async getOverview(): Promise<{
    currentSeason: Season | null
    recentEpisodes: Episode[]
    seasonCount: number
    totalEpisodes: number
  }> {
    const [currentSeason, recentEpisodesResponse, seasonsResponse] = await Promise.all([
      seasonApi.getCurrent(),
      episodeApi.list({ limit: 5 }),
      seasonApi.list({ limit: 1 })
    ])

    return {
      currentSeason,
      recentEpisodes: recentEpisodesResponse.episodes,
      seasonCount: seasonsResponse.total,
      totalEpisodes: recentEpisodesResponse.total
    }
  },

  /**
   * Initialize user's first season
   */
  async initializeFirstSeason(data: {
    title?: string
    theme: CreateSeasonRequest['theme']
    intention?: string
  }): Promise<Season> {
    return seasonApi.create({
      title: data.title || 'My First Season',
      theme: data.theme,
      intention: data.intention,
      start_date: new Date().toISOString().split('T')[0]
    })
  },

  /**
   * Quick episode creation with auto-suggestions
   */
  async createQuickEpisode(data: {
    title?: string
    mood_emoji?: string
    reflection?: string
    date_range_days?: number
  }): Promise<Episode> {
    const currentSeason = await seasonApi.getCurrent()
    if (!currentSeason) {
      throw new Error('No active season found. Please create a season first.')
    }

    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - (data.date_range_days || 7))

    return episodeApi.create({
      season_id: currentSeason.id,
      title: data.title || 'Untitled Episode',
      date_range_start: startDate.toISOString().split('T')[0],
      date_range_end: endDate.toISOString().split('T')[0],
      mood_emoji: data.mood_emoji,
      reflection: data.reflection
    })
  }
}

// =====================================================
// Export combined API
// =====================================================

export const narrativeApiClient = {
  seasons: seasonApi,
  episodes: episodeApi,
  narrative: narrativeApi
}

// Default export for convenience
export default narrativeApiClient

// Export error class for error handling
export { NarrativeAPIError }
