'use client'

import React from 'react'
import { X } from 'lucide-react'
import { useTranslation } from '../../contexts/LanguageContext'
import { useEnergyData } from './EnergySpectrum/hooks/useEnergyData'
import { getCurrentTimeInTimezone, buildSmoothPath } from './EnergySpectrum/utils'
import { DesktopEnergyChart } from './EnergySpectrum/components/DesktopEnergyChart'
import { MobileFullScreenModal } from './EnergySpectrum/components/MobileFullScreenModal'
import { MobileEnergyChart } from './EnergySpectrum/components/MobileEnergyChart'
import { useTimeEntries } from './EnergySpectrum/hooks/useTimeEntries'
import type { TimeEntry } from '../../lib/api'
import { tasksApi } from '../../lib/api'
import type { TimeEntryWithCrossDay } from './EnergySpectrum/types'

function localDateOf(iso: string) {
  const d = new Date(iso)
  const local = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  return local.toISOString().slice(0, 10)
}

type Props = {
  open: boolean
  entry: TimeEntry | null
  onClose: () => void
  skipFetchDayEntries?: boolean
  mobileMode?: 'sheet' | 'full'
}

export default function EnergyReviewModal({ open, entry, onClose, skipFetchDayEntries = true, mobileMode = 'sheet' }: Props) {
  const { t } = useTranslation()
  const [isMobile, setIsMobile] = React.useState(false)

  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const date = React.useMemo(() => entry ? localDateOf(entry.start_at) : localDateOf(new Date().toISOString()), [entry])

  const energyData = useEnergyData(date)
  const timeEntriesDataRaw = useTimeEntries(date)
  const timeEntriesData = skipFetchDayEntries
    ? { timeEntryLayers: [], categorySummary: [], timeEntries: [], loadingTimeEntries: false }
    : timeEntriesDataRaw
  const currentTimeInfo = React.useMemo(() => getCurrentTimeInTimezone(date), [date])

  const [hoveredTimeEntry, setHoveredTimeEntry] = React.useState<any>(null)
  const [focusedTimeEntry, setFocusedTimeEntry] = React.useState<TimeEntryWithCrossDay | null>(null)
  const [crosshairPosition, setCrosshairPosition] = React.useState<{ x: number; time: string } | null>(null)
  const [dims, setDims] = React.useState({ w: 900, h: 400 })
  const pad = { left: 48, right: 24, top: 36, bottom: 42 }
  const timeEntriesHeight = 40
  const plotH = dims.h - pad.top - pad.bottom - timeEntriesHeight - 20
  const plotW = dims.w - pad.left - pad.right

  const containerRef = React.useRef<HTMLDivElement>(null)
  const dragging = React.useRef<number | null>(null)
  const didEditDuringDrag = React.useRef<boolean>(false)

  React.useEffect(() => {
    if (!containerRef.current) return
    const ro = new (window as any).ResizeObserver((entries: any) => {
      for (const e of entries) {
        const cr = e.contentRect
        const minWidth = isMobile ? 320 : 600
        const maxWidth = 1200
        const optimalWidth = Math.min(maxWidth, Math.max(minWidth, cr.width - 24))
        const optimalHeight = isMobile ? Math.min(250, optimalWidth * 0.3) : Math.min(400, optimalWidth * 0.35)
        setDims({ w: optimalWidth, h: Math.max(320, optimalHeight) })
      }
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [isMobile])

  const xForIdx = (i: number) => pad.left + (i * plotW) / 71
  const yForEnergy = (e: number) => pad.top + (1 - (e - 1) / 9) * plotH
  const energyForY = (y: number) => Math.max(1, Math.min(10, Math.round(10 - ((y - pad.top) / Math.max(plotH, 1)) * 9)))
  const idxForX = (x: number) => Math.max(0, Math.min(71, Math.round(((x - pad.left) / Math.max(plotW, 1)) * 71)))

  const hourMarks = React.useMemo(() => Array.from({ length: 25 }, (_, h) => h), [])
  const points = React.useMemo(() => energyData.curve.map((e, i) => ({ x: xForIdx(i), y: yForEnergy(Number(e) || 5) })), [energyData.curve, dims])
  const smoothPath = React.useMemo(() => buildSmoothPath(points, 0.8), [points])

  React.useEffect(() => {
    if (!entry) return setFocusedTimeEntry(null)
    // 将 entry 转为本日片段（不精确分段，但用于可编辑范围计算足够）
    const fe: TimeEntryWithCrossDay = {
      id: entry.id,
      start_at: entry.start_at,
      end_at: entry.end_at || undefined,
      duration_minutes: entry.duration_minutes || null,
      task_title: entry.task_title,
      category_color: entry.category_color,
      category_id: (entry as any).category_id,
      category_name: (entry as any).category_name,
      note: entry.note || null,
      isCrossDaySegment: false,
    }
    setFocusedTimeEntry(fe)
  }, [entry])

  function handlePointerDown(e: React.PointerEvent<SVGRectElement>) {
    const svg = (e.currentTarget as SVGRectElement).ownerSVGElement!
    const pt = svg.createSVGPoint()
    pt.x = e.clientX; pt.y = e.clientY
    const ctm = svg.getScreenCTM()
    if (!ctm) return
    const p = pt.matrixTransform(ctm.inverse())
    const idx = idxForX(p.x)
    // 仅允许在聚焦的 time entry 范围内编辑
    if (!canEditIdxWithFocused(idx, currentTimeInfo, focusedTimeEntry)) return
    dragging.current = idx
    ;(e.currentTarget as any).setPointerCapture?.(e.pointerId)
    const val = Math.round(energyForY(p.y))
    energyData.updateCurve(idx, val)
    didEditDuringDrag.current = true
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
    if (!canEditIdxWithFocused(idx, currentTimeInfo, focusedTimeEntry)) return
    const val = Math.round(energyForY(p.y))
    energyData.updateCurve(idx, val)
    didEditDuringDrag.current = true
  }

  function handlePointerUp() {
    dragging.current = null
    if (didEditDuringDrag.current) {
      didEditDuringDrag.current = false
      energyData.saveAll()
    }
  }

  const isVisible = open && Boolean(entry)
  const [taskTitle, setTaskTitle] = React.useState<string>('')

  // Compute visible range for mobile: only the entry's segments +/- 3 within the same local day
  const visibleRange = React.useMemo(() => {
    if (!entry) return undefined as undefined | { start: number; end: number }
    const day = new Date(date + 'T00:00:00')
    const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0, 0)
    const dayEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59, 999)
    const rawStart = new Date(entry.start_at)
    const rawEnd = entry.end_at ? new Date(entry.end_at) : new Date()
    const startClamped = rawStart < dayStart ? dayStart : rawStart
    const endClamped = rawEnd > dayEnd ? dayEnd : rawEnd
    const startMinutes = startClamped.getHours() * 60 + startClamped.getMinutes()
    const endMinutes = endClamped.getHours() * 60 + endClamped.getMinutes()
    const startSegment = Math.floor(startMinutes / 20)
    const endSegment = Math.min(71, endMinutes === 0 ? 71 : Math.floor((endMinutes - 1) / 20))
    const pad = 3
    return { start: Math.max(0, startSegment - pad), end: Math.min(71, endSegment + pad) }
  }, [entry, date])

  // Resolve task title for info area: prefer entry.task_title; fallback to fetching task by id
  React.useEffect(() => {
    let cancelled = false
    async function resolveTitle() {
      if (!entry) {
        setTaskTitle('')
        return
      }
      if (entry.task_title && entry.task_title.trim()) {
        setTaskTitle(entry.task_title)
        return
      }
      try {
        const task = await tasksApi.getById(entry.task_id)
        if (!cancelled) setTaskTitle(task.content.title || '')
      } catch {
        if (!cancelled) setTaskTitle('')
      }
    }
    resolveTitle()
    return () => { cancelled = true }
  }, [entry])

  if (!isVisible) {
    return null
  }

  // Desktop or mobile-full
  if (!isMobile || mobileMode === 'full') {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center">
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />
        <div className="relative bg-white w-full max-w-5xl mx-4 rounded-xl shadow-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <div className="font-semibold text-gray-900 text-sm">Energy Review</div>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
          </div>
          <div className="p-4">
            {entry && (
              <div className="mb-3 flex flex-wrap items-center gap-3 text-sm text-gray-700">
                {entry.category_color && (
                  <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: (entry as any).category_color || entry.category_color as any }} />
                )}
                <span className="font-medium truncate">{taskTitle || entry.task_title || '...'}</span>
                <span className="text-gray-400">•</span>
                <span>
                  {new Date(entry.start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {entry.end_at ? ` - ${new Date(entry.end_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                </span>
                <span className="text-gray-400">•</span>
                <span>
                  {(() => {
                    const startMs = new Date(entry.start_at).getTime()
                    const endMs = new Date(entry.end_at || Date.now()).getTime()
                    const mins = entry.duration_minutes ?? Math.max(0, Math.round((endMs - startMs) / 60000))
                    return `${mins} min`
                  })()}
                </span>
                {((entry as any).category_name) && (
                  <>
                    <span className="text-gray-400">•</span>
                    <span>{(entry as any).category_name}</span>
                  </>
                )}
              </div>
            )}
            {isMobile ? (
              <MobileFullScreenModal
                isMobileModalOpen={true}
                curve={energyData.curve}
                hourMarks={hourMarks}
                focusedTimeEntry={focusedTimeEntry}
                crosshairPosition={crosshairPosition}
                currentTimeInfo={currentTimeInfo}
                timeEntryLayers={timeEntriesData.timeEntryLayers}
                categorySummary={timeEntriesData.categorySummary}
                hoveredTimeEntry={hoveredTimeEntry}
                setHoveredTimeEntry={setHoveredTimeEntry}
                setFocusedTimeEntry={setFocusedTimeEntry}
                setCrosshairPosition={setCrosshairPosition}
                setIsMobileModalOpen={() => {}}
                handlePointerDown={handlePointerDown}
                handlePointerMove={handlePointerMove}
                handlePointerUp={handlePointerUp}
                saveAll={() => { energyData.saveAll(); onClose() }}
                saving={energyData.saving}
                lastSaved={energyData.lastSaved}
                loading={energyData.loading}
                error={energyData.error}
                t={t}
                showTimeEntriesBar={!skipFetchDayEntries}
                hideSmoothPath={true}
              />
            ) : (
              <div ref={containerRef} className="w-full rounded-lg border border-gray-100 bg-white p-3 overflow-hidden">
                <DesktopEnergyChart
                  curve={energyData.curve}
                  dims={dims}
                  pad={pad}
                  timeEntriesHeight={timeEntriesHeight}
                  plotH={plotH}
                  plotW={plotW}
                  hourMarks={hourMarks}
                  smoothPath={smoothPath}
                  focusedTimeEntry={focusedTimeEntry}
                  crosshairPosition={crosshairPosition}
                  currentTimeInfo={currentTimeInfo}
                  timeEntryLayers={timeEntriesData.timeEntryLayers}
                  setHoveredTimeEntry={setHoveredTimeEntry}
                  setFocusedTimeEntry={setFocusedTimeEntry}
                  setCrosshairPosition={setCrosshairPosition}
                  handlePointerDown={handlePointerDown}
                  handlePointerMove={handlePointerMove}
                  handlePointerUp={handlePointerUp}
                  xForIdx={xForIdx}
                  yForEnergy={yForEnergy}
                  energyForY={energyForY}
                  idxForX={idxForX}
                  t={t}
                  showTimeEntriesBar={!skipFetchDayEntries}
                />
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => { energyData.saveAll(); onClose() }}
                    disabled={energyData.saving}
                    className="px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 shadow-sm"
                  >
                    {energyData.saving ? t.ui.saving : t.common.save}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Mobile bottom sheet mode
  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute left-0 right-0 bottom-0 max-h-[80vh] bg-white rounded-t-2xl shadow-2xl border-t border-gray-200">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <div className="font-semibold text-gray-900 text-sm truncate">Energy Review</div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-3 overflow-y-auto">
          {entry && (
            <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-gray-700">
              {entry.category_color && (
                <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: (entry as any).category_color || entry.category_color as any }} />
              )}
              <span className="font-medium truncate max-w-[60%]">{taskTitle || entry.task_title || '...'}</span>
              <span className="text-gray-400">•</span>
              <span>
                {new Date(entry.start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                {entry.end_at ? ` - ${new Date(entry.end_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
              </span>
              <span className="text-gray-400">•</span>
              <span>
                {(() => {
                  const startMs = new Date(entry.start_at).getTime()
                  const endMs = new Date(entry.end_at || Date.now()).getTime()
                  const mins = entry.duration_minutes ?? Math.max(0, Math.round((endMs - startMs) / 60000))
                  return `${mins} min`
                })()}
              </span>
              {((entry as any).category_name) && (
                <>
                  <span className="text-gray-400">•</span>
                  <span>{(entry as any).category_name}</span>
                </>
              )}
            </div>
          )}
          <div ref={containerRef} className="w-full rounded-lg border border-gray-100 bg-white p-2 overflow-hidden">
            <MobileEnergyChart
              curve={energyData.curve}
              hourMarks={hourMarks}
              focusedTimeEntry={focusedTimeEntry}
              crosshairPosition={crosshairPosition}
              currentTimeInfo={currentTimeInfo}
              timeEntryLayers={timeEntriesData.timeEntryLayers}
              categorySummary={timeEntriesData.categorySummary}
              hoveredTimeEntry={hoveredTimeEntry}
              setHoveredTimeEntry={setHoveredTimeEntry}
              setFocusedTimeEntry={setFocusedTimeEntry}
              setCrosshairPosition={setCrosshairPosition}
              handlePointerDown={handlePointerDown}
              handlePointerMove={handlePointerMove}
              handlePointerUp={handlePointerUp}
              showTimeEntriesBar={!skipFetchDayEntries}
              hideSmoothPath={true}
              t={t}
            />
          </div>
          <div className="mt-3">
            <button
              onClick={() => { energyData.saveAll(); onClose() }}
              disabled={energyData.saving}
              className="w-full px-4 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 shadow-sm"
            >
              {energyData.saving ? t.ui.saving : t.common.save}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function canEditIdxWithFocused(idx: number, currentTimeInfo: any, focused: TimeEntryWithCrossDay | null) {
  if (!focused) return false
  const startDate = new Date(focused.start_at)
  const endDate = focused.end_at ? new Date(focused.end_at) : new Date()
  const startMinutes = startDate.getHours() * 60 + startDate.getMinutes()
  const endMinutes = endDate.getHours() * 60 + endDate.getMinutes()
  const startSegment = Math.floor(startMinutes / 20)
  const endSegment = Math.min(71, endMinutes === 0 ? 71 : Math.floor((endMinutes - 1) / 20))
  const inRange = idx >= startSegment && idx <= endSegment
  // 还需符合当天可编辑（今天的话不能超过当前时刻）
  if (currentTimeInfo?.isToday) {
    return inRange && idx <= currentTimeInfo.currentIndex
  }
  return inRange
}


