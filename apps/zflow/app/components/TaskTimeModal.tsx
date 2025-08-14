'use client'

import React from 'react'
import useSWR from 'swr'
import { X, ChevronLeft, ChevronRight, Clock, List, Calendar as CalendarIcon, Minus, Plus } from 'lucide-react'
import { timeTrackingApi, TimeEntry } from '../../lib/api'
import { useTranslation } from '../../lib/i18n'

interface TaskTimeModalProps {
  isOpen: boolean
  onClose: () => void
  taskId: string
  taskTitle?: string
}

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

function minutesOf(entries: TimeEntry[]) {
  return entries.reduce((sum, e) => sum + (e.duration_minutes || 0), 0)
}

export default function TaskTimeModal({ isOpen, onClose, taskId, taskTitle }: TaskTimeModalProps) {
  const { t } = useTranslation()
  const [month, setMonth] = React.useState<Date>(() => startOfMonth(new Date()))
  const [selectedDay, setSelectedDay] = React.useState<string | null>(null)
  const [viewMode, setViewMode] = React.useState<'timeline' | 'list'>('timeline')
  const [minuteHeight, setMinuteHeight] = React.useState<number>(0.75) // px per minute

  React.useEffect(() => {
    if (isOpen) {
      setMonth(startOfMonth(new Date()))
      setSelectedDay(null)
    }
  }, [isOpen])

  const from = formatISO(startOfMonth(month))
  const to = formatISO(endOfMonth(month))
  const { data, isLoading, error, mutate } = useSWR(isOpen ? ['time-entries', taskId, from, to] : null, () => timeTrackingApi.list(taskId, { from, to, limit: 500, offset: 0 }))

  const entries: TimeEntry[] = data?.entries || []
  const grouped = React.useMemo(() => {
    const map = new Map<string, TimeEntry[]>()
    for (const e of entries) {
      const dayKey = ymd(new Date(e.start_at))
      const arr = map.get(dayKey) || []
      arr.push(e)
      map.set(dayKey, arr)
    }
    // sort entries per day by start_at asc
    map.forEach((arr, k) => {
      arr.sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
      map.set(k, arr)
    })
    return map
  }, [entries])

  const days = getDaysInMonth(month)
  const firstWeekday = startOfMonth(month).getDay() // 0-6

  const close = () => { onClose() }
  const prevMonth = () => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))
  const nextMonth = () => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={close} />
      {/* Modal */}
      <div className="absolute inset-x-0 top-8 mx-auto max-w-6xl bg-white rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-primary-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{t.ui.focusTime} · {taskTitle || ''}</h3>
              <p className="text-xs text-gray-500">{t.ui.viewTimeSegmentsByDay}</p>
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
                {month.getFullYear()} {t.ui.year} {month.getMonth() + 1} {t.ui.month}
              </div>
              <button onClick={nextMonth} className="p-2 rounded-md hover:bg-gray-100"><ChevronRight className="w-4 h-4" /></button>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500 mb-1">
              {t.ui.weekdays.map((w) => (
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
                const minutes = minutesOf(list)
                const isSelected = selectedDay === key
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedDay(key)}
                    className={`h-14 rounded-md border text-left p-1 transition-colors ${
                      isSelected ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-medium text-gray-700">{d.getDate()}</span>
                      {minutes > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-primary-100 text-primary-700">{minutes}m</span>
                      )}
                    </div>
                    {/* bars */}
                    <div className="mt-1.5 space-y-1 overflow-hidden">
                      {list.slice(0, 3).map((e) => {
                        const dur = e.duration_minutes || 0
                        const width = Math.max(10, Math.min(100, Math.round((dur / 120) * 100))) // scale baseline: 2h => 100%
                        return (
                          <div key={e.id} className="h-1.5 rounded bg-primary-200" style={{ width: `${width}%` }} />
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

          {/* Right: Day details - Google Calendar style timeline / List toggle */}
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
          />
        </div>
      </div>
    </div>
  )
}

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
}: {
  selectedDay: string | null
  isLoading: boolean
  error: any
  entries: Map<string, TimeEntry[]>
  onClearDay: () => void
  mode: 'timeline' | 'list'
  onModeChange: (m: 'timeline' | 'list') => void
  minuteHeight: number
  onZoomIn: () => void
  onZoomOut: () => void
  className?: string
  refreshEntries: () => void
}) {
  const { t } = useTranslation()
  const containerRef = React.useRef<HTMLDivElement | null>(null)
  const [hover, setHover] = React.useState<{ x: number; y: number } | null>(null)

  const dayEvents = React.useMemo(() => {
    if (!selectedDay) return [] as Array<{
      id: string
      start: Date
      end: Date
      top: number
      height: number
      lane: number
      laneCount: number
      label: string
      note?: string | null
    }>
    const list = entries.get(selectedDay) || []
    // Normalize to local day bounds
    const [y, m, d] = selectedDay.split('-').map((v) => parseInt(v, 10))
    const dayStart = new Date(y, m - 1, d, 0, 0, 0, 0)
    const dayEnd = new Date(y, m - 1, d, 23, 59, 59, 999)

    const normalized = list.map((e) => {
      const start = new Date(e.start_at)
      const end = e.end_at ? new Date(e.end_at) : new Date()
      const s = start < dayStart ? dayStart : start
      const ee = end > dayEnd ? dayEnd : end
      const top = ((s.getHours() * 60 + s.getMinutes()) * minuteHeight)
      const minutes = Math.max(1, Math.round((ee.getTime() - s.getTime()) / 60000))
      const height = Math.max(6, minutes * minuteHeight)
      const label = `${s.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} — ${ee.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
      return { id: e.id, start: s, end: ee, top, height, lane: 0, laneCount: 1, label, note: e.note }
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
  }, [selectedDay, entries, minuteHeight])

  React.useEffect(() => {
    if (!containerRef.current || dayEvents.length === 0) return
    const first = Math.max(0, dayEvents[0].top - 40)
    containerRef.current.scrollTop = first
  }, [selectedDay, dayEvents, minuteHeight])

  return (
    <div className={`p-4 ${className || ''}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-medium text-gray-700">{selectedDay || t.ui.pleaseSelectDate}</div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center rounded-md border border-gray-200 overflow-hidden">
            <button
              onClick={() => onModeChange('timeline')}
              className={`px-2 py-1 text-xs flex items-center gap-1 ${mode === 'timeline' ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
              title={t.ui.timelineView}
            >
              <CalendarIcon className="w-3.5 h-3.5" /> {t.ui.calendar}
            </button>
            <button
              onClick={() => onModeChange('list')}
              className={`px-2 py-1 text-xs flex items-center gap-1 ${mode === 'list' ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
              title={t.ui.timeListView}
            >
              <List className="w-3.5 h-3.5" /> {t.ui.listView}
            </button>
          </div>
          {/* Zoom controls for timeline */}
          {mode === 'timeline' && (
            <div className="flex items-center rounded-md border border-gray-200 overflow-hidden ml-1">
              <button onClick={onZoomOut} className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-50" title={t.ui.zoomOut}>
                <Minus className="w-3.5 h-3.5" />
              </button>
              <button onClick={onZoomIn} className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-50" title={t.ui.zoomIn}>
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
      {isLoading && <div className="text-sm text-gray-500">{t.common.loading}...</div>}
      {error && <div className="text-sm text-red-600">{t.messages.failedToLoadTasks}</div>}
      {!isLoading && !error && (!selectedDay || dayEvents.length === 0) && (
        <div className="text-sm text-gray-400">{t.ui.noTimeSegments}</div>
      )}
      {/* Content */}
      {selectedDay && mode === 'timeline' && (
        <div
          ref={containerRef}
          className="relative border border-gray-200 rounded-md h-[36rem] overflow-auto bg-white"
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
                className="absolute bg-primary-100 border border-primary-300 text-primary-900 rounded-md px-2 py-1 shadow-sm overflow-hidden"
                style={{
                  top: `${ev.top}px`,
                  left: `calc(${left}% + 8px)`,
                  width: `calc(${width}% - 8px)`,
                  height: `${ev.height}px`,
                }}
                title={ev.label}
              >
                <div className="text-[11px] font-medium truncate">{ev.label}</div>
                {ev.note && <div className="text-[10px] text-primary-700 truncate">{ev.note}</div>}
              </div>
            )
          })}
          {/* Mouse time indicator */}
          {hover && (
            <>
              <div
                className="absolute left-0 right-0 h-px bg-primary-400/70 pointer-events-none"
                style={{ top: `${hover.y}px` }}
              />
              <div
                className="absolute -translate-y-1/2 -translate-x-full px-1.5 py-0.5 rounded bg-primary-600 text-white text-[10px] pointer-events-none shadow"
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

      {selectedDay && mode === 'list' && (
        <div className="space-y-2 max-h-[32rem] overflow-auto pr-1">
          <CreateItem taskId={''} dateKey={selectedDay} onCreated={refreshEntries} />
          {dayEvents.map((ev) => (
            <ListItem key={ev.id} entryId={ev.id} label={ev.label} note={ev.note} onChanged={refreshEntries} />
          ))}
        </div>
      )}
    </div>
  )
}

function ListItem({ entryId, label, note, onChanged }: { entryId: string; label: string; note?: string | null; onChanged: () => void }) {
  const { t } = useTranslation()
  const [busy, setBusy] = React.useState(false)
  const [editing, setEditing] = React.useState(false)
  const [start, setStart] = React.useState<string>('')
  const [end, setEnd] = React.useState<string>('')
  const [memo, setMemo] = React.useState<string>(note || '')

  const onDelete = async () => {
    if (busy) return
    setBusy(true)
    try {
      await timeTrackingApi.remove(entryId)
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
      await timeTrackingApi.update(entryId, payload)
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
          <input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} className="px-2 py-1 text-xs border rounded" placeholder={t.ui.startTime} />
          <input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} className="px-2 py-1 text-xs border rounded" placeholder={t.ui.endTime} />
          <div className="flex items-center gap-2">
            <button onClick={onSave} disabled={busy} className="px-2 py-1 text-xs rounded-md border bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50">{t.common.save}</button>
            <button onClick={() => { setEditing(false); setStart(''); setEnd(''); setMemo(note || '') }} className="px-2 py-1 text-xs rounded-md border text-gray-700 hover:bg-gray-50">{t.common.cancel}</button>
          </div>
          <textarea value={memo} onChange={(e) => setMemo(e.target.value)} rows={2} className="sm:col-span-3 px-2 py-1 text-xs border rounded" placeholder={t.ui.note} />
        </div>
      )}
    </div>
  )
}

function CreateItem({ taskId, dateKey, onCreated }: { taskId: string; dateKey: string; onCreated: () => void }) {
  const { t } = useTranslation()
  const [busy, setBusy] = React.useState(false)
  const [open, setOpen] = React.useState(false)
  const [start, setStart] = React.useState<string>('')
  const [end, setEnd] = React.useState<string>('')
  const [memo, setMemo] = React.useState<string>('')

  const onSave = async () => {
    if (busy) return
    setBusy(true)
    try {
      if (!start) return
      const s = new Date(start).toISOString()
      const payload: any = { start_at: s }
      if (end) payload.end_at = new Date(end).toISOString()
      if (memo) payload.note = memo
      await timeTrackingApi.create(taskId, payload)
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
            <button onClick={onSave} disabled={busy} className="px-2 py-1 text-xs rounded-md border bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50">{t.common.save}</button>
            <button onClick={() => { setOpen(false); setStart(''); setEnd(''); setMemo('') }} className="px-2 py-1 text-xs rounded-md border text-gray-700 hover:bg-gray-50">{t.common.cancel}</button>
          </div>
          <textarea value={memo} onChange={(e) => setMemo(e.target.value)} rows={2} className="sm:col-span-3 px-2 py-1 text-xs border rounded" placeholder={t.ui.note} />
        </div>
      )}
    </div>
  )
}


