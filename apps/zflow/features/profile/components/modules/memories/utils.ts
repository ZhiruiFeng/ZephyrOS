// Utility functions for the MemoriesModule
import { AnchorFilterType, EnhancedMemory, MemoryGroupedByAnchors } from './types'

// Helper functions for anchor filtering
export const getAnchorCount = (memory: EnhancedMemory, type: AnchorFilterType): number => {
  switch (type) {
    case 'tasks':
      return memory.anchors?.filter(a => a.timeline_item?.type === 'task').length || 0
    case 'episodes':
      return memory.episode_anchors?.length || 0
    case 'strategies':
      return memory.strategy_anchors?.length || 0
    case 'all':
      return (memory.anchors?.length || 0) + (memory.episode_anchors?.length || 0) + (memory.strategy_anchors?.length || 0)
    case 'unanchored':
      return 0
  }
}

export const hasAnchorType = (memory: EnhancedMemory, type: AnchorFilterType): boolean => {
  switch (type) {
    case 'tasks':
      return memory.anchors?.some(a => a.timeline_item?.type === 'task') || false
    case 'episodes':
      return (memory.episode_anchors?.length || 0) > 0
    case 'strategies':
      return (memory.strategy_anchors?.length || 0) > 0
    case 'all':
      return true
    case 'unanchored':
      return getAnchorCount(memory, 'all') === 0
  }
}

export const getRelationTypes = (): string[] => [
  'about', 'context_of', 'result_of', 'insight_from', 'co_occurred', 'triggered_by', 'reflects_on'
]

// Group memories by anchor type for anchored view
export const groupMemoriesByAnchors = (filteredMemories: EnhancedMemory[]): MemoryGroupedByAnchors => {
  const groups: MemoryGroupedByAnchors = {
    tasks: [],
    episodes: [],
    strategies: []
  }

  // Group by task anchors
  const taskAnchors = new Map<string, { anchor: any; memories: EnhancedMemory[] }>()
  filteredMemories.forEach(memory => {
    memory.anchors?.forEach(anchor => {
      if (anchor.timeline_item?.type === 'task') {
        const key = anchor.anchor_item_id
        if (!taskAnchors.has(key)) {
          taskAnchors.set(key, { anchor, memories: [] })
        }
        taskAnchors.get(key)!.memories.push(memory)
      }
    })
  })
  groups.tasks = Array.from(taskAnchors.values())

  // Group by episode anchors
  const episodeAnchors = new Map<string, { anchor: any; memories: EnhancedMemory[] }>()
  filteredMemories.forEach(memory => {
    memory.episode_anchors?.forEach(anchor => {
      const key = anchor.episode_id
      if (!episodeAnchors.has(key)) {
        episodeAnchors.set(key, { anchor, memories: [] })
      }
      episodeAnchors.get(key)!.memories.push(memory)
    })
  })
  groups.episodes = Array.from(episodeAnchors.values())

  // Group by strategy anchors
  const strategyAnchors = new Map<string, { anchor: any; memories: EnhancedMemory[] }>()
  filteredMemories.forEach(memory => {
    memory.strategy_anchors?.forEach(anchor => {
      const key = anchor.strategy_item_id
      if (!strategyAnchors.has(key)) {
        strategyAnchors.set(key, { anchor, memories: [] })
      }
      strategyAnchors.get(key)!.memories.push(memory)
    })
  })
  groups.strategies = Array.from(strategyAnchors.values())

  return groups
}

export const formatDateGroup = (dateString: string): string => {
  const date = new Date(dateString)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)

  if (date.toDateString() === today.toDateString()) {
    return 'Today'
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday'
  } else {
    const diffTime = today.getTime() - date.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays <= 7) {
      return `${diffDays} days ago`
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
  }
}