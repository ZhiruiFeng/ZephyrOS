import React, { useRef } from 'react'
import { Search, Filter, X, HelpCircle } from 'lucide-react'
import { Button } from '../ui'

interface SearchFilterBarProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  showFilters: boolean
  onToggleFilters: () => void
  statusFilter: string
  onStatusFilterChange: (status: string) => void
  priorityFilter: string
  onPriorityFilterChange: (priority: string) => void
  categoryFilter: string
  onCategoryFilterChange: (category: string) => void
  onClearFilters: () => void
  onShowKeyboardShortcuts: () => void
}

export const SearchFilterBar = ({
  searchQuery,
  onSearchChange,
  showFilters,
  onToggleFilters,
  statusFilter,
  onStatusFilterChange,
  priorityFilter,
  onPriorityFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  onClearFilters,
  onShowKeyboardShortcuts
}: SearchFilterBarProps) => {
  const searchInputRef = useRef<HTMLInputElement>(null)

  const hasActiveFilters = searchQuery || statusFilter !== 'all' || priorityFilter !== 'all' || categoryFilter !== 'all'

  return (
    <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search initiatives, tasks, or agents... (Press / to focus)"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>

          {/* Filter Controls */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onToggleFilters}
              className={`${showFilters ? 'bg-gray-100' : ''}`}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>

            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={onClearFilters}
                className="text-gray-600"
              >
                <X className="h-4 w-4 mr-2" />
                Clear
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={onShowKeyboardShortcuts}
              className="text-gray-600"
              title="Show keyboard shortcuts (Press ?)"
            >
              <HelpCircle className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Expandable Filter Panel */}
        {showFilters && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Status Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => onStatusFilterChange(e.target.value)}
                  className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="on_hold">On Hold</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              {/* Priority Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Priority</label>
                <select
                  value={priorityFilter}
                  onChange={(e) => onPriorityFilterChange(e.target.value)}
                  className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Priorities</option>
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              {/* Category Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={categoryFilter}
                  onChange={(e) => onCategoryFilterChange(e.target.value)}
                  className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Categories</option>
                  <option value="Product">Product</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Process">Process</option>
                  <option value="Research">Research</option>
                  <option value="Development">Development</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
