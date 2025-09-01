'use client'

import React from 'react'
import { X } from 'lucide-react'
import { useTranslation } from '../../../../contexts/LanguageContext'
import { useEnergyData } from './hooks/useEnergyData'
import { useTimeEntries } from './hooks/useTimeEntries'
import { getCurrentTimeInTimezone, buildSmoothPath } from './utils'
import { TimeEntryTooltip } from './components/TimeEntryTooltip'
import { DesktopEnergyChart } from './components/DesktopEnergyChart'
import { MobileCompactView } from './components/MobileCompactView'
import { MobileEnergyChart } from './components/MobileEnergyChart'
import { CategoryLegend } from './components/CategoryLegend'
import type { 
  EnergySpectrumProps, 
  TimeEntryWithCrossDay, 
  HoveredTimeEntry, 
  CrosshairPosition,
  InteractiveTooltip 
} from './types'

export default function EnergySpectrum({ date, now, onSaved }: EnergySpectrumProps) {
  const { t } = useTranslation()
  const [isMobileModalOpen, setIsMobileModalOpen] = React.useState(false)
  const [isMobile, setIsMobile] = React.useState(false)
  const [hoveredTimeEntry, setHoveredTimeEntry] = React.useState<HoveredTimeEntry | null>(null)
  const [focusedTimeEntry, setFocusedTimeEntry] = React.useState<TimeEntryWithCrossDay | null>(null)
  const [crosshairPosition, setCrosshairPosition] = React.useState<CrosshairPosition | null>(null)
  const [interactiveTooltip, setInteractiveTooltip] = React.useState<InteractiveTooltip | null>(null)

  // Custom hooks
  const energyData = useEnergyData(date)
  const timeEntriesData = useTimeEntries(date)

  // Get current time in user's timezone for the selected date
  const currentTimeInfo = React.useMemo(() => getCurrentTimeInTimezone(date), [date])

  const containerRef = React.useRef<HTMLDivElement>(null)
  const dragging = React.useRef<number | null>(null)
  const didEditDuringDrag = React.useRef<boolean>(false)
  const [dims, setDims] = React.useState({ w: 900, h: 400 })
  const pad = { left: 48, right: 24, top: 36, bottom: 42 }
  const timeEntriesHeight = 40
  const plotH = dims.h - pad.top - pad.bottom - timeEntriesHeight - 20
  const plotW = dims.w - pad.left - pad.right

  // Mobile detection
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
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
        const minWidth = isMobile ? 320 : 600
        const maxWidth = 1200
        const optimalWidth = Math.min(maxWidth, Math.max(minWidth, cr.width - 24))
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

  const xForIdx = (i: number) => pad.left + (i * plotW) / 71
  const yForEnergy = (e: number) => pad.top + (1 - (e - 1) / 9) * plotH

  const hourMarks = React.useMemo(() => Array.from({ length: 25 }, (_, h) => h), [])
  const points = React.useMemo(() => energyData.curve.map((e, i) => ({ x: xForIdx(i), y: yForEnergy(Number(e) || 5) })), [energyData.curve, dims])
  const smoothPath = React.useMemo(() => buildSmoothPath(points, 0.8), [points])

  // Helper functions
  const energyForY = (y: number, padTop: number, plotHeight: number) => {
    return Math.max(1, Math.min(10, Math.round(10 - ((y - padTop) / Math.max(plotHeight, 1)) * 9)))
  }
  
  const idxForX = (x: number, padLeft: number, plotWidth: number) => {
    const r = Math.round(((x - padLeft) / Math.max(plotWidth, 1)) * 71)
    return Math.max(0, Math.min(71, r))
  }

  function handlePointerDown(e: React.PointerEvent<SVGRectElement>) {
    const svg = (e.currentTarget as SVGRectElement).ownerSVGElement!
    const pt = svg.createSVGPoint()
    pt.x = e.clientX; pt.y = e.clientY
    const ctm = svg.getScreenCTM()
    if (!ctm) return
    const p = pt.matrixTransform(ctm.inverse())
    const idx = idxForX(p.x, pad.left, plotW)
    if (!canEdit(idx, currentTimeInfo, focusedTimeEntry, (entry: any) => {
      const startDate = new Date(entry.start_at)
      const endDate = entry.end_at ? new Date(entry.end_at) : new Date()
      const startMinutes = startDate.getHours() * 60 + startDate.getMinutes()
      const endMinutes = endDate.getHours() * 60 + endDate.getMinutes()
      const startSegment = Math.floor(startMinutes / 20)
      const endSegment = Math.min(71, endMinutes === 0 ? 71 : Math.floor((endMinutes - 1) / 20))
      return { startSegment, endSegment }
    })) return
    dragging.current = idx
    ;(e.currentTarget as any).setPointerCapture?.(e.pointerId)
    const val = Math.round(energyForY(p.y, pad.top, plotH))
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
    const idx = idxForX(p.x, pad.left, plotW)
    if (!canEdit(idx, currentTimeInfo, focusedTimeEntry, (entry: any) => {
      const startDate = new Date(entry.start_at)
      const endDate = entry.end_at ? new Date(entry.end_at) : new Date()
      const startMinutes = startDate.getHours() * 60 + startDate.getMinutes()
      const endMinutes = endDate.getHours() * 60 + endDate.getMinutes()
      const startSegment = Math.floor(startMinutes / 20)
      const endSegment = Math.min(71, endMinutes === 0 ? 71 : Math.floor((endMinutes - 1) / 20))
      return { startSegment, endSegment }
    })) return
    const val = Math.round(energyForY(p.y, pad.top, plotH))
    energyData.updateCurve(idx, val)
    didEditDuringDrag.current = true
  }

  function handlePointerUp() { 
    dragging.current = null 
    if (didEditDuringDrag.current) {
      didEditDuringDrag.current = false
      energyData.saveAll(onSaved)
    }
  }

  // Reset editable/focus state when date changes (e.g., switch day)
  React.useEffect(() => {
    setFocusedTimeEntry(null)
    setHoveredTimeEntry(null)
    setCrosshairPosition(null)
    dragging.current = null
    setInteractiveTooltip(null)
  }, [date])



  // Conditional rendering based on mobile state
  if (isMobile) {
    return (
      <>
        <MobileCompactView
          curve={energyData.curve}
          timeEntries={timeEntriesData.timeEntries}
          categorySummary={timeEntriesData.categorySummary}
          currentTimeInfo={currentTimeInfo}
          focusedTimeEntry={focusedTimeEntry}
          hoveredTimeEntry={hoveredTimeEntry}
          interactiveTooltip={interactiveTooltip}
          setHoveredTimeEntry={setHoveredTimeEntry}
          setFocusedTimeEntry={setFocusedTimeEntry}
          setInteractiveTooltip={setInteractiveTooltip}
          setIsMobileModalOpen={setIsMobileModalOpen}
          loading={energyData.loading}
          error={energyData.error}
          t={t}
        />
        {isMobileModalOpen && (
          <div className="fixed inset-0 z-50 bg-black bg-opacity-50 backdrop-blur-sm flex items-end">
            <div className="w-full bg-white rounded-t-3xl shadow-2xl max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <div className="flex flex-col">
                  <h2 className="text-lg font-semibold text-gray-900">Energy Spectrum</h2>
                  <p className="text-sm text-gray-500 mt-1">{date}</p>
                </div>
                <button
                  onClick={() => setIsMobileModalOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 overflow-auto">
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
                  showTimeEntriesBar={true}
                  hideSmoothPath={false}
                  showCategoryLegend={true}
                  showEditableRange={true}
                  showLastSaved={true}
                  lastSaved={energyData.lastSaved}
                  compactMode={false}
                  t={t}
                />
              </div>
              <div className="border-t border-gray-100 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-white">
                <button 
                  onClick={() => {
                    energyData.saveAll(onSaved)
                    setIsMobileModalOpen(false)
                  }} 
                  disabled={energyData.saving} 
                  className="w-full px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 shadow-sm font-medium"
                >
                  {energyData.saving ? t.ui.saving : t.common.save}
                </button>
              </div>
            </div>
          </div>
        )}
        <TimeEntryTooltip hoveredTimeEntry={hoveredTimeEntry} />
      </>
    )
  }

  return (
    <div 
      className="w-full max-w-7xl mx-auto bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100"
      onClick={() => {
        // 点击空白不再取消锁定；仍清理悬停提示
        if (hoveredTimeEntry) {
          setHoveredTimeEntry(null)
        }
      }}
    >
      {energyData.loading ? (
        <div className="h-40 flex items-center justify-center text-gray-500">{t.common.loading}...</div>
      ) : energyData.error ? (
        <div className="h-40 flex items-center justify-center text-red-600">{energyData.error}</div>
      ) : (
        <div className="w-full">
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
              energyForY={(y: number) => energyForY(y, pad.top, plotH)}
              idxForX={(x: number) => idxForX(x, pad.left, plotW)}
              t={t}
            />
          </div>
          <div className="mt-4 space-y-3">
            {/* Category legend for desktop */}
            {!timeEntriesData.loadingTimeEntries && timeEntriesData.categorySummary.length > 0 && (
              <CategoryLegend categorySummary={timeEntriesData.categorySummary} isMobile={false} />
            )}
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-xs text-gray-600">
                  {t.ui.editableRange}：
                  {currentTimeInfo.isFutureDate 
                    ? t.ui.notEditableFutureDate 
                    : currentTimeInfo.isToday 
                      ? `00:00 - ${segmentToTimeLabel(currentTimeInfo.currentIndex+1)}` 
                      : t.ui.allDay
                  }
                </div>
                {focusedTimeEntry && (
                  <div 
                    className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg border border-blue-200"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-1.5">
                      <div 
                        className="w-2 h-2 rounded-full" 
                        style={{ backgroundColor: focusedTimeEntry.category_color || '#94a3b8' }}
                      />
                      <span className="text-xs text-blue-700 font-medium">
                        {t.ui.focused}: {focusedTimeEntry.task_title || t.ui.unnamedTask}
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setFocusedTimeEntry(null)
                      }}
                      className="ml-2 p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-full transition-colors"
                      title={t.ui.closeTaskFocus}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3">
                {energyData.lastSaved && (
                  <div className="text-xs text-gray-500">
                    {t.ui.lastSaved}: {new Date(energyData.lastSaved).toLocaleString()}
                  </div>
                )}
                <button 
                  onClick={(e) => {
                    e.stopPropagation()
                    energyData.saveAll(onSaved)
                  }} 
                  disabled={energyData.saving} 
                  className="px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 shadow-sm"
                >
                  {energyData.saving ? t.ui.saving : t.common.save}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <TimeEntryTooltip hoveredTimeEntry={hoveredTimeEntry} />
    </div>
  )
}

// Helper functions that need to be imported
import { canEdit, segmentToTimeLabel } from './utils'
