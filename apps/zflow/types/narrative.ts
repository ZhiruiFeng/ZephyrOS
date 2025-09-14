// =====================================================
// Hybrid Seasons Narrative Type Definitions
// =====================================================

export type SeasonTheme = 'spring' | 'summer' | 'autumn' | 'winter'
export type SeasonStatus = 'active' | 'completed' | 'paused'

// =====================================================
// Core Types
// =====================================================

export interface Season {
  id: string
  user_id: string
  title: string
  intention?: string
  theme: SeasonTheme
  status: SeasonStatus
  start_date?: string
  end_date?: string
  opening_ritual?: OpeningRitual
  closing_ritual?: ClosingRitual
  metadata?: Record<string, any>
  created_at: string
  updated_at: string
}

export interface Episode {
  id: string
  season_id: string
  user_id: string
  title: string
  date_range_start: string
  date_range_end: string
  mood_emoji?: string
  reflection?: string
  metadata?: Record<string, any>
  created_at: string
  updated_at: string
}

// =====================================================
// Extended Types
// =====================================================

export interface SeasonWithEpisodes extends Season {
  episodes: Episode[]
  episode_count?: number
}

export interface EpisodeWithSeason extends Episode {
  season: Pick<Season, 'id' | 'title' | 'theme'>
}

// =====================================================
// Ritual Types
// =====================================================

export interface OpeningRitual {
  intention?: string
  goals?: string[]
  questions?: RitualQuestion[]
  completed_at?: string
}

export interface ClosingRitual {
  reflection?: string
  achievements?: string[]
  lessons_learned?: string[]
  questions?: RitualQuestion[]
  completed_at?: string
}

export interface RitualQuestion {
  id: string
  question: string
  answer?: string
  type: 'text' | 'scale' | 'choice'
  options?: string[]
}

// =====================================================
// API Response Types
// =====================================================

export interface SeasonsResponse {
  seasons: Season[]
  total: number
  has_more: boolean
}

export interface EpisodesResponse {
  episodes: Episode[]
  total: number
  has_more: boolean
}

export interface SeasonRecapResponse {
  season: Season
  episodes: Episode[]
  statistics: SeasonStatistics
  highlights: string[]
  generated_summary?: string
}

// =====================================================
// Statistics Types
// =====================================================

export interface SeasonStatistics {
  total_episodes: number
  date_range: {
    start: string
    end: string
    duration_days: number
  }
  mood_distribution: Record<string, number>
  most_common_moods: Array<{
    emoji: string
    count: number
  }>
  reflection_word_count: number
  themes: string[]
}

// =====================================================
// Form Types
// =====================================================

export interface CreateSeasonRequest {
  title: string
  intention?: string
  theme: SeasonTheme
  start_date?: string
  opening_ritual?: Partial<OpeningRitual>
}

export interface UpdateSeasonRequest extends Partial<CreateSeasonRequest> {
  status?: SeasonStatus
  end_date?: string
  closing_ritual?: Partial<ClosingRitual>
}

export interface CreateEpisodeRequest {
  season_id: string
  title: string
  date_range_start: string
  date_range_end: string
  mood_emoji?: string
  reflection?: string
}

export interface UpdateEpisodeRequest extends Partial<Omit<CreateEpisodeRequest, 'season_id'>> {}

// =====================================================
// UI/Component Types
// =====================================================

export interface SeasonThemeConfig {
  name: string
  colors: {
    primary: string
    secondary: string
    accent: string
    text: string
    background: string
  }
  gradient: string
  emoji: string
  description: string
}

export interface EpisodeMoodSuggestion {
  emoji: string
  label: string
  category: 'positive' | 'neutral' | 'negative' | 'energetic' | 'calm'
}

export interface AutoSuggestion {
  type: 'title' | 'mood' | 'reflection'
  value: string
  confidence: number
  source: 'ai' | 'pattern' | 'history'
}

// =====================================================
// Hook Return Types
// =====================================================

export interface UseSeasonsReturn {
  seasons: Season[]
  activeSeason: Season | null
  loading: boolean
  error: string | null
  createSeason: (data: CreateSeasonRequest) => Promise<Season>
  updateSeason: (id: string, data: UpdateSeasonRequest) => Promise<Season>
  deleteSeason: (id: string) => Promise<void>
  refetch: () => void
}

export interface UseEpisodesReturn {
  episodes: Episode[]
  loading: boolean
  error: string | null
  createEpisode: (data: CreateEpisodeRequest) => Promise<Episode>
  updateEpisode: (id: string, data: UpdateEpisodeRequest) => Promise<Episode>
  deleteEpisode: (id: string) => Promise<void>
  refetch: () => void
}

