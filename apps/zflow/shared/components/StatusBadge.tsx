'use client'

import React from 'react'
import { getStatusColor, getPriorityColor } from '../utils/task-utils'

interface StatusBadgeProps {
  status: string
  className?: string
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const colorClass = getStatusColor(status)

  return (
    <span className={`inline-flex items-center text-xs px-2 py-1 rounded border ${colorClass} ${className}`}>
      {status.replace('_', ' ')}
    </span>
  )
}

interface PriorityBadgeProps {
  priority: string
  className?: string
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority, className = '' }) => {
  const colorClass = getPriorityColor(priority)

  return (
    <span className={`inline-flex items-center text-xs px-2 py-1 rounded border ${colorClass} ${className}`}>
      {priority}
    </span>
  )
}

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  className = ''
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  }

  return (
    <div className={`animate-spin rounded-full border-b-2 border-primary-600 ${sizeClasses[size]} ${className}`} />
  )
}

interface ErrorMessageProps {
  message: string
  className?: string
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ message, className = '' }) => {
  return (
    <div className={`text-red-600 text-sm ${className}`}>
      {message}
    </div>
  )
}

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = ''
}) => {
  return (
    <div className={`text-center text-gray-500 py-12 ${className}`}>
      {icon && <div className="mb-4">{icon}</div>}
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      {description && <p className="text-sm text-gray-600 mb-4">{description}</p>}
      {action && <div>{action}</div>}
    </div>
  )
}