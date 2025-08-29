import React from 'react'
import { X } from 'lucide-react'
import { energyToColor, buildSmoothPath, canEdit, segmentToTimeLabel } from '../utils'
import { TimeEntriesDisplay } from './TimeEntriesDisplay'
import { CategoryLegend } from './CategoryLegend'
import type { 
  TimeEntryWithCrossDay, 
  HoveredTimeEntry, 
  CrosshairPosition,
  CurrentTimeInfo,
  CategorySummary 
} from '../types'

interface MobileFullScreenModalProps {
  isMobileModalOpen: boolean
  curve: number[]
  hourMarks: number[]
  focusedTimeEntry: TimeEntryWithCrossDay | null
  crosshairPosition: CrosshairPosition | null
  currentTimeInfo: CurrentTimeInfo
  timeEntryLayers: Array<Array<TimeEntryWithCrossDay>>
  categorySummary: CategorySummary[]
  hoveredTimeEntry: HoveredTimeEntry | null
  setHoveredTimeEntry: (entry: HoveredTimeEntry | null) => void
  setFocusedTimeEntry: (entry: TimeEntryWithCrossDay | null) => void
  setCrosshairPosition: (position: CrosshairPosition | null) => void
  setIsMobileModalOpen: (open: boolean) => void
  handlePointerDown: (e: React.PointerEvent<SVGRectElement>) => void
  handlePointerMove: (e: React.PointerEvent<SVGRectElement>) => void
  handlePointerUp: () => void
  saveAll: () => void
  saving: boolean
  lastSaved: string | null
  loading: boolean
  error: string | null
  t: any
  showTimeEntriesBar?: boolean
  visibleRange?: { start: number; end: number }
  hideSmoothPath?: boolean
}

