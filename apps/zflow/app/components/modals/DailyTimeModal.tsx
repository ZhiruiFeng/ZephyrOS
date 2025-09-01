import React from 'react'
import useSWR from 'swr'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import { timeTrackingApi } from '../../../lib/api'
import { useTranslation } from '../../../contexts/LanguageContext'
import { 
  processDayEntries, 
  calculateTotalMinutes, 
  getCrossDayBorderClass,
  type TimeEntryWithCrossDay 
} from '../../utils/crossDayUtils'

function startOfDay(d: Date) { return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0) }
function endOfDay(d: Date) { return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999) }
function fmtISO(d: Date) { return new Date(d).toISOString() }

export default function DailyTimeModal({ isOpen, onClose, day }: { isOpen: boolean; onClose: () => void; day?: Date }) {
  const { t } = useTranslation()
  const [current, setCurrent] = React.useState<Date>(() => startOfDay(day || new Date()))
  const [hoverCategory, setHoverCategory] = React.useState<string | null>(null)
  const [minuteHeight, setMinuteHeight] = React.useState<number>(0.8)

  React.useEffect(() => { if (day) setCurrent(startOfDay(day)) }, [day])

  const from = fmtISO(startOfDay(current))
  const to = fmtISO(endOfDay(current))
  const { data, isLoading, error } = useSWR(isOpen ? ['day-entries', from, to] : null, () => timeTrackingApi.listDay({ from, to }))

  if (!isOpen) return null

  const rawEntries = (data?.entries || []).map((e) => ({
    ...e,
    category_color: (e as any).category?.color || '#CBD5E1',
    category_id: (e as any).category?.id || (e as any).category_id_snapshot || 'uncategorized',
    category_name: (e as any).category?.name || t.ui.uncategorized,
    task_title: (e as any).task?.title || (e as any).task_title || t.ui.unknownTask,
  }))

  // 使用跨天处理逻辑处理当天的任务条目
  const entries = processDayEntries(rawEntries, current)

  const byCat = new Map<string, { id: string; name: string; color: string; minutes: number }>()
  entries.forEach((e: TimeEntryWithCrossDay) => {
    const key = e.category_id || 'uncategorized'
    const prev = byCat.get(key)
    const add = Math.max(0, e.duration_minutes || 0)
    if (prev) byCat.set(key, { ...prev, minutes: prev.minutes + add })
    else byCat.set(key, { id: key, name: e.category_name || t.ui.uncategorized, color: e.category_color || '#CBD5E1', minutes: add })
  })
  const cats = Array.from(byCat.values()).sort((a, b) => b.minutes - a.minutes)

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-x-0 top-10 mx-auto max-w-6xl bg-white rounded-xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <button onClick={() => setCurrent(new Date(current.getFullYear(), current.getMonth(), current.getDate() - 1))} className="p-2 rounded hover:bg-gray-100"><ChevronLeft className="w-4 h-4" /></button>
            <div className="text-sm font-medium text-gray-700">{current.toLocaleDateString()}</div>
            <button onClick={() => setCurrent(new Date(current.getFullYear(), current.getMonth(), current.getDate() + 1))} className="p-2 rounded hover:bg-gray-100"><ChevronRight className="w-4 h-4" /></button>
          </div>
          <button onClick={onClose} className="p-2 text-gray-500 hover:text-gray-700"><X className="w-5 h-5" /></button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-10">
          {/* Left: category summary */}
          <div className="md:col-span-5 p-4 border-r border-gray-200">
            <div className="text-sm font-medium text-gray-700 mb-2">{t.ui.summaryByCategory}</div>
            {isLoading && <div className="text-sm text-gray-500">{t.common.loading}</div>}
            {error && <div className="text-sm text-red-600">{t.ui.loadFailed}</div>}
            {!isLoading && !error && cats.length === 0 && <div className="text-sm text-gray-400">{t.ui.noData}</div>}
            <div className="space-y-2">
              {cats.map((c) => (
                <div key={c.id}
                  onMouseEnter={() => setHoverCategory(c.id)}
                  onMouseLeave={() => setHoverCategory(null)}
                  className={`flex items-center justify-between p-2 rounded border ${hoverCategory === c.id ? 'border-primary-400 bg-primary-50' : 'border-gray-200'}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color }} />
                    <span className="text-sm text-gray-700">{c.name}</span>
                  </div>
                  <div className="text-sm font-medium text-gray-700">{c.minutes}m</div>
                </div>
              ))}
            </div>
          </div>
          {/* Right: day timeline calendar */}
          <div className="md:col-span-5 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-700">{t.ui.dailyTimeDistribution}</div>
              <div className="flex items-center gap-2">
                <button onClick={() => setMinuteHeight((v) => Math.max(0.5, +(v - 0.1).toFixed(2)))} className="px-2 py-1 text-xs border rounded">-</button>
                <button onClick={() => setMinuteHeight((v) => Math.min(1.2, +(v + 0.1).toFixed(2)))} className="px-2 py-1 text-xs border rounded">+</button>
              </div>
            </div>
            <DayCanvas
              entries={entries}
              minuteHeight={minuteHeight}
              highlightCategory={hoverCategory}
              t={t}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function DayCanvas({ entries, minuteHeight, highlightCategory, t }: { entries: TimeEntryWithCrossDay[]; minuteHeight: number; highlightCategory: string | null; t: any }) {
  const ref = React.useRef<HTMLDivElement | null>(null)
  const [hover, setHover] = React.useState<number | null>(null)
  const evs = React.useMemo(() => {
    const sorted = [...entries].sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
    const lanes: Array<{ end: Date }> = []
    const norm = sorted.map((e) => {
      // 由于processDayEntries已经处理了跨天截断，这里直接使用条目的时间
      const s = new Date(e.start_at)
      const ee = e.end_at ? new Date(e.end_at) : new Date()
      const top = (s.getHours() * 60 + s.getMinutes()) * minuteHeight
      const minutes = Math.max(1, e.duration_minutes || 1)
      const height = Math.max(6, minutes * minuteHeight)
      const timeLabel = `${s.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} — ${ee.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
      return { 
        id: e.id, 
        start: s, 
        end: ee, 
        top, 
        height, 
        color: e.category_color || '#CBD5E1', 
        category_id: e.category_id || 'uncategorized', 
        label: timeLabel, 
        task_title: e.task_title, 
        note: e.note,
        isCrossDaySegment: e.isCrossDaySegment || false
      }
    })
    norm.forEach((ev) => {
      let placed = false
      for (let i = 0; i < lanes.length; i++) {
        if (lanes[i].end <= ev.start) { placed = true; (ev as any).lane = i; lanes[i].end = ev.end; break }
      }
      if (!placed) { (ev as any).lane = lanes.length; lanes.push({ end: ev.end }) }
    })
    const laneCount = Math.max(1, lanes.length)
    norm.forEach((ev: any) => (ev.laneCount = laneCount))
    return norm
  }, [entries, minuteHeight])

  return (
    <div
      ref={ref}
      className="relative border border-gray-200 rounded h-[36rem] overflow-auto bg-white"
      onMouseMove={(e) => {
        if (!ref.current) return
        const rect = ref.current.getBoundingClientRect()
        const y = e.clientY - rect.top + ref.current.scrollTop
        const total = 24 * 60 * minuteHeight
        const clamped = Math.max(0, Math.min(total, y))
        setHover(clamped)
      }}
      onMouseLeave={() => setHover(null)}
    >
      <div className="absolute left-0 top-0 w-full pl-8" style={{ height: `${24 * 60 * minuteHeight}px` }}>
        {Array.from({ length: 25 }).map((_, i) => (
          <div key={i} className="absolute left-0 w-full border-t border-gray-100" style={{ top: `${i * 60 * minuteHeight}px` }} />
        ))}
        {Array.from({ length: 25 }).map((_, i) => (
          <div key={`lbl-${i}`} className="absolute left-0 -translate-y-1/2 text-[10px] text-gray-400 select-none" style={{ top: `${i * 60 * minuteHeight}px` }}>
            {String(i).padStart(2, '0')}:00
          </div>
        ))}
      </div>
      {evs.map((ev: any) => {
        const width = 100 / ev.laneCount
        const left = ev.lane * width
        const dim = highlightCategory && highlightCategory !== ev.category_id
        return (
          <div
            key={ev.id}
            className={`absolute rounded-md px-2 py-1 shadow-sm overflow-hidden border ${dim ? 'opacity-30' : ''} ${getCrossDayBorderClass(ev.isCrossDaySegment)}`}
            style={{
              top: `${ev.top}px`,
              left: `calc(${left}% + 8px)`,
              width: `calc(${width}% - 8px)`,
              height: `${ev.height}px`,
              backgroundColor: ev.color + '22',
              borderColor: ev.color,
              color: '#1f2937',
            }}
            title={`${ev.task_title} - ${ev.label}${ev.isCrossDaySegment ? ` (${t.ui.crossDaySegment})` : ''}`}
          >
            {/* 任务标题 */}
            {ev.task_title && (
              <div className="text-[11px] font-semibold truncate mb-1" style={{ color: '#1f2937' }}>
                {ev.task_title}
              </div>
            )}
            {/* 时间标签 */}
            <div className="text-[10px] font-medium truncate" style={{ color: '#4b5563' }}>
              {ev.label}
            </div>
            {/* 备注 */}
            {ev.note && (
              <div className="text-[9px] truncate mt-0.5" style={{ color: '#6b7280' }}>
                {ev.note}
              </div>
            )}
          </div>
        )
      })}
      {hover !== null && (
        <>
          <div className="absolute left-0 right-0 h-px bg-primary-400/70" style={{ top: `${hover}px` }} />
          <div className="absolute -translate-y-1/2 -translate-x-full px-1.5 py-0.5 rounded bg-primary-600 text-white text-[10px]" style={{ top: `${hover}px`, left: 0 }}>
            {(() => { const minutes = Math.round(hover / minuteHeight); const h = Math.floor(minutes / 60); const m = minutes % 60; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}` })()}
          </div>
        </>
      )}
    </div>
  )
}


