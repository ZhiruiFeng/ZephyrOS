'use client'

import React from 'react'
import { Anchor, CheckCircle2, Brain, Target } from 'lucide-react'
import MemoryCard from '@/features/memory/components/MemoryCard'
import { EnhancedMemory, MemoryGroupedByAnchors } from '../types'

interface AnchoredViewProps {
  groupedByAnchors: MemoryGroupedByAnchors
  isFullscreen: boolean
  expandedDescriptions: Set<string>
  onMemoryClick: (memoryId: string) => void
  onEditMemory: (memory: EnhancedMemory) => void
  onDeleteMemory: (memoryId: string) => void
  onToggleHighlight: (memory: EnhancedMemory) => void
  onToggleDescription: (memoryId: string) => void
  onTagClick: (tag: string) => void
}

export default function AnchoredView({
  groupedByAnchors,
  isFullscreen,
  expandedDescriptions,
  onMemoryClick,
  onEditMemory,
  onDeleteMemory,
  onToggleHighlight,
  onToggleDescription,
  onTagClick
}: AnchoredViewProps) {
  const hasAnyAnchors = Object.keys(groupedByAnchors).some(
    key => groupedByAnchors[key as keyof typeof groupedByAnchors].length > 0
  )

  if (!hasAnyAnchors) {
    return (
      <div className="text-center py-8">
        <Anchor className="w-8 h-8 text-gray-400 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No anchored memories</h3>
        <p className="text-gray-600 text-sm">Link memories to tasks, episodes, or strategies to see them here</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Task Anchors */}
      {groupedByAnchors.tasks.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-600" />
            Tasks ({groupedByAnchors.tasks.length})
          </h4>
          <div className="space-y-3">
            {groupedByAnchors.tasks.slice(0, isFullscreen ? 10 : 3).map(({ anchor, memories }) => (
              <div key={anchor.anchor_item_id} className="border border-gray-200 rounded-lg p-3">
                <div className="mb-3">
                  <h5 className="font-medium text-gray-900">{anchor.timeline_item?.title}</h5>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                      {anchor.relation_type.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-gray-500">{memories.length} memories</span>
                  </div>
                </div>
                <div className="space-y-2">
                  {memories.slice(0, 2).map(memory => (
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
                  {memories.length > 2 && (
                    <p className="text-xs text-gray-500 text-center">
                      +{memories.length - 2} more memories
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Episode Anchors */}
      {groupedByAnchors.episodes.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <Brain className="w-4 h-4 text-green-600" />
            Episodes ({groupedByAnchors.episodes.length})
          </h4>
          <div className="space-y-3">
            {groupedByAnchors.episodes.slice(0, isFullscreen ? 10 : 3).map(({ anchor, memories }) => (
              <div key={anchor.episode_id} className="border border-gray-200 rounded-lg p-3">
                <div className="mb-3">
                  <h5 className="font-medium text-gray-900 flex items-center gap-2">
                    {anchor.episode?.title}
                    {anchor.episode?.mood_emoji && <span>{anchor.episode.mood_emoji}</span>}
                  </h5>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                      {anchor.relation_type.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-gray-500">{memories.length} memories</span>
                  </div>
                </div>
                <div className="space-y-2">
                  {memories.slice(0, 2).map(memory => (
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
                  {memories.length > 2 && (
                    <p className="text-xs text-gray-500 text-center">
                      +{memories.length - 2} more memories
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Strategy Anchors */}
      {groupedByAnchors.strategies.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <Target className="w-4 h-4 text-purple-600" />
            Strategies ({groupedByAnchors.strategies.length})
          </h4>
          <div className="space-y-3">
            {groupedByAnchors.strategies.slice(0, isFullscreen ? 10 : 3).map(({ anchor, memories }) => (
              <div key={anchor.strategy_item_id} className="border border-gray-200 rounded-lg p-3">
                <div className="mb-3">
                  <h5 className="font-medium text-gray-900">{anchor.strategy_item?.timeline_item_title}</h5>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">
                      {anchor.strategy_item?.strategy_type}
                    </span>
                    <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">
                      {anchor.relation_type.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-gray-500">{memories.length} memories</span>
                  </div>
                </div>
                <div className="space-y-2">
                  {memories.slice(0, 2).map(memory => (
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
                  {memories.length > 2 && (
                    <p className="text-xs text-gray-500 text-center">
                      +{memories.length - 2} more memories
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}