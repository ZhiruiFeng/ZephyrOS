import React from 'react'
import { toLocal } from '../../../utils/timeUtils'
import { formatDuration } from '../../../utils/timeUtils'
import type { HoveredTimeEntry } from '../types'


interface TimeEntryTooltipProps {
  hoveredTimeEntry: HoveredTimeEntry | null
}

export function TimeEntryTooltip({ hoveredTimeEntry }: TimeEntryTooltipProps) {
  if (!hoveredTimeEntry) return null

  const { entry, position } = hoveredTimeEntry
  const startDate = new Date(entry.start_at)
  const endDate = entry.end_at ? new Date(entry.end_at) : new Date()
  const originalStartDate = startDate
  const originalEndDate = endDate
  
  // Calculate duration
  let duration = entry.duration_minutes
  if (!duration && entry.end_at) {
    duration = Math.round((originalEndDate.getTime() - originalStartDate.getTime()) / (1000 * 60))
  } else if (!duration) {
    duration = Math.round((new Date().getTime() - originalStartDate.getTime()) / (1000 * 60))
  }
  
  const startTime = toLocal(entry.start_at, { format: 'time-only' })
  const endTime = entry.end_at ? toLocal(entry.end_at, { format: 'time-only' }) : 'Running'
  const isCrossDaySegment = entry.isCrossDaySegment
  
  return (
    <div
      className="fixed z-[100]"
      style={{
        left: `${position.x}px`,
        top: `${position.y - 10}px`,
        transform: 'translate(-50%, -100%)'
      }}
    >
      <div 
        className="bg-gray-900 text-white text-sm rounded-lg shadow-xl px-3 py-2 max-w-xs"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking on tooltip
      >
        <div className="font-medium truncate mb-1">
          {entry.task_title || 'Unnamed Task'}
        </div>
        <div className="text-gray-300 text-xs space-y-1">
          <div className="flex justify-between gap-4">
            <span>Time:</span>
            <span className="text-right">{startTime} - {endTime}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span>Duration:</span>
            <span className="text-right">{formatDuration(duration || 0)}</span>
          </div>
          {entry.category_name && (
            <div className="flex justify-between gap-4">
              <span>Category:</span>
              <div className="flex items-center gap-1">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: entry.category_color || '#94a3b8' }}
                />
                <span className="text-right">{entry.category_name}</span>
              </div>
            </div>
          )}
          {isCrossDaySegment && (
            <div className="flex justify-between gap-4">
              <span>Cross-day:</span>
              <span className="text-right text-orange-300">Yes</span>
            </div>
          )}
          {entry.note && (
            <div className="mt-2 pt-1 border-t border-gray-700">
              <div className="text-xs text-gray-400">{entry.note}</div>
            </div>
          )}
        </div>
        {/* Tooltip arrow */}
        <div 
          className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0"
          style={{
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderTop: '6px solid #1f2937'
          }}
        />
      </div>
    </div>
  )
}
