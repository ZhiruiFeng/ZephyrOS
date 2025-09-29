'use client'

import React from 'react'
import { Brain } from 'lucide-react'
import MemoryCard from '@/features/memory/components/MemoryCard'
import { EnhancedMemory, MemoryGroupedByAnchors } from '../types'

interface EpisodesViewProps {
  groupedByAnchors: MemoryGroupedByAnchors
  expandedDescriptions: Set<string>
  onMemoryClick: (memoryId: string) => void
  onEditMemory: (memory: EnhancedMemory) => void
  onDeleteMemory: (memoryId: string) => void
  onToggleHighlight: (memory: EnhancedMemory) => void
  onToggleDescription: (memoryId: string) => void
  onTagClick: (tag: string) => void
}

export default function EpisodesView({
  groupedByAnchors,
  expandedDescriptions,
  onMemoryClick,
  onEditMemory,
  onDeleteMemory,
  onToggleHighlight,
  onToggleDescription,
  onTagClick
}: EpisodesViewProps) {
  if (groupedByAnchors.episodes.length === 0) {
    return (
      <div className="text-center py-8">
        <Brain className="w-8 h-8 text-gray-400 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No episode memories</h3>
        <p className="text-gray-600 text-sm">Link memories to life episodes to see them here</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {groupedByAnchors.episodes.map(({ anchor, memories }) => (
        <div key={anchor.episode_id} className="border border-gray-200 rounded-lg p-4">
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <h4 className="font-medium text-gray-900">{anchor.episode?.title}</h4>
              {anchor.episode?.mood_emoji && <span className="text-lg">{anchor.episode.mood_emoji}</span>}
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>{anchor.episode?.date_range_start}</span>
              <span>-</span>
              <span>{anchor.episode?.date_range_end}</span>
              <span>•</span>
              <span>{memories.length} memories</span>
            </div>
          </div>
          <div className="space-y-2">
            {memories.map(memory => (
              <MemoryCard
                key={memory.id}
                memory={memory}
                variant="collection"
                displayMode="list"
                expandedDescriptions={expandedDescriptions}
                onMemoryClick={onMemoryClick}
                onEditMemory={onEditMemory}
                onDeleteMemory={onDeleteMemory}
                onToggleHighlight={onToggleHighlight}
                onToggleDescription={onToggleDescription}
                onTagClick={onTagClick}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}