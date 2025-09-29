'use client'

import React from 'react'
import { Search, Plus, Clock, Tag } from 'lucide-react'
import { Activity } from '@/features/activities/types/activities'
import { useActivitySelector, ActivitySelectorConfig } from './useActivitySelector'

export interface ActivitySelectorModalProps {
  isOpen: boolean
  onSelectActivity: (activity: Activity) => void
  onCreateNew?: () => void
  onCancel: () => void
  title?: string
  config?: ActivitySelectorConfig
  showCreateNew?: boolean
  createNewText?: string
  createNewDescription?: string
}

export function ActivitySelectorModal({
  isOpen,
  onSelectActivity,
  onCreateNew,
  onCancel,
  title = 'Select an Activity',
  config,
  showCreateNew = true,
  createNewText = 'Create New Activity',
  createNewDescription = 'Create a new activity'
}: ActivitySelectorModalProps) {
  const {
    loading,
    error,
    searchQuery,
    setSearchQuery,
    filteredActivities,
    getActivityDisplayInfo,
    formatDate,
  } = useActivitySelector(config)

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

          {/* Create New Activity Option */}
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
              placeholder="Search activities by title, type, status..."
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

          {/* Activity List */}
          <div className="max-h-60 overflow-y-auto">
            {loading ? (
              <div className="text-center py-4">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <p className="mt-2 text-sm text-gray-600">Loading activities...</p>
              </div>
            ) : filteredActivities.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {searchQuery ? 'No activities found matching your search' : 'No available activities'}
              </div>
            ) : (
              <div className="space-y-1">
                {filteredActivities.map((activity) => {
                  const { title, subtitle, statusColor, typeColor, typeIcon } = getActivityDisplayInfo(activity)

                  return (
                    <div
                      key={activity.id}
                      className="group cursor-pointer transition-colors mt-2 first:mt-0"
                      onClick={() => onSelectActivity(activity)}
                    >
                      <div className="p-3 rounded-lg border border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{typeIcon}</span>
                              <h4 className="font-medium text-gray-900 truncate">
                                {title}
                              </h4>
                            </div>

                            {activity.description && (
                              <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                {activity.description}
                              </p>
                            )}

                            <div className="flex items-center gap-3 mt-2 flex-wrap">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusColor}`}>
                                {activity.status}
                              </span>
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${typeColor}`}>
                                {activity.activity_type}
                              </span>

                              {activity.created_at && (
                                <div className="flex items-center text-xs text-gray-500">
                                  <Clock className="w-3 h-3 mr-1" />
                                  {formatDate(activity.created_at)}
                                </div>
                              )}

                              {activity.category_id && (
                                <div className="flex items-center text-xs text-gray-500">
                                  <Tag className="w-3 h-3 mr-1" />
                                  {activity.category_id}
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