// =====================================================
// Timeline Feature Types
// =====================================================

export interface TimelineItem {
  id: string
  type: 'time_entry' | 'memory' | 'task' | 'activity'
  title: string
  description?: string | null
  startTime: string
  endTime?: string
  duration?: number // minutes
  category?: {
    id: string
    name: string
    color: string
    icon?: string
  }
  tags: string[]
  location?: string | null
  isHighlight?: boolean
  status?: string
  priority?: string
  metadata?: Record<string, any>
}

export interface TimelineData {
  items: TimelineItem[]
  totalDuration: number
  categories: Array<{ id: string; name: string; color: string; count: number }>
  tags: Array<{ name: string; count: number }>
}

export interface DayReflectionData {
  reflections: any[] // Will be properly typed when integrated with strategy feature
  priorities: any[] // Will be properly typed when integrated with strategy feature
  completionRate: number
  completedCount: number
  totalCount: number
}

// Hook return types
export interface UseTimelineReturn {
  timelineData: TimelineData
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

export interface UseTimelineRangeReturn {
  timelineData: TimelineData
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

export interface UseDayReflectionReturn {
  data: DayReflectionData
  loading: boolean
  error: string | null
  reflectionsByType: Record<string, any[]>
  loadData: () => void
  addReflection: (type: any, title: string, content: string) => Promise<void>
  updateReflection: (id: string, title: string, content: string) => Promise<void>
  deleteReflection: (id: string) => Promise<void>
}
