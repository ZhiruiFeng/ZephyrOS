'use client'

import React from 'react'
import { DateSelector } from '@/app/components/ui'
import TimelineView from '../components/TimelineView'
import { usePerformanceTracking } from '@/lib/performance'
import type { TimelineItem } from '@/timeline'

interface TimelineHomeProps {
  selectedDate: Date
  onDateChange: (d: Date) => void
  items: any
  loading: boolean
  refetch: () => void
  t: any
  lang: any
  onItemClick: (item: TimelineItem) => void
}

const TimelineHome = React.memo(function TimelineHome({
  selectedDate,
  onDateChange,
  items,
  loading,
  refetch,
  t,
  lang,
  onItemClick,
}: TimelineHomeProps) {
  usePerformanceTracking('TimelineHome')
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-center">
        <DateSelector selectedDate={selectedDate} onDateChange={onDateChange} />
      </div>
      <TimelineView
        selectedDate={selectedDate}
        timelineItems={items}
        loading={loading}
        onItemClick={onItemClick}
        onEditItem={(item: TimelineItem) => {
          console.log('Edit timeline item:', item)
        }}
        onDeleteItem={(item: TimelineItem) => {
          console.log('Delete timeline item:', item)
        }}
        refetchTimeline={refetch}
        t={t}
        lang={lang}
      />
    </div>
  )
})

export default TimelineHome
