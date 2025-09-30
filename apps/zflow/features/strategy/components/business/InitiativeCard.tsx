import React, { useState } from 'react'
import { Badge } from '../ui'
import { Edit2, Clock, AlertCircle, CheckCircle2, TrendingUp, ListTodo } from 'lucide-react'
import { EditInitiativeModal } from '../modals/EditInitiativeModal'
import { InitiativeDetailModal } from '../modals/InitiativeDetailModal'
import type { Initiative } from '../../types/strategy'

interface InitiativeCardProps {
  initiative: Initiative
  progressIntent: (p: number) => string
  onInitiativeUpdated?: (initiative: Initiative) => void
}

export const InitiativeCard = React.memo(function InitiativeCard({
  initiative,
  progressIntent,
  onInitiativeUpdated
}: InitiativeCardProps) {
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  const handleEditSuccess = (updatedInitiative: Initiative) => {
    onInitiativeUpdated?.(updatedInitiative)
  }

  const handleCardClick = () => {
    setIsDetailModalOpen(true)
  }

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent card click
    setIsEditModalOpen(true)
  }

  // Calculate task breakdown
  const completedTasks = initiative.tasks.filter(t => t.status === 'completed').length
  const inProgressTasks = initiative.tasks.filter(t => t.status === 'in_progress').length
  const totalTasks = initiative.tasks.length

  // Status badge styling
  const statusConfig = {
    pending: { label: 'Not Started', color: 'bg-gray-100 text-gray-700', icon: Clock },
    in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-700', icon: TrendingUp },
    completed: { label: 'Completed', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
    on_hold: { label: 'On Hold', color: 'bg-yellow-100 text-yellow-700', icon: AlertCircle },
    cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700', icon: AlertCircle }
  }

  const status = statusConfig[initiative.status] || statusConfig.pending
  const StatusIcon = status.icon

  // Priority badge styling
  const priorityConfig = {
    urgent: { color: 'bg-red-500', label: 'Urgent' },
    high: { color: 'bg-orange-500', label: 'High' },
    medium: { color: 'bg-blue-500', label: 'Medium' },
    low: { color: 'bg-gray-400', label: 'Low' }
  }

  const priority = initiative.priority ? priorityConfig[initiative.priority] : null

  // Due date status
  const isDueSoon = initiative.due_date && new Date(initiative.due_date).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000
  const isOverdue = initiative.due_date && new Date(initiative.due_date) < new Date()

  return (
    <>
      <div
        onClick={handleCardClick}
        className="relative border-2 rounded-xl p-4 bg-gradient-to-br from-white to-gray-50/50 hover:shadow-lg hover:border-blue-200 transition-all duration-200 touch-pan-y group cursor-pointer"
      >
        {/* Priority indicator bar */}
        {priority && (
          <div className={`absolute top-0 left-0 right-0 h-1 ${priority.color} rounded-t-xl`} />
        )}

        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base leading-tight mb-1 text-gray-900">
              {initiative.title}
            </h3>
            {initiative.description && (
              <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                {initiative.description}
              </p>
            )}
          </div>

          {/* Actions */}
          <button
            onClick={handleEditClick}
            className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
            title="Edit initiative"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        </div>

        {/* Progress Section */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-gray-700">Progress</span>
            <span className="text-xs font-semibold text-gray-900">{initiative.progress}%</span>
          </div>
          <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-2 ${progressIntent(initiative.progress)} rounded-full transition-all duration-500`}
              style={{ width: `${initiative.progress}%` }}
            />
          </div>
        </div>

        {/* Meta Information */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {/* Status Badge */}
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${status.color}`}>
            <StatusIcon className="w-3 h-3" />
            {status.label}
          </span>

          {/* Task Count */}
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 rounded-md text-xs font-medium">
            <ListTodo className="w-3 h-3" />
            {completedTasks}/{totalTasks} tasks
          </span>

          {/* Due Date (if exists and soon/overdue) */}
          {initiative.due_date && (isDueSoon || isOverdue) && (
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${
              isOverdue ? 'bg-red-50 text-red-700' : 'bg-orange-50 text-orange-700'
            }`}>
              <Clock className="w-3 h-3" />
              {isOverdue ? 'Overdue' : 'Due Soon'}
            </span>
          )}
        </div>

        {/* Footer: Category & Priority */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          {initiative.category && (
            <span className="text-xs text-gray-500 font-medium">
              {initiative.category}
            </span>
          )}

          {priority && (
            <span className={`text-xs font-semibold px-2 py-0.5 rounded ${priority.color} text-white`}>
              {priority.label}
            </span>
          )}
        </div>
      </div>

      <InitiativeDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        initiative={initiative}
        progressIntent={progressIntent}
        onInitiativeUpdated={handleEditSuccess}
      />

      <EditInitiativeModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={handleEditSuccess}
        initiative={initiative}
      />
    </>
  )
})
