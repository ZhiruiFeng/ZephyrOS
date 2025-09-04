'use client'

import React from 'react'
import { Pencil, Trash2, Clock, Play, Square } from 'lucide-react'

interface ActivityCardProps {
  activity: any
  categories: any[]
  timer: {
    runningTimelineItemId?: string
    runningTimelineItemType?: string
    startActivity: (activityId: string) => void
    stopActivity: (activityId: string) => void
  }
  t: any // translations
  
  // Event handlers
  onActivityClick: (activityId: string) => void
  onToggleComplete: (activityId: string, currentStatus: string) => void
  onEditActivity: (activity: any) => void
  onDeleteActivity: (activityId: string) => void
  onShowTime: (activity: { id: string; title: string }) => void
}

export default function ActivityCard({
  activity,
  categories,
  timer,
  t,
  onActivityClick,
  onToggleComplete,
  onEditActivity,
  onDeleteActivity,
  onShowTime
}: ActivityCardProps) {
  const isActive = activity.status === 'active'
  const isCompleted = activity.status === 'completed'
  const isTiming = timer.runningTimelineItemId === activity.id && timer.runningTimelineItemType === 'activity'

  // Get activity type icon
  const getActivityTypeIcon = (activityType: string) => {
    const iconMap: Record<string, string> = {
      exercise: '🏃‍♂️',
      meditation: '🧘‍♀️',
      reading: '📚',
      music: '🎵',
      socializing: '👥',
      gaming: '🎮',
      walking: '🚶‍♀️',
      cooking: '👨‍🍳',
      rest: '😴',
      creative: '🎨',
      learning: '📖',
    }
    
    return iconMap[activityType] || '✨'
  }

  // Get card styling based on state
  const getCardStyling = () => {
    if (isTiming) {
      return 'bg-gradient-to-r from-green-50 to-emerald-100 border-2 border-green-400 shadow-lg shadow-green-200/60 ring-2 ring-green-300/50 hover:shadow-xl hover:shadow-green-200/70'
    }
    if (isActive) {
      return 'bg-gradient-to-r from-emerald-50 to-green-100 border-2 border-emerald-300 shadow-lg shadow-emerald-200/50'
    }
    if (isCompleted) {
      return 'bg-gradient-to-r from-gray-50 to-gray-100 border-2 border-gray-300'
    }
    return 'glass'
  }

  // Get status indicator
  const getStatusIndicator = () => {
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
    
    return (
      <svg className="w-4 h-4 md:w-5 md:h-5 text-gray-400" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="12" r="10"/>
      </svg>
    )
  }

  return (
    <div 
      className={`${getCardStyling()} rounded-lg md:rounded-xl p-4 md:p-6 hover:shadow-md transition-all duration-200 cursor-pointer`}
      onClick={(e) => {
        // Prevent click when clicking on buttons
        if ((e.target as HTMLElement).tagName === 'BUTTON' || (e.target as HTMLElement).closest('button')) {
          return
        }
        onActivityClick(activity.id)
      }}
    >
      {/* Header with action buttons */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <button 
            onClick={(e) => {
              e.stopPropagation()
              onToggleComplete(activity.id, activity.status)
            }}
            className="flex-shrink-0"
          >
            {getStatusIndicator()}
          </button>
          {/* Activity type icon */}
          <div className="text-lg">
            {getActivityTypeIcon(activity.activity_type)}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onEditActivity(activity)
            }}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-md"
            title={t.activity?.editActivity || 'Edit Activity'}
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDeleteActivity(activity.id)
            }}
            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md"
            title={t.activity?.deleteActivity || 'Delete Activity'}
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onShowTime({ id: activity.id, title: activity.title })
            }}
            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md"
            title={t.activity?.viewActivityTime || 'View Activity Time'}
          >
            <Clock className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              if (isTiming) {
                timer.stopActivity(activity.id)
              } else {
                timer.startActivity(activity.id)
              }
            }}
            className={`p-1.5 rounded-md ${
              isTiming 
                ? 'text-red-600 bg-red-50 hover:bg-red-100' 
                : 'text-green-600 hover:bg-green-50'
            }`}
            title={isTiming ? (t.activity?.stopTimer || 'Stop Timer') : (t.activity?.startTimer || 'Start Timer')}
          >
            {isTiming ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Title and description */}
      <div className="mb-3">
        <h3 className={`font-medium text-sm md:text-base ${isCompleted ? 'line-through text-gray-500' : 'text-gray-900'}`}>
          {activity.title}
        </h3>
        {activity.description && (
          <p className="text-xs md:text-sm text-gray-600 mt-1 line-clamp-2">
            {activity.description}
          </p>
        )}
      </div>

      {/* Activity details */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-2">
          {activity.category_id && (
            <span className="flex items-center gap-1">
              <div 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: categories.find(c => c.id === activity.category_id)?.color || '#gray' }}
              />
              {categories.find(c => c.id === activity.category_id)?.name}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {activity.started_at && (
            <span>{new Date(activity.started_at).toLocaleDateString()}</span>
          )}
        </div>
      </div>
    </div>
  )
}
