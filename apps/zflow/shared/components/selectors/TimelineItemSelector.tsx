'use client'

import React, { useState } from 'react'
import { Search, Plus, CheckCheck, Activity, FileText } from 'lucide-react'
import { TaskMemory } from '@/lib/api/api-base'
import { Activity as ActivityType } from '@/features/activities/types/activities'
import { Memory } from 'types'
import { TaskSelectorConfig, useTaskSelector } from './useTaskSelector'
import { ActivitySelectorConfig, useActivitySelector } from './useActivitySelector'
import { MemorySelectorConfig, useMemorySelector } from './useMemorySelector'

export type TimelineItemType = 'task' | 'activity' | 'memory'
export type TimelineItem = TaskMemory | ActivityType | Memory

export interface TimelineItemSelectorConfig {
  /** Which item types to enable */
  enabledTypes: TimelineItemType[]
  /** Configuration for task selector */
  taskConfig?: TaskSelectorConfig
  /** Configuration for activity selector */
  activityConfig?: ActivitySelectorConfig
  /** Configuration for memory selector */
  memoryConfig?: MemorySelectorConfig
}

export interface TimelineItemSelectorProps {
  isOpen: boolean
  onSelectItem: (item: TimelineItem, type: TimelineItemType) => void
  onCreateNew?: (type: TimelineItemType) => void
  onCancel: () => void
  title?: string
  config: TimelineItemSelectorConfig
  showCreateNew?: boolean
  defaultTab?: TimelineItemType
}

const TAB_CONFIG = {
  task: {
    label: 'Tasks',
    icon: CheckCheck,
    color: 'blue',
    createText: 'Create New Task',
    createDescription: 'Create a new task'
  },
  activity: {
    label: 'Activities',
    icon: Activity,
    color: 'green',
    createText: 'Create New Activity',
    createDescription: 'Create a new activity'
  },
  memory: {
    label: 'Memories',
    icon: FileText,
    color: 'purple',
    createText: 'Create New Memory',
    createDescription: 'Create a new memory'
  }
}

