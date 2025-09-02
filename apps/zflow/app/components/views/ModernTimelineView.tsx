/**
 * Modern Timeline Stream UI - Drop this into a Next.js page
 * 
 * Usage:
 * ```tsx
 * import ModernTimelineView from './components/views/ModernTimelineView'
 * 
 * export default function TimelinePage() {
 *   return <ModernTimelineView selectedDate={new Date()} />
 * }
 * ```
 */

'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { 
  Calendar, Clock, Search, Plus, Sparkles, Briefcase, 
  ArrowUp, ArrowDown, Home, ChevronLeft, ChevronRight 
} from 'lucide-react'

// Types
type ID = string

export interface TimelineEvent {
  id: ID
  title: string
  start: string // ISO
  end: string   // ISO
  type: 'task' | 'activity' | 'routine' | 'habit' | 'memory'
  categoryId?: ID
  source?: 'ZephyrOS' | 'Import' | 'Manual' | string
  energy?: { 
    avg?: number
    min?: number
    max?: number
    samples?: Array<[number, number]> // [timestamp, energy 1-10]
  }
  meta?: { note?: string; tags?: string[] }
}

export interface Category {
  id: ID
  name: string
  color: string
  icon?: string
}

// Design tokens - Light Theme
const tokens = {
  color: {
    'bg.canvas': '#FAFBFC',
    'bg.surface': '#FFFFFF',
    'bg.elevated': '#FFFFFF',
    'border.subtle': '#E1E8ED',
    'text.primary': '#0F172A',
    'text.secondary': '#475569',
    'text.muted': '#64748B',
    'accent': '#7C5CFF',
    'accent.hover': '#6B46C1',
    'accent.subtle': 'rgba(124,92,255,0.08)',
    'now': '#059669',
    'grid': 'rgba(0,0,0,0.06)'
  },
  category: {
    'ZephyrOS': '#0EA5E9',
    'Work': '#059669',
    'Study': '#D97706',
    'Health': '#DC2626',
    'Default': '#64748B'
  }
}

// Sample data
const categories: Category[] = [
  { id: 'c1', name: 'ZephyrOS', color: tokens.category.ZephyrOS, icon: 'Sparkles' },
  { id: 'c2', name: 'Work', color: tokens.category.Work, icon: 'Briefcase' },
  { id: 'c3', name: 'Study', color: tokens.category.Study, icon: 'Home' }
]

const sampleEvents: TimelineEvent[] = [
  {
    id: 'e1',
    title: 'Unify Task / Activity / Memory',
    start: '2025-09-02T00:33:00',
    end: '2025-09-02T01:32:00',
    type: 'task',
    categoryId: 'c1',
    source: 'ZephyrOS',
    energy: { avg: 6.5, samples: [[0, 6], [30, 7], [59, 6]] }
  },
  {
    id: 'e2',
    title: 'Planning: Roadmap Review',
    start: '2025-09-02T10:23:00',
    end: '2025-09-02T11:05:00',
    type: 'activity',
    categoryId: 'c1',
    source: 'ZephyrOS',
    energy: { avg: 7.2, samples: [[0, 7], [20, 8], [42, 7]] }
  },
  {
    id: 'e3',
    title: 'Team Meeting - Weekly Sync',
    start: '2025-09-02T10:45:00',
    end: '2025-09-02T11:30:00',
    type: 'activity',
    categoryId: 'c2',
    source: 'Manual',
    energy: { avg: 5.8 }
  },
  {
    id: 'e4',
    title: 'Deep Work Session',
    start: '2025-09-02T14:00:00',
    end: '2025-09-02T16:30:00',
    type: 'task',
    categoryId: 'c2',
    source: 'ZephyrOS',
    energy: { avg: 8.1 }
  }
]

// Utilities
const minutesSinceMidnight = (isoString: string): number => {
  const date = new Date(isoString)
  return date.getHours() * 60 + date.getMinutes()
}

const spanInMinutes = (start: string, end: string): number => {
  return minutesSinceMidnight(end) - minutesSinceMidnight(start)
}

const formatTime = (isoString: string): string => {
  return new Date(isoString).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
}