export interface UseSeasonRecapReturn {
  recap: SeasonRecapResponse | null
  loading: boolean
  error: string | null
  generateRecap: (seasonId: string) => Promise<SeasonRecapResponse>
  clearRecap: () => void
}

// =====================================================
// Constants
// =====================================================

export const SEASON_THEMES: Record<SeasonTheme, SeasonThemeConfig> = {
  spring: {
    name: 'Spring',
    colors: {
      primary: '#22c55e',
      secondary: '#86efac',
      accent: '#16a34a',
      text: '#14532d',
      background: '#f0fdf4'
    },
    gradient: 'from-emerald-200 via-green-100 to-teal-100 dark:from-emerald-900/40 dark:via-green-800/30 dark:to-teal-800/30',
    emoji: '🌱',
    description: 'Growth, renewal, and new beginnings'
  },
  summer: {
    name: 'Summer',
    colors: {
      primary: '#f59e0b',
      secondary: '#fbbf24',
      accent: '#d97706',
      text: '#92400e',
      background: '#fffbeb'
    },
    gradient: 'from-amber-200 via-yellow-100 to-orange-100 dark:from-amber-900/40 dark:via-yellow-800/30 dark:to-orange-800/30',
    emoji: '☀️',
    description: 'Energy, vitality, and peak activity'
  },
  autumn: {
    name: 'Autumn',
    colors: {
      primary: '#ea580c',
      secondary: '#fb923c',
      accent: '#c2410c',
      text: '#9a3412',
      background: '#fff7ed'
    },
    gradient: 'from-orange-200 via-amber-100 to-red-100 dark:from-orange-900/40 dark:via-amber-800/30 dark:to-red-800/30',
    emoji: '🍂',
    description: 'Reflection, harvest, and transformation'
  },
  winter: {
    name: 'Winter',
    colors: {
      primary: '#64748b',
      secondary: '#94a3b8',
      accent: '#475569',
      text: '#1e293b',
      background: '#f8fafc'
    },
    gradient: 'from-slate-200 via-blue-100 to-indigo-100 dark:from-slate-900/40 dark:via-blue-800/30 dark:to-indigo-800/30',
    emoji: '❄️',
    description: 'Rest, contemplation, and inner work'
  }
}

export const MOOD_SUGGESTIONS: EpisodeMoodSuggestion[] = [
  // Positive
  { emoji: '😊', label: 'Happy', category: 'positive' },
  { emoji: '🥳', label: 'Celebratory', category: 'positive' },
  { emoji: '😍', label: 'Loving', category: 'positive' },
  { emoji: '🤗', label: 'Grateful', category: 'positive' },
  { emoji: '🌟', label: 'Inspired', category: 'positive' },

  // Energetic
  { emoji: '🚀', label: 'Motivated', category: 'energetic' },
  { emoji: '💪', label: 'Strong', category: 'energetic' },
  { emoji: '🔥', label: 'Passionate', category: 'energetic' },
  { emoji: '⚡', label: 'Energized', category: 'energetic' },

  // Calm
  { emoji: '😌', label: 'Peaceful', category: 'calm' },
  { emoji: '🧘', label: 'Centered', category: 'calm' },
  { emoji: '🌸', label: 'Gentle', category: 'calm' },
  { emoji: '💙', label: 'Serene', category: 'calm' },

  // Neutral
  { emoji: '😐', label: 'Neutral', category: 'neutral' },
  { emoji: '🤔', label: 'Thoughtful', category: 'neutral' },
  { emoji: '📚', label: 'Focused', category: 'neutral' },

  // Negative
  { emoji: '😔', label: 'Sad', category: 'negative' },
  { emoji: '😟', label: 'Worried', category: 'negative' },
  { emoji: '😤', label: 'Frustrated', category: 'negative' },
  { emoji: '😴', label: 'Tired', category: 'negative' }
]

// =====================================================
// Validation Schemas (for runtime validation)
// =====================================================

export const SEASON_THEME_VALUES = ['spring', 'summer', 'autumn', 'winter'] as const
export const SEASON_STATUS_VALUES = ['active', 'completed', 'paused'] as const

// Helper type guards
export const isSeasonTheme = (value: any): value is SeasonTheme => {
  return SEASON_THEME_VALUES.includes(value)
}

export const isSeasonStatus = (value: any): value is SeasonStatus => {
  return SEASON_STATUS_VALUES.includes(value)
}