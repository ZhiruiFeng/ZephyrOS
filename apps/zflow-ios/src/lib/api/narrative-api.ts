import { API_BASE, authenticatedFetch, ApiError } from './api-base';

// Types for Narrative API
export interface Season {
  id: string;
  title: string;
  theme: 'growth' | 'exploration' | 'focus' | 'balance' | 'transformation' | 'adventure' | 'learning' | 'creation' | 'connection' | 'renewal';
  intention?: string;
  start_date: string;
  end_date?: string;
  status: 'active' | 'completed' | 'planned';
  reflection?: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface Episode {
  id: string;
  season_id: string;
  title: string;
  date_range_start: string;
  date_range_end: string;
  mood_emoji?: string;
  energy_level?: number;
  reflection?: string;
  highlights?: string[];
  challenges?: string[];
  learnings?: string[];
  gratitude?: string[];
  user_id: string;
  created_at: string;
  updated_at: string;
  season?: Season;
}

export interface SeasonWithEpisodes extends Season {
  episodes?: Episode[];
}

export interface CreateSeasonRequest {
  title: string;
  theme: Season['theme'];
  intention?: string;
  start_date: string;
  end_date?: string;
}

export interface UpdateSeasonRequest {
  title?: string;
  theme?: Season['theme'];
  intention?: string;
  start_date?: string;
  end_date?: string;
  status?: Season['status'];
  reflection?: string;
}

export interface CreateEpisodeRequest {
  season_id: string;
  title: string;
  date_range_start: string;
  date_range_end: string;
  mood_emoji?: string;
  energy_level?: number;
  reflection?: string;
  highlights?: string[];
  challenges?: string[];
  learnings?: string[];
  gratitude?: string[];
}

export interface UpdateEpisodeRequest {
  title?: string;
  date_range_start?: string;
  date_range_end?: string;
  mood_emoji?: string;
  energy_level?: number;
  reflection?: string;
  highlights?: string[];
  challenges?: string[];
  learnings?: string[];
  gratitude?: string[];
}

export interface SeasonsResponse {
  seasons: Season[];
  total: number;
}

export interface EpisodesResponse {
  episodes: Episode[];
  total: number;
}

export interface SeasonRecapResponse {
  recap: string;
  highlights: string[];
  achievements: string[];
  lessons_learned: string[];
  growth_areas: string[];
}

// Season API Functions
export const seasonApi = {
  async list(params?: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<SeasonsResponse> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());

    const queryString = searchParams.toString();
    const response = await authenticatedFetch(`${API_BASE}/api/narrative/seasons${queryString ? `?${queryString}` : ''}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to fetch seasons' }));
      throw new ApiError(response.status, errorData.error || 'Failed to fetch seasons');
    }

    return response.json();
  },

  async get(id: string, includeEpisodes = false): Promise<SeasonWithEpisodes> {
    const query = includeEpisodes ? '?include_episodes=true' : '';
    const response = await authenticatedFetch(`${API_BASE}/api/narrative/seasons/${id}${query}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to fetch season' }));
      throw new ApiError(response.status, errorData.error || 'Failed to fetch season');
    }

    return response.json();
  },

  async create(data: CreateSeasonRequest): Promise<Season> {
    const response = await authenticatedFetch(`${API_BASE}/api/narrative/seasons`, {
      method: 'POST',
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to create season' }));
      throw new ApiError(response.status, errorData.error || 'Failed to create season');
    }

    return response.json();
  },

  async update(id: string, data: UpdateSeasonRequest): Promise<Season> {
    const response = await authenticatedFetch(`${API_BASE}/api/narrative/seasons/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to update season' }));
      throw new ApiError(response.status, errorData.error || 'Failed to update season');
    }

    return response.json();
  },

  async delete(id: string): Promise<void> {
    const response = await authenticatedFetch(`${API_BASE}/api/narrative/seasons/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to delete season' }));
      throw new ApiError(response.status, errorData.error || 'Failed to delete season');
    }
  },

  async getCurrent(): Promise<Season | null> {
    try {
      const response = await authenticatedFetch(`${API_BASE}/api/narrative/seasons/current`);

      if (!response.ok) {
        if (response.status === 404) {
          return null; // No active season found
        }
        const errorData = await response.json().catch(() => ({ error: 'Failed to fetch current season' }));
        throw new ApiError(response.status, errorData.error || 'Failed to fetch current season');
      }

      return response.json();
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return null;
      }
      throw error;
    }
  },

