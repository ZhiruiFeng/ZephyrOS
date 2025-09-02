export interface Memory {
  id: string
  user_id: string
  title?: string | null  // Use title instead of title_override
  title_override?: string | null  // Keep for backward compatibility but prefer title
  description?: string | null  // Add description field that exists in DB
  note: string
  memory_type: 'note' | 'link' | 'file' | 'thought' | 'quote' | 'insight'
  captured_at: string
  happened_range?: {
    start: string
    end?: string
  } | null
  emotion_valence?: number | null // -5 to 5
  emotion_arousal?: number | null // 1 to 5
  energy_delta?: number | null
  place_name?: string | null
  latitude?: number | null
  longitude?: number | null
  is_highlight: boolean
  salience_score?: number | null // 0 to 1
  source: 'manual' | 'import' | 'api' | 'voice' | 'auto'
  context?: string | null
  mood?: number | null // 1 to 10
  importance_level: 'low' | 'medium' | 'high'
  related_to: string[]
  category_id?: string | null
  tags: string[]
  status: 'active' | 'deleted' | 'archived'
  created_at: string
  updated_at: string
  
  // Relations
  category?: {
    id: string
    name: string
    color: string
    icon?: string
  } | null
}

export interface MemoryCreateInput {
  note: string
  memory_type?: 'note' | 'link' | 'file' | 'thought' | 'quote' | 'insight'
  title?: string  // Use title instead of title_override
  title_override?: string  // Keep for backward compatibility
  happened_range?: {
    start: string
    end?: string
  }
  emotion_valence?: number
  emotion_arousal?: number
  energy_delta?: number
  place_name?: string
  latitude?: number
  longitude?: number
  is_highlight?: boolean
  salience_score?: number
  source?: 'manual' | 'import' | 'api' | 'voice' | 'auto'
  context?: string
  mood?: number
  importance_level?: 'low' | 'medium' | 'high'
  category_id?: string
  tags?: string[]
}

export interface MemoryUpdateInput extends Partial<MemoryCreateInput> {
  status?: 'active' | 'deleted' | 'archived'
}

export interface MemorySearchParams {
  q?: string
  tags?: string[]
  category_id?: string
  memory_type?: string
  importance_level?: string
  is_highlight?: boolean
  date_from?: string
  date_to?: string
  emotion_valence_min?: number
  emotion_valence_max?: number
  mood_min?: number
  mood_max?: number
  limit?: number
  offset?: number
}

export interface MemorySearchResult {
  memories: Memory[]
  total: number
  has_more: boolean
}

export interface WeeklyReview {
  week_start: string
  week_end: string
  total_memories: number
  highlights_count: number
  emotion_summary: {
    avg_valence: number
    avg_arousal: number
    avg_mood: number
  }
  top_categories: Array<{ id: string; name: string; color: string; memory_count: number }>
  most_used_tags: string[]
  insights: string[]
}

export type MemoryViewType = 'timeline' | 'search' | 'collections' | 'insights'
export type MemoryDisplayMode = 'list' | 'grid'
export type MemorySortBy = 'created_at' | 'happened_at' | 'updated_at' | 'importance' | 'emotion'
export type MemorySortOrder = 'asc' | 'desc'

export interface MemoryFilters {
  view: MemoryViewType
  display_mode: MemoryDisplayMode
  sort_by: MemorySortBy
  sort_order: MemorySortOrder
  search_query: string
  selected_tags: string[]
  selected_categories: string[]
  date_range?: {
    start: string
    end: string
  }
  emotion_range?: {
    valence_min: number
    valence_max: number
    mood_min: number
    mood_max: number
  }
  show_highlights_only: boolean
}

export interface MemoryListState {
  memories: Memory[]
  loading: boolean
  error: string | null
  has_more: boolean
  filters: MemoryFilters
  selected_memories: Set<string>
}