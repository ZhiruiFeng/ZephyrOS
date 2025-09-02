'use client'

import React from 'react'
import { Calendar, Clock, Star, Activity, CheckCircle } from 'lucide-react'

import { TimelineItem } from '../../../hooks/useTimeline'

interface TimelineViewProps {
  selectedDate: Date
  timelineItems: TimelineItem[]
  loading: boolean
  onItemClick: (item: TimelineItem) => void
  onEditItem: (item: TimelineItem) => void
  onDeleteItem: (item: TimelineItem) => void
  t: any
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
  // Group items by hour for better organization
  const groupedByHour = React.useMemo(() => {
    const grouped: { [hour: string]: TimelineItem[] } = {}
    
    timelineItems.forEach(item => {
      const hour = new Date(item.startTime).getHours()
      const hourKey = `${hour.toString().padStart(2, '0')}:00`
      
      if (!grouped[hourKey]) {
        grouped[hourKey] = []
      }
      grouped[hourKey].push(item)
    })

    // Sort items within each hour by start time
    Object.keys(grouped).forEach(hour => {
      grouped[hour].sort((a, b) => 
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      )
    })

    return grouped
  }, [timelineItems])

  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
  }

  const formatDuration = (minutes?: number) => {
    if (!minutes) return ''
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}m`
  }

  const getItemIcon = (item: TimelineItem) => {
    switch (item.type) {
      case 'time_entry':
        return <Clock className="w-4 h-4" />
      case 'memory':
        return <Star className="w-4 h-4" />
      case 'task':
        return <CheckCircle className="w-4 h-4" />
      case 'activity':
        return <Activity className="w-4 h-4" />
      default:
        return <Clock className="w-4 h-4" />
    }
  }

  const getItemColor = (item: TimelineItem) => {
    if (item.category?.color) {
      return item.category.color
    }
    
    switch (item.type) {
      case 'time_entry':
        return '#3B82F6' // blue
      case 'memory':
        return '#F59E0B' // amber
      case 'task':
        return '#10B981' // green
      case 'activity':
        return '#8B5CF6' // purple
      default:
        return '#6B7280' // gray
    }
  }

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

  if (timelineItems.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {t?.timeline?.noEntries || '暂无时间记录'}
        </h3>
        <p className="text-gray-600">
          {t?.timeline?.noEntriesDesc || '这一天还没有记录任何活动或记忆'}
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Date Header */}
      <div className="sticky top-32 z-10 bg-white/80 backdrop-blur-sm border-b border-gray-200 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <Calendar className="w-6 h-6 text-primary-600" />
          <h2 className="text-xl font-semibold text-gray-900">
            {selectedDate.toLocaleDateString('zh-CN', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              weekday: 'long'
            })}
          </h2>
          <span className="text-sm text-gray-500">
            {timelineItems.length} 项记录
          </span>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical Timeline Line */}
        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200"></div>

        {/* Timeline Items */}
        <div className="space-y-8">
          {Object.entries(groupedByHour).map(([hour, items]) => (
            <div key={hour} className="relative">
              {/* Hour Label */}
              <div className="absolute left-0 top-0 w-16 text-right text-sm font-medium text-gray-500">
                {hour}
              </div>

              {/* Items for this hour */}
              <div className="ml-20 space-y-4">
                {items.map((item, index) => (
                  <TimelineItemCard
                    key={`${item.id}-${index}`}
                    item={item}
                    onItemClick={onItemClick}
                    onEditItem={onEditItem}
                    onDeleteItem={onDeleteItem}
                    formatTime={formatTime}
                    formatDuration={formatDuration}
                    getItemIcon={getItemIcon}
                    getItemColor={getItemColor}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

interface TimelineItemCardProps {
  item: TimelineItem
  onItemClick: (item: TimelineItem) => void
  onEditItem: (item: TimelineItem) => void
  onDeleteItem: (item: TimelineItem) => void
  formatTime: (time: string) => string
  formatDuration: (duration?: number) => string
  getItemIcon: (item: TimelineItem) => React.ReactNode
  getItemColor: (item: TimelineItem) => string
}

function TimelineItemCard({
  item,
  onItemClick,
  onEditItem,
  onDeleteItem,
  formatTime,
  formatDuration,
  getItemIcon,
  getItemColor
}: TimelineItemCardProps) {
  const [isExpanded, setIsExpanded] = React.useState(false)

  return (
    <div className="relative group">
      {/* Timeline Dot */}
      <div 
        className="absolute -left-12 top-4 w-4 h-4 rounded-full border-2 border-white shadow-sm"
        style={{ backgroundColor: getItemColor(item) }}
      ></div>

      {/* Item Card */}
      <div 
        className="bg-white/70 backdrop-blur-md border border-gray-200/60 rounded-lg p-4 hover:shadow-md transition-all duration-200 cursor-pointer"
        onClick={() => onItemClick(item)}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3 flex-1">
            <div 
              className="p-2 rounded-lg"
              style={{ backgroundColor: `${getItemColor(item)}20` }}
            >
              {getItemIcon(item)}
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-gray-900 truncate">
                {item.title}
              </h3>
              <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                <Clock className="w-3 h-3" />
                <span>{formatTime(item.startTime)}</span>
                {item.endTime && (
                  <>
                    <span>-</span>
                    <span>{formatTime(item.endTime)}</span>
                  </>
                )}
                {item.duration && (
                  <>
                    <span>•</span>
                    <span>{formatDuration(item.duration)}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Status and Priority */}
          <div className="flex items-center gap-2">
            {item.isHighlight && (
              <Star className="w-4 h-4 text-amber-500" />
            )}
            {item.status && (
              <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full">
                {item.status}
              </span>
            )}
            {item.priority && (
              <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded-full">
                {item.priority}
              </span>
            )}
          </div>
        </div>

        {/* Description */}
        {item.description && (
          <div className="mb-3">
            <p className="text-sm text-gray-600 line-clamp-2">
              {item.description}
            </p>
            {item.description.length > 100 && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setIsExpanded(!isExpanded)
                }}
                className="text-xs text-primary-600 hover:text-primary-700 mt-1"
              >
                {isExpanded ? '收起' : '展开'}
              </button>
            )}
            {isExpanded && (
              <p className="text-sm text-gray-600 mt-2">
                {item.description}
              </p>
            )}
          </div>
        )}

        {/* Metadata */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Category */}
            {item.category && (
              <div className="flex items-center gap-1">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.category.color }}
                ></div>
                <span className="text-xs text-gray-600">{item.category.name}</span>
              </div>
            )}

            {/* Location */}
            {item.location && (
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <span>{item.location}</span>
              </div>
            )}
          </div>

          {/* Tags */}
          {item.tags.length > 0 && (
            <div className="flex items-center gap-1">
              {item.tags.slice(0, 3).map((tag: string) => (
                <span
                  key={tag}
                  className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full"
                >
                  #{tag}
                </span>
              ))}
              {item.tags.length > 3 && (
                <span className="text-xs text-gray-500">
                  +{item.tags.length - 3}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-gray-100 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onEditItem(item)
            }}
            className="px-3 py-1 text-xs text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded transition-colors"
          >
            编辑
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDeleteItem(item)
            }}
            className="px-3 py-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
          >
            删除
          </button>
        </div>
      </div>
    </div>
  )
}
