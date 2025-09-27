import React from 'react'
import type { TimeEntryWithCrossDay, HoveredTimeEntry } from '../types'


interface TimeEntriesDisplayProps {
  width: number
  height: number
  padLeft: number
  padRight: number
  yOffset: number
  isMobile?: boolean
  timeEntryLayers: Array<Array<TimeEntryWithCrossDay>>
  focusedTimeEntry: TimeEntryWithCrossDay | null
  setHoveredTimeEntry: (entry: HoveredTimeEntry | null) => void
  setFocusedTimeEntry: (entry: TimeEntryWithCrossDay | null) => void
}

export function TimeEntriesDisplay({
  width,
  height,
  padLeft,
  padRight,
  yOffset,
  isMobile = false,
  timeEntryLayers,
  focusedTimeEntry,
  setHoveredTimeEntry,
  setFocusedTimeEntry
}: TimeEntriesDisplayProps) {
  const plotWidth = width - padLeft - padRight
  const layerHeight = isMobile ? 16 : 20
  const maxLayers = Math.floor(height / layerHeight)
  const displayLayers = timeEntryLayers.slice(0, maxLayers)
  
  return (
    <g>
      {/* Time entries background area */}
      <rect
        x={padLeft}
        y={yOffset}
        width={plotWidth}
        height={height}
        fill="#f8fafc"
        stroke="#e2e8f0"
        strokeWidth={1}
        rx={4}
      />
      
      {/* Time entry bars */}
      {displayLayers.map((layer, layerIndex) =>
        layer.map((entry, entryIndex) => {
          const startDate = new Date(entry.start_at)
          const endDate = entry.end_at ? new Date(entry.end_at) : new Date()
          const startMinutes = startDate.getHours() * 60 + startDate.getMinutes()
          const endMinutes = endDate.getHours() * 60 + endDate.getMinutes()
          const x1 = padLeft + (startMinutes / (24 * 60)) * plotWidth
          const x2 = padLeft + (endMinutes / (24 * 60)) * plotWidth
          const y = yOffset + layerIndex * layerHeight + 2
          const barHeight = layerHeight - 4
          
          const categoryColor = entry.category_color || '#94a3b8'
          const isCrossDaySegment = entry.isCrossDaySegment
          const isFocused = focusedTimeEntry?.id === entry.id
          
          return (
            <g key={`${layerIndex}-${entryIndex}`}>
              <rect
                x={x1}
                y={y}
                width={Math.max(2, x2 - x1)}
                height={barHeight}
                fill={categoryColor}
                opacity={isFocused ? 1 : 0.8}
                rx={2}
                stroke={isFocused ? '#3b82f6' : (isCrossDaySegment ? categoryColor : 'none')}
                strokeWidth={isFocused ? 3 : (isCrossDaySegment ? 2 : 0)}
                strokeDasharray={isCrossDaySegment && !isFocused ? '4,2' : 'none'}
                style={{ cursor: 'pointer' }}
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect()
                  setHoveredTimeEntry({
                    entry,
                    position: { 
                      x: rect.left + rect.width / 2, 
                      y: rect.top 
                    }
                  })
                }}
                onMouseLeave={() => setHoveredTimeEntry(null)}
                onClick={(e) => {
                  e.stopPropagation()
                  // Toggle focus: if already focused on this entry, unfocus; otherwise focus
                  if (focusedTimeEntry?.id === entry.id) {
                    setFocusedTimeEntry(null)
                  } else {
                    setFocusedTimeEntry(entry)
                  }
                }}
              />
            </g>
          )
        })
      )}
      
      {/* Layer overflow indicator */}
      {timeEntryLayers.length > maxLayers && (
        <text
          x={padLeft + plotWidth - 4}
          y={yOffset + height - 4}
          textAnchor="end"
          fontSize={10}
          fill="#64748b"
        >
          +{timeEntryLayers.length - maxLayers} more
        </text>
      )}
    </g>
  )
}
