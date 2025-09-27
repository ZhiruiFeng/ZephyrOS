'use client'

import React from 'react'
import { ListTodo, Archive, CheckCircle } from 'lucide-react'
import type { TaskCardVariant } from '../TaskCard'

interface Props {
  variant: TaskCardVariant
  isCompleted: boolean
  isTiming: boolean
  isInProgress: boolean
}

export default function StatusIndicator({ variant, isCompleted, isTiming, isInProgress }: Props) {
  if (variant === 'archive') {
    return isCompleted ? (
      <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-green-500" />
    ) : (
      <Archive className="w-4 h-4 md:w-5 md:h-5 text-gray-500" />
    )
  }

  if (variant === 'future') {
    return <ListTodo className="w-4 h-4 md:w-5 md:h-5 text-purple-500" />
  }

  if (isCompleted) {
    return (
      <svg className="w-4 h-4 md:w-5 md:h-5 text-green-500" viewBox="0 0 24 24" fill="currentColor">
        <path d="M9 16.2l-3.5-3.5L4 14.2l5 5 12-12-1.5-1.5z"/>
      </svg>
    )
  }

  if (isTiming) {
    return (
      <div className="relative">
        <svg className="w-4 h-4 md:w-5 md:h-5 text-green-600" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="12" r="10"/>
        </svg>
        <div className="absolute inset-0 w-4 h-4 md:w-5 md:h-5 border-2 border-green-600 rounded-full animate-ping"></div>
        <div className="absolute inset-1 w-2 h-2 md:w-3 md:h-3 bg-green-600 rounded-full animate-pulse"></div>
      </div>
    )
  }

  if (isInProgress) {
    return (
      <div className="relative">
        <svg className="w-4 h-4 md:w-5 md:h-5 text-primary-600" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="12" r="10"/>
        </svg>
        <div className="absolute inset-0 w-4 h-4 md:w-5 md:h-5 border-2 border-primary-600 rounded-full animate-pulse"></div>
      </div>
    )
  }

  return (
    <svg className="w-4 h-4 md:w-5 md:h-5 text-gray-400" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="12" r="10"/>
    </svg>
  )
}

