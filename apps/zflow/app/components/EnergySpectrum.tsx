'use client'

import React from 'react'
import { energyDaysApi, type EnergyDay } from '../../lib/api'

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

// Map energy 1..10 to heatmap-like HSL color (cool→warm)
function energyToColor(e: number) {
  // Match prototype palette: hue 200→10, sat 75%, light 35%→60%
  const t = (clamp(e, 1, 10) - 1) / 9
  const hue = Math.round(200 - 190 * t)
  const sat = 75
  const light = Math.round(35 + 25 * t)
  return `hsl(${hue} ${sat}% ${light}%)`
}

function segmentToTimeLabel(index: number) {
  const minutes = index * 20
  const hh = Math.floor(minutes / 60).toString().padStart(2, '0')
  const mm = (minutes % 60).toString().padStart(2, '0')
  return `${hh}:${mm}`
}

export default function EnergySpectrum({ date, now, onSaved }: Props) {
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
        setError(e?.message || 'Failed to load')
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
  const pad = { left: 48, right: 24, top: 24, bottom: 42 }
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
  const polyPoints = React.useMemo(() => curve.map((e, i) => `${xForIdx(i)},${yForEnergy(Number(e) || 5)}`).join(' '), [curve, dims])

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
      setError(e?.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-gray-600">{date} 能量图谱</div>
        <div className="text-xs text-gray-500">{lastSaved ? `Last saved: ${new Date(lastSaved).toLocaleString()}` : ''}</div>
      </div>
      {loading ? (
        <div className="h-40 flex items-center justify-center text-gray-500">Loading...</div>
      ) : error ? (
        <div className="h-40 flex items-center justify-center text-red-600">{error}</div>
      ) : (
        <div>
          <div ref={containerRef} className="rounded border border-gray-200 bg-white p-2">
          <svg width={dims.w} height={dims.h} className="block select-none">
            {/* Hour grid lines */}
            {hourMarks.map((h, i) => {
              const x = pad.left + (h / 24) * plotW
              const isMajor = h % 3 === 0
              return (
                <g key={i}>
                  <line x1={x} x2={x} y1={pad.top} y2={pad.top + plotH} stroke={isMajor ? '#e5e7eb' : '#f1f5f9'} strokeWidth={isMajor ? 1.2 : 1} />
                  {isMajor && (
                    <text x={x} y={dims.h - 14} textAnchor="middle" fontSize={11} fill="#374151">
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
                  <line x1={pad.left} x2={pad.left + plotW} y1={y} y2={y} stroke="#f1f5f9" />
                  <text x={pad.left - 10} y={y + 4} textAnchor="end" fontSize={11} fill="#374151" className="tabular-nums">{e}</text>
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
              const opacity = editable ? 0.85 : 0.45
              return <rect key={i} x={x - w / 2} y={y} width={w} height={h} fill={fill} opacity={opacity} rx={2} />
            })}

            {/* Line */}
            <polyline points={polyPoints} fill="none" stroke="#1f2937" strokeWidth={2} />

            {/* Legend gradient */}
            <defs>
              <linearGradient id="energyLegend" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={energyToColor(1)} />
                <stop offset="50%" stopColor={energyToColor(5.5)} />
                <stop offset="100%" stopColor={energyToColor(10)} />
              </linearGradient>
            </defs>
            <g>
              <rect x={pad.left} y={pad.top - 14} width={140} height={6} rx={3} fill="url(#energyLegend)" />
              <text x={pad.left + 70} y={pad.top - 18} textAnchor="middle" fontSize={10} fill="#6b7280">低能量 
                <tspan dx="64">高能量</tspan>
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
            <text x={pad.left + plotW / 2} y={16} textAnchor="middle" fontSize={12} fill="#4b5563">Energy (1–10)</text>
            <text x={pad.left + plotW / 2} y={dims.h - 6} textAnchor="middle" fontSize={12} fill="#4b5563">Time of day</text>
          </svg>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <div className="text-xs text-gray-600">可编辑范围：{isToday ? `00:00 - ${segmentToTimeLabel(currentIndex+1)}` : '全天'}</div>
            <button onClick={saveAll} disabled={saving} className="px-3 py-1.5 bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50">
              {saving ? '保存中...' : '保存修改'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}