  async generateRecap(id: string): Promise<SeasonRecapResponse> {
    const response = await authenticatedFetch(`${API_BASE}/api/narrative/seasons/${id}/recap`, {
      method: 'POST',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to generate season recap' }));
      throw new ApiError(response.status, errorData.error || 'Failed to generate season recap');
    }

    return response.json();
  }
};

// Episode API Functions
export const episodeApi = {
  async list(params?: {
    season_id?: string;
    limit?: number;
    offset?: number;
    date_from?: string;
    date_to?: string;
  }): Promise<EpisodesResponse> {
    const searchParams = new URLSearchParams();
    if (params?.season_id) searchParams.set('season_id', params.season_id);
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());
    if (params?.date_from) searchParams.set('date_from', params.date_from);
    if (params?.date_to) searchParams.set('date_to', params.date_to);

    const queryString = searchParams.toString();
    const response = await authenticatedFetch(`${API_BASE}/api/narrative/episodes${queryString ? `?${queryString}` : ''}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to fetch episodes' }));
      throw new ApiError(response.status, errorData.error || 'Failed to fetch episodes');
    }

    return response.json();
  },

  async get(id: string): Promise<Episode> {
    const response = await authenticatedFetch(`${API_BASE}/api/narrative/episodes/${id}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to fetch episode' }));
      throw new ApiError(response.status, errorData.error || 'Failed to fetch episode');
    }

    return response.json();
  },

  async create(data: CreateEpisodeRequest): Promise<Episode> {
    const response = await authenticatedFetch(`${API_BASE}/api/narrative/episodes`, {
      method: 'POST',
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to create episode' }));
      throw new ApiError(response.status, errorData.error || 'Failed to create episode');
    }

    return response.json();
  },

  async update(id: string, data: UpdateEpisodeRequest): Promise<Episode> {
    const response = await authenticatedFetch(`${API_BASE}/api/narrative/episodes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to update episode' }));
      throw new ApiError(response.status, errorData.error || 'Failed to update episode');
    }

    return response.json();
  },

  async delete(id: string): Promise<void> {
    const response = await authenticatedFetch(`${API_BASE}/api/narrative/episodes/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to delete episode' }));
      throw new ApiError(response.status, errorData.error || 'Failed to delete episode');
    }
  },

  async getByDateRange(startDate: string, endDate: string): Promise<Episode[]> {
    const response = await this.list({
      date_from: startDate,
      date_to: endDate
    });
    return response.episodes;
  }
};

// Combined API Functions
export const narrativeApi = {
  async getOverview(): Promise<{
    currentSeason: Season | null;
    recentEpisodes: Episode[];
    seasonCount: number;
    totalEpisodes: number;
  }> {
    const [currentSeason, recentEpisodesResponse, seasonsResponse] = await Promise.all([
      seasonApi.getCurrent(),
      episodeApi.list({ limit: 5 }),
      seasonApi.list({ limit: 1 })
    ]);

    return {
      currentSeason,
      recentEpisodes: recentEpisodesResponse.episodes,
      seasonCount: seasonsResponse.total,
      totalEpisodes: recentEpisodesResponse.total
    };
  },

  async initializeFirstSeason(data: {
    title?: string;
    theme: CreateSeasonRequest['theme'];
    intention?: string;
  }): Promise<Season> {
    return seasonApi.create({
      title: data.title || 'My First Season',
      theme: data.theme,
      intention: data.intention,
      start_date: new Date().toISOString().split('T')[0]
    });
  },

  async createQuickEpisode(data: {
    title?: string;
    mood_emoji?: string;
    reflection?: string;
    date_range_days?: number;
  }): Promise<Episode> {
    const currentSeason = await seasonApi.getCurrent();
    if (!currentSeason) {
      throw new Error('No active season found. Please create a season first.');
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (data.date_range_days || 7));

    return episodeApi.create({
      season_id: currentSeason.id,
      title: data.title || 'Untitled Episode',
      date_range_start: startDate.toISOString().split('T')[0],
      date_range_end: endDate.toISOString().split('T')[0],
      mood_emoji: data.mood_emoji,
      reflection: data.reflection
    });
  }
};

// Export combined API client
export const narrativeApiClient = {
  seasons: seasonApi,
  episodes: episodeApi,
  narrative: narrativeApi
};