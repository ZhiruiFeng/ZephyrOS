'use client'

import React from 'react'
import { Clock, Tag, FolderOpen, TrendingUp } from 'lucide-react'
import { TimelineData } from '@/hooks/timeline/useTimeline'

interface TimelineStatsProps {
  timelineData: TimelineData
  className?: string
  t?: any
}

export default function TimelineStats({
  timelineData,
  className = '',
  t
}: TimelineStatsProps) {
  const { totalDuration, categories, tags, items } = timelineData

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}m`
  }

  const getItemTypeCount = (type: string) => {
    return items.filter(item => item.type === type).length
  }

  const getItemTypeDuration = (type: string) => {
    return items
      .filter(item => item.type === type && item.duration)
      .reduce((total, item) => total + (item.duration || 0), 0)
  }

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
      {/* Total Duration */}
      <div className="bg-white/70 backdrop-blur-md border border-gray-200/60 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Clock className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-gray-600">{t?.ui?.recorded || 'Total Duration'}</p>
            <p className="text-xl font-semibold text-gray-900">
              {formatDuration(totalDuration)}
            </p>
          </div>
        </div>
      </div>

      {/* Total Items */}
      <div className="bg-white/70 backdrop-blur-md border border-gray-200/60 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-sm text-gray-600">{t?.ui?.statistics || 'Total Items'}</p>
            <p className="text-xl font-semibold text-gray-900">
              {items.length}
            </p>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="bg-white/70 backdrop-blur-md border border-gray-200/60 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <FolderOpen className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <p className="text-sm text-gray-600">{t?.ui?.categories || 'Categories'}</p>
            <p className="text-xl font-semibold text-gray-900">
              {categories.length}
            </p>
          </div>
        </div>
      </div>

      {/* Tags */}
      <div className="bg-white/70 backdrop-blur-md border border-gray-200/60 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-100 rounded-lg">
            <Tag className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="text-sm text-gray-600">{t?.task?.tags || 'Tags'}</p>
            <p className="text-xl font-semibold text-gray-900">
              {tags.length}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Detailed stats component for showing breakdown
export function TimelineDetailedStats({ timelineData, t }: { timelineData: TimelineData, t?: any }) {
  const { items, categories, tags } = timelineData

  const getItemTypeCount = (type: string) => {
    return items.filter(item => item.type === type).length
  }

  const getItemTypeDuration = (type: string) => {
    return items
      .filter(item => item.type === type && item.duration)
      .reduce((total, item) => total + (item.duration || 0), 0)
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}m`
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Item Types Breakdown */}
      <div className="bg-white/70 backdrop-blur-md border border-gray-200/60 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t?.ui?.statistics || 'Record Type Breakdown'}</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Time Entries</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-900">
                {getItemTypeCount('time_entry')}
              </span>
              <span className="text-xs text-gray-500">
                ({formatDuration(getItemTypeDuration('time_entry'))})
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Memories</span>
            <span className="text-sm font-medium text-gray-900">
              {getItemTypeCount('memory')}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">{t?.ui?.task || 'Task'}</span>
            <span className="text-sm font-medium text-gray-900">
              {getItemTypeCount('task')}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">{t?.ui?.activity || 'Activity'}</span>
            <span className="text-sm font-medium text-gray-900">
              {getItemTypeCount('activity')}
            </span>
          </div>
        </div>
      </div>

      {/* Top Categories */}
      <div className="bg-white/70 backdrop-blur-md border border-gray-200/60 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Categories</h3>
        <div className="space-y-3">
          {categories.slice(0, 5).map(category => (
            <div key={category.id} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: category.color }}
                ></div>
                <span className="text-sm text-gray-600">{category.name}</span>
              </div>
              <span className="text-sm font-medium text-gray-900">
                {category.count}
              </span>
            </div>
          ))}
          {categories.length === 0 && (
            <p className="text-sm text-gray-500">{t?.ui?.noData || 'No data'}</p>
          )}
        </div>
      </div>

      {/* Top Tags */}
      <div className="bg-white/70 backdrop-blur-md border border-gray-200/60 rounded-lg p-6 lg:col-span-2">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Tags</h3>
        <div className="flex flex-wrap gap-2">
          {tags.slice(0, 10).map(tag => (
            <div
              key={tag.name}
              className="flex items-center gap-2 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
            >
              <span>#{tag.name}</span>
              <span className="text-xs text-gray-500">({tag.count})</span>
            </div>
          ))}
          {tags.length === 0 && (
            <p className="text-sm text-gray-500">{t?.ui?.noData || 'No data'}</p>
          )}
        </div>
      </div>
    </div>
  )
}
