'use client'

import React from 'react'
import { StatusBadge, PriorityBadge } from './StatusBadge'
import { smartFormatDate } from '../utils/time-utils'

interface BasicTaskCardProps {
  id: string
  title: string
  description?: string
  status: string
  priority: string
  dueDate?: string
  tags?: string[]
  className?: string
  onClick?: () => void
  onStatusChange?: (newStatus: string) => void
}

export const TaskCard: React.FC<BasicTaskCardProps> = ({
  id,
  title,
  description,
  status,
  priority,
  dueDate,
  tags = [],
  className = '',
  onClick,
  onStatusChange
}) => {
  return (
    <div
      className={`bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer ${className}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-900 flex-1 pr-2">{title}</h3>
        <div className="flex items-center space-x-2">
          <StatusBadge status={status} />
          <PriorityBadge priority={priority} />
        </div>
      </div>

      {description && (
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{description}</p>
      )}

      {dueDate && (
        <div className="text-xs text-gray-500 mb-2">
          Due: {smartFormatDate(dueDate)}
        </div>
      )}

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tags.slice(0, 3).map((tag, index) => (
            <span
              key={index}
              className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800"
            >
              {tag}
            </span>
          ))}
          {tags.length > 3 && (
            <span className="text-xs text-gray-500">+{tags.length - 3} more</span>
          )}
        </div>
      )}
    </div>
  )
}