export function TimelineItemSelector({
  isOpen,
  onSelectItem,
  onCreateNew,
  onCancel,
  title = 'Select Timeline Item',
  config,
  showCreateNew = true,
  defaultTab
}: TimelineItemSelectorProps) {
  const [activeTab, setActiveTab] = useState<TimelineItemType>(
    defaultTab || config.enabledTypes[0]
  )

  if (!isOpen) return null

  const getTabClass = (tabType: TimelineItemType) => {
    const tabConfig = TAB_CONFIG[tabType]
    const isActive = activeTab === tabType
    return `
      flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors
      ${isActive
        ? `bg-${tabConfig.color}-100 text-${tabConfig.color}-700 border border-${tabConfig.color}-200`
        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
      }
    `.trim()
  }

  const handleSelectTask = (task: TaskMemory) => {
    onSelectItem(task, 'task')
  }

  const handleSelectActivity = (activity: ActivityType) => {
    onSelectItem(activity, 'activity')
  }

  const handleSelectMemory = (memory: Memory) => {
    onSelectItem(memory, 'memory')
  }

  const handleCreateNew = () => {
    if (onCreateNew) {
      onCreateNew(activeTab)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-hidden">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <button
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              onClick={onCancel}
            >
              Cancel
            </button>
          </div>

          {/* Tab Navigation */}
          {config.enabledTypes.length > 1 && (
            <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
              {config.enabledTypes.map((type) => {
                const tabConfig = TAB_CONFIG[type]
                const Icon = tabConfig.icon
                return (
                  <button
                    key={type}
                    onClick={() => setActiveTab(type)}
                    className={getTabClass(type)}
                  >
                    <Icon className="w-4 h-4" />
                    {tabConfig.label}
                  </button>
                )
              })}
            </div>
          )}

          {/* Tab Content */}
          <div className="min-h-[400px]">
            {activeTab === 'task' && (
              <TaskSelectorContent
                onSelectTask={handleSelectTask}
                onCreateNew={showCreateNew ? handleCreateNew : undefined}
                config={config.taskConfig}
                showCreateNew={showCreateNew}
                createNewText={TAB_CONFIG.task.createText}
                createNewDescription={TAB_CONFIG.task.createDescription}
              />
            )}

            {activeTab === 'activity' && (
              <ActivitySelectorContent
                onSelectActivity={handleSelectActivity}
                onCreateNew={showCreateNew ? handleCreateNew : undefined}
                config={config.activityConfig}
                showCreateNew={showCreateNew}
                createNewText={TAB_CONFIG.activity.createText}
                createNewDescription={TAB_CONFIG.activity.createDescription}
              />
            )}

            {activeTab === 'memory' && (
              <MemorySelectorContent
                onSelectMemory={handleSelectMemory}
                onCreateNew={showCreateNew ? handleCreateNew : undefined}
                config={config.memoryConfig}
                showCreateNew={showCreateNew}
                createNewText={TAB_CONFIG.memory.createText}
                createNewDescription={TAB_CONFIG.memory.createDescription}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Internal content components (extracted from modal content)
interface TaskSelectorContentProps {
  onSelectTask: (task: TaskMemory) => void
  onCreateNew?: () => void
  config?: TaskSelectorConfig
  showCreateNew?: boolean
  createNewText?: string
  createNewDescription?: string
}

function TaskSelectorContent({
  onSelectTask,
  onCreateNew,
  config,
  showCreateNew = true,
  createNewText = 'Create New Task',
  createNewDescription = 'Create a new task'
}: TaskSelectorContentProps) {
  const {
    loading,
    error,
    searchQuery,
    setSearchQuery,
    filteredTasks,
    getTaskDisplayInfo,
    formatDate,
  } = useTaskSelector(config)

  return (
    <div className="space-y-4">
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
  )
}

interface ActivitySelectorContentProps {
  onSelectActivity: (activity: ActivityType) => void
  onCreateNew?: () => void
  config?: ActivitySelectorConfig
  showCreateNew?: boolean
  createNewText?: string
  createNewDescription?: string
}

function ActivitySelectorContent({
  onSelectActivity,
  onCreateNew,
  config,
  showCreateNew = true,
  createNewText = 'Create New Activity',
  createNewDescription = 'Create a new activity'
}: ActivitySelectorContentProps) {
  const {
    loading,
    error,
    searchQuery,
    setSearchQuery,
    filteredActivities,
    getActivityDisplayInfo,
    formatDate,
  } = useActivitySelector(config)

  return (
    <div className="space-y-4">
      {/* Create New Activity Option */}
      {showCreateNew && onCreateNew && (
        <div
          className="p-4 border-2 border-dashed border-green-300 rounded-lg hover:border-green-400 cursor-pointer transition-colors"
          onClick={onCreateNew}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <Plus className="w-4 h-4 text-green-600" />
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
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
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
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
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
                  <div className="p-3 rounded-lg border border-gray-200 bg-white hover:border-green-300 hover:bg-green-50 transition-colors">
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
  )
}

interface MemorySelectorContentProps {
  onSelectMemory: (memory: Memory) => void
  onCreateNew?: () => void
  config?: MemorySelectorConfig
  showCreateNew?: boolean
  createNewText?: string
  createNewDescription?: string
}

function MemorySelectorContent({
  onSelectMemory,
  onCreateNew,
  config,
  showCreateNew = true,
  createNewText = 'Create New Memory',
  createNewDescription = 'Create a new memory'
}: MemorySelectorContentProps) {
  const {
    loading,
    error,
    searchQuery,
    setSearchQuery,
    filteredMemories,
    getMemoryDisplayInfo,
    formatDate,
  } = useMemorySelector(config)

  return (
    <div className="space-y-4">
      {/* Create New Memory Option */}
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
          placeholder="Search memories by title, content, type, tags..."
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

      {/* Memory List */}
      <div className="max-h-60 overflow-y-auto">
        {loading ? (
          <div className="text-center py-4">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
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
                  <div className="p-3 rounded-lg border border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{typeIcon}</span>
                          <h4 className="font-medium text-gray-900 truncate">
                            {title}
                          </h4>
                          {isHighlight && (
                            <span className="text-yellow-500">⭐</span>
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
  )
}