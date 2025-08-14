'use client'

import React from 'react'
import useSWR from 'swr'
import { X, ChevronLeft, ChevronRight, Clock } from 'lucide-react'
import { timeTrackingApi, TimeEntry } from '../../lib/api'

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
  const [month, setMonth] = React.useState<Date>(() => startOfMonth(new Date()))
  const [selectedDay, setSelectedDay] = React.useState<string | null>(null)

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
      <div className="absolute inset-x-0 top-8 mx-auto max-w-5xl bg-white rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-primary-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">专注时间 · {taskTitle || ''}</h3>
              <p className="text-xs text-gray-500">按日查看该任务的专注时间段</p>
            </div>
          </div>
          <button onClick={close} className="p-2 text-gray-500 hover:text-gray-700 rounded-md">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
          {/* Left: Calendar */}
          <div className="md:col-span-2 p-4 border-r border-gray-200">
            {/* Month Navigator */}
            <div className="flex items-center justify-between mb-2">
              <button onClick={prevMonth} className="p-2 rounded-md hover:bg-gray-100"><ChevronLeft className="w-4 h-4" /></button>
              <div className="text-sm font-medium text-gray-700">
                {month.getFullYear()} 年 {month.getMonth() + 1} 月
              </div>
              <button onClick={nextMonth} className="p-2 rounded-md hover:bg-gray-100"><ChevronRight className="w-4 h-4" /></button>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500 mb-1">
              {['日','一','二','三','四','五','六'].map((w) => (
                <div key={w} className="py-1">{w}</div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {/* Leading blanks */}
              {Array.from({ length: firstWeekday }).map((_, i) => (
                <div key={`blank-${i}`} className="h-20 bg-transparent" />
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
                    className={`h-20 rounded-md border text-left p-2 transition-colors ${
                      isSelected ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-gray-700">{d.getDate()}</span>
                      {minutes > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-primary-100 text-primary-700">{minutes}m</span>
                      )}
                    </div>
                    {/* bars */}
                    <div className="mt-2 space-y-1 overflow-hidden">
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

          {/* Right: Day details */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-700">{selectedDay || '请选择日期'}</div>
              <button onClick={() => setSelectedDay(null)} className="text-xs text-gray-500 hover:text-gray-700">清除</button>
            </div>
            <div className="space-y-2 max-h-[24rem] overflow-auto pr-1">
              {(() => {
                if (isLoading) return <div className="text-sm text-gray-500">加载中...</div>
                if (error) return <div className="text-sm text-red-600">加载失败</div>
                const list = selectedDay ? grouped.get(selectedDay) || [] : []
                if (list.length === 0) return <div className="text-sm text-gray-400">无时间段</div>
                return list.map((e) => {
                  const start = new Date(e.start_at)
                  const end = e.end_at ? new Date(e.end_at) : null
                  const time = `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} — ${end ? end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '进行中'}`
                  return (
                    <div key={e.id} className="p-2 border border-gray-200 rounded-md">
                      <div className="flex items-center justify-between text-sm text-gray-700">
                        <span>{time}</span>
                        <span className="text-primary-700">{e.duration_minutes ? `${e.duration_minutes}m` : ''}</span>
                      </div>
                      {e.note && <div className="mt-1 text-xs text-gray-500">{e.note}</div>}
                    </div>
                  )
                })
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


