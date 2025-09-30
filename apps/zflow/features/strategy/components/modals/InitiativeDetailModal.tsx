import React, { useState } from 'react'
import { X, Edit2, Calendar, Target, Flag, Tag, ListTodo, Clock, TrendingUp, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react'
import { Button, Badge } from '../ui'
import { EditInitiativeModal } from './EditInitiativeModal'
import type { Initiative } from '../../types/strategy'

interface InitiativeDetailModalProps {
  isOpen: boolean
  onClose: () => void
  initiative: Initiative | null
  progressIntent: (p: number) => string
  onInitiativeUpdated?: (initiative: Initiative) => void
}

export const InitiativeDetailModal = ({
  isOpen,
  onClose,
  initiative,
  progressIntent,
  onInitiativeUpdated
}: InitiativeDetailModalProps) => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  if (!isOpen || !initiative) return null

  // Calculate task breakdown
  const completedTasks = initiative.tasks.filter(t => t.status === 'completed').length
  const inProgressTasks = initiative.tasks.filter(t => t.status === 'in_progress').length
  const pendingTasks = initiative.tasks.filter(t => t.status === 'pending').length
  const totalTasks = initiative.tasks.length

  // Status configuration
  const statusConfig = {
    pending: { label: 'Not Started', color: 'bg-gray-100 text-gray-700 border-gray-300', icon: Clock },
    in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-700 border-blue-300', icon: TrendingUp },
    completed: { label: 'Completed', color: 'bg-green-100 text-green-700 border-green-300', icon: CheckCircle2 },
    on_hold: { label: 'On Hold', color: 'bg-yellow-100 text-yellow-700 border-yellow-300', icon: AlertCircle },
    cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700 border-red-300', icon: AlertCircle }
  }

  const status = statusConfig[initiative.status] || statusConfig.pending
  const StatusIcon = status.icon

  // Priority configuration
  const priorityConfig = {
    urgent: { color: 'bg-red-500 text-white', label: 'Urgent', border: 'border-red-500' },
    high: { color: 'bg-orange-500 text-white', label: 'High', border: 'border-orange-500' },
    medium: { color: 'bg-blue-500 text-white', label: 'Medium', border: 'border-blue-500' },
    low: { color: 'bg-gray-400 text-white', label: 'Low', border: 'border-gray-400' }
  }

  const priority = initiative.priority ? priorityConfig[initiative.priority] : null

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const handleEditSuccess = (updatedInitiative: Initiative) => {
    onInitiativeUpdated?.(updatedInitiative)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="relative bg-gradient-to-br from-blue-50 via-purple-50/30 to-blue-50 border-b border-gray-200 px-6 py-5">
            {/* Priority bar */}
            {priority && (
              <div className={`absolute top-0 left-0 right-0 h-1.5 ${priority.color.replace('text-white', '')}`} />
            )}

            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h2 className="text-2xl font-bold text-gray-900 mb-2 leading-tight">
                  {initiative.title}
                </h2>
                <div className="flex flex-wrap items-center gap-2">
                  {/* Status Badge */}
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-medium border ${status.color}`}>
                    <StatusIcon className="w-4 h-4" />
                    {status.label}
                  </span>

                  {/* Priority Badge */}
                  {priority && (
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-semibold ${priority.color}`}>
                      <Flag className="w-4 h-4" />
                      {priority.label}
                    </span>
                  )}

                  {/* Category */}
                  {initiative.category && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium">
                      <Tag className="w-4 h-4" />
                      {initiative.category}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  onClick={() => setIsEditModalOpen(true)}
                  variant="outline"
                  className="bg-white hover:bg-blue-50 border-blue-200"
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit
                </Button>
                <button
                  onClick={onClose}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(90vh-180px)] p-6 space-y-6">
            {/* Description */}
            {initiative.description && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Description
                </h3>
                <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">
                  {initiative.description}
                </p>
              </div>
            )}

            {/* Progress Section */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Progress
              </h3>
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Overall Progress</span>
                  <span className="text-lg font-bold text-gray-900">{initiative.progress}%</span>
                </div>
                <div className="h-3 w-full bg-gray-200 rounded-full overflow-hidden mb-4">
                  <div
                    className={`h-3 ${progressIntent(initiative.progress)} rounded-full transition-all duration-500`}
                    style={{ width: `${initiative.progress}%` }}
                  />
                </div>

                {/* Task Breakdown */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="text-center p-3 bg-white rounded-lg border border-gray-200">
                    <div className="text-2xl font-bold text-gray-900">{totalTasks}</div>
                    <div className="text-xs text-gray-600 mt-1">Total Tasks</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="text-2xl font-bold text-green-700">{completedTasks}</div>
                    <div className="text-xs text-green-600 mt-1">Completed</div>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="text-2xl font-bold text-blue-700">{inProgressTasks}</div>
                    <div className="text-xs text-blue-600 mt-1">In Progress</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="text-2xl font-bold text-gray-700">{pendingTasks}</div>
                    <div className="text-xs text-gray-600 mt-1">Pending</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tasks List */}
            {initiative.tasks.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <ListTodo className="w-4 h-4" />
                  Tasks ({totalTasks})
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {initiative.tasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                        task.status === 'completed' ? 'bg-green-500' :
                        task.status === 'in_progress' ? 'bg-blue-500' :
                        'bg-gray-400'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-medium ${
                          task.status === 'completed' ? 'text-gray-500 line-through' : 'text-gray-900'
                        }`}>
                          {task.title}
                        </div>
                        {task.description && (
                          <div className="text-xs text-gray-500 mt-1 line-clamp-1">
                            {task.description}
                          </div>
                        )}
                      </div>
                      <span className={`text-xs px-2 py-1 rounded ${
                        task.status === 'completed' ? 'bg-green-100 text-green-700' :
                        task.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-200 text-gray-700'
                      }`}>
                        {task.status.replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Metadata */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Due Date */}
              {initiative.due_date && (
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1">
                    <Calendar className="w-4 h-4" />
                    Due Date
                  </div>
                  <div className="text-gray-900 font-medium">
                    {formatDate(initiative.due_date)}
                  </div>
                </div>
              )}

              {/* Created Date */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1">
                  <Clock className="w-4 h-4" />
                  Created
                </div>
                <div className="text-gray-900 font-medium">
                  {formatDate(initiative.created_at)}
                </div>
              </div>
            </div>

            {/* Tags */}
            {initiative.tags.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  Tags
                </h3>
                <div className="flex flex-wrap gap-2">
                  {initiative.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium border border-blue-200"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex items-center justify-between">
            <div className="text-xs text-gray-500">
              Last updated: {formatDate(initiative.updated_at)}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <EditInitiativeModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={handleEditSuccess}
        initiative={initiative}
      />
    </>
  )
}