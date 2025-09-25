// =====================================================
// Memory Domain Types - Unified
// =====================================================

// Core enums and types
export type MemoryType = 'note' | 'link' | 'file' | 'thought' | 'quote' | 'insight'
export type MemorySource = 'manual' | 'import' | 'api' | 'voice' | 'auto'
export type MemoryStatus = 'active' | 'deleted' | 'archived'
export type ImportanceLevel = 'low' | 'medium' | 'high'
export type MemoryViewType = 'timeline' | 'search' | 'collections' | 'insights'
export type MemoryDisplayMode = 'list' | 'grid'
export type MemorySortBy = 'created_at' | 'happened_at' | 'updated_at' | 'importance' | 'emotion'
export type MemorySortOrder = 'asc' | 'desc'

// Time range interface
export interface TimeRange {
  start: string
  end?: string
}

// Emotion range interface
export interface EmotionRange {
  valence_min: number
  valence_max: number
  mood_min: number
  mood_max: number
}

// Date range interface
export interface DateRange {
  start: string
  end: string
}

// Core Memory interface
export interface Memory {
  id: string
  user_id: string
  title?: string | null
  title_override?: string | null // Backward compatibility
  description?: string | null
  note: string
  memory_type: MemoryType
  captured_at: string
  happened_range?: TimeRange | null
  emotion_valence?: number | null // -5 to 5
  emotion_arousal?: number | null // 1 to 5
  energy_delta?: number | null
  place_name?: string | null
  latitude?: number | null
  longitude?: number | null
  is_highlight: boolean
  salience_score?: number | null // 0 to 1
  source: MemorySource
  context?: string | null
  mood?: number | null // 1 to 10
  importance_level: ImportanceLevel
  related_to: string[]
  category_id?: string | null
  tags: string[]
  status: MemoryStatus
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

// Memory input types
export interface MemoryCreateInput {
  title: string
  note?: string
  description?: string
  captured_at?: string
  memory_type?: MemoryType
  title_override?: string
  happened_range?: TimeRange
  emotion_valence?: number
  emotion_arousal?: number
  energy_delta?: number
  place_name?: string
  latitude?: number
  longitude?: number
  is_highlight?: boolean
  salience_score?: number
  source?: MemorySource
  context?: string
  mood?: number
  importance_level?: ImportanceLevel
  category_id?: string
  tags?: string[]
}

export interface MemoryUpdateInput extends Partial<MemoryCreateInput> {
  status?: MemoryStatus
}

// Search and filtering
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

export interface MemoryFilters {
  view: MemoryViewType
  display_mode: MemoryDisplayMode
  sort_by: MemorySortBy
  sort_order: MemorySortOrder
  search_query: string
  selected_tags: string[]
  selected_categories: string[]
  date_range?: DateRange
  emotion_range?: EmotionRange
  show_highlights_only: boolean
}

// UI State
export interface MemoryListState {
  memories: Memory[]
  loading: boolean
  error: string | null
  has_more: boolean
  filters: MemoryFilters
  selected_memories: Set<string>
}

// Analytics
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
  top_categories: Array<{
    id: string
    name: string
    color: string
    memory_count: number
  }>
  most_used_tags: string[]
  insights: string[]
}