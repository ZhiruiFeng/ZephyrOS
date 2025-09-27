'use client'

import React from 'react'
import { ActivityCard } from '@/features/activities'

interface ActivitiesViewProps {
  activities: any[]
  activitiesLoading: boolean
  categories: any[]
  timer: any
  displayMode: 'list' | 'grid'
  t: any
  
  // Event handlers
  onActivityClick: (activityId: string) => void
  onToggleActivityComplete: (activityId: string, currentStatus: string) => void
  onEditActivity: (activity: any) => void
  onDeleteActivity: (activityId: string) => void
  onShowActivityTime: (activity: { id: string; title: string }) => void
}

export default function ActivitiesView({
  activities,
  activitiesLoading,
  categories,
  timer,
  displayMode,
  t,
  onActivityClick,
  onToggleActivityComplete,
  onEditActivity,
  onDeleteActivity,
  onShowActivityTime
}: ActivitiesViewProps) {
  if (activitiesLoading) {
    return (
      <div className="glass rounded-lg md:rounded-xl p-6 md:p-8 text-center text-gray-500">
        {t.common?.loading || 'Loading...'}
      </div>
    )
  }

  if (!activities || activities.length === 0) {
    return (
      <div className="glass rounded-lg md:rounded-xl p-6 md:p-8 text-center text-gray-500">
        {t.activity?.noActivities || 'No activities yet'}
      </div>
    )
  }

  return (
    <div className={displayMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4' : 'space-y-3 md:space-y-4'}>
      {activities.map((activity) => (
        <ActivityCard
          key={activity.id}
          activity={activity}
          categories={categories}
          timer={timer}
          t={t}
          onActivityClick={onActivityClick}
          onToggleComplete={onToggleActivityComplete}
          onEditActivity={onEditActivity}
          onDeleteActivity={onDeleteActivity}
          onShowTime={onShowActivityTime}
        />
      ))}
    </div>
  )
}
