'use client'

import React from 'react'
import {
  Lightbulb,
  Target,
  Eye,
  Info,
  Clock,
  Zap,
  RotateCcw
} from 'lucide-react'

export type RelationType =
  | 'context_of'
  | 'result_of'
  | 'insight_from'
  | 'about'
  | 'co_occurred'
  | 'triggered_by'
  | 'reflects_on'

interface RelationTypeBadgeProps {
  type: RelationType
  className?: string
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const relationConfig = {
  context_of: {
    label: 'Context',
    icon: Info,
    color: 'bg-blue-100 text-blue-800',
    description: 'Provides context for the task'
  },
  result_of: {
    label: 'Result',
    icon: Target,
    color: 'bg-green-100 text-green-800',
    description: 'Result or outcome of the task'
  },
  insight_from: {
    label: 'Insight',
    icon: Lightbulb,
    color: 'bg-yellow-100 text-yellow-800',
    description: 'Insight derived from the task'
  },
  about: {
    label: 'About',
    icon: Eye,
    color: 'bg-purple-100 text-purple-800',
    description: 'About or concerning the task'
  },
  co_occurred: {
    label: 'Co-occurred',
    icon: Clock,
    color: 'bg-orange-100 text-orange-800',
    description: 'Happened during the task'
  },
  triggered_by: {
    label: 'Triggered',
    icon: Zap,
    color: 'bg-red-100 text-red-800',
    description: 'Triggered by the task'
  },
  reflects_on: {
    label: 'Reflects',
    icon: RotateCcw,
    color: 'bg-indigo-100 text-indigo-800',
    description: 'Reflects on or reviews the task'
  }
}

export default function RelationTypeBadge({
  type,
  className = '',
  showLabel = true,
  size = 'md'
}: RelationTypeBadgeProps) {
  const config = relationConfig[type]
  const Icon = config.icon

  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-xs',
    md: 'px-2 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base'
  }

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  }

  return (
    <span
      className={`
        inline-flex items-center gap-1 rounded-full font-medium
        ${config.color} ${sizeClasses[size]} ${className}
      `}
      title={config.description}
    >
      <Icon className={iconSizes[size]} />
      {showLabel && <span>{config.label}</span>}
    </span>
  )
}

export { relationConfig }