// =====================================================
// Narrative Feature API
// =====================================================

import { API_BASE, authenticatedFetch } from '@/lib/api/api-base'
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
} from '../types/narrative'

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
// Seasons API
// =====================================================

export const seasonsApi = {
  async list(params?: {
    limit?: number
    status?: string
    theme?: string
    date_from?: string
    date_to?: string
  }): Promise<SeasonsResponse> {
    const searchParams = new URLSearchParams()
    if (params?.limit) searchParams.set('limit', params.limit.toString())
    if (params?.status) searchParams.set('status', params.status)
    if (params?.theme) searchParams.set('theme', params.theme)
    if (params?.date_from) searchParams.set('date_from', params.date_from)
    if (params?.date_to) searchParams.set('date_to', params.date_to)

    const queryString = searchParams.toString()
    return apiRequest<SeasonsResponse>(`/seasons${queryString ? `?${queryString}` : ''}`)
  },

  async get(id: string): Promise<Season> {
    return apiRequest<Season>(`/seasons/${id}`)
  },

  async create(data: CreateSeasonRequest): Promise<Season> {
    return apiRequest<Season>('/seasons', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async update(id: string, data: UpdateSeasonRequest): Promise<Season> {
    return apiRequest<Season>(`/seasons/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  async delete(id: string): Promise<void> {
    await apiRequest<void>(`/seasons/${id}`, {
      method: 'DELETE',
    })
  },

  async getWithEpisodes(id: string): Promise<SeasonWithEpisodes> {
    return apiRequest<SeasonWithEpisodes>(`/seasons/${id}/episodes`)
  },

  async generateRecap(id: string): Promise<SeasonRecapResponse> {
    return apiRequest<SeasonRecapResponse>(`/seasons/${id}/recap`, {
      method: 'POST',
    })
  }
}

// =====================================================
// Episodes API
// =====================================================

export const episodesApi = {
  async list(params?: {
    season_id?: string
    limit?: number
    date_from?: string
    date_to?: string
  }): Promise<EpisodesResponse> {
    const searchParams = new URLSearchParams()
    if (params?.season_id) searchParams.set('season_id', params.season_id)
    if (params?.limit) searchParams.set('limit', params.limit.toString())
    if (params?.date_from) searchParams.set('date_from', params.date_from)
    if (params?.date_to) searchParams.set('date_to', params.date_to)

    const queryString = searchParams.toString()
    return apiRequest<EpisodesResponse>(`/episodes${queryString ? `?${queryString}` : ''}`)
  },

  async get(id: string): Promise<Episode> {
    return apiRequest<Episode>(`/episodes/${id}`)
  },

  async create(data: CreateEpisodeRequest): Promise<Episode> {
    return apiRequest<Episode>('/episodes', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async update(id: string, data: UpdateEpisodeRequest): Promise<Episode> {
    return apiRequest<Episode>(`/episodes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  async delete(id: string): Promise<void> {
    await apiRequest<void>(`/episodes/${id}`, {
      method: 'DELETE',
    })
  }
}

// =====================================================
// Narrative API (Quick Actions)
// =====================================================

export const narrativeApi = {
  async createQuickEpisode(data: {
    title?: string
    mood_emoji?: string
    reflection?: string
    date_range_days?: number
  }): Promise<Episode> {
    return apiRequest<Episode>('/narrative/quick-episode', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async generateSuggestions(context: {
    season_id?: string
    current_mood?: string
    recent_episodes?: Episode[]
  }): Promise<{
    title_suggestions: string[]
    mood_suggestions: string[]
    reflection_prompts: string[]
  }> {
    return apiRequest('/narrative/suggestions', {
      method: 'POST',
      body: JSON.stringify(context),
    })
  }
}

// =====================================================
// Main API Client (for backward compatibility)
// =====================================================

export const narrativeApiClient = {
  seasons: seasonsApi,
  episodes: episodesApi,
  narrative: narrativeApi,
}