export function MobileFullScreenModal({
  isMobileModalOpen,
  curve,
  hourMarks,
  focusedTimeEntry,
  crosshairPosition,
  currentTimeInfo,
  timeEntryLayers,
  categorySummary,
  hoveredTimeEntry,
  setHoveredTimeEntry,
  setFocusedTimeEntry,
  setCrosshairPosition,
  setIsMobileModalOpen,
  handlePointerDown,
  handlePointerMove,
  handlePointerUp,
  saveAll,
  saving,
  lastSaved,
  loading,
  error,
  t,
  showTimeEntriesBar = true,
  visibleRange,
  hideSmoothPath
}: MobileFullScreenModalProps) {
  if (!isMobileModalOpen) return null

  return (
    <div 
      className="fixed inset-0 z-50 bg-white"
      onClick={() => {
        // Click anywhere to close tooltip in mobile modal
        if (hoveredTimeEntry) {
          setHoveredTimeEntry(null)
        }
      }}
    >
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Energy Spectrum</h2>
        <button
          onClick={(e) => {
            e.stopPropagation() // Prevent closing tooltip when closing modal
            setIsMobileModalOpen(false)
          }}
          className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="h-64 flex items-center justify-center text-gray-500">{t.common.loading}...</div>
        ) : error ? (
          <div className="h-64 flex items-center justify-center text-red-600">{error}</div>
        ) : (
          <div>
            {/* Mobile-optimized chart with horizontal scroll */}
            <div className="overflow-x-auto">
              <div className="min-w-[800px] bg-gray-50 rounded-lg p-4">
                <svg width="800" height="360" className="block select-none">
                  {/* Hour grid lines */}
                  {hourMarks.map((h, i) => {
                    const x = 60 + (h / 24) * 680
                    const isMajor = h % 3 === 0
                    return (
                      <g key={i}>
                        <line x1={x} x2={x} y1={40} y2={240} stroke={isMajor ? '#e6eaf0' : '#f3f6fa'} strokeWidth={isMajor ? 1.25 : 1} />
                        {isMajor && (
                          <text x={x} y={255} textAnchor="middle" fontSize={12} fill="#475569">
                            {String(h).padStart(2, '0')}:00
                          </text>
                        )}
                      </g>
                    )
                  })}

                  {/* Y grid */}
                  {Array.from({ length: 10 }).map((_, k) => {
                    const e = 1 + k
                    const y = 40 + (1 - (e - 1) / 9) * 200
                    return (
                      <g key={k}>
                        <line x1={60} x2={740} y1={y} y2={y} stroke="#eef2f7" />
                        <text x={45} y={y + 4} textAnchor="end" fontSize={12} fill="#475569" className="tabular-nums">{e}</text>
                      </g>
                    )
                  })}

                  {/* Energy bars */}
                  {curve.map((eVal, i) => {
                    if (visibleRange && (i < visibleRange.start || i > visibleRange.end)) return null
                    const eNum = Number(eVal) || 5
                    const x = 60 + (i * 680) / 71
                    const w = Math.max(6, 680 / 72 * 0.8)
                    const y = 40 + (1 - (eNum - 1) / 9) * 200
                    const h = 40 + 200 - y
                    const editable = canEdit(i, currentTimeInfo, focusedTimeEntry, (entry: any) => {
                      const startDate = new Date(entry.start_at)
                      const endDate = entry.end_at ? new Date(entry.end_at) : new Date()
                      const startMinutes = startDate.getHours() * 60 + startDate.getMinutes()
                      const endMinutes = endDate.getHours() * 60 + endDate.getMinutes()
                      const startSegment = Math.floor(startMinutes / 20)
                      const endSegment = Math.min(71, endMinutes === 0 ? 71 : Math.floor((endMinutes - 1) / 20))
                      return { startSegment, endSegment }
                    })
                    
                    // Mobile version of focus logic
                    let fill, opacity, stroke, strokeWidth
                    if (focusedTimeEntry) {
                      const startDate = new Date(focusedTimeEntry.start_at)
                      const endDate = focusedTimeEntry.end_at ? new Date(focusedTimeEntry.end_at) : new Date()
                      const startMinutes = startDate.getHours() * 60 + startDate.getMinutes()
                      const endMinutes = endDate.getHours() * 60 + endDate.getMinutes()
                      const startSegment = Math.floor(startMinutes / 20)
                      const endSegment = Math.min(71, endMinutes === 0 ? 71 : Math.floor((endMinutes - 1) / 20))
                      const isInFocusedRange = i >= startSegment && i <= endSegment
                      
                      if (isInFocusedRange && editable) {
                        fill = energyToColor(eNum)
                        opacity = 1
                        stroke = '#3b82f6'
                        strokeWidth = 2
                      } else {
                        fill = '#e5e7eb'
                        opacity = 0.5
                        stroke = 'none'
                        strokeWidth = 0
                      }
                    } else {
                      fill = editable ? energyToColor(eNum) : '#cbd5e1'
                      opacity = editable ? 0.9 : 0.4
                      stroke = 'none'
                      strokeWidth = 0
                    }
                    
                    return (
                      <rect 
                        key={i} 
                        x={x - w / 2} 
                        y={y} 
                        width={w} 
                        height={h} 
                        fill={fill} 
                        opacity={opacity}
                        stroke={stroke}
                        strokeWidth={strokeWidth}
                        rx={3} 
                      />
                    )
                  })}

                  {/* Smoothed line */}
                  {!hideSmoothPath && (
                    <path 
                      d={buildSmoothPath(
                        curve.map((e, i) => ({ 
                          x: 60 + (i * 680) / 71, 
                          y: 40 + (1 - (Number(e) || 5 - 1) / 9) * 200 
                        })), 0.8
                      )} 
                      fill="none" 
                      stroke="#111827" 
                      strokeWidth={3} 
                    />
                  )}

                  {/* Touch interaction overlay */}
                  <rect
                    x={60}
                    y={40}
                    width={680}
                    height={270}
                    fill="transparent"
                    style={{ cursor: 'crosshair' }}
                    onPointerDown={handlePointerDown}
                    onPointerMove={(e) => {
                      // Handle energy editing
                      if (e.currentTarget.getAttribute('data-dragging') === 'true') {
                        handlePointerMove(e)
                      }
                      
                      // Handle crosshair positioning
                      const svg = (e.currentTarget as SVGRectElement).ownerSVGElement!
                      const pt = svg.createSVGPoint()
                      pt.x = e.clientX; pt.y = e.clientY
                      const ctm = svg.getScreenCTM()
                      if (!ctm) return
                      const p = pt.matrixTransform(ctm.inverse())
                      const relativeX = p.x - 60
                      if (relativeX >= 0 && relativeX <= 680) {
                        const timePercent = relativeX / 680
                        const totalMinutes = timePercent * 24 * 60
                        const hours = Math.floor(totalMinutes / 60)
                        const minutes = Math.floor(totalMinutes % 60)
                        const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
                        
                        setCrosshairPosition({
                          x: 60 + relativeX,
                          time: timeString
                        })
                      }
                    }}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={() => setCrosshairPosition(null)}
                  />
                  
                  {/* Time entries display in mobile modal */}
                  {showTimeEntriesBar && (
                    <TimeEntriesDisplay
                      width={800}
                      height={40}
                      padLeft={60}
                      padRight={60}
                      yOffset={270}
                      isMobile={true}
                      timeEntryLayers={timeEntryLayers}
                      focusedTimeEntry={focusedTimeEntry}
                      setHoveredTimeEntry={setHoveredTimeEntry}
                      setFocusedTimeEntry={setFocusedTimeEntry}
                    />
                  )}

                  {/* Crosshair line and time label for mobile */}
                  {crosshairPosition && (
                    <g>
                      {/* Vertical crosshair line */}
                      <line
                        x1={crosshairPosition.x}
                        y1={40}
                        x2={crosshairPosition.x}
                        y2={310}
                        stroke="#3b82f6"
                        strokeWidth={2}
                        strokeDasharray="4,2"
                        opacity={0.8}
                        pointerEvents="none"
                      />
                      {/* Time label */}
                      <g pointerEvents="none">
                        <rect
                          x={crosshairPosition.x - 25}
                          y={15}
                          width={50}
                          height={22}
                          rx={6}
                          fill="#3b82f6"
                          opacity={0.9}
                        />
                        <text
                          x={crosshairPosition.x}
                          y={29}
                          textAnchor="middle"
                          fontSize={12}
                          fill="white"
                          fontWeight="500"
                        >
                          {crosshairPosition.time}
                        </text>
                      </g>
                    </g>
                  )}
                  
                </svg>
              </div>
            </div>

            {/* Info and controls */}
            <div className="mt-4 space-y-4">
              {/* Mobile modal category legend */}
              <CategoryLegend categorySummary={categorySummary} isMobile={true} />
              
              <div className="text-xs text-gray-600">
                {t.ui.editableRange}：
                {currentTimeInfo.isFutureDate 
                  ? 'Not editable (future date)' 
                  : currentTimeInfo.isToday 
                    ? `00:00 - ${segmentToTimeLabel(currentTimeInfo.currentIndex+1)}` 
                    : t.ui.allDay
                }
              </div>
              
              {lastSaved && (
                <div className="text-xs text-gray-500">
                  {t.ui.lastSaved}: {new Date(lastSaved).toLocaleString()}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Sticky bottom actions */}
      <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <button 
          onClick={(e) => {
            e.stopPropagation() // Prevent closing tooltip when saving
            saveAll()
          }} 
          disabled={saving} 
          className="w-full px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 shadow-sm font-medium"
        >
          {saving ? t.ui.saving : t.common.save}
        </button>
      </div>
    </div>
  )
}
