'use client'

import React from 'react'
import { Filter, Star } from 'lucide-react'
import { MemoryFilters } from '@/types/domain/memory'
import { AnchorFilterType } from './types'
import { getRelationTypes } from './utils'

interface MemoryFiltersPanelProps {
  showFilters: boolean
  setShowFilters: (show: boolean) => void
  anchorFilter: AnchorFilterType
  setAnchorFilter: (filter: AnchorFilterType) => void
  relationTypeFilter: string
  setRelationTypeFilter: (filter: string) => void
  filters: MemoryFilters
  setFilters: (filters: MemoryFilters | ((prev: MemoryFilters) => MemoryFilters)) => void
}

export default function MemoryFiltersPanel({
  showFilters,
  setShowFilters,
  anchorFilter,
  setAnchorFilter,
  relationTypeFilter,
  setRelationTypeFilter,
  filters,
  setFilters
}: MemoryFiltersPanelProps) {
  const hasActiveFilters = anchorFilter !== 'all' || relationTypeFilter !== 'all' || filters.show_highlights_only

  const clearAllFilters = () => {
    setAnchorFilter('all')
    setRelationTypeFilter('all')
    setFilters(prev => ({ ...prev, show_highlights_only: false }))
  }

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          <Filter className="w-4 h-4" />
          Filters
          {hasActiveFilters && (
            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs">
              Active
            </span>
          )}
        </button>
      </div>

      {showFilters && (
        <div className="p-4 bg-gray-50 rounded-lg border space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Anchor Type Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Anchor Type
              </label>
              <select
                value={anchorFilter}
                onChange={(e) => setAnchorFilter(e.target.value as AnchorFilterType)}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">All</option>
                <option value="tasks">Tasks</option>
                <option value="episodes">Episodes</option>
                <option value="strategies">Strategies</option>
                <option value="unanchored">Unanchored</option>
              </select>
            </div>

            {/* Relation Type Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Relation Type
              </label>
              <select
                value={relationTypeFilter}
                onChange={(e) => setRelationTypeFilter(e.target.value)}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">All Relations</option>
                {getRelationTypes().map(type => (
                  <option key={type} value={type}>
                    {type.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Filters */}
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1 text-sm">
                <input
                  type="checkbox"
                  checked={filters.show_highlights_only}
                  onChange={(e) => setFilters(prev => ({ ...prev, show_highlights_only: e.target.checked }))}
                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <Star className="w-3 h-3" />
                Highlights only
              </label>
            </div>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <div className="flex justify-end">
              <button
                onClick={clearAllFilters}
                className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}