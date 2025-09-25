import React, { useState } from 'react'
import { Badge } from '../ui'
import { Edit2, MoreHorizontal } from 'lucide-react'
import { EditInitiativeModal } from '../modals/EditInitiativeModal'
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
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [showActions, setShowActions] = useState(false)

  const handleEditSuccess = (updatedInitiative: Initiative) => {
    onInitiativeUpdated?.(updatedInitiative)
  }

  return (
    <>
      <div
        key={initiative.id}
        className="border rounded-xl p-4 bg-white hover:shadow-md transition-shadow duration-200 touch-pan-y group relative"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="font-medium text-sm sm:text-base leading-tight min-w-0 flex-1">
            {initiative.title}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge variant="outline">
              {initiative.progress}%
            </Badge>
            {/* Edit button - visible on hover */}
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
              title="Edit initiative"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      <div className="mt-2 text-xs sm:text-sm text-gray-500 line-clamp-2">
        {initiative.description}
      </div>
      <div className="mt-3 h-2 w-full bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-2 ${progressIntent(initiative.progress)} rounded-full transition-all duration-300`}
          style={{ width: `${initiative.progress}%` }}
        />
      </div>
        <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
          <span>{initiative.tasks.length} tasks</span>
          <span className="px-2 py-1 bg-gray-100 rounded-md text-xs">
            {initiative.category}
          </span>
        </div>
      </div>

      <EditInitiativeModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={handleEditSuccess}
        initiative={initiative}
      />
    </>
  )
})
