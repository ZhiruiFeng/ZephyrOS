import React from 'react'
import { energyToColor, buildSmoothPath, canEdit, segmentToTimeLabel } from '../utils'
import { TimeEntriesDisplay } from './TimeEntriesDisplay'
import type { 
  TimeEntryWithCrossDay, 
  HoveredTimeEntry, 
  CrosshairPosition,
  CurrentTimeInfo,
  CategorySummary 
} from '../types'

interface MobileEnergyChartProps {
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
  handlePointerDown: (e: React.PointerEvent<SVGRectElement>) => void
  handlePointerMove: (e: React.PointerEvent<SVGRectElement>) => void
  handlePointerUp: () => void
  showTimeEntriesBar?: boolean
  visibleRange?: { start: number; end: number }
  hideSmoothPath?: boolean
  t: any
}

export function MobileEnergyChart({
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
  handlePointerDown,
  handlePointerMove,
  handlePointerUp,
  showTimeEntriesBar = true,
  visibleRange,
  hideSmoothPath,
  t
}: MobileEnergyChartProps) {
  return (
    <div>
      <div className="overflow-x-auto">
        <div className="min-w-[800px] bg-gray-50 rounded-lg p-4">
          <svg width="800" height="360" className="block select-none">
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

            <rect
              x={60}
              y={40}
              width={680}
              height={270}
              fill="transparent"
              style={{ cursor: 'crosshair' }}
              onPointerDown={handlePointerDown}
              onPointerMove={(e) => {
                if ((e.currentTarget as any).getAttribute('data-dragging') === 'true') {
                  handlePointerMove(e)
                }
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
                  setCrosshairPosition({ x: 60 + relativeX, time: timeString })
                }
              }}
              onPointerUp={handlePointerUp}
              onPointerLeave={() => setCrosshairPosition(null)}
            />

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

            {crosshairPosition && (
              <g>
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
                <g pointerEvents="none">
                  <rect x={crosshairPosition.x - 25} y={15} width={50} height={22} rx={6} fill="#3b82f6" opacity={0.9} />
                  <text x={crosshairPosition.x} y={29} textAnchor="middle" fontSize={12} fill="white" fontWeight="500">
                    {crosshairPosition.time}
                  </text>
                </g>
              </g>
            )}
          </svg>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        <div className="text-xs text-gray-600">
          {t.ui.editableRange}：
          {currentTimeInfo.isFutureDate 
            ? 'Not editable (future date)' 
            : currentTimeInfo.isToday 
              ? `00:00 - ${segmentToTimeLabel(currentTimeInfo.currentIndex+1)}` 
              : t.ui.allDay}
        </div>
      </div>
    </div>
  )
}