const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours > 0) {
    return `${hours}h ${mins}m`
  }
  return `${mins}m`
}

// Overlap calculation
interface PositionedEvent extends TimelineEvent {
  overlapIndex: number
  y: number
  height: number
}

const calculateOverlaps = (events: TimelineEvent[], pxPerMinute: number): PositionedEvent[] => {
  const sortedEvents = [...events].sort((a, b) => 
    new Date(a.start).getTime() - new Date(b.start).getTime()
  )

  const positioned: PositionedEvent[] = []
  const activeEvents: Array<{ event: PositionedEvent; endTime: number }> = []

  sortedEvents.forEach(event => {
    const startMinutes = minutesSinceMidnight(event.start)
    const endMinutes = minutesSinceMidnight(event.end)
    const duration = endMinutes - startMinutes

    // Remove ended events
    while (activeEvents.length > 0 && activeEvents[0].endTime <= startMinutes) {
      activeEvents.shift()
    }

    // Find lowest available index
    const usedIndices = new Set(activeEvents.map(ae => ae.event.overlapIndex))
    let overlapIndex = 0
    while (usedIndices.has(overlapIndex)) {
      overlapIndex++
    }

    const positionedEvent: PositionedEvent = {
      ...event,
      overlapIndex,
      y: startMinutes * pxPerMinute,
      height: Math.max(20, duration * pxPerMinute) // Minimum 20px height
    }

    positioned.push(positionedEvent)
    activeEvents.push({ event: positionedEvent, endTime: endMinutes })
    activeEvents.sort((a, b) => a.endTime - b.endTime)
  })

  return positioned
}

