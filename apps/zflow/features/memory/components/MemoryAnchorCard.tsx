'use client'

import React, { useState } from 'react'
import { ChevronDown, ChevronRight, Star, Clock, X } from 'lucide-react'
import RelationTypeBadge, { type RelationType } from './RelationTypeBadge'

interface MemoryAnchor {
  memory_id: string
  anchor_item_id: string
  relation_type: RelationType
  weight: number
  local_time_range?: {
    start: string
    end?: string
  }
  notes?: string
  created_at: string
  timeline_item?: {
    id: string
    type: string
    title: string
    description?: string
    status: string
  }
  memory?: {
    id: string
    title: string
    note: string
    tags?: string[]
    created_at: string
  }
}

interface MemoryCardProps {
  anchor: MemoryAnchor
  onRemove?: (anchorId: string) => void
  onExpand?: (memoryId: string) => void
  className?: string
  compact?: boolean
}

export default function MemoryCard({
  anchor,
  onRemove,
  onExpand,
  className = '',
  compact = false
}: MemoryCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const memory = anchor.memory
  if (!memory) return null

  const weightStars = Math.round(anchor.weight / 2) // Convert 0-10 to 0-5 stars
  const hasTimeRange = anchor.local_time_range?.start

  const handleToggleExpand = () => {
    if (compact) {
      onExpand?.(memory.id)
    } else {
      setIsExpanded(!isExpanded)
    }
  }

  const formatTimeRange = () => {
    if (!anchor.local_time_range) return null

    const start = new Date(anchor.local_time_range.start).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    })

    if (anchor.local_time_range.end) {
      const end = new Date(anchor.local_time_range.end).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      })
      return `${start} - ${end}`
    }

    return start
  }

  // Get preview text from memory note
  const getPreviewText = () => {
    const maxLength = compact ? 80 : 150
    if (memory.note.length <= maxLength) return memory.note
    return memory.note.substring(0, maxLength) + '...'
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow ${className}`}>
      {/* Header */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <button
                onClick={handleToggleExpand}
                className="flex items-center gap-1 text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors"
              >
                {!compact && (
                  isExpanded ?
                    <ChevronDown className="w-4 h-4 flex-shrink-0" /> :
                    <ChevronRight className="w-4 h-4 flex-shrink-0" />
                )}
                <span className="truncate">{memory.title}</span>
              </button>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <RelationTypeBadge type={anchor.relation_type} size="sm" />

              {/* Weight indicator */}
              {anchor.weight > 1 && (
                <div className="flex items-center gap-0.5" title={`Importance: ${anchor.weight}/10`}>
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star
                      key={i}
                      className={`w-3 h-3 ${
                        i < weightStars ? 'text-yellow-400 fill-current' : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
              )}

              {/* Time range */}
              {hasTimeRange && (
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Clock className="w-3 h-3" />
                  <span>{formatTimeRange()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Remove button */}
          {onRemove && (
            <button
              onClick={() => onRemove(anchor.memory_id)}
              className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
              title="Remove memory anchor"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Preview content */}
        {(!compact || isExpanded) && (
          <div className="mt-2">
            <p className="text-sm text-gray-600 leading-relaxed">
              {getPreviewText()}
            </p>
          </div>
        )}

        {/* Tags */}
        {memory.tags && memory.tags.length > 0 && (!compact || isExpanded) && (
          <div className="flex flex-wrap gap-1 mt-2">
            {memory.tags.map((tag, index) => (
              <span
                key={index}
                className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Notes */}
        {anchor.notes && (!compact || isExpanded) && (
          <div className="mt-2 p-2 bg-yellow-50 border-l-2 border-yellow-200 rounded">
            <p className="text-sm text-gray-700 italic">
              &ldquo;{anchor.notes}&rdquo;
            </p>
          </div>
        )}
      </div>

      {/* Expanded content */}
      {isExpanded && !compact && (
        <div className="border-t border-gray-100 p-3 bg-gray-50">
          <div className="prose prose-sm max-w-none">
            <div className="whitespace-pre-wrap text-sm text-gray-700">
              {memory.note}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-gray-500 mt-3 pt-2 border-t border-gray-200">
            <span>Created {new Date(memory.created_at).toLocaleDateString()}</span>
            <span>Anchored {new Date(anchor.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      )}
    </div>
  )
}

export type { MemoryAnchor }