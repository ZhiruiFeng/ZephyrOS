'use client'

import React from 'react'
import { Maximize2, X } from 'lucide-react'
import { energyDaysApi, type EnergyDay, timeTrackingApi, type TimeEntry } from '../../lib/api'
import { useTranslation } from '../../contexts/LanguageContext'
import { getUserTimezone, formatDuration, toLocal } from '../utils/timeUtils'
import { processDayEntries, type TimeEntryWithCrossDay } from '../utils/crossDayUtils'

type Props = {
  date: string
  now?: Date
  onSaved?: (data: EnergyDay) => void
}

const SEGMENTS = 72
const MIN = 1
const MAX = 10

function clamp(v: number, lo = MIN, hi = MAX) {
  return Math.max(lo, Math.min(hi, Math.round(v)))
}

function defaultCurve() {
  return new Array(SEGMENTS).fill(5)
}

function defaultMask() {
  return new Array(SEGMENTS).fill(false)
}

// Light green → yellow → orange → red mapping based on energy value
function energyToColor(e: number) {
  const t = (clamp(e, 1, 10) - 1) / 9 // 0..1
  // Hue 120 (green) → 0 (red)
  const hue = Math.round(120 - 120 * t)
  const sat = 60
  const light = 70
  return `hsl(${hue} ${sat}% ${light}%)`
}

function segmentToTimeLabel(index: number) {
  const minutes = index * 20
  const hh = Math.floor(minutes / 60).toString().padStart(2, '0')
  const mm = (minutes % 60).toString().padStart(2, '0')
  return `${hh}:${mm}`
}

