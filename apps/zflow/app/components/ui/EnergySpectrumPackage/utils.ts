import { getUserTimezone } from '../../../utils/timeUtils'

export const SEGMENTS = 72
export const MIN = 1
export const MAX = 10

export function clamp(v: number, lo = MIN, hi = MAX) {
  return Math.max(lo, Math.min(hi, Math.round(v)))
}

export function defaultCurve() {
  return new Array(SEGMENTS).fill(5)
}

export function defaultMask() {
  return new Array(SEGMENTS).fill(false)
}

// Light green → yellow → orange → red mapping based on energy value
export function energyToColor(e: number) {
  const t = (clamp(e, 1, 10) - 1) / 9 // 0..1
  // Hue 120 (green) → 0 (red)
  const hue = Math.round(120 - 120 * t)
  const sat = 60
  const light = 70
  return `hsl(${hue} ${sat}% ${light}%)`
}

export function segmentToTimeLabel(index: number) {
  const minutes = index * 20
  const hh = Math.floor(minutes / 60).toString().padStart(2, '0')
  const mm = (minutes % 60).toString().padStart(2, '0')
  return `${hh}:${mm}`
}

export function getCurrentTimeInTimezone(date: string) {
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
}

// Smooth path (Catmull-Rom to cubic Bezier)
export function buildSmoothPath(ps: { x: number; y: number }[], tension = 0.2) {
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

export function canEdit(
  index: number, 
  currentTimeInfo: ReturnType<typeof getCurrentTimeInTimezone>,
  focusedTimeEntry: any,
  getTimeEntryPosition: (entry: any) => any
) {
  // For future dates, nothing is editable
  if (currentTimeInfo.isFutureDate) {
    return false
  }
  
  // For past dates, everything is editable
  // For today, only up to current time is editable
  const basicCanEdit = !currentTimeInfo.isToday || index <= currentTimeInfo.currentIndex
  
  // If a time entry is focused, only allow editing within its time range
  if (focusedTimeEntry) {
    const { startSegment, endSegment } = getTimeEntryPosition(focusedTimeEntry)
    const isInFocusedRange = index >= startSegment && index <= endSegment
    return basicCanEdit && isInFocusedRange
  }
  
  return basicCanEdit
}
