'use client'

import React from 'react'
import { Brain, Plus } from 'lucide-react'

interface MemoryAnchorButtonProps {
  onClick: () => void
  disabled?: boolean
  memoryCount?: number
  className?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'compact' | 'icon-only'
  isActive?: boolean
}

export default function MemoryAnchorButton({
  onClick,
  disabled = false,
  memoryCount = 0,
  className = '',
  size = 'md',
  variant = 'default',
  isActive = false
}: MemoryAnchorButtonProps) {
  const sizeClasses = {
    sm: 'px-2 py-1.5 text-xs',
    md: 'px-2 py-2 text-xs',
    lg: 'px-3 py-2 text-sm'
  }

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  }

  const baseClasses = `
    flex items-center justify-center gap-1
    rounded transition-colors
    ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
  `

  const getContent = () => {
    switch (variant) {
      case 'icon-only':
        return (
          <>
            <Brain className={`${iconSizes[size]} flex-shrink-0`} />
            {memoryCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                {memoryCount > 9 ? '9+' : memoryCount}
              </span>
            )}
          </>
        )

      case 'compact':
        return (
          <>
            <Brain className={`${iconSizes[size]} flex-shrink-0`} />
            {memoryCount > 0 && (
              <span className="text-xs bg-blue-100 text-blue-700 px-1 rounded-full min-w-[16px] text-center">
                {memoryCount}
              </span>
            )}
          </>
        )

      default:
        return (
          <>
            <Brain className={`${iconSizes[size]} flex-shrink-0`} />
            <span className="hidden sm:inline truncate">
              {memoryCount > 0 ? `Memory (${memoryCount})` : 'Memory'}
            </span>
            {memoryCount === 0 && size !== 'sm' && (
              <Plus className="w-2 h-2 flex-shrink-0 opacity-60" />
            )}
          </>
        )
    }
  }

  const colorClasses = disabled
    ? 'text-gray-400 bg-transparent'
    : isActive
      ? 'text-gray-900 bg-gray-200 hover:bg-gray-200'
      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        ${baseClasses}
        ${sizeClasses[size]}
        ${colorClasses}
        ${variant === 'icon-only' ? 'relative min-w-[36px]' : 'min-w-[36px]'}
        ${className}
      `}
      title={
        memoryCount > 0
          ? `${memoryCount} memories anchored. Click to manage.`
          : 'Add memory to this task'
      }
    >
      {getContent()}
    </button>
  )
}
