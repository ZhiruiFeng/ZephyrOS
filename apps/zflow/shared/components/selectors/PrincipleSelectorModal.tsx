'use client'

import React from 'react'
import { Search, Plus, BookOpen, Star } from 'lucide-react'
import { usePrincipleSelector, PrincipleSelectorConfig, CorePrincipleMemory } from './usePrincipleSelector'

export interface PrincipleSelectorModalProps {
  isOpen: boolean
  onSelectPrinciple: (principle: CorePrincipleMemory) => void
  onCreateNew?: () => void
  onCancel: () => void
  title?: string
  config?: PrincipleSelectorConfig
  showCreateNew?: boolean
  createNewText?: string
  createNewDescription?: string
}

export function PrincipleSelectorModal({
  isOpen,
  onSelectPrinciple,
  onCreateNew,
  onCancel,
  title = 'Select a Principle',
  config,
  showCreateNew = true,
  createNewText = 'Create New Principle',
  createNewDescription = 'Create a custom principle'
}: PrincipleSelectorModalProps) {
  const {
    loading,
    error,
    searchQuery,
    setSearchQuery,
    filteredPrinciples,
    getPrincipleDisplayInfo,
    formatDate,
  } = usePrincipleSelector(config)

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

          {/* Create New Principle Option */}
          {showCreateNew && onCreateNew && (
            <div
              className="p-4 border-2 border-dashed border-purple-300 rounded-lg hover:border-purple-400 cursor-pointer transition-colors"
              onClick={onCreateNew}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <Plus className="w-4 h-4 text-purple-600" />
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
              placeholder="Search principles by title, description, category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Principle List */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="text-center py-4">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
                <p className="mt-2 text-sm text-gray-600">Loading principles...</p>
              </div>
            ) : filteredPrinciples.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {searchQuery ? 'No principles found matching your search' : 'No available principles'}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredPrinciples.map((principle) => {
                  const { title, subtitle, statusColor, categoryColor, categoryIcon, sourceLabel, importanceLevel } = getPrincipleDisplayInfo(principle)

                  return (
                    <div
                      key={principle.id}
                      className="group cursor-pointer transition-colors"
                      onClick={() => onSelectPrinciple(principle)}
                    >
                      <div className="p-3 rounded-lg border border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{categoryIcon}</span>
                              <h4 className="font-medium text-gray-900 truncate">
                                {title}
                              </h4>
                              {principle.content.is_default && (
                                <BookOpen className="w-4 h-4 text-blue-500" />
                              )}
                              {importanceLevel >= 4 && (
                                <Star className="w-4 h-4 text-yellow-500 fill-current" />
                              )}
                            </div>

                            {principle.content.description && (
                              <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                {principle.content.description}
                              </p>
                            )}

                            <div className="flex items-center gap-3 mt-2 flex-wrap">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusColor}`}>
                                {principle.content.status}
                              </span>
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${categoryColor}`}>
                                {principle.content.category.replace(/_/g, ' ')}
                              </span>
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-gray-600 bg-gray-50">
                                {sourceLabel}
                              </span>
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-purple-600 bg-purple-50">
                                Importance: {importanceLevel}/5
                              </span>
                            </div>

                            {/* Trigger Questions Preview */}
                            {principle.content.trigger_questions.length > 0 && (
                              <div className="mt-2 text-xs text-gray-500 italic">
                                "{principle.content.trigger_questions[0]}"
                              </div>
                            )}
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
