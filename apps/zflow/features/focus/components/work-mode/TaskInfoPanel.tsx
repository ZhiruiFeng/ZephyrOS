'use client'

import React from 'react'
import { Settings, Save, Plus } from 'lucide-react'
import { TaskContent } from '@/lib/api'
import { useTranslation } from '@/contexts/LanguageContext'

interface TaskInfo {
  title: string
  description: string
  status: TaskContent['status']
  priority: TaskContent['priority']
  progress: number
  due_date: string
  estimated_duration: number
  assignee: string
  tags: string[]
}

interface TaskInfoPanelProps {
  showTaskInfo: boolean
  editingTaskInfo: boolean
  setEditingTaskInfo: (editing: boolean) => void
  taskInfo: TaskInfo
  setTaskInfo: React.Dispatch<React.SetStateAction<TaskInfo>>
  handleSaveTaskInfo: () => Promise<void>
  isSaving: boolean
  addTag: () => void
  removeTag: (tag: string) => void
  selectedTask: any
}

export default function TaskInfoPanel({
  showTaskInfo,
  editingTaskInfo,
  setEditingTaskInfo,
  taskInfo,
  setTaskInfo,
  handleSaveTaskInfo,
  isSaving,
  addTag,
  removeTag,
  selectedTask
}: TaskInfoPanelProps) {
  const { t } = useTranslation()

  if (!showTaskInfo) return null

  return (
    <div className="p-4 lg:p-6 border-b border-gray-200 bg-gray-50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Settings className="w-5 h-5" />
          {t.ui.taskInfo}
        </h3>
        <div className="flex items-center gap-2">
          {editingTaskInfo ? (
            <>
              <button
                onClick={handleSaveTaskInfo}
                disabled={isSaving}
                className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 text-sm transition-colors"
              >
                <Save className="w-4 h-4" />
                {t.common.save}
              </button>
              <button
                onClick={() => {
                  setEditingTaskInfo(false)
                  if (selectedTask) {
                    setTaskInfo({
                      title: selectedTask.content.title || '',
                      description: selectedTask.content.description || '',
                      status: selectedTask.content.status || 'pending',
                      priority: selectedTask.content.priority || 'medium',
                      progress: selectedTask.content.progress || 0,
                      due_date: selectedTask.content.due_date ? new Date(selectedTask.content.due_date).toISOString().slice(0, 16) : '',
                      estimated_duration: selectedTask.content.estimated_duration || 0,
                      assignee: selectedTask.content.assignee || '',
                      tags: selectedTask.tags || []
                    })
                  }
                }}
                className="px-3 py-1.5 text-gray-600 hover:text-gray-900 text-sm transition-colors"
              >
                {t.common.cancel}
              </button>
            </>
          ) : (
            <button
              onClick={() => setEditingTaskInfo(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm transition-colors"
            >
              <Settings className="w-4 h-4" />
              {t.common.edit}
            </button>
          )}
        </div>
      </div>

      {editingTaskInfo ? (
        <div className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.task.title}</label>
            <input
              type="text"
              value={taskInfo.title}
              onChange={(e) => setTaskInfo(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.task.description}</label>
            <textarea
              value={taskInfo.description}
              onChange={(e) => setTaskInfo(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Status and Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.task.status}</label>
              <select
                value={taskInfo.status}
                onChange={(e) => setTaskInfo(prev => ({ ...prev, status: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="pending">{t.task.statusPending}</option>
                <option value="in_progress">{t.task.statusInProgress}</option>
                <option value="completed">{t.task.statusCompleted}</option>
                <option value="cancelled">{t.task.statusCancelled}</option>
                <option value="on_hold">{t.task.statusOnHold}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.task.priority}</label>
              <select
                value={taskInfo.priority}
                onChange={(e) => setTaskInfo(prev => ({ ...prev, priority: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="low">{t.task.priorityLow}</option>
                <option value="medium">{t.task.priorityMedium}</option>
                <option value="high">{t.task.priorityHigh}</option>
                <option value="urgent">{t.task.priorityUrgent}</option>
              </select>
            </div>
          </div>

          {/* Progress */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.task.progress} ({taskInfo.progress}%)</label>
            <input
              type="range"
              min="0"
              max="100"
              value={taskInfo.progress}
              onChange={(e) => setTaskInfo(prev => ({ ...prev, progress: parseInt(e.target.value) }))}
              className="w-full"
            />
          </div>

          {/* Due Date and Estimated Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.ui.dueDate}</label>
              <input
                type="datetime-local"
                value={taskInfo.due_date}
                onChange={(e) => setTaskInfo(prev => ({ ...prev, due_date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.ui.estimatedDurationMinutes}</label>
              <input
                type="number"
                value={taskInfo.estimated_duration}
                onChange={(e) => setTaskInfo(prev => ({ ...prev, estimated_duration: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          {/* Assignee */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.ui.assignee}</label>
            <input
              type="text"
              value={taskInfo.assignee}
              onChange={(e) => setTaskInfo(prev => ({ ...prev, assignee: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.task.tags}</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {taskInfo.tags.map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-primary-100 text-primary-800 rounded-md text-sm"
                >
                  {tag}
                  <button
                    onClick={() => removeTag(tag)}
                    className="text-primary-600 hover:text-primary-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <button
              onClick={addTag}
              className="flex items-center gap-2 px-3 py-2 text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-md transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              {t.ui.addTag}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">{t.task.status}:</span>
              <span className="ml-2 text-gray-600">{taskInfo.status}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">{t.task.priority}:</span>
              <span className="ml-2 text-gray-600">{taskInfo.priority}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">{t.task.progress}:</span>
              <span className="ml-2 text-gray-600">{taskInfo.progress}%</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">{t.ui.assignee}:</span>
              <span className="ml-2 text-gray-600">{taskInfo.assignee || t.ui.unassigned}</span>
            </div>
          </div>
          {taskInfo.due_date && (
            <div>
              <span className="font-medium text-gray-700">{t.ui.dueDate}:</span>
              <span className="ml-2 text-gray-600">{new Date(taskInfo.due_date).toLocaleString()}</span>
            </div>
          )}
          {taskInfo.estimated_duration > 0 && (
            <div>
              <span className="font-medium text-gray-700">{t.task.estimatedDuration}:</span>
              <span className="ml-2 text-gray-600">{taskInfo.estimated_duration} {t.ui.minutes}</span>
            </div>
          )}
          {taskInfo.tags.length > 0 && (
            <div>
              <span className="font-medium text-gray-700">{t.task.tags}:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {taskInfo.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-primary-100 text-primary-800 rounded-md text-xs"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}