/**
 * Modern Timeline Stream UI - Refactored into reusable components
 */
'use client'

import * as React from 'react'
import type { TranslationKeys, Language } from '@/lib/i18n'
import type { TimelineEvent, Category } from './types'
import { byStart, findNowIndex, toDate } from './utils'
import { Header } from './Header'
import { Gap } from './Gap'
import { NowMarker } from './NowMarker'
import { EventCard } from './EventCard'

interface ModernTimelineViewProps {
  selectedDate: Date
  events?: TimelineEvent[]
  categories?: Category[]
  onEventClick?: (event: TimelineEvent) => void
  onCreateEvent?: (start: string, end: string) => void
  onUpdateTimeEntry?: (timeEntryId: string, start: string, end: string) => Promise<void>
  t?: TranslationKeys
  lang?: Language
}

const ModernTimelineView: React.FC<ModernTimelineViewProps> = ({
  selectedDate,
  events: eventsProp = [],
  categories: categoriesProp = [],
  onEventClick,
  onCreateEvent,
  onUpdateTimeEntry,
  t,
  lang = 'en'
}) => {
  const [events, setEvents] = React.useState<TimelineEvent[]>(() => [...eventsProp].sort(byStart))
  const [now, setNow] = React.useState<Date>(new Date())

  React.useEffect(() => { setEvents([...eventsProp].sort(byStart)) }, [eventsProp])
  React.useEffect(() => { const id = setInterval(() => setNow(new Date()), 60_000); return () => clearInterval(id) }, [])

  const day = selectedDate
  const startOfDay = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0)

  const dayEvents = React.useMemo(() => {
    const dayStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 0, 0, 0, 0)
    const dayEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 23, 59, 59, 999)
    return events.filter(event => {
      const eventStart = new Date(event.start)
      const eventEnd = new Date(event.end)
      return eventStart <= dayEnd && eventEnd >= dayStart
    })
  }, [events, selectedDate])

  const sorted = [...dayEvents].sort(byStart)
  const isToday = selectedDate.toDateString() === now.toDateString()
  const nowIndex = isToday ? findNowIndex(sorted, now) : -1

  type Block = { kind: 'gap'; from: Date; to: Date } | { kind: 'event'; ev: TimelineEvent } | { kind: 'now' }
  const blocks: Block[] = []
  let cursor = startOfDay
  sorted.forEach((ev, i) => {
    const s = toDate(ev.start)
    if (s > cursor) blocks.push({ kind: 'gap', from: cursor, to: s })
    if (i === nowIndex) blocks.push({ kind: 'now' })
    blocks.push({ kind: 'event', ev })
    const e = toDate(ev.end)
    cursor = e > cursor ? e : cursor
  })
  if (nowIndex >= sorted.length && isToday) blocks.push({ kind: 'now' })
  const endOfDay = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59)
  if (cursor < endOfDay) blocks.push({ kind: 'gap', from: cursor, to: endOfDay })

  return (
    <div className="min-h-screen bg-primary-50 text-slate-900">
      <Header day={day} events={dayEvents} onCreateEvent={onCreateEvent} t={t} lang={lang} />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-8 pb-32">
        <div className="relative pl-12 sm:pl-0">
          <div className="absolute left-[12px] sm:left-[22px] top-0 bottom-0 w-px bg-primary-600/20" />
          <div className="space-y-2">
            {blocks.map((b, idx) => (
              b.kind === 'gap' ? (
                <Gap key={idx} from={b.from} to={b.to} onCreateEvent={onCreateEvent} t={t} />
              ) : b.kind === 'now' ? (
                <NowMarker key={idx} t={t} />
              ) : (
                <EventCard key={b.ev.id} ev={b.ev} categories={categoriesProp} onEventClick={onEventClick} onUpdateTimeEntry={onUpdateTimeEntry} t={t} />
              )
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ModernTimelineView