// Components
const Header: React.FC<{ selectedDate: Date; onDateChange: (date: Date) => void }> = ({ 
  selectedDate, 
  onDateChange 
}) => {
  const goToPrevDay = () => {
    const prev = new Date(selectedDate)
    prev.setDate(prev.getDate() - 1)
    onDateChange(prev)
  }

  const goToNextDay = () => {
    const next = new Date(selectedDate)
    next.setDate(next.getDate() + 1)
    onDateChange(next)
  }

  const goToToday = () => {
    onDateChange(new Date())
  }

  const isToday = selectedDate.toDateString() === new Date().toDateString()

  return (
    <div 
      className="sticky top-0 z-30 px-6 py-4 border-b"
      style={{ 
        backgroundColor: tokens.color['bg.surface'],
        borderColor: tokens.color['border.subtle']
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button onClick={goToPrevDay} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <ChevronLeft className="w-4 h-4" style={{ color: tokens.color['text.secondary'] }} />
            </button>
            
            <h1 className="text-xl font-bold tracking-tight" style={{ color: tokens.color['text.primary'] }}>
              {selectedDate.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric'
              })}
            </h1>
            
            <button onClick={goToNextDay} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <ChevronRight className="w-4 h-4" style={{ color: tokens.color['text.secondary'] }} />
            </button>
          </div>

          {!isToday && (
            <button
              onClick={goToToday}
              className="px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors"
              style={{ 
                color: tokens.color.accent,
                borderColor: tokens.color.accent,
                backgroundColor: tokens.color['accent.subtle']
              }}
            >
              Today
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" 
              style={{ color: tokens.color['text.muted'] }} />
            <input
              type="text"
              placeholder="Search timeline..."
              className="pl-10 pr-4 py-2 text-sm rounded-lg border bg-transparent focus:outline-none focus:ring-2 focus:ring-offset-0 transition-all"
              style={{
                backgroundColor: tokens.color['bg.elevated'],
                borderColor: tokens.color['border.subtle'],
                color: tokens.color['text.primary']
              }}
            />
          </div>
          
          <button
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all hover:shadow-lg"
            style={{
              backgroundColor: tokens.color.accent,
              color: tokens.color['text.primary']
            }}
          >
            <Plus className="w-4 h-4" />
            New
          </button>
        </div>
      </div>
    </div>
  )
}

const TimeRail: React.FC<{ currentHour?: number }> = ({ currentHour }) => {
  const hours = Array.from({ length: 24 }, (_, i) => i)

  return (
    <div className="w-18 flex-shrink-0 relative">
      {hours.map(hour => (
        <div key={hour} className="relative" style={{ height: '80px' }}>
          {/* Hour label */}
          <div 
            className={`absolute -top-2 right-4 text-sm font-medium px-2 py-1 rounded ${
              hour === currentHour ? 'font-bold' : ''
            }`}
            style={{ 
              color: hour === currentHour ? tokens.color.now : tokens.color['text.secondary'],
              backgroundColor: hour === currentHour ? `${tokens.color.now}20` : 'transparent'
            }}
          >
            {hour.toString().padStart(2, '0')}
          </div>
          
          {/* Half-hour tick */}
          <div 
            className="absolute right-0 w-2 h-px"
            style={{ 
              top: '40px',
              backgroundColor: tokens.color.grid
            }}
          />
          
          {/* Grid line */}
          <div 
            className="absolute right-0 left-0 h-px"
            style={{ backgroundColor: tokens.color.grid }}
          />
        </div>
      ))}
    </div>
  )
}

const EnergySparkline: React.FC<{ energy?: TimelineEvent['energy']; width?: number; height?: number }> = ({ 
  energy, 
  width = 60, 
  height = 16 
}) => {
  const points = useMemo(() => {
    if (!energy?.samples || energy.samples.length === 0) {
      // Generate fake sine wave
      const fakePoints = Array.from({ length: 5 }, (_, i) => {
        const x = (i / 4) * width
        const y = height/2 + Math.sin(i * 0.8) * (height/4)
        return `${x},${y}`
      })
      return fakePoints.join(' ')
    }

    const maxTime = Math.max(...energy.samples.map(s => s[0]))
    return energy.samples.map(([time, value]) => {
      const x = (time / maxTime) * width
      const y = height - ((value - 1) / 9) * height // Scale 1-10 to full height
      return `${x},${y}`
    }).join(' ')
  }, [energy, width, height])

  return (
    <svg width={width} height={height} className="opacity-60">
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

const EventCard: React.FC<{ 
  event: PositionedEvent
  category?: Category
  isSelected?: boolean
  onClick?: () => void
}> = ({ event, category, isSelected, onClick }) => {
  const duration = spanInMinutes(event.start, event.end)
  
  return (
    <div
      className={`absolute left-4 rounded-xl border cursor-pointer transition-all duration-150 hover:shadow-lg group ${
        isSelected ? 'ring-2' : ''
      }`}
      style={{
        top: `${event.y}px`,
        height: `${event.height}px`,
        right: '16px',
        transform: `translateX(${event.overlapIndex * 8}px)`,
        backgroundColor: tokens.color['bg.elevated'],
        borderColor: isSelected ? tokens.color.accent : tokens.color['border.subtle'],
        boxShadow: '0 1px 3px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.05)',
        '--tw-ring-color': tokens.color.accent
      } as React.CSSProperties}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`${event.title}, ${formatTime(event.start)}–${formatTime(event.end)}, ${formatDuration(duration)}, ${category?.name || 'No category'}`}
    >
      <div className="p-3 h-full flex flex-col">
        {/* Top row: Category + Time */}
        <div className="flex items-center justify-between mb-2">
          {category && (
            <div className="flex items-center gap-1.5">
              <div 
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: category.color }}
              />
              <span 
                className="text-xs font-medium"
                style={{ color: tokens.color['text.secondary'] }}
              >
                {category.name}
              </span>
            </div>
          )}
          <span 
            className="text-xs font-medium"
            style={{ color: tokens.color['text.muted'] }}
          >
            {formatTime(event.start)}–{formatTime(event.end)} • {formatDuration(duration)}
          </span>
        </div>

        {/* Title */}
        <h3 
          className="text-sm font-semibold leading-5 flex-grow"
          style={{ color: tokens.color['text.primary'] }}
        >
          {event.title}
        </h3>

        {/* Energy sparkline */}
        {event.height > 60 && (
          <div className="mt-2 flex items-center justify-end">
            <EnergySparkline 
              energy={event.energy} 
              width={50} 
              height={12}
            />
          </div>
        )}
      </div>
    </div>
  )
}

const NowMarker: React.FC<{ currentMinutes: number; pxPerMinute: number }> = ({ 
  currentMinutes, 
  pxPerMinute 
}) => {
  const y = currentMinutes * pxPerMinute

  return (
    <div
      className="absolute left-0 right-4 z-20 flex items-center"
      style={{ top: `${y}px` }}
    >
      <div 
        className="w-3 h-3 rounded-full border-2 shadow-sm"
        style={{ 
          backgroundColor: tokens.color.now,
          borderColor: tokens.color['bg.surface']
        }}
      />
      <div 
        className="flex-1 h-0.5"
        style={{ backgroundColor: tokens.color.now }}
      />
      <div 
        className="px-2 py-1 text-xs font-medium rounded-md"
        style={{
          backgroundColor: tokens.color.now,
          color: tokens.color['bg.surface']
        }}
      >
        Now
      </div>
    </div>
  )
}

const StreamColumn: React.FC<{
  events: PositionedEvent[]
  categories: Category[]
  selectedEventId?: string
  onEventClick?: (event: TimelineEvent) => void
  showNowMarker?: boolean
  currentMinutes?: number
}> = ({ events, categories, selectedEventId, onEventClick, showNowMarker, currentMinutes }) => {
  const pxPerMinute = 80 / 60 // 80px per hour = ~1.33px per minute
  const totalHeight = 24 * 80 // 24 hours * 80px each

  return (
    <div className="flex-1 relative" style={{ height: `${totalHeight}px` }}>
      {/* Grid lines */}
      <div className="absolute inset-0">
        {Array.from({ length: 24 }, (_, i) => (
          <div
            key={i}
            className="absolute inset-x-0 h-px"
            style={{ 
              top: `${i * 80}px`,
              backgroundColor: tokens.color.grid
            }}
          />
        ))}
      </div>

      {/* Now marker */}
      {showNowMarker && currentMinutes !== undefined && (
        <NowMarker currentMinutes={currentMinutes} pxPerMinute={pxPerMinute} />
      )}

      {/* Events */}
      {events.map(event => {
        const category = categories.find(c => c.id === event.categoryId)
        return (
          <EventCard
            key={event.id}
            event={event}
            category={category}
            isSelected={event.id === selectedEventId}
            onClick={() => onEventClick?.(event)}
          />
        )
      })}
    </div>
  )
}

const RightRail: React.FC<{ events: TimelineEvent[]; categories: Category[] }> = ({ 
  events, 
  categories 
}) => {
  const stats = useMemo(() => {
    const totalMinutes = events.reduce((sum, event) => 
      sum + spanInMinutes(event.start, event.end), 0
    )
    
    const categoryBreakdown = categories.map(cat => {
      const catEvents = events.filter(e => e.categoryId === cat.id)
      const catMinutes = catEvents.reduce((sum, event) => 
        sum + spanInMinutes(event.start, event.end), 0
      )
      return { ...cat, minutes: catMinutes, count: catEvents.length }
    }).filter(cat => cat.count > 0)

    const avgEnergy = events
      .filter(e => e.energy?.avg)
      .reduce((sum, e) => sum + (e.energy!.avg! || 0), 0) / 
      events.filter(e => e.energy?.avg).length || 0

    return { totalMinutes, categoryBreakdown, avgEnergy }
  }, [events, categories])

  return (
    <div className="w-70 flex-shrink-0 p-4 space-y-6">
      <div>
        <h3 
          className="text-sm font-semibold mb-3"
          style={{ color: tokens.color['text.primary'] }}
        >
          Daily Summary
        </h3>
        
        <div className="space-y-2">
          <div className="flex justify-between">
            <span style={{ color: tokens.color['text.secondary'] }}>Total Time</span>
            <span style={{ color: tokens.color['text.primary'] }}>
              {formatDuration(stats.totalMinutes)}
            </span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: tokens.color['text.secondary'] }}>Events</span>
            <span style={{ color: tokens.color['text.primary'] }}>{events.length}</span>
          </div>
          {stats.avgEnergy > 0 && (
            <div className="flex justify-between">
              <span style={{ color: tokens.color['text.secondary'] }}>Avg Energy</span>
              <span style={{ color: tokens.color['text.primary'] }}>
                {stats.avgEnergy.toFixed(1)}/10
              </span>
            </div>
          )}
        </div>
      </div>

      {stats.categoryBreakdown.length > 0 && (
        <div>
          <h3 
            className="text-sm font-semibold mb-3"
            style={{ color: tokens.color['text.primary'] }}
          >
            By Category
          </h3>
          
          <div className="space-y-2">
            {stats.categoryBreakdown.map(cat => (
              <div key={cat.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span 
                    className="text-sm"
                    style={{ color: tokens.color['text.secondary'] }}
                  >
                    {cat.name}
                  </span>
                </div>
                <span 
                  className="text-sm font-medium"
                  style={{ color: tokens.color['text.primary'] }}
                >
                  {formatDuration(cat.minutes)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Main component
interface ModernTimelineViewProps {
  selectedDate: Date
  events?: TimelineEvent[]
  categories?: Category[]
  onDateChange?: (date: Date) => void
  onEventClick?: (event: TimelineEvent) => void
  onCreateEvent?: (start: string, end: string) => void
}

const ModernTimelineView: React.FC<ModernTimelineViewProps> = ({
  selectedDate,
  events = sampleEvents,
  categories: categoriesProp = categories,
  onDateChange,
  onEventClick,
  onCreateEvent
}) => {
  const [selectedEventId, setSelectedEventId] = useState<string>()
  const [density, setDensity] = useState<'comfort' | 'dense'>('comfort')

  const handleDateChange = useCallback((date: Date) => {
    onDateChange?.(date)
  }, [onDateChange])

  const handleEventClick = useCallback((event: TimelineEvent) => {
    setSelectedEventId(event.id)
    onEventClick?.(event)
  }, [onEventClick])

  // Filter events for selected date and calculate positions
  const dayEvents = useMemo(() => {
    const dayString = selectedDate.toISOString().split('T')[0]
    return events.filter(event => event.start.startsWith(dayString))
  }, [events, selectedDate])

  const positionedEvents = useMemo(() => {
    return calculateOverlaps(dayEvents, 80 / 60) // 80px per hour
  }, [dayEvents])

  // Current time calculations
  const now = new Date()
  const isToday = selectedDate.toDateString() === now.toDateString()
  const currentHour = isToday ? now.getHours() : undefined
  const currentMinutes = isToday ? minutesSinceMidnight(now.toISOString()) : undefined

  // Keyboard navigation
  React.useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.target !== document.body) return

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault()
          // Navigate to previous event
          break
        case 'ArrowDown':
          e.preventDefault()
          // Navigate to next event
          break
        case 'Escape':
          setSelectedEventId(undefined)
          break
        case 'n':
        case 'N':
          // Open new event dialog
          break
      }
    }

    document.addEventListener('keydown', handleKeydown)
    return () => document.removeEventListener('keydown', handleKeydown)
  }, [selectedEventId, positionedEvents])

  return (
    <div 
      className={`min-h-screen ${density === 'dense' ? 'dense' : 'comfort'}`}
      style={{ backgroundColor: tokens.color['bg.canvas'] }}
    >
      {/* CSS Variables */}
      <style jsx global>{`
        .comfort { --spacing: 1rem; --text-sm: 0.875rem; }
        .dense { --spacing: 0.5rem; --text-sm: 0.75rem; }
      `}</style>

      <Header selectedDate={selectedDate} onDateChange={handleDateChange} />
      
      <div className="flex">
        <TimeRail currentHour={currentHour} />
        
        <div className="flex-1 relative overflow-auto">
          <StreamColumn
            events={positionedEvents}
            categories={categoriesProp}
            selectedEventId={selectedEventId}
            onEventClick={handleEventClick}
            showNowMarker={isToday}
            currentMinutes={currentMinutes}
          />
        </div>

        <div className="hidden lg:block">
          <RightRail events={dayEvents} categories={categories} />
        </div>
      </div>
    </div>
  )
}

export default ModernTimelineView