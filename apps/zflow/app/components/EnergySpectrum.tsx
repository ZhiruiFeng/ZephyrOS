'use client'

import React from 'react'
import { energyDaysApi, type EnergyDay } from '../../lib/api'
import { useTranslation } from '../../contexts/LanguageContext'

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

  const current = now ?? new Date()
  const isToday = date === new Date().toISOString().slice(0,10)
  const currentIndex = isToday ? Math.min(SEGMENTS - 1, Math.floor((current.getHours() * 60 + current.getMinutes()) / 20)) : SEGMENTS - 1

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

  function canEdit(index: number) {
    return !isToday || index <= currentIndex
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
  const [dims, setDims] = React.useState({ w: 900, h: 360 })
  const pad = { left: 48, right: 24, top: 36, bottom: 42 }
  const plotW = dims.w - pad.left - pad.right
  const plotH = dims.h - pad.top - pad.bottom

  React.useEffect(() => {
    if (!containerRef.current) return
    const ro = new (window as any).ResizeObserver((entries: any) => {
      for (const e of entries) {
        const cr = e.contentRect
        setDims({ w: Math.max(620, cr.width), h: Math.max(280, Math.min(440, cr.width * 0.35)) })
      }
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

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

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-gray-700 font-medium tracking-tight">{date} {t.ui.energySpectrumTitle}</div>
        <div className="text-xs text-gray-500">{lastSaved ? `${t.ui.lastSaved}: ${new Date(lastSaved).toLocaleString()}` : ''}</div>
      </div>
      {loading ? (
        <div className="h-40 flex items-center justify-center text-gray-500">{t.common.loading}...</div>
      ) : error ? (
        <div className="h-40 flex items-center justify-center text-red-600">{error}</div>
      ) : (
        <div>
          <div ref={containerRef} className="rounded-lg border border-gray-100 bg-white p-3">
          <svg width={dims.w} height={dims.h} className="block select-none">
            {/* Hour grid lines */}
            {hourMarks.map((h, i) => {
              const x = pad.left + (h / 24) * plotW
              const isMajor = h % 3 === 0
              return (
                <g key={i}>
                  <line x1={x} x2={x} y1={pad.top} y2={pad.top + plotH} stroke={isMajor ? '#e6eaf0' : '#f3f6fa'} strokeWidth={isMajor ? 1.25 : 1} />
                  {isMajor && (
                    <text x={x} y={dims.h - 14} textAnchor="middle" fontSize={11} fill="#475569">
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
              const fill = editable ? energyToColor(eNum) : '#cbd5e1'
              const opacity = editable ? 0.9 : 0.4
              return <rect key={i} x={x - w / 2} y={y} width={w} height={h} fill={fill} opacity={opacity} rx={3} />
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
              height={plotH}
              fill="transparent"
              style={{ cursor: 'crosshair' }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            />

            {/* Axis titles */}
            <text x={pad.left + plotW / 2} y={28} textAnchor="middle" fontSize={12} fill="#475569">{t.ui.energyAxis}</text>
            <text x={pad.left + plotW / 2} y={dims.h} textAnchor="middle" fontSize={12} fill="#475569">{t.ui.timeAxis}</text>
          </svg>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <div className="text-xs text-gray-600">{t.ui.editableRange}：{isToday ? `00:00 - ${segmentToTimeLabel(currentIndex+1)}` : t.ui.allDay}</div>
            <button onClick={saveAll} disabled={saving} className="px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 shadow-sm">
              {saving ? t.ui.saving : t.common.save}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}


