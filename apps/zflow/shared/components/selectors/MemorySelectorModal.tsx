'use client'

import React from 'react'
import { Search, Plus, Clock, Tag, Star } from 'lucide-react'
import { Memory } from 'types'
import { useMemorySelector, MemorySelectorConfig } from './useMemorySelector'

export interface MemorySelectorModalProps {
  isOpen: boolean
  onSelectMemory: (memory: Memory) => void
  onCreateNew?: () => void
  onCancel: () => void
  title?: string
  config?: MemorySelectorConfig
  showCreateNew?: boolean
  createNewText?: string
  createNewDescription?: string
}

export function MemorySelectorModal({
  isOpen,
  onSelectMemory,
  onCreateNew,
  onCancel,
  title = 'Select a Memory',
  config,
  showCreateNew = true,
  createNewText = 'Create New Memory',
  createNewDescription = 'Create a new memory'
}: MemorySelectorModalProps) {
  const {
    loading,
    error,
    searchQuery,
    setSearchQuery,
    filteredMemories,
    getMemoryDisplayInfo,
    formatDate,
  } = useMemorySelector(config)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-hidden">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <button
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              onClick={onCancel}
            >
              Cancel
            </button>
          </div>

          {/* Create New Memory Option */}
          {showCreateNew && onCreateNew && (
            <div
              className="p-4 border-2 border-dashed border-blue-300 rounded-lg hover:border-blue-400 cursor-pointer transition-colors"
              onClick={onCreateNew}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <Plus className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <div className="font-medium text-gray-900">{createNewText}</div>
                  <div className="text-sm text-gray-500">{createNewDescription}</div>
                </div>
              </div>
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search memories by title, content, type, tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Memory List */}
          <div className="max-h-60 overflow-y-auto">
            {loading ? (
              <div className="text-center py-4">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <p className="mt-2 text-sm text-gray-600">Loading memories...</p>
              </div>
            ) : filteredMemories.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {searchQuery ? 'No memories found matching your search' : 'No available memories'}
              </div>
            ) : (
              <div className="space-y-1">
                {filteredMemories.map((memory) => {
                  const { title, subtitle, statusColor, typeColor, typeIcon, isHighlight, importanceColor } = getMemoryDisplayInfo(memory)

                  return (
                    <div
                      key={memory.id}
                      className="group cursor-pointer transition-colors mt-2 first:mt-0"
                      onClick={() => onSelectMemory(memory)}
                    >
                      <div className="p-3 rounded-lg border border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{typeIcon}</span>
                              <h4 className="font-medium text-gray-900 truncate">
                                {title}
                              </h4>
                              {isHighlight && (
                                <Star className="w-4 h-4 text-yellow-500 fill-current" />
                              )}
                            </div>

                            {memory.note && (
                              <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                {memory.note}
                              </p>
                            )}

                            <div className="flex items-center gap-3 mt-2 flex-wrap">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusColor}`}>
                                {memory.status}
                              </span>
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${typeColor}`}>
                                {memory.memory_type}
                              </span>
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${importanceColor}`}>
                                {memory.importance_level}
                              </span>

                              {memory.captured_at && (
                                <div className="flex items-center text-xs text-gray-500">
                                  <Clock className="w-3 h-3 mr-1" />
                                  {formatDate(memory.captured_at)}
                                </div>
                              )}

                              {memory.category?.name && (
                                <div className="flex items-center text-xs text-gray-500">
                                  <Tag className="w-3 h-3 mr-1" />
                                  {memory.category.name}
                                </div>
                              )}

                              {memory.tags.length > 0 && (
                                <div className="flex items-center text-xs text-gray-500">
                                  #{memory.tags.slice(0, 2).join(', #')}
                                  {memory.tags.length > 2 && ` +${memory.tags.length - 2}`}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}