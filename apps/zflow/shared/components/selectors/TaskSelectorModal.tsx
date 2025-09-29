'use client'

import React from 'react'
import { Search, Plus, Clock, User } from 'lucide-react'
// Using a simple button instead of importing from UI library
// import { Button } from '../ui'
import { TaskMemory } from '@/lib/api/api-base'
import { useTaskSelector, TaskSelectorConfig } from './useTaskSelector'

export interface TaskSelectorModalProps {
  isOpen: boolean
  onSelectTask: (task: TaskMemory) => void
  onCreateNew?: () => void
  onCancel: () => void
  title?: string
  config?: TaskSelectorConfig
  showCreateNew?: boolean
  createNewText?: string
  createNewDescription?: string
}

export function TaskSelectorModal({
  isOpen,
  onSelectTask,
  onCreateNew,
  onCancel,
  title = 'Select a Task',
  config,
  showCreateNew = true,
  createNewText = 'Create New Task',
  createNewDescription = 'Create a new task'
}: TaskSelectorModalProps) {
  const {
    loading,
    error,
    searchQuery,
    setSearchQuery,
    filteredTasks,
    getTaskDisplayInfo,
    formatDate,
  } = useTaskSelector(config)

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

          {/* Create New Task Option */}
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
              placeholder="Search tasks by title, description, status..."
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

          {/* Task List */}
          <div className="max-h-60 overflow-y-auto">
            {loading ? (
              <div className="text-center py-4">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <p className="mt-2 text-sm text-gray-600">Loading tasks...</p>
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {searchQuery ? 'No tasks found matching your search' : 'No available tasks'}
              </div>
            ) : (
              <div className="space-y-1">
                {filteredTasks.map((task) => {
                  const { title, subtitle, isSubtask, isContextTask, statusColor, priorityColor } = getTaskDisplayInfo(task)

                  return (
                    <div
                      key={task.id}
                      className={`group transition-colors ${
                        isSubtask ? 'ml-4' : 'mt-2 first:mt-0'
                      } ${
                        isContextTask
                          ? 'cursor-default'
                          : 'cursor-pointer'
                      }`}
                      onClick={() => !isContextTask && onSelectTask(task)}
                    >
                      <div
                        className={`p-3 rounded-lg border transition-colors ${
                          isContextTask
                            ? 'border-gray-100 bg-gray-50 opacity-75'
                            : isSubtask
                              ? 'border-gray-100 bg-white hover:border-blue-200 hover:bg-blue-50'
                              : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h4 className={`font-medium truncate ${
                              isContextTask
                                ? 'text-gray-500'
                                : isSubtask
                                  ? 'text-gray-700'
                                  : 'text-gray-900'
                            }`}>
                              {isSubtask && <span className="text-gray-400 mr-1">↳</span>}
                              {title}
                              {isContextTask && <span className="text-xs text-gray-400 ml-2">(parent context)</span>}
                            </h4>

                            {task.content.description && !isSubtask && (
                              <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                {task.content.description}
                              </p>
                            )}

                            <div className="flex items-center gap-3 mt-2 flex-wrap">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusColor}`}>
                                {task.content.status}
                              </span>
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${priorityColor}`}>
                                {task.content.priority}
                              </span>

                              {task.content.due_date && (
                                <div className="flex items-center text-xs text-gray-500">
                                  <Clock className="w-3 h-3 mr-1" />
                                  {formatDate(task.content.due_date)}
                                </div>
                              )}

                              {task.content.assignee && (
                                <div className="flex items-center text-xs text-gray-500">
                                  <User className="w-3 h-3 mr-1" />
                                  {task.content.assignee}
                                </div>
                              )}

                              {!isSubtask && task.subtask_count != null && task.subtask_count > 0 && (
                                <div className="text-xs text-gray-500">
                                  {task.completed_subtask_count || 0}/{task.subtask_count} subtasks
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