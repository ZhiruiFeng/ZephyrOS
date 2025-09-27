// =====================================================
// Timeline Feature - Public API
// =====================================================

// Timeline Hooks
export { useTimeline, useTimelineRange } from './hooks/useTimeline'
export { useDayReflection } from './hooks/useDayReflection'

// Timeline API
export { timelineApi } from './api/timeline-api'

// Timeline Types
export type {
  TimelineItem,
  TimelineData,
  DayReflectionData,
  UseTimelineReturn,
  UseTimelineRangeReturn,
  UseDayReflectionReturn
} from './types/timeline'

// Timeline Components
export { default as TimelinePage } from './TimelinePage'

// Timeline View Components
export {
  TimelineView,
  ModernTimelineView,
  Header,
  Gap,
  NowMarker,
  EventCard,
  TimelineHome,
  byStart,
  findNowIndex,
  toDate
} from './components'

// Timeline Component Types
export type { TimelineEvent, Category } from './components'

// Modal Components
export { CreateTimelineItemModal, DailyTimeModal } from './components/modals'
