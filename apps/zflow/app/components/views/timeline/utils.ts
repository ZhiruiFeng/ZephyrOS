import { ItemType, TimelineEvent } from './types'

export function toDate(iso: string) { return new Date(iso) }
export function pad2(n: number) { return String(n).padStart(2, '0') }
export function fmtHM(d: Date) { return `${pad2(d.getHours())}:${pad2(d.getMinutes())}` }
export function minutesSinceMidnight(d: Date) { return d.getHours()*60 + d.getMinutes() }
export function spanMinutes(a: Date, b: Date) { return Math.max(0, Math.round((b.getTime()-a.getTime())/60000)) }
export function byStart(a: TimelineEvent, b: TimelineEvent) { return toDate(a.start).getTime() - toDate(b.start).getTime() }

// Map a minutes gap to visual spacing (stream-like, not literal timeline)
export function gapToSpace(mins: number) {
  if (mins >= 15) {
    return Math.min(160, Math.max(48, 8 + Math.round(mins * 0.5)))
  } else {
    return Math.min(120, 8 + Math.round(mins * 0.5))
  }
}

// Energy sparkline path (simple sine if no samples)
export function sparkPath(width = 160, height = 24, avg = 6) {
  const pts: Array<[number, number]> = Array.from({ length: 24 }, (_, i) => [i, 6 + Math.sin(i/2) * 2 + (avg-6)*0.2])
  const max = 10, min = 1
  const scaleX = width / (pts.length - 1)
  const scaleY = height / (max - min)
  let d = ''
  pts.forEach((p, i) => {
    const x = i * scaleX
    const y = height - (p[1]-min) * scaleY
    d += (i === 0 ? `M ${x},${y}` : ` L ${x},${y}`)
  })
  return d
}

export function getTypeProperties(type: ItemType) {
  switch (type) {
    case 'task':
      return { label: 'Task', color: '#8B5CF6', bgColor: 'rgba(139, 92, 246, 0.1)', icon: '✓' }
    case 'activity':
      return { label: 'Activity', color: '#10B981', bgColor: 'rgba(16, 185, 129, 0.1)', icon: '🎯' }
    case 'memory':
      return { label: 'Memory', color: '#EC4899', bgColor: 'rgba(236, 72, 153, 0.1)', icon: '🔖' }
    case 'time_entry':
      return { label: 'Time', color: '#06B6D4', bgColor: 'rgba(6, 182, 212, 0.1)', icon: '⏱️' }
    default:
      return { label: 'Item', color: '#6B7280', bgColor: 'rgba(107, 114, 128, 0.1)', icon: '📄' }
  }
}

// Insert a pseudo NOW item index based on current time
export function findNowIndex(sorted: TimelineEvent[], now: Date) {
  const t = now.getTime()
  for (let i = 0; i < sorted.length; i++) {
    const s = toDate(sorted[i].start).getTime()
    if (t < s) return i
  }
  return sorted.length
}

