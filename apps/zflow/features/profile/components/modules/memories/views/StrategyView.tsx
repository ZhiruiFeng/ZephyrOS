'use client'

import React from 'react'
import { Target } from 'lucide-react'
import MemoryCard from '@/features/memory/components/MemoryCard'
import { EnhancedMemory, MemoryGroupedByAnchors } from '../types'

interface StrategyViewProps {
  groupedByAnchors: MemoryGroupedByAnchors
  expandedDescriptions: Set<string>
  onMemoryClick: (memoryId: string) => void
  onEditMemory: (memory: EnhancedMemory) => void
  onDeleteMemory: (memoryId: string) => void
  onToggleHighlight: (memory: EnhancedMemory) => void
  onToggleDescription: (memoryId: string) => void
  onTagClick: (tag: string) => void
}

export default function StrategyView({
  groupedByAnchors,
  expandedDescriptions,
  onMemoryClick,
  onEditMemory,
  onDeleteMemory,
  onToggleHighlight,
  onToggleDescription,
  onTagClick
}: StrategyViewProps) {
  if (groupedByAnchors.strategies.length === 0) {
    return (
      <div className="text-center py-8">
        <Target className="w-8 h-8 text-gray-400 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No strategy memories</h3>
        <p className="text-gray-600 text-sm">Link memories to daily plans and reflections to see them here</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {groupedByAnchors.strategies.map(({ anchor, memories }) => (
        <div key={anchor.strategy_item_id} className="border border-gray-200 rounded-lg p-4">
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-gray-900">{anchor.strategy_item?.timeline_item_title}</h4>
              <span className={`text-xs px-2 py-1 rounded-full ${
                anchor.strategy_item?.importance_level === 'high' ? 'bg-red-100 text-red-700' :
                anchor.strategy_item?.importance_level === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                'bg-green-100 text-green-700'
              }`}>
                {anchor.strategy_item?.importance_level}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">
                {anchor.strategy_item?.strategy_type}
              </span>
              <span className="text-xs text-gray-500">
                {anchor.strategy_item?.local_date}
              </span>
              <span className="text-xs text-gray-500">
                {memories.length} memories
              </span>
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