// Enhanced types for anchored memories in the MemoriesModule
import { Memory } from '@/types/domain/memory'

export interface EnhancedMemory extends Memory {
  anchors?: MemoryAnchor[]
  episode_anchors?: MemoryEpisodeAnchor[]
  strategy_anchors?: MemoryStrategyAnchor[]
}

export interface MemoryAnchor {
  memory_id: string
  anchor_item_id: string
  relation_type: string
  weight: number
  local_time_range?: any
  notes?: string
  created_at: string
  timeline_item?: {
    id: string
    type: string
    title: string
    description?: string
    status: string
  }
}

export interface MemoryEpisodeAnchor {
  memory_id: string
  episode_id: string
  relation_type: string
  weight: number
  created_at: string
  episode?: {
    id: string
    title: string
    date_range_start: string
    date_range_end: string
    mood_emoji?: string
  }
}

export interface MemoryStrategyAnchor {
  memory_id: string
  strategy_item_id: string
  relation_type: string
  weight: number
  created_at: string
  strategy_item?: {
    id: string
    strategy_type: string
    timeline_item_title: string
    local_date: string
    importance_level: string
  }
}

export type MemoryViewMode = 'timeline' | 'search' | 'collections' | 'anchored' | 'strategy' | 'episodes'
export type AnchorFilterType = 'all' | 'tasks' | 'episodes' | 'strategies' | 'unanchored'

export interface MemoryGroupedByAnchors {
  tasks: { anchor: MemoryAnchor; memories: EnhancedMemory[] }[]
  episodes: { anchor: MemoryEpisodeAnchor; memories: EnhancedMemory[] }[]
  strategies: { anchor: MemoryStrategyAnchor; memories: EnhancedMemory[] }[]
}