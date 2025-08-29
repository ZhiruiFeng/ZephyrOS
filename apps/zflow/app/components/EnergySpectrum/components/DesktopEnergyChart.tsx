import React from 'react'
import { X } from 'lucide-react'
import { energyToColor, buildSmoothPath, canEdit } from '../utils'
import { TimeEntriesDisplay } from './TimeEntriesDisplay'
import type { 
  TimeEntryWithCrossDay, 
  HoveredTimeEntry, 
  CrosshairPosition, 
  Dimensions, 
  Padding,
  CurrentTimeInfo 
} from '../types'

interface DesktopEnergyChartProps {
  curve: number[]
  dims: Dimensions
  pad: Padding
  timeEntriesHeight: number
  plotH: number
  plotW: number
  hourMarks: number[]
  smoothPath: string
  focusedTimeEntry: TimeEntryWithCrossDay | null
  crosshairPosition: CrosshairPosition | null
  currentTimeInfo: CurrentTimeInfo
  timeEntryLayers: Array<Array<TimeEntryWithCrossDay>>
  setHoveredTimeEntry: (entry: HoveredTimeEntry | null) => void
  setFocusedTimeEntry: (entry: TimeEntryWithCrossDay | null) => void
  setCrosshairPosition: (position: CrosshairPosition | null) => void
  handlePointerDown: (e: React.PointerEvent<SVGRectElement>) => void
  handlePointerMove: (e: React.PointerEvent<SVGRectElement>) => void
  handlePointerUp: () => void
  xForIdx: (i: number) => number
  yForEnergy: (e: number) => number
  energyForY: (y: number) => number
  idxForX: (x: number) => number
  t: any
}