export default function EnergySpectrum({ date, now, onSaved }: Props) {
  const { t } = useTranslation()
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [curve, setCurve] = React.useState<number[]>(defaultCurve)
  const [mask, setMask] = React.useState<boolean[]>(defaultMask)
  const [lastCheckedIndex, setLastCheckedIndex] = React.useState<number | null>(null)
  const [lastSaved, setLastSaved] = React.useState<string | null>(null)
  const [isMobileModalOpen, setIsMobileModalOpen] = React.useState(false)
  const [isMobile, setIsMobile] = React.useState(false)
  const [timeEntries, setTimeEntries] = React.useState<TimeEntryWithCrossDay[]>([])
  const [loadingTimeEntries, setLoadingTimeEntries] = React.useState(true)
  const [hoveredTimeEntry, setHoveredTimeEntry] = React.useState<{
    entry: TimeEntryWithCrossDay
    position: { x: number; y: number }
  } | null>(null)
  const [focusedTimeEntry, setFocusedTimeEntry] = React.useState<TimeEntryWithCrossDay | null>(null)
  const [crosshairPosition, setCrosshairPosition] = React.useState<{ x: number; time: string } | null>(null)

  // Get current time in user's timezone for the selected date
  const getCurrentTimeInTimezone = React.useMemo(() => {
    const now = new Date()
    const selectedDateObj = new Date(date + 'T00:00:00') // Selected date at midnight in local timezone
    const todayDateObj = new Date(now.getFullYear(), now.getMonth(), now.getDate()) // Today at midnight in local timezone
    
    // Check if selected date is today in local timezone
    const isSelectedDateToday = selectedDateObj.getTime() === todayDateObj.getTime()
    
    if (isSelectedDateToday) {
      // For today, use current time in local timezone
      return {
        isToday: true,
        currentHour: now.getHours(),
        currentMinute: now.getMinutes(),
        currentIndex: Math.min(SEGMENTS - 1, Math.floor((now.getHours() * 60 + now.getMinutes()) / 20))
      }
    } else {
      // For past dates, all segments are editable; for future dates, none are editable
      const isFutureDate = selectedDateObj.getTime() > todayDateObj.getTime()
      return {
        isToday: false,
        isFutureDate,
        currentHour: isFutureDate ? -1 : 23,
        currentMinute: isFutureDate ? -1 : 59,
        currentIndex: isFutureDate ? -1 : SEGMENTS - 1
      }
    }
  }, [date])

  const isToday = getCurrentTimeInTimezone.isToday
  const currentIndex = getCurrentTimeInTimezone.currentIndex

  React.useEffect(() => {
    let mounted = true
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await energyDaysApi.get(date)
        if (!mounted) return
        if (data) {
          const normalizedCurve = (data.curve && data.curve.length === SEGMENTS)
            ? data.curve.map((x: any) => {
                const n = Number(x)
                return Number.isFinite(n) ? clamp(n) : 5
              })
            : defaultCurve()
          setCurve(normalizedCurve)
          setMask((data.edited_mask && data.edited_mask.length === SEGMENTS) ? data.edited_mask : defaultMask())
          setLastCheckedIndex(data.last_checked_index ?? null)
          setLastSaved(data.updated_at ?? null)
        } else {
          // create default using historical average curve (fallback to 5)
          const end = new Date(date)
          const start = new Date(end)
          start.setDate(start.getDate() - 30)
          let avgCurve = defaultCurve()
          try {
            const history = await energyDaysApi.list({ start: start.toISOString().slice(0,10), end: end.toISOString().slice(0,10), limit: 60 })
            if (history && history.length > 0) {
              const sums = new Array(SEGMENTS).fill(0)
              const counts = new Array(SEGMENTS).fill(0)
              for (const d of history) {
                if (Array.isArray(d.curve) && d.curve.length === SEGMENTS) {
                  for (let i = 0; i < SEGMENTS; i++) {
                    const val = d.curve[i]
                    if (typeof val === 'number' && !Number.isNaN(val)) {
                      sums[i] += val
                      counts[i] += 1
                    }
                  }
                }
              }
              avgCurve = sums.map((s, i) => counts[i] > 0 ? Math.round(s / counts[i]) : 5)
            }
          } catch {}
          const created = await energyDaysApi.upsert({ local_date: date, curve: avgCurve, source: 'simulated' })
          if (!mounted) return
          setCurve(created.curve)
          setMask(created.edited_mask || defaultMask())
          setLastCheckedIndex(created.last_checked_index ?? null)
          setLastSaved(created.updated_at ?? null)
        }
      } catch (e: any) {
        setError(e?.message || t.common.error)
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [date])

  // Fetch time entries for the selected date
  React.useEffect(() => {
    let mounted = true
    ;(async () => {
      setLoadingTimeEntries(true)
      try {
        // Create date range for the selected date in user's timezone
        // We need to query UTC times that overlap with the local date
        const localMidnight = new Date(date + 'T00:00:00')
        const localEndOfDay = new Date(date + 'T23:59:59.999')
        
        // Convert local times to UTC for API query
        const dayStart = new Date(localMidnight.getTime() - localMidnight.getTimezoneOffset() * 60000).toISOString()
        const dayEnd = new Date(localEndOfDay.getTime() - localEndOfDay.getTimezoneOffset() * 60000).toISOString()
        
        console.debug(`Fetching time entries for ${date}:`, {
          localRange: { start: localMidnight.toISOString(), end: localEndOfDay.toISOString() },
          utcRange: { start: dayStart, end: dayEnd },
          timezone: getUserTimezone(),
          currentTimeInTimezone: {
            ...getCurrentTimeInTimezone,
            currentTime: `${getCurrentTimeInTimezone.currentHour}:${String(getCurrentTimeInTimezone.currentMinute).padStart(2, '0')}`
          }
        })
        
        const data = await timeTrackingApi.listDay({ from: dayStart, to: dayEnd })
        if (!mounted) return
        
        // Map raw entries to include category information
        const rawEntries = (data.entries || []).map((e) => ({
          ...e,
          category_color: (e as any).category?.color || '#CBD5E1',
          category_id: (e as any).category?.id || (e as any).category_id_snapshot || 'uncategorized',
          category_name: (e as any).category?.name || 'Uncategorized',
          task_title: (e as any).task?.title || (e as any).task_title || 'Unknown Task',
        }))
        
        // Process entries using cross-day logic from DailyTimeModal
        const processedEntries = processDayEntries(rawEntries, localMidnight)
        
        console.debug(`Processed ${data.entries?.length || 0} entries to ${processedEntries.length} for local date ${date}`, {
          crossDayEntries: processedEntries.filter(e => e.isCrossDaySegment).length
        })
        setTimeEntries(processedEntries)
      } catch (e: any) {
        if (mounted) {
          console.warn('Failed to fetch time entries:', e?.message)
          setTimeEntries([]) // Fail gracefully
        }
      } finally {
        if (mounted) setLoadingTimeEntries(false)
      }
    })()
    return () => { mounted = false }
  }, [date])

  function canEdit(index: number) {
    // For future dates, nothing is editable
    if (getCurrentTimeInTimezone.isFutureDate) {
      return false
    }
    
    // For past dates, everything is editable
    // For today, only up to current time is editable
    const basicCanEdit = !isToday || index <= currentIndex
    
    // If a time entry is focused, only allow editing within its time range
    if (focusedTimeEntry) {
      const { startSegment, endSegment } = getTimeEntryPosition(focusedTimeEntry)
      const isInFocusedRange = index >= startSegment && index <= endSegment
      return basicCanEdit && isInFocusedRange
    }
    
    return basicCanEdit
  }

  function handleDrag(idx: number, clientY: number, rect: DOMRect) {
    const y = clientY - rect.top
    const ratio = 1 - Math.max(0, Math.min(1, y / rect.height))
    const value = clamp(MIN + ratio * (MAX - MIN))
    setCurve(prev => {
      const next = prev.slice()
      next[idx] = value
      return next
    })
    setMask(prev => {
      const next = prev.slice()
      next[idx] = true
      return next
    })
  }

  const containerRef = React.useRef<HTMLDivElement>(null)
  const dragging = React.useRef<number | null>(null)
  const [dims, setDims] = React.useState({ w: 900, h: 400 }) // Reduced height for more compact design
  const pad = { left: 48, right: 24, top: 36, bottom: 42 }
  const timeEntriesHeight = 40 // Reduced to two lines (2 * 20px)
  const plotH = dims.h - pad.top - pad.bottom - timeEntriesHeight - 20 // Space for time entries
  const plotW = dims.w - pad.left - pad.right

  // Mobile detection
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768) // md breakpoint
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])


  // Adjust dimensions for better responsiveness
  React.useEffect(() => {
    if (!containerRef.current) return
    const ro = new (window as any).ResizeObserver((entries: any) => {
      for (const e of entries) {
        const cr = e.contentRect
        // More responsive width calculation
        const minWidth = isMobile ? 320 : 600
        const maxWidth = 1200
        const optimalWidth = Math.min(maxWidth, Math.max(minWidth, cr.width - 24)) // Account for padding
        const optimalHeight = isMobile ? 
          Math.min(250, optimalWidth * 0.3) : 
          Math.min(400, optimalWidth * 0.35)
        setDims({ 
          w: optimalWidth, 
          h: Math.max(320, optimalHeight) 
        })
      }
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [isMobile, containerRef])

  const xForIdx = (i: number) => pad.left + (i * plotW) / (SEGMENTS - 1)
  const yForEnergy = (e: number) => pad.top + (1 - (e - 1) / 9) * plotH
  const energyForY = (y: number) => clamp(10 - ((y - pad.top) / Math.max(plotH, 1)) * 9, 1, 10)
  const idxForX = (x: number) => {
    const r = Math.round(((x - pad.left) / Math.max(plotW, 1)) * (SEGMENTS - 1))
    return Math.max(0, Math.min(SEGMENTS - 1, r))
  }

  const hourMarks = React.useMemo(() => Array.from({ length: 25 }, (_, h) => h), [])
  const points = React.useMemo(() => curve.map((e, i) => ({ x: xForIdx(i), y: yForEnergy(Number(e) || 5) })), [curve, dims])

  // Smooth path (Catmull-Rom to cubic Bezier)
  function buildSmoothPath(ps: { x: number; y: number }[], tension = 0.2) {
    if (ps.length === 0) return ''
    if (ps.length < 3) {
      return `M ${ps[0].x} ${ps[0].y} ` + ps.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ')
    }
    const d: string[] = []
    d.push(`M ${ps[0].x} ${ps[0].y}`)
    for (let i = 0; i < ps.length - 1; i++) {
      const p0 = ps[i - 1] || ps[i]
      const p1 = ps[i]
      const p2 = ps[i + 1]
      const p3 = ps[i + 2] || p2
      const cp1x = p1.x + (p2.x - p0.x) * tension / 6
      const cp1y = p1.y + (p2.y - p0.y) * tension / 6
      const cp2x = p2.x - (p3.x - p1.x) * tension / 6
      const cp2y = p2.y - (p3.y - p1.y) * tension / 6
      d.push(`C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`)
    }
    return d.join(' ')
  }
  const smoothPath = React.useMemo(() => buildSmoothPath(points, 0.8), [points])

  // Helper functions for time entry positioning
  const getTimeEntryPosition = (entry: TimeEntryWithCrossDay) => {
    // Convert UTC times to local timezone for proper alignment
    const startDate = new Date(entry.start_at)
    const endDate = entry.end_at ? new Date(entry.end_at) : new Date()
    
    // Get local time components (automatically handles timezone conversion)
    const startMinutes = startDate.getHours() * 60 + startDate.getMinutes()
    const endMinutes = endDate.getHours() * 60 + endDate.getMinutes()
    
    // Note: cross-day entries are already processed by processDayEntries,
    // so start_at and end_at are already clamped to the current day
    
    // Map to energy spectrum segments (20-minute intervals)
    const startSegment = Math.floor(startMinutes / 20)
    // For end segment, if the entry ends exactly on a segment boundary (e.g., 10:00),
    // include the segment that contains the end time, not the next one
    const endSegment = Math.min(SEGMENTS - 1, endMinutes === 0 ? SEGMENTS - 1 : Math.floor((endMinutes - 1) / 20))
    
    return { 
      startSegment, 
      endSegment, 
      startMinutes, 
      endMinutes,
      originalStartDate: startDate,
      originalEndDate: endDate,
      isCrossDaySegment: entry.isCrossDaySegment || false
    }
  }

  // Group time entries by overlapping periods for stacking
  const timeEntryLayers = React.useMemo(() => {
    if (!timeEntries.length) return []
    
    const layers: Array<Array<TimeEntryWithCrossDay>> = []
    
    timeEntries.forEach(entry => {
      const { startMinutes, endMinutes } = getTimeEntryPosition(entry)
      
      // Find a layer where this entry doesn't overlap
      let placedInLayer = false
      for (const layer of layers) {
        const hasOverlap = layer.some(existingEntry => {
          const existingPos = getTimeEntryPosition(existingEntry)
          return !(endMinutes <= existingPos.startMinutes || startMinutes >= existingPos.endMinutes)
        })
        
        if (!hasOverlap) {
          layer.push(entry)
          placedInLayer = true
          break
        }
      }
      
      // If no suitable layer found, create a new one
      if (!placedInLayer) {
        layers.push([entry])
      }
    })
    
    return layers
  }, [timeEntries])

  // Category summary for reference (like DailyTimeModal)
  const categorySummary = React.useMemo(() => {
    const byCat = new Map<string, { id: string; name: string; color: string; minutes: number }>()
    
    timeEntries.forEach((entry) => {
      const key = entry.category_id || 'uncategorized'
      const prev = byCat.get(key)
      const add = Math.max(0, entry.duration_minutes || 0)
      
      if (prev) {
        byCat.set(key, { ...prev, minutes: prev.minutes + add })
      } else {
        byCat.set(key, { 
          id: key, 
          name: entry.category_name || t.ui.uncategorized || 'Uncategorized', 
          color: entry.category_color || '#CBD5E1', 
          minutes: add 
        })
      }
    })
    
    return Array.from(byCat.values()).sort((a, b) => b.minutes - a.minutes)
  }, [timeEntries, t])

  function handlePointerDown(e: React.PointerEvent<SVGRectElement>) {
    const svg = (e.currentTarget as SVGRectElement).ownerSVGElement!
    const pt = svg.createSVGPoint()
    pt.x = e.clientX; pt.y = e.clientY
    const ctm = svg.getScreenCTM()
    if (!ctm) return
    const p = pt.matrixTransform(ctm.inverse())
    const idx = idxForX(p.x)
    if (!canEdit(idx)) return
    dragging.current = idx
    ;(e.currentTarget as any).setPointerCapture?.(e.pointerId)
    // apply once on down
    const val = Math.round(energyForY(p.y))
    setCurve(prev => { const next = prev.slice(); next[idx] = clamp(val); return next })
    setMask(prev => { const next = prev.slice(); next[idx] = true; return next })
  }
  function handlePointerMove(e: React.PointerEvent<SVGRectElement>) {
    if (dragging.current == null) return
    const svg = (e.currentTarget as SVGRectElement).ownerSVGElement!
    const pt = svg.createSVGPoint()
    pt.x = e.clientX; pt.y = e.clientY
    const ctm = svg.getScreenCTM()
    if (!ctm) return
    const p = pt.matrixTransform(ctm.inverse())
    const idx = idxForX(p.x)
    if (!canEdit(idx)) return
    const val = Math.round(energyForY(p.y))
    setCurve(prev => { const next = prev.slice(); next[idx] = clamp(val); return next })
    setMask(prev => { const next = prev.slice(); next[idx] = true; return next })
  }
  function handlePointerUp() { dragging.current = null }

  async function saveAll() {
    try {
      setSaving(true)
      const updated = await energyDaysApi.update(date, { curve, edited_mask: mask, source: 'user_edited' })
      setLastSaved(updated.updated_at ?? new Date().toISOString())
      onSaved?.(updated)
    } catch (e: any) {
      setError(e?.message || t.ui.loadFailed || t.common.error)
    } finally {
      setSaving(false)
    }
  }

  // Floating Tooltip Component for Time Entry Details
  const TimeEntryTooltip = () => {
    if (!hoveredTimeEntry) return null

    const { entry, position } = hoveredTimeEntry
    const { originalStartDate, originalEndDate } = getTimeEntryPosition(entry)
    
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
        className="fixed z-[100] pointer-events-none"
        style={{
          left: `${position.x}px`,
          top: `${position.y - 10}px`,
          transform: 'translate(-50%, -100%)'
        }}
      >
        <div className="bg-gray-900 text-white text-sm rounded-lg shadow-xl px-3 py-2 max-w-xs">
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

  // Time Entry Visualization Component
  const TimeEntriesDisplay = ({ 
    width, 
    height, 
    padLeft, 
    padRight, 
    yOffset,
    isMobile = false 
  }: { 
    width: number; 
    height: number; 
    padLeft: number; 
    padRight: number; 
    yOffset: number;
    isMobile?: boolean;
  }) => {
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
            const { startMinutes, endMinutes } = getTimeEntryPosition(entry)
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

  // Mobile Compact View Component
  const MobileCompactView = () => (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
      <div className="flex items-center justify-end mb-3">
        <button
          onClick={() => setIsMobileModalOpen(true)}
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
          {/* Simple curve preview */}
          <div className="h-20 flex items-end gap-1 overflow-x-auto pb-2">
            {curve.map((eVal, i) => {
              const eNum = Number(eVal) || 5
              const height = Math.max(4, (eNum / 10) * 60)
              const editable = canEdit(i)
              const fill = editable ? energyToColor(eNum) : '#cbd5e1'
              return (
                <div
                  key={i}
                  className="flex-shrink-0 w-2 rounded-t"
                  style={{ 
                    height: `${height}px`,
                    backgroundColor: fill,
                    opacity: editable ? 0.9 : 0.4
                  }}
                />
              )
            })}
          </div>
          <div className="mt-2 flex justify-between text-xs text-gray-500">
            <span>00:00</span>
            <span>12:00</span>
            <span>23:59</span>
          </div>
          {/* Mobile time entries preview */}
          {!loadingTimeEntries && timeEntries.length > 0 && (
            <div className="mt-3 pt-2 border-t border-gray-100">
              <div className="text-xs text-gray-600 mb-2">{timeEntries.length} tasks tracked</div>
              <div className="flex gap-1 overflow-x-auto">
                {timeEntries.slice(0, 8).map((entry, i) => (
                  <div
                    key={i}
                    className="flex-shrink-0 w-4 h-4 rounded cursor-pointer"
                    style={{ 
                      backgroundColor: entry.category_color || '#94a3b8',
                      border: entry.isCrossDaySegment ? `1px dashed ${entry.category_color || '#94a3b8'}` : 'none'
                    }}
                    title={entry.task_title || 'Unnamed Task'}
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
                      if (focusedTimeEntry?.id === entry.id) {
                        setFocusedTimeEntry(null)
                      } else {
                        setFocusedTimeEntry(entry)
                      }
                    }}
                  />
                ))}
                {timeEntries.length > 8 && (
                  <div className="flex-shrink-0 w-4 h-4 rounded bg-gray-300 flex items-center justify-center">
                    <span className="text-xs text-white">+</span>
                  </div>
                )}
              </div>
              {/* Mobile category legend */}
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
      )}
    </div>
  )

  // Full Screen Mobile Modal Component  
  const MobileFullScreenModal = () => {
    if (!isMobileModalOpen) return null

    return (
      <div className="fixed inset-0 z-50 bg-white">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">{date}</h2>
          <button
            onClick={() => setIsMobileModalOpen(false)}
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
                      const eNum = Number(eVal) || 5
                      const x = 60 + (i * 680) / (SEGMENTS - 1)
                      const w = Math.max(6, 680 / SEGMENTS * 0.8)
                      const y = 40 + (1 - (eNum - 1) / 9) * 200
                      const h = 40 + 200 - y
                      const editable = canEdit(i)
                      
                      // Mobile version of focus logic
                      let fill, opacity, stroke, strokeWidth
                      if (focusedTimeEntry) {
                        const { startSegment, endSegment } = getTimeEntryPosition(focusedTimeEntry)
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
                    <path 
                      d={buildSmoothPath(
                        curve.map((e, i) => ({ 
                          x: 60 + (i * 680) / (SEGMENTS - 1), 
                          y: 40 + (1 - (Number(e) || 5 - 1) / 9) * 200 
                        })), 0.8
                      )} 
                      fill="none" 
                      stroke="#111827" 
                      strokeWidth={3} 
                    />

                    {/* Touch interaction overlay */}
                    <rect
                      x={60}
                      y={40}
                      width={680}
                      height={270}
                      fill="transparent"
                      style={{ cursor: 'crosshair' }}
                      onPointerDown={(e) => {
                        const svg = (e.currentTarget as SVGRectElement).ownerSVGElement!
                        const pt = svg.createSVGPoint()
                        pt.x = e.clientX; pt.y = e.clientY
                        const ctm = svg.getScreenCTM()
                        if (!ctm) return
                        const p = pt.matrixTransform(ctm.inverse())
                        const idx = Math.round(((p.x - 60) / 680) * (SEGMENTS - 1))
                        if (!canEdit(idx)) return
                        dragging.current = idx
                        ;(e.currentTarget as any).setPointerCapture?.(e.pointerId)
                        const val = Math.round(10 - ((p.y - 40) / 200) * 9)
                        setCurve(prev => { const next = prev.slice(); next[idx] = clamp(val); return next })
                        setMask(prev => { const next = prev.slice(); next[idx] = true; return next })
                      }}
                      onPointerMove={(e) => {
                        // Handle energy editing
                        if (dragging.current != null) {
                          const svg = (e.currentTarget as SVGRectElement).ownerSVGElement!
                          const pt = svg.createSVGPoint()
                          pt.x = e.clientX; pt.y = e.clientY
                          const ctm = svg.getScreenCTM()
                          if (!ctm) return
                          const p = pt.matrixTransform(ctm.inverse())
                          const idx = Math.round(((p.x - 60) / 680) * (SEGMENTS - 1))
                          if (!canEdit(idx)) return
                          const val = Math.round(10 - ((p.y - 40) / 200) * 9)
                          setCurve(prev => { const next = prev.slice(); next[idx] = clamp(val); return next })
                          setMask(prev => { const next = prev.slice(); next[idx] = true; return next })
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
                      onPointerUp={() => { dragging.current = null }}
                      onPointerLeave={() => setCrosshairPosition(null)}
                    />
                    
                    {/* Time axis for mobile (moved above time entries) */}
                    <text x={400} y={260} textAnchor="middle" fontSize={12} fill="#475569">Time</text>
                    
                    {/* Time entries display in mobile modal */}
                    <TimeEntriesDisplay
                      width={800}
                      height={40}
                      padLeft={60}
                      padRight={60}
                      yOffset={270}
                      isMobile={true}
                    />

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
                {categorySummary.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-600 font-medium mb-3">Time Entry Categories</div>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {categorySummary.map((category) => (
                        <div key={category.id} className="flex items-center gap-1.5 bg-white rounded-full px-3 py-1.5 border border-gray-200">
                          <div 
                            className="w-3 h-3 rounded-full flex-shrink-0" 
                            style={{ backgroundColor: category.color }}
                          />
                          <span className="text-sm text-gray-700 font-medium">{category.name}</span>
                          <span className="text-sm text-gray-500">({formatDuration(category.minutes)})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="text-xs text-gray-600">
                  {t.ui.editableRange}：
                  {getCurrentTimeInTimezone.isFutureDate 
                    ? 'Not editable (future date)' 
                    : isToday 
                      ? `00:00 - ${segmentToTimeLabel(currentIndex+1)}` 
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
            onClick={saveAll} 
            disabled={saving} 
            className="w-full px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 shadow-sm font-medium"
          >
            {saving ? t.ui.saving : t.common.save}
          </button>
        </div>
      </div>
    )
  }

  // Conditional rendering based on mobile state
  if (isMobile) {
    return (
      <>
        <MobileCompactView />
        <MobileFullScreenModal />
        <TimeEntryTooltip />
      </>
    )
  }

  return (
    <div className="w-full max-w-7xl mx-auto bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100">
      {loading ? (
        <div className="h-40 flex items-center justify-center text-gray-500">{t.common.loading}...</div>
      ) : error ? (
        <div className="h-40 flex items-center justify-center text-red-600">{error}</div>
      ) : (
        <div className="w-full">
          <div ref={containerRef} className="w-full rounded-lg border border-gray-100 bg-white p-3 overflow-hidden">
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
              const w = Math.max(2, (plotW / (SEGMENTS - 1)) * 0.9)
              const y = yForEnergy(eNum)
              const h = pad.top + plotH - y
              const editable = canEdit(i)
              
              // Determine visual state based on focus and editability
              let fill, opacity, stroke, strokeWidth
              if (focusedTimeEntry) {
                const { startSegment, endSegment } = getTimeEntryPosition(focusedTimeEntry)
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
          </div>
          <div className="mt-4 space-y-3">
            {/* Category legend for desktop */}
            {!loadingTimeEntries && categorySummary.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-700 font-medium mb-3">Time Entry Categories</div>
                <div className="flex flex-wrap gap-3">
                  {categorySummary.map((category) => (
                    <div key={category.id} className="flex items-center gap-2 bg-white rounded-full px-3 py-2 border border-gray-200 shadow-sm">
                      <div 
                        className="w-3 h-3 rounded-full flex-shrink-0" 
                        style={{ backgroundColor: category.color }}
                      />
                      <span className="text-sm text-gray-700 font-medium whitespace-nowrap">{category.name}</span>
                      <span className="text-sm text-gray-500">({formatDuration(category.minutes)})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-xs text-gray-600">
                  {t.ui.editableRange}：
                  {getCurrentTimeInTimezone.isFutureDate 
                    ? 'Not editable (future date)' 
                    : isToday 
                      ? `00:00 - ${segmentToTimeLabel(currentIndex+1)}` 
                      : t.ui.allDay
                  }
                </div>
                {focusedTimeEntry && (
                  <div className="flex items-center gap-2 px-2 py-1 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-1.5">
                      <div 
                        className="w-2 h-2 rounded-full" 
                        style={{ backgroundColor: focusedTimeEntry.category_color || '#94a3b8' }}
                      />
                      <span className="text-xs text-blue-700 font-medium">
                        Focused: {focusedTimeEntry.task_title || 'Unnamed Task'}
                      </span>
                    </div>
                    <button
                      onClick={() => setFocusedTimeEntry(null)}
                      className="text-xs text-blue-600 hover:text-blue-800 underline"
                    >
                      Exit
                    </button>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3">
                {lastSaved && (
                  <div className="text-xs text-gray-500">
                    {t.ui.lastSaved}: {new Date(lastSaved).toLocaleString()}
                  </div>
                )}
                <button onClick={saveAll} disabled={saving} className="px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 shadow-sm">
                  {saving ? t.ui.saving : t.common.save}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <TimeEntryTooltip />
    </div>
  )
}


