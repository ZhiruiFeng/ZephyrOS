'use client'

import React, { useState, useEffect } from 'react'
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Plus,
  Filter,
  Search,
  SortAsc,
  SortDesc
} from 'lucide-react'
import MemoryCard, { type MemoryAnchor } from './MemoryCard'
import RelationTypeBadge, { type RelationType, relationConfig } from './RelationTypeBadge'

interface TaskMemoryDisplayProps {
  taskId: string
  memories: MemoryAnchor[]
  onAddMemory?: () => void
  onRemoveMemory?: (memoryId: string) => void
  onViewMemory?: (memoryId: string) => void
  isLoading?: boolean
  className?: string
  collapsible?: boolean
  compact?: boolean
}

type SortOption = 'created_at' | 'weight' | 'relation_type' | 'title'
type SortOrder = 'asc' | 'desc'

export default function TaskMemoryDisplay({
  taskId,
  memories,
  onAddMemory,
  onRemoveMemory,
  onViewMemory,
  isLoading = false,
  className = '',
  collapsible = true,
  compact = false
}: TaskMemoryDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [filterType, setFilterType] = useState<RelationType | 'all'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('created_at')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [showFilters, setShowFilters] = useState(false)

  // Filter and sort memories
  const filteredAndSortedMemories = React.useMemo(() => {
    let filtered = memories

    // Filter by relation type
    if (filterType !== 'all') {
      filtered = filtered.filter(anchor => anchor.relation_type === filterType)
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(anchor =>
        anchor.memory?.title.toLowerCase().includes(term) ||
        anchor.memory?.note.toLowerCase().includes(term) ||
        anchor.notes?.toLowerCase().includes(term)
      )
    }

    // Sort
    filtered.sort((a, b) => {
      let compareValue = 0

      switch (sortBy) {
        case 'created_at':
          compareValue = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          break
        case 'weight':
          compareValue = a.weight - b.weight
          break
        case 'relation_type':
          compareValue = a.relation_type.localeCompare(b.relation_type)
          break
        case 'title':
          compareValue = (a.memory?.title || '').localeCompare(b.memory?.title || '')
          break
      }

      return sortOrder === 'asc' ? compareValue : -compareValue
    })

    return filtered
  }, [memories, filterType, searchTerm, sortBy, sortOrder])

  // Group memories by relation type for better organization
  const groupedMemories = React.useMemo(() => {
    const groups: Record<RelationType, MemoryAnchor[]> = {
      context_of: [],
      result_of: [],
      insight_from: [],
      about: [],
      co_occurred: [],
      triggered_by: [],
      reflects_on: []
    }

    filteredAndSortedMemories.forEach(anchor => {
      groups[anchor.relation_type].push(anchor)
    })

    return groups
  }, [filteredAndSortedMemories])

  if (isLoading) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="flex items-center gap-2 mb-3">
          <BookOpen className="w-5 h-5 text-gray-400" />
          <span className="text-sm font-medium text-gray-500">Loading memories...</span>
        </div>
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  const totalMemories = memories.length
  const filteredCount = filteredAndSortedMemories.length

  return (
    <div className={`${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {collapsible ? (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
              <BookOpen className="w-4 h-4" />
              <span>Memories</span>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                {totalMemories}
              </span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Memories</span>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                {totalMemories}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          {totalMemories > 0 && (
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
              title="Show filters"
            >
              <Filter className="w-4 h-4" />
            </button>
          )}

          {onAddMemory && (
            <button
              onClick={onAddMemory}
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
            >
              <Plus className="w-3 h-3" />
              Add
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      {showFilters && isExpanded && totalMemories > 0 && (
        <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search memories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-7 pr-3 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Relation type filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as RelationType | 'all')}
              className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All types</option>
              {Object.entries(relationConfig).map(([type, config]) => (
                <option key={type} value={type}>
                  {config.label}
                </option>
              ))}
            </select>

            {/* Sort */}
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [sort, order] = e.target.value.split('-') as [SortOption, SortOrder]
                setSortBy(sort)
                setSortOrder(order)
              }}
              className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="created_at-desc">Newest first</option>
              <option value="created_at-asc">Oldest first</option>
              <option value="weight-desc">Highest weight</option>
              <option value="weight-asc">Lowest weight</option>
              <option value="title-asc">Title A-Z</option>
              <option value="title-desc">Title Z-A</option>
            </select>
          </div>

          {filteredCount !== totalMemories && (
            <div className="text-xs text-gray-500">
              Showing {filteredCount} of {totalMemories} memories
            </div>
          )}
        </div>
      )}

      {/* Content */}
      {isExpanded && (
        <div className="space-y-3">
          {totalMemories === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <BookOpen className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm">No memories anchored to this task yet.</p>
              {onAddMemory && (
                <button
                  onClick={onAddMemory}
                  className="mt-2 text-xs text-blue-600 hover:text-blue-700 underline"
                >
                  Add your first memory
                </button>
              )}
            </div>
          ) : filteredAndSortedMemories.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              <p className="text-sm">No memories match your filters.</p>
              <button
                onClick={() => {
                  setFilterType('all')
                  setSearchTerm('')
                }}
                className="mt-1 text-xs text-blue-600 hover:text-blue-700 underline"
              >
                Clear filters
              </button>
            </div>
          ) : compact ? (
            // Compact view: flat list
            <div className="space-y-2">
              {filteredAndSortedMemories.map((anchor) => (
                <MemoryCard
                  key={`${anchor.memory_id}-${anchor.anchor_item_id}`}
                  anchor={anchor}
                  onRemove={onRemoveMemory}
                  onExpand={onViewMemory}
                  compact={compact}
                />
              ))}
            </div>
          ) : (
            // Full view: grouped by relation type
            <div className="space-y-4">
              {Object.entries(groupedMemories).map(([relationType, anchors]) => {
                if (anchors.length === 0) return null

                return (
                  <div key={relationType}>
                    <div className="flex items-center gap-2 mb-2">
                      <RelationTypeBadge
                        type={relationType as RelationType}
                        size="sm"
                      />
                      <span className="text-xs text-gray-500">
                        {anchors.length} {anchors.length === 1 ? 'memory' : 'memories'}
                      </span>
                    </div>
                    <div className="space-y-2 ml-4">
                      {anchors.map((anchor) => (
                        <MemoryCard
                          key={`${anchor.memory_id}-${anchor.anchor_item_id}`}
                          anchor={anchor}
                          onRemove={onRemoveMemory}
                          onExpand={onViewMemory}
                          compact={compact}
                        />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}