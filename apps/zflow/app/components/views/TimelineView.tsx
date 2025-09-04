'use client'

import React from 'react'
import { TimelineItem } from '@/hooks/useTimeline'
import ModernTimelineView, { TimelineEvent, Category } from './ModernTimelineView'
import { Language } from '../../../lib/i18n'
import { getCrossDayBorderClass } from '../../utils/crossDayUtils'
import { timeTrackingApi } from '../../../lib/api'
import CreateTimelineItemModal from '../modals/CreateTimelineItemModal'

interface TimelineViewProps {
  selectedDate: Date
  timelineItems: TimelineItem[]
  loading: boolean
  onItemClick: (item: TimelineItem) => void
  onEditItem: (item: TimelineItem) => void
  onDeleteItem: (item: TimelineItem) => void
  onDateChange?: (date: Date) => void
  refetchTimeline?: () => void
  t: any
  lang?: Language
}

// Transform TimelineItem to TimelineEvent (use timeline_item_type for time-entries)
const transformTimelineItems = (items: TimelineItem[]): TimelineEvent[] => {
  return items.map(item => {
    // For time-entries, use the timeline_item_type from metadata
    let displayType = item.type
    if (item.type === 'time_entry' && item.metadata?.timelineItemType) {
      displayType = item.metadata.timelineItemType
    }

    return {
      id: item.id,
      title: item.title,
      start: item.startTime,
      end: item.endTime || new Date(new Date(item.startTime).getTime() + (item.duration || 30) * 60000).toISOString(),
      type: displayType as 'task' | 'activity' | 'memory',
      categoryId: item.category?.id,
      source: item.metadata?.source as string,
      energy: item.metadata?.energy ? {
        avg: item.metadata.energy.avg,
        min: item.metadata.energy.min,
        max: item.metadata.energy.max,
        samples: item.metadata.energy.samples
      } : undefined,
      meta: {
        note: item.description || undefined,
        tags: item.tags,
        isCrossDaySegment: item.metadata?.isCrossDaySegment,
        originalId: item.metadata?.originalId,
        originalStart: item.metadata?.originalStart,
        originalEnd: item.metadata?.originalEnd,
        // Track original type information for time-entries
        originalType: item.type,
        relatedItemId: item.type === 'time_entry' ? item.metadata?.taskId : undefined,
        timelineItemType: item.metadata?.timelineItemType,
        timelineItemTitle: item.metadata?.timelineItemTitle,
        timelineItemId: item.metadata?.timelineItemId
      }
    }
  })
}

// Transform categories
const transformCategories = (items: TimelineItem[]): Category[] => {
  const categoryMap = new Map<string, Category>()
  
  items.forEach(item => {
    if (item.category && !categoryMap.has(item.category.id)) {
      categoryMap.set(item.category.id, {
        id: item.category.id,
        name: item.category.name,
        color: item.category.color,
        icon: item.category.icon
      })
    }
  })

  // Add default categories if none exist
  if (categoryMap.size === 0) {
    categoryMap.set('default', {
      id: 'default',
      name: 'General',
      color: '#C6D2DE',
      icon: 'Circle'
    })
  }

  return Array.from(categoryMap.values())
}

export default function TimelineView({
  selectedDate,
  timelineItems,
  loading,
  onItemClick,
  onEditItem,
  onDeleteItem,
  onDateChange,
  refetchTimeline,
  t,
  lang
}: TimelineViewProps) {
  const [createEventModalData, setCreateEventModalData] = React.useState<{ start: string; end: string } | null>(null)
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-3 text-gray-500">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
          <span>{t?.common?.loading || 'Loading...'}</span>
        </div>
      </div>
    )
  }

  const events = transformTimelineItems(timelineItems)
  const categories = transformCategories(timelineItems)

  const handleEventClick = (event: TimelineEvent) => {
    // Find the original timeline item
    const originalItem = timelineItems.find(item => item.id === event.id)
    if (originalItem) {
      onItemClick(originalItem)
    }
  }

  const handleCreateEvent = (start: string, end: string) => {
    setCreateEventModalData({ start, end })
  }

  const handleUpdateTimeEntry = async (timeEntryId: string, start: string, end: string) => {
    try {
      // Call the API to update the time entry
      const response = await timeTrackingApi.update(timeEntryId, {
        start_at: start,
        end_at: end
      })
      
      console.log('Time entry updated successfully:', response)
      
      // Refresh the timeline data silently
      if (refetchTimeline) {
        console.log('Refreshing timeline data...')
        await refetchTimeline()
        console.log('Timeline data refreshed successfully')
      } else {
        console.warn('refetchTimeline function not provided - timeline will not refresh')
      }
      
    } catch (error) {
      console.error('Failed to update time entry:', error)
      // Only show error messages, not success messages
      alert(`Failed to update time entry: ${error instanceof Error ? error.message : 'Unknown error'}`)
      throw error // Re-throw to keep edit mode open
    }
  }

  return (
    <>
      <ModernTimelineView
        selectedDate={selectedDate}
        events={events}
        categories={categories}
        onEventClick={handleEventClick}
        onCreateEvent={handleCreateEvent}
        onUpdateTimeEntry={handleUpdateTimeEntry}
        t={t}
        lang={lang}
      />
      
      {createEventModalData && (
        <CreateTimelineItemModal
          isOpen={true}
          onClose={() => setCreateEventModalData(null)}
          initialStart={createEventModalData.start}
          initialEnd={createEventModalData.end}
          selectedDate={selectedDate}
          onActivityCreated={() => {
            if (refetchTimeline) refetchTimeline()
            setCreateEventModalData(null)
          }}
          t={t}
        />
      )}
    </>
  )
}
