'use client'

import React from 'react'
import useSWR from 'swr'
import { X, ChevronLeft, ChevronRight, Clock, List, Calendar as CalendarIcon, Minus, Plus, ArrowLeft, Play, Square } from 'lucide-react'
import { timelineItemsApi, TimeEntry } from '../../../lib/api'
import { useTranslation, type TranslationKeys } from '../../../lib/i18n'
import { 
  splitCrossDayEntries, 
  calculateTotalMinutes, 
  getCrossDayBorderClass,
  type TimeEntryWithCrossDay 
} from '../../utils/crossDayUtils'

// Using the standard TimeEntry interface from API

interface ActivityTimeModalProps {
  isOpen: boolean
  onClose: () => void
  activityId: string
  activityTitle?: string
}

// Custom hook to detect mobile device
function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(false)
  
  React.useEffect(() => {
    const checkDevice = () => {
      setIsMobile(window.innerWidth < 768) // md breakpoint
    }
    
    checkDevice()
    window.addEventListener('resize', checkDevice)
    return () => window.removeEventListener('resize', checkDevice)
  }, [])
  
  return isMobile
}

// Using the same API pattern as TaskTimeModal

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)
}
function formatISO(d: Date) {
  return new Date(d).toISOString()
}
function getDaysInMonth(d: Date) {
  const start = startOfMonth(d)
  const end = endOfMonth(d)
  const days: Date[] = []
  for (let dt = new Date(start); dt <= end; dt = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate() + 1)) {
    days.push(new Date(dt))
  }
  return days
}
function ymd(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function ActivityTimeModal({ isOpen, onClose, activityId, activityTitle }: ActivityTimeModalProps) {
  const { t } = useTranslation()
  const isMobile = useIsMobile()
  const [month, setMonth] = React.useState<Date>(() => startOfMonth(new Date()))
  const [selectedDay, setSelectedDay] = React.useState<string | null>(null)
  const [viewMode, setViewMode] = React.useState<'timeline' | 'list'>('timeline')
  const [minuteHeight, setMinuteHeight] = React.useState<number>(0.75) // px per minute
  const [mobileView, setMobileView] = React.useState<'calendar' | 'day'>('calendar') // Mobile-specific state

  React.useEffect(() => {
    if (isOpen) {
      setMonth(startOfMonth(new Date()))
      setSelectedDay(null)
      setMobileView('calendar')
    }
  }, [isOpen])

  const from = formatISO(startOfMonth(month))
  const to = formatISO(endOfMonth(month))
  const { data, isLoading, error, mutate } = useSWR(
    isOpen ? ['timeline-item-time-entries', activityId, from, to] : null, 
    () => timelineItemsApi.listTimeEntries(activityId, { from, to, limit: 500, offset: 0 })
  )

  const entries: any[] = data?.entries || []
  const grouped = React.useMemo(() => {
    // Convert timeline item entries to TimeEntry format for splitCrossDayEntries
    const convertedEntries = entries.map((entry: any) => ({
      id: entry.id,
      task_id: entry.timeline_item_id, // Use timeline_item_id as task_id
      start_at: entry.start_at,
      end_at: entry.end_at,
      duration_minutes: entry.duration_minutes,
      note: entry.note,
      source: entry.source,
      task_title: entry.timeline_item_title || activityTitle, // Map timeline_item_title to task_title
      category_name: entry.category_name,
      category_color: entry.category_color
    }))
    return splitCrossDayEntries(convertedEntries)
  }, [entries, activityTitle])

  const days = getDaysInMonth(month)
  const firstWeekday = startOfMonth(month).getDay() // 0-6

  const close = () => { onClose() }
  const prevMonth = () => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))
  const nextMonth = () => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))

  const handleDaySelect = (dayKey: string) => {
    setSelectedDay(dayKey)
    if (isMobile) {
      setMobileView('day')
    }
  }

  const handleBackToCalendar = () => {
    setMobileView('calendar')
    setSelectedDay(null)
  }

  if (!isOpen) return null

  // Mobile layout
  if (isMobile) {
    return (
      <div className="fixed inset-0 z-50">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/40" onClick={close} />
        {/* Mobile Modal */}
        <div className="absolute inset-0 bg-white flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
            <div className="flex items-center gap-3">
              {mobileView === 'day' && (
                <button onClick={handleBackToCalendar} className="p-2 text-gray-500 hover:text-gray-700 rounded-md">
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              <Clock className="w-5 h-5 text-emerald-600" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {mobileView === 'calendar' ? t.activity.activityTime : selectedDay}
                </h3>
                <p className="text-xs text-gray-500">
                  {mobileView === 'calendar' ? activityTitle || '' : t.activity.activityTimeDesc}
                </p>
              </div>
            </div>
            <button onClick={close} className="p-2 text-gray-500 hover:text-gray-700 rounded-md">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mobile Content */}
          <div className="flex-1 overflow-hidden">
            {mobileView === 'calendar' ? (
              <MobileCalendarView
                month={month}
                onPrevMonth={prevMonth}
                onNextMonth={nextMonth}
                days={days}
                firstWeekday={firstWeekday}
                grouped={grouped}
                onDaySelect={handleDaySelect}
                selectedDay={selectedDay}
              />
            ) : (
              <div className="h-full overflow-auto">
                <DayTimeline
                  selectedDay={selectedDay}
                  isLoading={isLoading}
                  error={error}
                  entries={grouped}
                  onClearDay={() => setSelectedDay(null)}
                  mode={viewMode}
                  onModeChange={setViewMode}
                  minuteHeight={minuteHeight}
                  onZoomIn={() => setMinuteHeight((v) => Math.min(1.2, +(v + 0.1).toFixed(2)))}
                  onZoomOut={() => setMinuteHeight((v) => Math.max(0.4, +(v - 0.1).toFixed(2)))}
                  className=""
                  refreshEntries={() => mutate()}
                  activityTitle={activityTitle}
                  isMobile={true}
                  activityId={activityId}
                  t={t}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Desktop layout
  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={close} />
      {/* Modal */}
      <div className="absolute inset-x-0 top-8 mx-auto max-w-6xl bg-white rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-emerald-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{t.activity.activityTime} · {activityTitle || ''}</h3>
              <p className="text-xs text-gray-500">{t.activity.activityTimeDesc}</p>
            </div>
          </div>
          <button onClick={close} className="p-2 text-gray-500 hover:text-gray-700 rounded-md">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 md:grid-cols-10 gap-0">
          {/* Left: Calendar (smaller) */}
          <div className="md:col-span-5 p-3 border-r border-gray-200">
            {/* Month Navigator */}
            <div className="flex items-center justify-between mb-2">
              <button onClick={prevMonth} className="p-2 rounded-md hover:bg-gray-100"><ChevronLeft className="w-4 h-4" /></button>
              <div className="text-sm font-medium text-gray-700">
                {month.getFullYear()} Year {month.getMonth() + 1} Month
              </div>
              <button onClick={nextMonth} className="p-2 rounded-md hover:bg-gray-100"><ChevronRight className="w-4 h-4" /></button>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500 mb-1">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((w) => (
                <div key={w} className="py-1">{w}</div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {/* Leading blanks */}
              {Array.from({ length: firstWeekday }).map((_, i) => (
                <div key={`blank-${i}`} className="h-14 bg-transparent" />
              ))}
              {days.map((d) => {
                const key = ymd(d)
                const list = grouped.get(key) || []
                const minutes = list.reduce((sum, e) => sum + (e.duration_minutes || 0), 0)
                const isSelected = selectedDay === key
                return (
                  <button
                    key={key}
                    onClick={() => handleDaySelect(key)}
                    className={`h-14 rounded-md border text-left p-1 transition-colors ${
                      isSelected ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-medium text-gray-700">{d.getDate()}</span>
                      {minutes > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">{minutes}m</span>
                      )}
                    </div>
                    {/* bars */}
                    <div className="mt-1.5 space-y-1 overflow-hidden">
                      {list.slice(0, 3).map((e) => {
                        const dur = e.duration_minutes || 0
                        const width = Math.max(10, Math.min(100, Math.round((dur / 120) * 100)))
                        return (
                          <div key={e.id} className="h-1.5 rounded bg-emerald-200" style={{ width: `${width}%` }} />
                        )
                      })}
                      {list.length > 3 && (
                        <div className="text-[10px] text-gray-400">+{list.length - 3}</div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Right: Day details */}
          <DayTimeline
            selectedDay={selectedDay}
            isLoading={isLoading}
            error={error}
            entries={grouped}
            onClearDay={() => setSelectedDay(null)}
            mode={viewMode}
            onModeChange={setViewMode}
            minuteHeight={minuteHeight}
            onZoomIn={() => setMinuteHeight((v) => Math.min(1.2, +(v + 0.1).toFixed(2)))}
            onZoomOut={() => setMinuteHeight((v) => Math.max(0.4, +(v - 0.1).toFixed(2)))}
            className="md:col-span-5"
            refreshEntries={() => mutate()}
            activityTitle={activityTitle}
            isMobile={false}
            activityId={activityId}
            t={t}
          />
        </div>
      </div>
    </div>
  )
}

// Mobile Calendar View Component
function MobileCalendarView({
  month,
  onPrevMonth,
  onNextMonth,
  days,
  firstWeekday,
  grouped,
  onDaySelect,
  selectedDay
}: {
  month: Date
  onPrevMonth: () => void
  onNextMonth: () => void
  days: Date[]
  firstWeekday: number
  grouped: Map<string, any[]>
  onDaySelect: (day: string) => void
  selectedDay: string | null
}) {
  return (
    <div className="flex-1 p-4 overflow-auto">
      {/* Month Navigator */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={onPrevMonth} className="p-3 rounded-md hover:bg-gray-100">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="text-lg font-medium text-gray-700">
          {month.getFullYear()} Year {month.getMonth() + 1} Month
        </div>
        <button onClick={onNextMonth} className="p-3 rounded-md hover:bg-gray-100">
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 text-center text-sm text-gray-500 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((w) => (
          <div key={w} className="py-2">{w}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Leading blanks */}
        {Array.from({ length: firstWeekday }).map((_, i) => (
          <div key={`blank-${i}`} className="h-16 bg-transparent" />
        ))}
        {days.map((d) => {
          const key = ymd(d)
          const list = grouped.get(key) || []
          const minutes = list.reduce((sum, e) => sum + (e.duration_minutes || 0), 0)
          const isSelected = selectedDay === key
          const hasEntries = list.length > 0
          
          return (
            <button
              key={key}
              onClick={() => onDaySelect(key)}
              className={`h-16 rounded-lg border text-left p-2 transition-colors ${
                isSelected 
                  ? 'border-emerald-500 bg-emerald-50' 
                  : hasEntries 
                    ? 'border-emerald-200 bg-emerald-25 hover:bg-emerald-50'
                    : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-gray-700">{d.getDate()}</span>
                {minutes > 0 && (
                  <span className="px-2 py-1 rounded text-xs bg-emerald-100 text-emerald-700">
                    {minutes}m
                  </span>
                )}
              </div>
              {/* Visual indicators */}
              <div className="mt-1 space-y-1 overflow-hidden">
                {list.slice(0, 2).map((e) => {
                  const dur = e.duration_minutes || 0
                  const width = Math.max(20, Math.min(100, Math.round((dur / 120) * 100)))
                  return (
                    <div key={e.id} className="h-1 rounded bg-emerald-300" style={{ width: `${width}%` }} />
                  )
                })}
                {list.length > 2 && (
                  <div className="text-xs text-gray-400">+{list.length - 2}</div>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// Day timeline component
function DayTimeline({
  selectedDay,
  isLoading,
  error,
  entries,
  onClearDay,
  mode,
  onModeChange,
  minuteHeight,
  onZoomIn,
  onZoomOut,
  className,
  refreshEntries,
  activityTitle,
  isMobile = false,
  activityId,
  t,
}: {
  selectedDay: string | null
  isLoading: boolean
  error: any
  entries: Map<string, any[]>
  onClearDay: () => void
  mode: 'timeline' | 'list'
  onModeChange: (m: 'timeline' | 'list') => void
  minuteHeight: number
  onZoomIn: () => void
  onZoomOut: () => void
  className?: string
  refreshEntries: () => void
  activityTitle?: string
  isMobile?: boolean
  activityId: string
  t: TranslationKeys
}) {
  const containerRef = React.useRef<HTMLDivElement | null>(null)
  const [hover, setHover] = React.useState<{ x: number; y: number } | null>(null)

  const dayEvents = React.useMemo(() => {
    if (!selectedDay) return [] as Array<{
      id: string
      originalId?: string
      start: Date
      end: Date
      top: number
      height: number
      lane: number
      laneCount: number
      label: string
      note?: string | null
      activityTitle?: string
      isCrossDaySegment?: boolean
    }>
    const list = entries.get(selectedDay) || []

    const normalized = list.map((e) => {
      const start = new Date(e.start_at)
      const end = e.end_at ? new Date(e.end_at) : new Date()
      const top = ((start.getHours() * 60 + start.getMinutes()) * minuteHeight)
      const minutes = Math.max(1, e.duration_minutes || 1)
      const height = Math.max(6, minutes * minuteHeight)
      const label = `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} — ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
      return { 
        id: e.id, 
        originalId: (e as any).originalId,
        start, 
        end, 
        top, 
        height, 
        lane: 0, 
        laneCount: 1, 
        label, 
        note: e.note, 
        activityTitle: e.task_title || activityTitle,
        isCrossDaySegment: (e as any).isCrossDaySegment || false
      }
    })
    
    // Sort by start
    normalized.sort((a, b) => a.start.getTime() - b.start.getTime())
    // Simple lane assignment for overlaps
    const lanes: Array<{ end: Date }> = []
    normalized.forEach((ev) => {
      let placed = false
      for (let i = 0; i < lanes.length; i++) {
        if (lanes[i].end <= ev.start) {
          ev.lane = i
          lanes[i].end = ev.end
          placed = true
          break
        }
      }
      if (!placed) {
        ev.lane = lanes.length
        lanes.push({ end: ev.end })
      }
    })
    const laneCount = Math.max(1, lanes.length)
    normalized.forEach((ev) => (ev.laneCount = laneCount))
    return normalized
  }, [selectedDay, entries, minuteHeight, activityTitle])

  React.useEffect(() => {
    if (!containerRef.current || dayEvents.length === 0) return
    const first = Math.max(0, dayEvents[0].top - 40)
    containerRef.current.scrollTop = first
  }, [selectedDay, dayEvents, minuteHeight])

  return (
    <div className={`${isMobile ? 'p-4' : 'p-4'} ${className || ''}`}>
      {/* Header controls */}
      <div className={`flex items-center justify-between mb-3 ${isMobile ? 'flex-col gap-3' : ''}`}>
        <div className={`text-sm font-medium text-gray-700 ${isMobile ? 'text-center' : ''}`}>
          {selectedDay || t.ui.pleaseSelectDate}
        </div>
        <div className={`flex items-center gap-2 ${isMobile ? 'w-full justify-center' : ''}`}>
          {/* View toggle */}
          <div className="flex items-center rounded-md border border-gray-200 overflow-hidden">
            <button
              onClick={() => onModeChange('timeline')}
              className={`${isMobile ? 'px-3 py-2' : 'px-2 py-1'} text-xs flex items-center gap-1 ${mode === 'timeline' ? 'bg-emerald-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <CalendarIcon className={`${isMobile ? 'w-4 h-4' : 'w-3.5 h-3.5'}`} /> {t.ui.timelineView}
            </button>
            <button
              onClick={() => onModeChange('list')}
              className={`${isMobile ? 'px-3 py-2' : 'px-2 py-1'} text-xs flex items-center gap-1 ${mode === 'list' ? 'bg-emerald-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <List className={`${isMobile ? 'w-4 h-4' : 'w-3.5 h-3.5'}`} /> {t.ui.timeListView}
            </button>
          </div>
          {/* Zoom controls for timeline */}
          {mode === 'timeline' && (
            <div className="flex items-center rounded-md border border-gray-200 overflow-hidden ml-1">
              <button 
                onClick={onZoomOut} 
                className={`${isMobile ? 'px-3 py-2' : 'px-2 py-1'} text-xs text-gray-600 hover:bg-gray-50`}
              >
                <Minus className={`${isMobile ? 'w-4 h-4' : 'w-3.5 h-3.5'}`} />
              </button>
              <button 
                onClick={onZoomIn} 
                className={`${isMobile ? 'px-3 py-2' : 'px-2 py-1'} text-xs text-gray-600 hover:bg-gray-50`}
              >
                <Plus className={`${isMobile ? 'w-4 h-4' : 'w-3.5 h-3.5'}`} />
              </button>
            </div>
          )}
        </div>
      </div>

      {isLoading && <div className="text-sm text-gray-500">{t.common.loading}...</div>}
      {error && <div className="text-sm text-red-600">{t.ui.loadFailed}</div>}
      {!isLoading && !error && (!selectedDay || dayEvents.length === 0) && (
        <div className="text-sm text-gray-400">{t.ui.noTimeSegments}</div>
      )}

      {/* Timeline view */}
      {selectedDay && mode === 'timeline' && (
        <div
          ref={containerRef}
          className={`relative border border-gray-200 rounded-md overflow-auto bg-white ${
            isMobile ? 'h-[calc(100vh-200px)]' : 'h-[36rem]'
          }`}
          onMouseMove={(e) => {
            if (!containerRef.current) return
            const rect = containerRef.current.getBoundingClientRect()
            const y = e.clientY - rect.top + containerRef.current.scrollTop
            const x = e.clientX - rect.left
            const total = 24 * 60 * minuteHeight
            const clampedY = Math.max(0, Math.min(total, y))
            setHover({ x, y: clampedY })
          }}
          onMouseLeave={() => setHover(null)}
        >
          {/* Hour grid */}
          <div className="absolute left-0 top-0 w-full pl-8" style={{ height: `${24 * 60 * minuteHeight}px` }}>
            {Array.from({ length: 25 }).map((_, i) => (
              <div key={i} className="absolute left-0 w-full border-t border-gray-100" style={{ top: `${i * 60 * minuteHeight}px` }}>
              </div>
            ))}
            {/* Hour labels */}
            {Array.from({ length: 25 }).map((_, i) => (
              <div key={`lbl-${i}`} className="absolute left-0 -translate-y-1/2 text-[10px] text-gray-400 select-none" style={{ top: `${i * 60 * minuteHeight}px` }}>
                {String(i).padStart(2, '0')}:00
              </div>
            ))}
          </div>
          
          {/* Event blocks */}
          {dayEvents.map((ev) => {
            const width = 100 / ev.laneCount
            const left = ev.lane * width
            return (
              <div
                key={ev.id}
                className={`absolute border text-emerald-900 rounded-md px-2 py-1 shadow-sm overflow-hidden bg-emerald-100 border-emerald-300 ${getCrossDayBorderClass(ev.isCrossDaySegment || false)}`}
                style={{
                  top: `${ev.top}px`,
                  left: `calc(${left}% + 8px)`,
                  width: `calc(${width}% - 8px)`,
                  height: `${ev.height}px`,
                }}
                title={`${ev.activityTitle || activityTitle || 'Activity'} - ${ev.label}${ev.isCrossDaySegment ? ` (${t.ui?.crossDaySegment || 'Cross-day Task Segment'})` : ''}`}
              >
                {/* Activity title */}
                {ev.activityTitle && (
                  <div className="text-[11px] font-semibold truncate text-emerald-800 mb-1">
                    {ev.activityTitle}
                  </div>
                )}
                {/* Time label */}
                <div className="text-[10px] font-medium truncate text-emerald-700">
                  {ev.label}
                </div>
                {/* Note */}
                {ev.note && (
                  <div className="text-[9px] truncate mt-0.5 text-emerald-600">
                    {ev.note}
                  </div>
                )}
              </div>
            )
          })}
          
          {/* Mouse time indicator */}
          {hover && (
            <>
              <div
                className="absolute left-0 right-0 h-px bg-emerald-400/70 pointer-events-none"
                style={{ top: `${hover.y}px` }}
              />
              <div
                className="absolute -translate-y-1/2 -translate-x-full px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[10px] pointer-events-none shadow"
                style={{ top: `${hover.y}px`, left: 0 }}
              >
                {(() => {
                  const minutes = Math.round(hover.y / minuteHeight)
                  const h = Math.floor(minutes / 60)
                  const m = minutes % 60
                  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
                })()}
              </div>
            </>
          )}
        </div>
      )}

      {/* List view */}
      {selectedDay && mode === 'list' && (
        <div className={`space-y-2 overflow-auto pr-1 ${
          isMobile ? 'max-h-[calc(100vh-200px)]' : 'max-h-[32rem]'
        }`}>
          <CreateActivityItem activityId={activityId} dateKey={selectedDay} onCreated={refreshEntries} t={t} />
          {dayEvents.map((ev) => (
            <ActivityListItem key={ev.id} entryId={ev.originalId || ev.id} label={ev.label} note={ev.note} onChanged={refreshEntries} t={t} />
          ))}
        </div>
      )}
    </div>
  )
}

function ActivityListItem({ entryId, label, note, onChanged, t }: { entryId: string; label: string; note?: string | null; onChanged: () => void; t: TranslationKeys }) {
  const [busy, setBusy] = React.useState(false)
  const [editing, setEditing] = React.useState(false)
  const [start, setStart] = React.useState<string>('')
  const [end, setEnd] = React.useState<string>('')
  const [memo, setMemo] = React.useState<string>(note || '')

  const onDelete = async () => {
    if (busy) return
    setBusy(true)
    try {
      await timelineItemsApi.removeTimeEntry(entryId)
      onChanged()
    } finally {
      setBusy(false)
    }
  }
  
  const onSave = async () => {
    if (busy) return
    setBusy(true)
    try {
      const payload: any = {}
      if (start) payload.start_at = new Date(start).toISOString()
      if (end) payload.end_at = new Date(end).toISOString()
      if (memo !== note) payload.note = memo
      if (Object.keys(payload).length === 0) { setEditing(false); setBusy(false); return }
      await timelineItemsApi.updateTimeEntry(entryId, payload)
      setEditing(false)
      onChanged()
    } finally {
      setBusy(false)
    }
  }
  
  return (
    <div className="p-2 border border-gray-200 rounded-md">
      <div className="flex items-center justify-between text-sm text-gray-700">
        <span>{label}</span>
        <div className="flex items-center gap-2">
          {!editing && (
            <button onClick={() => setEditing(true)} className="px-2 py-1 text-xs rounded-md border text-gray-700 hover:bg-gray-50">{t.common.edit}</button>
          )}
          <button onClick={onDelete} disabled={busy} className="px-2 py-1 text-xs rounded-md border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed">{t.common.delete}</button>
        </div>
      </div>
      {!editing ? (
        note ? <div className="mt-1 text-xs text-gray-500">{note}</div> : null
      ) : (
        <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
          <input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} className="px-2 py-1 text-xs border rounded" placeholder="Start time" />
          <input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} className="px-2 py-1 text-xs border rounded" placeholder="End time" />
          <div className="flex items-center gap-2">
            <button onClick={onSave} disabled={busy} className="px-2 py-1 text-xs rounded-md border bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50">{t.common.save}</button>
            <button onClick={() => { setEditing(false); setStart(''); setEnd(''); setMemo(note || '') }} className="px-2 py-1 text-xs rounded-md border text-gray-700 hover:bg-gray-50">{t.common.cancel}</button>
          </div>
          <textarea value={memo} onChange={(e) => setMemo(e.target.value)} rows={2} className="sm:col-span-3 px-2 py-1 text-xs border rounded" placeholder={t.ui.note} />
        </div>
      )}
    </div>
  )
}

function CreateActivityItem({ activityId, dateKey, onCreated, t }: { activityId: string; dateKey: string; onCreated: () => void; t: TranslationKeys }) {
  const [busy, setBusy] = React.useState(false)
  const [open, setOpen] = React.useState(false)
  const [start, setStart] = React.useState<string>('')
  const [end, setEnd] = React.useState<string>('')
  const [memo, setMemo] = React.useState<string>('')

  const onSave = async () => {
    if (busy || !activityId) return
    setBusy(true)
    try {
      if (!start) return
      const s = new Date(start).toISOString()
      const payload: any = { start_at: s }
      if (end) payload.end_at = new Date(end).toISOString()
      if (memo) payload.note = memo
      await timelineItemsApi.createTimeEntry(activityId, payload)
      setOpen(false)
      setStart(''); setEnd(''); setMemo('')
      onCreated()
    } finally {
      setBusy(false)
    }
  }

  const datePrefix = dateKey ? `${dateKey}T` : ''

  return (
    <div className="p-2 border border-dashed border-gray-300 rounded-md">
      {!open ? (
        <button onClick={() => setOpen(true)} className="px-2 py-1 text-xs rounded-md border text-gray-700 hover:bg-gray-50">+ {t.ui.addTimeEntry}</button>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} className="px-2 py-1 text-xs border rounded" placeholder={t.ui.startTime} min={`${datePrefix}00:00`} max={`${datePrefix}23:59`} />
          <input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} className="px-2 py-1 text-xs border rounded" placeholder={t.ui.endTime} min={`${datePrefix}00:00`} max={`${datePrefix}23:59`} />
          <div className="flex items-center gap-2">
            <button onClick={onSave} disabled={busy} className="px-2 py-1 text-xs rounded-md border bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50">{t.common.save}</button>
            <button onClick={() => { setOpen(false); setStart(''); setEnd(''); setMemo('') }} className="px-2 py-1 text-xs rounded-md border text-gray-700 hover:bg-gray-50">{t.common.cancel}</button>
          </div>
          <textarea value={memo} onChange={(e) => setMemo(e.target.value)} rows={2} className="sm:col-span-3 px-2 py-1 text-xs border rounded" placeholder={t.ui.note} />
        </div>
      )}
    </div>
  )
}
