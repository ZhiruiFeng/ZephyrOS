import { API_BASE, authenticatedFetch, ApiError } from './api-base';

// Memory Types
export interface Memory {
  id: string;
  title: string;
  note: string;
  memory_type: 'note' | 'experience' | 'insight' | 'reflection' | 'learning' | 'achievement';
  tags: string[];
  importance_level: 'low' | 'medium' | 'high';
  is_highlight: boolean;
  emotion_valence?: number; // -1 to 1
  emotion_arousal?: number; // 0 to 1
  mood?: number; // 1 to 10
  energy_delta?: number; // -5 to 5
  salience_score?: number; // 0 to 1
  source: 'manual' | 'ai_generated' | 'imported';
  captured_at: string;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export interface MemoryCreateInput {
  title: string;
  note?: string;
  memory_type?: Memory['memory_type'];
  tags?: string[];
  importance_level?: Memory['importance_level'];
  is_highlight?: boolean;
  emotion_valence?: number;
  emotion_arousal?: number;
  mood?: number;
  energy_delta?: number;
  salience_score?: number;
  source?: Memory['source'];
  captured_at?: string;
}

export interface MemoryUpdateInput {
  title?: string;
  note?: string;
  memory_type?: Memory['memory_type'];
  tags?: string[];
  importance_level?: Memory['importance_level'];
  is_highlight?: boolean;
  emotion_valence?: number;
  emotion_arousal?: number;
  mood?: number;
  energy_delta?: number;
  salience_score?: number;
}

export interface MemorySearchParams {
  q?: string;
  tags?: string[];
  category_id?: string;
  memory_type?: Memory['memory_type'];
  importance_level?: Memory['importance_level'];
  is_highlight?: boolean;
  date_from?: string;
  date_to?: string;
  emotion_valence_min?: number;
  emotion_valence_max?: number;
  mood_min?: number;
  mood_max?: number;
  limit?: number;
  offset?: number;
}

export interface MemorySearchResult {
  memories: Memory[];
  total: number;
  has_more: boolean;
}

export interface WeeklyReview {
  week_start: string;
  memories: Memory[];
  summary: {
    total_memories: number;
    highlights: number;
    avg_mood?: number;
    avg_energy_delta?: number;
    top_tags: string[];
  };
  insights: string[];
}

export interface MemoryAnchor {
  memory_id: string;
  anchor_item_id: string;
  relation_type: 'context_of' | 'result_of' | 'insight_from' | 'about' | 'co_occurred' | 'triggered_by' | 'reflects_on';
  local_time_range?: { start: string; end?: string } | null;
  weight?: number;
  notes?: string;
  timeline_item?: {
    id: string;
    type: string;
    title: string;
    start_time?: string | null;
    end_time?: string | null;
  };
}

export const memoriesApi = {
  async create(data: MemoryCreateInput): Promise<Memory> {
    const response = await authenticatedFetch(`${API_BASE}/memories`, {
      method: 'POST',
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to create memory' }));
      throw new ApiError(response.status, errorData.error || 'Failed to create memory');
    }

    return response.json();
  },

  async getById(id: string): Promise<Memory> {
    const response = await authenticatedFetch(`${API_BASE}/memories/${id}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to fetch memory' }));
      throw new ApiError(response.status, errorData.error || 'Failed to fetch memory');
    }

    return response.json();
  },

  async update(id: string, data: MemoryUpdateInput): Promise<Memory> {
    const response = await authenticatedFetch(`${API_BASE}/memories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to update memory' }));
      throw new ApiError(response.status, errorData.error || 'Failed to update memory');
    }

    return response.json();
  },

  async delete(id: string): Promise<{ message: string }> {
    const response = await authenticatedFetch(`${API_BASE}/memories/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to delete memory' }));
      throw new ApiError(response.status, errorData.error || 'Failed to delete memory');
    }

    return response.json();
  },

  async search(params: MemorySearchParams = {}): Promise<MemorySearchResult> {
    const searchParams = new URLSearchParams();

    // Map our parameters to the API's expected parameters
    const mappedParams: any = {};

    if (params.q) mappedParams.search = params.q;
    if (params.tags && params.tags.length > 0) mappedParams.tags = params.tags.join(',');
    if (params.category_id) mappedParams.category_id = params.category_id;
    if (params.memory_type) mappedParams.memory_type = params.memory_type;
    if (params.importance_level) mappedParams.importance_level = params.importance_level;
    if (params.is_highlight !== undefined) mappedParams.is_highlight = params.is_highlight;
    if (params.date_from) mappedParams.captured_from = params.date_from;
    if (params.date_to) mappedParams.captured_to = params.date_to;
    if (params.emotion_valence_min !== undefined) mappedParams.min_emotion_valence = params.emotion_valence_min;
    if (params.emotion_valence_max !== undefined) mappedParams.max_emotion_valence = params.emotion_valence_max;
    if (params.mood_min !== undefined) mappedParams.min_mood = params.mood_min;
    if (params.mood_max !== undefined) mappedParams.max_mood = params.mood_max;
    if (params.limit) mappedParams.limit = params.limit;
    if (params.offset) mappedParams.offset = params.offset;

    Object.entries(mappedParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, value.toString());
      }
    });

    const queryString = searchParams.toString();
    const endpoint = queryString ? `?${queryString}` : '';

    try {
      const response = await authenticatedFetch(`${API_BASE}/memories${endpoint}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to search memories' }));
        throw new ApiError(response.status, errorData.error || 'Failed to search memories');
      }

      const memories = await response.json();
      return {
        memories: Array.isArray(memories) ? memories : [],
        total: Array.isArray(memories) ? memories.length : 0,
        has_more: false // API doesn't provide pagination info
      };
    } catch (error) {
      console.warn('Memories search failed, returning empty results:', error);
      return {
        memories: [],
        total: 0,
        has_more: false
      };
    }
  },

  async getRecent(limit: number = 20): Promise<Memory[]> {
    const result = await this.search({ limit });
    return result.memories;
  },

  async getHighlights(limit: number = 10): Promise<Memory[]> {
    const result = await this.search({ is_highlight: true, limit });
    return result.memories;
  },

  async autoEnhance(memoryId: string): Promise<Memory> {
    const response = await authenticatedFetch(`${API_BASE}/memories/${memoryId}/auto-enhance`, {
      method: 'POST',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to auto-enhance memory' }));
      throw new ApiError(response.status, errorData.error || 'Failed to auto-enhance memory');
    }

    return response.json();
  },

  async analyze(content: string): Promise<{
    emotion_valence?: number;
    emotion_arousal?: number;
    mood?: number;
    importance_level?: 'low' | 'medium' | 'high';
    suggested_tags?: string[];
    salience_score?: number;
  }> {
    const response = await authenticatedFetch(`${API_BASE}/memories/analyze`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to analyze memory content' }));
      throw new ApiError(response.status, errorData.error || 'Failed to analyze memory content');
    }

    return response.json();
  },

  async getWeeklyReview(weekStart: string): Promise<WeeklyReview> {
    const response = await authenticatedFetch(`${API_BASE}/memories/reviews/weekly?week_start=${weekStart}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to get weekly review' }));
      throw new ApiError(response.status, errorData.error || 'Failed to get weekly review');
    }

    return response.json();
  },

  // Memory assets
  async addAsset(memoryId: string, file: File): Promise<{ id: string; url: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await authenticatedFetch(`${API_BASE}/memories/${memoryId}/assets`, {
      method: 'POST',
      body: formData,
      headers: {} // Don't set Content-Type for FormData
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
      throw new ApiError(response.status, errorData.error || 'Upload failed');
    }

    return response.json();
  },

  async deleteAsset(memoryId: string, assetId: string): Promise<{ message: string }> {
    const response = await authenticatedFetch(`${API_BASE}/memories/${memoryId}/assets/${assetId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to delete asset' }));
      throw new ApiError(response.status, errorData.error || 'Failed to delete asset');
    }

    return response.json();
  },

  // Memory anchors
  async getAnchors(memoryId: string, params?: {
    relation_type?: MemoryAnchor['relation_type'];
    anchor_item_type?: 'task' | 'activity' | 'routine' | 'habit' | 'memory';
    min_weight?: number;
    limit?: number;
    offset?: number;
  }): Promise<MemoryAnchor[]> {
    const searchParams = new URLSearchParams();
    if (params?.relation_type) searchParams.set('relation_type', params.relation_type);
    if (params?.anchor_item_type) searchParams.set('anchor_item_type', params.anchor_item_type);
    if (typeof params?.min_weight === 'number') searchParams.set('min_weight', String(params.min_weight));
    if (typeof params?.limit === 'number') searchParams.set('limit', String(params.limit));
    if (typeof params?.offset === 'number') searchParams.set('offset', String(params.offset));
    const qs = searchParams.toString();

    const response = await authenticatedFetch(`${API_BASE}/memories/${memoryId}/anchors${qs ? `?${qs}` : ''}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to get memory anchors' }));
      throw new ApiError(response.status, errorData.error || 'Failed to get memory anchors');
    }

    return response.json();
  },

  async addAnchor(memoryId: string, anchor: {
    anchor_item_id: string;
    relation_type: MemoryAnchor['relation_type'];
    local_time_range?: { start: string; end?: string };
    weight?: number;
    notes?: string;
  }): Promise<{ memory_id: string; anchor_item_id: string; relation_type: string }> {
    const response = await authenticatedFetch(`${API_BASE}/memories/${memoryId}/anchors`, {
      method: 'POST',
      body: JSON.stringify(anchor),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to add memory anchor' }));
      throw new ApiError(response.status, errorData.error || 'Failed to add memory anchor');
    }

    return response.json();
  },

  async deleteAnchor(memoryId: string, anchorId: string): Promise<{ message: string }> {
    const response = await authenticatedFetch(`${API_BASE}/memories/${memoryId}/anchors/${anchorId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to delete memory anchor' }));
      throw new ApiError(response.status, errorData.error || 'Failed to delete memory anchor');
    }

    return response.json();
  }
};

// Hook-like utilities for common operations
export const useMemoryOperations = () => {
  const createMemory = async (title: string, options: Partial<MemoryCreateInput> = {}) => {
    const data: MemoryCreateInput = {
      title,
      memory_type: 'note',
      source: 'manual',
      importance_level: 'medium',
      is_highlight: false,
      tags: [],
      ...options,
    };

    return memoriesApi.create(data);
  };

  const enhanceMemory = async (id: string, content: string) => {
    // First analyze the content
    const analysis = await memoriesApi.analyze(content);

    // Then update the memory with the analysis
    return memoriesApi.update(id, analysis);
  };

  const toggleHighlight = async (memory: Memory) => {
    return memoriesApi.update(memory.id, {
      is_highlight: !memory.is_highlight
    });
  };

  const addTags = async (memory: Memory, newTags: string[]) => {
    const uniqueTags = Array.from(new Set([...memory.tags, ...newTags]));
    return memoriesApi.update(memory.id, { tags: uniqueTags });
  };

  const removeTags = async (memory: Memory, tagsToRemove: string[]) => {
    const filteredTags = memory.tags.filter(tag => !tagsToRemove.includes(tag));
    return memoriesApi.update(memory.id, { tags: filteredTags });
  };

  return {
    createMemory,
    enhanceMemory,
    toggleHighlight,
    addTags,
    removeTags,
  };
};