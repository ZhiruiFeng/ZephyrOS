import React from 'react'
import { Maximize2 } from 'lucide-react'
import { energyToColor, canEdit, segmentToTimeLabel } from '../utils'
import { formatDuration } from '@/shared/utils'
import type { 
  TimeEntryWithCrossDay, 
  HoveredTimeEntry, 
  InteractiveTooltip,
  CurrentTimeInfo,
  CategorySummary 
} from '../types'

interface MobileCompactViewProps {
  curve: number[]
  timeEntries: TimeEntryWithCrossDay[]
  categorySummary: CategorySummary[]
  currentTimeInfo: CurrentTimeInfo
  focusedTimeEntry: TimeEntryWithCrossDay | null
  hoveredTimeEntry: HoveredTimeEntry | null
  interactiveTooltip: InteractiveTooltip | null
  setHoveredTimeEntry: (entry: HoveredTimeEntry | null) => void
  setFocusedTimeEntry: (entry: TimeEntryWithCrossDay | null) => void
  setInteractiveTooltip: React.Dispatch<React.SetStateAction<InteractiveTooltip | null>>
  setIsMobileModalOpen: (open: boolean) => void
  loading: boolean
  error: string | null
  t: any
}

export function MobileCompactView({
  curve,
  timeEntries,
  categorySummary,
  currentTimeInfo,
  focusedTimeEntry,
  hoveredTimeEntry,
  interactiveTooltip,
  setHoveredTimeEntry,
  setFocusedTimeEntry,
  setInteractiveTooltip,
  setIsMobileModalOpen,
  loading,
  error,
  t
}: MobileCompactViewProps) {
  const [zoomLevel, setZoomLevel] = React.useState(2)
  const [scrollPosition, setScrollPosition] = React.useState(0)
  const scrollContainerRef = React.useRef<HTMLDivElement>(null)
  const entriesScrollRef = React.useRef<HTMLDivElement>(null)
  const longPressTimerRef = React.useRef<number | null>(null)
  const longPressTriggeredRef = React.useRef(false)
  
  const barWidth = Math.max(3, 4 * zoomLevel)
  const totalWidth = 72 * barWidth
  const containerWidth = 280 // Fixed container width
  
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const newLeft = e.currentTarget.scrollLeft
    setScrollPosition(newLeft)
  }

  // Reset editable-related states when date-driven data changes
  React.useEffect(() => {
    setFocusedTimeEntry(null)
    setHoveredTimeEntry(null)
    setInteractiveTooltip(null)
  }, [curve, timeEntries, categorySummary, setFocusedTimeEntry, setHoveredTimeEntry, setInteractiveTooltip])
  
  const zoomIn = () => setZoomLevel(prev => Math.min(3, prev + 0.5))
  const zoomOut = () => setZoomLevel(prev => Math.max(0.5, prev - 0.5))
  
  const handleSpectrumInteraction = (e: React.TouchEvent | React.MouseEvent, isTouch = false) => {
    const rect = scrollContainerRef.current?.getBoundingClientRect()
    if (!rect) return
    
    const clientX = 'touches' in e ? e.touches[0]?.clientX || e.changedTouches[0]?.clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0]?.clientY || e.changedTouches[0]?.clientY : e.clientY
    
    if (!clientX || !clientY) return
    
    const relativeX = clientX - rect.left + scrollPosition
    // Calculate which segment and energy level
    const segmentIndex = Math.floor(relativeX / barWidth)
    if (segmentIndex >= 0 && segmentIndex < 72) {
      const energy = curve[segmentIndex] || 5
      const time = segmentToTimeLabel(segmentIndex)

      // Compute logical x (center of the segment in content space, accounting for 1px gaps)
      const xLogical = segmentIndex * barWidth + segmentIndex + barWidth / 2
      const clampedLeft = Math.max(12, Math.min(containerWidth - 12, xLogical - scrollPosition))
      
      setInteractiveTooltip({
        time,
        energy: Number(energy),
        x: xLogical,
        y: 0,
        visible: true
      })
    }
  }
  
  const getEntrySegmentRange = (entry: TimeEntryWithCrossDay) => {
    const startDate = new Date(entry.start_at)
    const endDate = entry.end_at ? new Date(entry.end_at) : new Date()
    const startMinutes = startDate.getHours() * 60 + startDate.getMinutes()
    const endMinutes = endDate.getHours() * 60 + endDate.getMinutes()
    const startSegment = Math.floor(startMinutes / 20)
    const endSegment = Math.min(71, endMinutes === 0 ? 71 : Math.floor((endMinutes - 1) / 20))
    return { startSegment, endSegment }
  }

  const hideTooltip = () => {
    setInteractiveTooltip((prev: InteractiveTooltip | null) => prev ? { ...prev, visible: false } : null)
  }
  
  return (
    <div 
      className="bg-white p-4 rounded-xl shadow-sm border border-gray-100"
      onClick={() => {
        // Click anywhere to close tooltip on mobile
        if (interactiveTooltip) {
          setInteractiveTooltip(null)
        }
        // Also close hovered time entry tooltip
        if (hoveredTimeEntry) {
          setHoveredTimeEntry(null)
        }
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <button onClick={(e) => { e.stopPropagation(); zoomOut(); }} className="w-6 h-6 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded text-xs font-bold">−</button>
          <span className="text-xs text-gray-600">{zoomLevel}x</span>
          <button onClick={(e) => { e.stopPropagation(); zoomIn(); }} className="w-6 h-6 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded text-xs font-bold">+</button>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); setIsMobileModalOpen(true); }}
          className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm text-gray-600 transition-colors"
        >
          <Maximize2 className="w-4 h-4" />
          View Full
        </button>
      </div>
      {loading ? (
        <div className="h-20 flex items-center justify-center text-gray-500">{t.common.loading}...</div>
      ) : error ? (
        <div className="h-20 flex items-center justify-center text-red-600">{error}</div>
      ) : (
        <div className="relative">
          {/* Interactive energy spectrum */}
          <div className="relative">
            {/* Top spacer area for tooltip to avoid finger covering and overflow */}
            <div
              className="relative"
              style={{ width: `${containerWidth}px`, height: '36px' }}
            >
              {interactiveTooltip && interactiveTooltip.visible && (
                <div
                  className="absolute z-20 pointer-events-none"
                  style={{
                    left: `${Math.max(12, Math.min(containerWidth - 12, (interactiveTooltip.x || 0) - scrollPosition))}px`,
                    top: '6px',
                    transform: 'translateX(-50%)'
                  }}
                >
                  <div className="bg-gray-900 text-white text-xs rounded-md shadow px-2 py-1">
                    <div className="text-center">
                      <div className="font-mono font-extrabold text-[13px]">
                        {interactiveTooltip.time}
                      </div>
                      <div className="text-[10px] text-gray-300">
                        Energy: <span className="font-medium text-white">{interactiveTooltip.energy}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            {/* Grid background and energy bars */}
            <div 
              ref={scrollContainerRef}
              className="h-16 flex items-end overflow-x-hidden pb-1 relative touch-none"
              style={{ 
                width: `${containerWidth}px`,
                background: 'linear-gradient(to right, transparent 0%, transparent calc(100% - 1px), #e5e7eb calc(100% - 1px), #e5e7eb 100%), repeating-linear-gradient(to right, transparent 0px, transparent calc(4 * var(--bar-width) - 1px), #f3f4f6 calc(4 * var(--bar-width) - 1px), #f3f4f6 calc(4 * var(--bar-width)))',
                backgroundSize: `${barWidth * 12}px 100%, ${barWidth * 4}px 100%`
              }}
              onTouchStart={(e) => { e.stopPropagation(); handleSpectrumInteraction(e, true) }}
              onTouchMove={(e) => {
                e.preventDefault() // Prevent scrolling while showing tooltip
                e.stopPropagation()
                handleSpectrumInteraction(e, true)
              }}
              // Keep tooltip after touch end (persist selection)
              onClick={(e) => e.stopPropagation()}
              onMouseMove={(e) => handleSpectrumInteraction(e, false)}
              onMouseLeave={hideTooltip}
            >

              <div className="relative" style={{ width: `${totalWidth}px`, transform: `translateX(-${scrollPosition}px)` }}>
                {/* Selection vertical line */}
                {interactiveTooltip && interactiveTooltip.visible && (
                  <div
                    className="absolute top-0 bottom-0 z-10 pointer-events-none"
                    style={{
                      left: `${interactiveTooltip.x || 0}px`,
                      width: '1px',
                      backgroundColor: '#111827',
                      opacity: 0.5
                    }}
                  />
                )}
                {/* Horizontal grid lines */}
                <div className="absolute inset-0 pointer-events-none">
                  {[25, 50, 75].map((percent) => (
                    <div
                      key={percent}
                      className="absolute w-full border-t border-gray-200"
                      style={{
                        bottom: `${percent}%`,
                        opacity: 0.3
                      }}
                    />
                  ))}
                </div>
                
                <div 
                  className="flex items-end relative z-10" 
                  style={{ 
                    width: `${totalWidth}px`,
                    '--bar-width': `${barWidth}px`
                  } as React.CSSProperties}
                >
                  {curve.map((eVal, i) => {
                    const eNum = Number(eVal) || 5
                    const height = Math.max(4, (eNum / 10) * 56)
                    const editable = canEdit(i, currentTimeInfo, focusedTimeEntry, (entry: any) => {
                      const startDate = new Date(entry.start_at)
                      const endDate = entry.end_at ? new Date(entry.end_at) : new Date()
                      const startMinutes = startDate.getHours() * 60 + startDate.getMinutes()
                      const endMinutes = endDate.getHours() * 60 + endDate.getMinutes()
                      const startSegment = Math.floor(startMinutes / 20)
                      const endSegment = Math.min(71, endMinutes === 0 ? 71 : Math.floor((endMinutes - 1) / 20))
                      return { startSegment, endSegment }
                    })
                    const fill = editable ? energyToColor(eNum) : '#cbd5e1'
                    return (
                      <div
                        key={i}
                        className="rounded-t flex-shrink-0 relative"
                        style={{ 
                          height: `${height}px`,
                          width: `${barWidth}px`,
                          backgroundColor: fill,
                          opacity: editable ? 0.9 : 0.4,
                          marginRight: '1px',
                          border: '1px solid rgba(255,255,255,0.2)'
                        }}
                      />
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
          
          {/* Time entries aligned by time (below spectrum, not overlay) */}
          {timeEntries.length > 0 && (
            <div className="mt-3">
              <div
                ref={entriesScrollRef}
                className="overflow-x-auto scrollbar-thin"
                style={{ width: `${containerWidth}px`, scrollbarWidth: 'thin' as any }}
                onScroll={handleScroll}
              >
                <div className="relative" style={{ width: `${totalWidth}px`, height: '20px' }}>
                  {timeEntries.map((entry, idx) => {
                    const { startSegment, endSegment } = getEntrySegmentRange(entry)
                    const left = startSegment * barWidth + startSegment
                    const width = Math.max(2, (endSegment - startSegment + 1) * barWidth + (endSegment - startSegment))
                    return (
                      <div
                        key={idx}
                        className="absolute rounded cursor-pointer"
                        style={{
                          top: '7px',
                          height: '10px',
                          left: `${left}px`,
                          width: `${width}px`,
                          backgroundColor: entry.category_color || '#94a3b8',
                          border: entry.isCrossDaySegment ? `1px dashed ${entry.category_color || '#94a3b8'}` : 'none',
                          opacity: 0.95
                        }}
                        title={entry.task_title || 'Unnamed Task'}
                        onMouseEnter={(e) => {
                          const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
                          setHoveredTimeEntry({
                            entry,
                            position: { x: rect.left + rect.width / 2, y: rect.top - 44 }
                          })
                        }}
                        onMouseLeave={() => setHoveredTimeEntry(null)}
                        onClick={(e) => {
                          e.stopPropagation()
                          if (focusedTimeEntry?.id === entry.id) {
                            setFocusedTimeEntry(null)
                          } else {
                            setFocusedTimeEntry(entry)
                          }
                        }}
                        onTouchStart={(e) => {
                          longPressTriggeredRef.current = false
                          if (longPressTimerRef.current) {
                            window.clearTimeout(longPressTimerRef.current)
                          }
                          const target = e.currentTarget as HTMLDivElement
                          longPressTimerRef.current = window.setTimeout(() => {
                            longPressTriggeredRef.current = true
                            const rect = target.getBoundingClientRect()
                            setHoveredTimeEntry({
                              entry,
                              position: { x: rect.left + rect.width / 2, y: rect.top - 48 }
                            })
                          }, 400)
                        }}
                        onTouchMove={() => {
                          if (longPressTimerRef.current) {
                            window.clearTimeout(longPressTimerRef.current)
                            longPressTimerRef.current = null
                          }
                        }}
                        onTouchEnd={() => {
                          if (longPressTimerRef.current) {
                            window.clearTimeout(longPressTimerRef.current)
                            longPressTimerRef.current = null
                          }
                          if (longPressTriggeredRef.current) {
                            setHoveredTimeEntry(null)
                          }
                        }}
                      />
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Category legend */}
          {categorySummary.length > 0 && (
            <div className="mt-3 pt-2 border-t border-gray-100">
              <div className="text-xs text-gray-600 mb-2">Categories</div>
              <div className="flex flex-wrap gap-2">
                {categorySummary.slice(0, 4).map((category) => (
                  <div key={category.id} className="flex items-center gap-1.5 bg-gray-50 rounded-full px-2 py-1">
                    <div 
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="text-xs text-gray-700 font-medium">{category.name}</span>
                    <span className="text-xs text-gray-500">({formatDuration(category.minutes)})</span>
                  </div>
                ))}
                {categorySummary.length > 4 && (
                  <div className="text-xs text-gray-500 px-2 py-1">+{categorySummary.length - 4} more</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
