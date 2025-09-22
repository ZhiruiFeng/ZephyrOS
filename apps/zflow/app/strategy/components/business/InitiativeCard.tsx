import React from 'react'
import { Badge } from '../ui'

interface Initiative {
  id: string
  title: string
  description: string
  progress: number
  category: string
  tasks: any[]
}

interface InitiativeCardProps {
  initiative: Initiative
  progressIntent: (p: number) => string
}

export const InitiativeCard = React.memo(function InitiativeCard({
  initiative,
  progressIntent
}: InitiativeCardProps) {
  return (
    <div
      key={initiative.id}
      className="border rounded-xl p-4 bg-white hover:shadow-md transition-shadow duration-200 touch-pan-y"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="font-medium text-sm sm:text-base leading-tight min-w-0 flex-1">
          {initiative.title}
        </div>
        <Badge variant="outline" className="flex-shrink-0">
          {initiative.progress}%
        </Badge>
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
  )
})
