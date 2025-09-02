'use client'

import React from 'react'
import { TimelineItem } from '@/hooks/useTimeline'
import ModernTimelineView, { TimelineEvent, Category } from './ModernTimelineView'

interface TimelineViewProps {
  selectedDate: Date
  timelineItems: TimelineItem[]
  loading: boolean
  onItemClick: (item: TimelineItem) => void
  onEditItem: (item: TimelineItem) => void
  onDeleteItem: (item: TimelineItem) => void
  t: any
}

// Transform TimelineItem to TimelineEvent
const transformTimelineItems = (items: TimelineItem[]): TimelineEvent[] => {
  return items.map(item => ({
    id: item.id,
    title: item.title,
    start: item.startTime,
    end: item.endTime || new Date(new Date(item.startTime).getTime() + (item.duration || 30) * 60000).toISOString(),
    type: item.type as 'task' | 'activity' | 'routine' | 'habit' | 'memory',
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
      tags: item.tags
    }
  }))
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
  t
}: TimelineViewProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-3 text-gray-500">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
          <span>{t?.ui?.loading || '加载中...'}</span>
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
    // TODO: Implement event creation
    console.log('Create event:', start, end)
  }

  return (
    <ModernTimelineView
      selectedDate={selectedDate}
      events={events}
      categories={categories}
      onEventClick={handleEventClick}
      onCreateEvent={handleCreateEvent}
    />
  )
}