export function DesktopEnergyChart({
  curve,
  dims,
  pad,
  timeEntriesHeight,
  plotH,
  plotW,
  hourMarks,
  smoothPath,
  focusedTimeEntry,
  crosshairPosition,
  currentTimeInfo,
  timeEntryLayers,
  setHoveredTimeEntry,
  setFocusedTimeEntry,
  setCrosshairPosition,
  handlePointerDown,
  handlePointerMove,
  handlePointerUp,
  xForIdx,
  yForEnergy,
  energyForY,
  idxForX,
  t
}: DesktopEnergyChartProps) {
  return (
    <svg width="100%" height={dims.h} viewBox={`0 0 ${dims.w} ${dims.h}`} className="block select-none" preserveAspectRatio="xMidYMid meet">
      {/* Hour grid lines */}
      {hourMarks.map((h, i) => {
        const x = pad.left + (h / 24) * plotW
        const isMajor = h % 3 === 0
        return (
          <g key={i}>
            <line x1={x} x2={x} y1={pad.top} y2={pad.top + plotH} stroke={isMajor ? '#e6eaf0' : '#f3f6fa'} strokeWidth={isMajor ? 1.25 : 1} />
            {isMajor && (
              <text x={x} y={pad.top + plotH + 20} textAnchor="middle" fontSize={11} fill="#475569">
                {String(h).padStart(2, '0')}:00
              </text>
            )}
          </g>
        )
      })}

      {/* Y grid */}
      {Array.from({ length: 10 }).map((_, k) => {
        const e = 1 + k
        const y = yForEnergy(e)
        return (
          <g key={k}>
            <line x1={pad.left} x2={pad.left + plotW} y1={y} y2={y} stroke="#eef2f7" />
            <text x={pad.left - 10} y={y + 4} textAnchor="end" fontSize={11} fill="#475569" className="tabular-nums">{e}</text>
          </g>
        )
      })}

      {/* Bars */}
      {curve.map((eVal, i) => {
        const eNum = Number(eVal) || 5
        const x = xForIdx(i)
        const w = Math.max(2, (plotW / 71) * 0.9)
        const y = yForEnergy(eNum)
        const h = pad.top + plotH - y
        const editable = canEdit(i, currentTimeInfo, focusedTimeEntry, (entry: any) => {
    const startDate = new Date(entry.start_at)
    const endDate = entry.end_at ? new Date(entry.end_at) : new Date()
    const startMinutes = startDate.getHours() * 60 + startDate.getMinutes()
    const endMinutes = endDate.getHours() * 60 + endDate.getMinutes()
    const startSegment = Math.floor(startMinutes / 20)
    const endSegment = Math.min(71, endMinutes === 0 ? 71 : Math.floor((endMinutes - 1) / 20))
    return { startSegment, endSegment }
  })
        
        // Determine visual state based on focus and editability
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
            // Highlighted segments within focused time entry
            fill = energyToColor(eNum)
            opacity = 1
            stroke = '#3b82f6'
            strokeWidth = 2
          } else {
            // Greyed out segments outside focused time entry
            fill = '#e5e7eb'
            opacity = 0.5
            stroke = 'none'
            strokeWidth = 0
          }
        } else {
          // Normal mode
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
      <path d={smoothPath} fill="none" stroke="#111827" strokeWidth={2} />

      {/* Legend gradient */}
      <defs>
        <linearGradient id="energyLegend" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={energyToColor(1)} />
          <stop offset="50%" stopColor={energyToColor(5.5)} />
          <stop offset="100%" stopColor={energyToColor(10)} />
        </linearGradient>
      </defs>
      <g>
        <rect x={pad.left} y={25} width={160} height={6} rx={3} fill="url(#energyLegend)" />
        <text x={pad.left + 80} y={20} textAnchor="middle" fontSize={10} fill="#64748b">{t.ui.lowEnergy} 
          <tspan dx="84">{t.ui.highEnergy}</tspan>
        </text>
      </g>

      {/* Interaction overlay */}
      <rect
        x={pad.left}
        y={pad.top}
        width={plotW}
        height={plotH + timeEntriesHeight + 25}
        fill="transparent"
        style={{ cursor: focusedTimeEntry ? 'default' : 'crosshair' }}
        onPointerDown={handlePointerDown}
        onPointerMove={(e) => {
          handlePointerMove(e)
          
          // Calculate crosshair position using SVG coordinate transformation
          const svg = e.currentTarget.closest('svg') as SVGSVGElement
          if (svg) {
            const pt = svg.createSVGPoint()
            pt.x = e.clientX
            pt.y = e.clientY
            const ctm = svg.getScreenCTM()
            if (ctm) {
              const svgPoint = pt.matrixTransform(ctm.inverse())
              const relativeX = svgPoint.x - pad.left
              
              if (relativeX >= 0 && relativeX <= plotW) {
                const timePercent = relativeX / plotW
                const totalMinutes = timePercent * 24 * 60
                const hours = Math.floor(totalMinutes / 60)
                const minutes = Math.floor(totalMinutes % 60)
                const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
                
                setCrosshairPosition({
                  x: pad.left + relativeX,
                  time: timeString
                })
              }
            }
          }
        }}
        onPointerUp={handlePointerUp}
        onMouseLeave={() => setCrosshairPosition(null)}
        onClick={() => {
          // Click on empty area to exit focus mode
          if (focusedTimeEntry) {
            setFocusedTimeEntry(null)
          }
        }}
      />

      {/* Energy axis title */}
      <text x={pad.left + plotW / 2} y={28} textAnchor="middle" fontSize={12} fill="#475569">{t.ui.energyAxis}</text>
      
      {/* Time entries display */}
      <TimeEntriesDisplay
        width={dims.w}
        height={timeEntriesHeight}
        padLeft={pad.left}
        padRight={pad.right}
        yOffset={pad.top + plotH + 25}
        isMobile={false}
        timeEntryLayers={timeEntryLayers}
        focusedTimeEntry={focusedTimeEntry}
        setHoveredTimeEntry={setHoveredTimeEntry}
        setFocusedTimeEntry={setFocusedTimeEntry}
      />

      {/* Crosshair line and time label */}
      {crosshairPosition && (
        <g>
          {/* Vertical crosshair line */}
          <line
            x1={crosshairPosition.x}
            y1={pad.top}
            x2={crosshairPosition.x}
            y2={pad.top + plotH + timeEntriesHeight + 25}
            stroke="#3b82f6"
            strokeWidth={1}
            strokeDasharray="4,2"
            opacity={0.8}
            pointerEvents="none"
          />
          {/* Time label */}
          <g pointerEvents="none">
            <rect
              x={crosshairPosition.x - 20}
              y={pad.top - 25}
              width={40}
              height={20}
              rx={4}
              fill="#3b82f6"
              opacity={0.9}
            />
            <text
              x={crosshairPosition.x}
              y={pad.top - 12}
              textAnchor="middle"
              fontSize={11}
              fill="white"
              fontWeight="500"
            >
              {crosshairPosition.time}
            </text>
          </g>
        </g>
      )}
    </svg>
  )
}
