// =====================================================
// Memory Hooks - Barrel Export
// =====================================================

// Episode memory hooks
export { useEpisodeAnchors } from './useEpisodeAnchors'
export {
  useEpisodeMemoryAnchors,
  useEpisodeMemoryActions,
  type EpisodeMemoryAnchor,
  type CreateEpisodeAnchorRequest
} from './useEpisodeMemoryAnchors'

// Task hooks have been moved to @/features/tasks/hooks

// Memory anchoring and relationships
export {
  useMemories,
  useTaskMemoryAnchors,
  useMemoryActions,
  useMemorySearch,
  type Memory,
  type CreateMemoryRequest,
  type CreateAnchorRequest
} from './useMemoryAnchors'

// Narrative theme management
export {
  useNarrativeTheme,
  useSeasonTransition,
  useThemeMoodSuggestions,
  useAdaptiveTheme,
  useThemeContentSuggestions
} from './useNarrativeTheme'

// People and relationship management (ZRelations)
export {
  useCheckinQueue,
  useRelationshipProfiles,
  usePeople,
  useReconnectSuggestions,
  useBrokerageOpportunities,
  useLogTouchpoint,
  useRelationshipProfile,
  usePeopleManager,
  type Person,
  type RelationshipProfile,
  type Touchpoint,
  type CheckinItem,
  type CheckinQueue,
  type ReconnectSuggestion,
  type BrokerageOpportunity
} from './useZRelations'