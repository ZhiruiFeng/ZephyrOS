// =====================================================
// Narrative Feature - Public API
// =====================================================

// Narrative Hooks
export { useEpisodes, useEpisode, useQuickEpisode, useEpisodeAnalytics } from './hooks/useEpisodes'

// Narrative API
export { narrativeApi, seasonsApi, episodesApi } from './api/narrative-api'

// Narrative Types
export type {
  Season,
  Episode,
  SeasonWithEpisodes,
  EpisodeWithSeason,
  SeasonTheme,
  SeasonStatus,
  CreateSeasonRequest,
  UpdateSeasonRequest,
  CreateEpisodeRequest,
  UpdateEpisodeRequest,
  SeasonsResponse,
  EpisodesResponse,
  SeasonRecapResponse,
  SeasonStatistics,
  SeasonThemeConfig,
  EpisodeMoodSuggestion,
  AutoSuggestion,
  UseSeasonsReturn,
  UseEpisodesReturn,
  UseEpisodeReturn,
  UseQuickEpisodeReturn,
  UseSeasonRecapReturn,
  OpeningRitual,
  ClosingRitual,
  RitualQuestion
} from './types/narrative'

// Narrative Constants
export { SEASON_THEMES, MOOD_SUGGESTIONS, SEASON_THEME_VALUES, SEASON_STATUS_VALUES } from './types/narrative'

// Narrative Components
export { NarrativePage } from './NarrativePage'
