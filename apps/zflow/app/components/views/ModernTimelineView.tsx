/**
 * Modern Timeline Stream UI - Light Theme
 */

'use client'

import * as React from "react";
import { TranslationKeys, Language } from "../../../lib/i18n";

// ===== Design Tokens (Light Theme) =====
const TOKENS = {
  color: {
    canvas: "#FAFBFC",
    surface: "#FFFFFF",
    elevated: "#FFFFFF",
    border: "#E1E8ED",
    text: "#0F172A",
    text2: "#475569",
    textMuted: "#64748B",
    accent: "#7C5CFF",
    accentHover: "#8F73FF",
    accentSubtle: "rgba(124,92,255,0.12)",
    now: "#2BD4BD",
    grid: "rgba(0,0,0,0.08)",
  },
  radius: { md: 14, xl: 24 },
  shadowCard: "0 1px 3px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.05)",
  shadowHover: "0 4px 12px rgba(0,0,0,0.15)",
};

// ===== Types =====
export type ID = string;
export type ItemType = "task" | "activity" | "memory" | "time_entry";
export interface Category { id: ID; name: string; color: string; icon?: string }
export interface TimelineEvent {
  id: ID;
  title: string;
  start: string; // ISO
  end: string;   // ISO
  type: ItemType;
  categoryId?: ID;
  source?: string;
  energy?: { avg?: number; min?: number; max?: number; samples?: Array<[number, number]> };
  meta?: { 
    note?: string; 
    tags?: string[];
    isCrossDaySegment?: boolean;
    originalId?: string;
    originalStart?: string;
    originalEnd?: string;
    originalType?: string;
    relatedItemId?: string;
    timelineItemType?: string;
    timelineItemTitle?: string;
    timelineItemId?: string;
  };
}

// ===== Sample Data =====
const categories: Category[] = [
  { id: 'c1', name: 'ZephyrOS', color: '#6366F1', icon: 'sparkles' },
  { id: 'c2', name: 'Work', color: '#059669', icon: 'briefcase' },
  { id: 'c3', name: 'Study', color: '#D97706', icon: 'book' },
  { id: 'c4', name: 'Health', color: '#DC2626', icon: 'heart' },
];

const events0: TimelineEvent[] = [
  { id: 'e1', title: 'Unify Task / Activity / Memory', start: '2025-09-02T00:33:00', end: '2025-09-02T01:32:00', type: 'task', categoryId: 'c1', source: 'ZephyrOS', energy: { avg: 6.5 } },
  { id: 'e2', title: 'Deep Focus: Writing Spec',        start: '2025-09-02T08:10:00', end: '2025-09-02T09:05:00', type: 'activity', categoryId: 'c2', source: 'Manual',    energy: { avg: 7.1 } },
  { id: 'e3', title: 'Morning Reflection',               start: '2025-09-02T09:20:00', end: '2025-09-02T09:30:00', type: 'memory',    categoryId: 'c4', source: 'Manual',    energy: { avg: 5.0 } },
  { id: 'e4', title: 'Planning: Roadmap Review',         start: '2025-09-02T10:23:00', end: '2025-09-02T11:05:00', type: 'activity', categoryId: 'c1', source: 'ZephyrOS', energy: { avg: 7.2 } },
  { id: 'e5', title: 'Study: ML Paper Reading',          start: '2025-09-02T13:15:00', end: '2025-09-02T14:10:00', type: 'memory',   categoryId: 'c3', source: 'Manual',    energy: { avg: 6.0 } },
  { id: 'e6', title: 'Bike 10mi (Spin Class)',           start: '2025-09-02T17:30:00', end: '2025-09-02T18:20:00', type: 'activity', categoryId: 'c4', source: 'Manual',    energy: { avg: 8.0 } },
];

// ===== Utilities =====
function toDate(iso: string) { return new Date(iso); }
function pad2(n: number) { return String(n).padStart(2, '0'); }
function fmtHM(d: Date) { return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`; }
function minutesSinceMidnight(d: Date) { return d.getHours()*60 + d.getMinutes(); }
function spanMinutes(a: Date, b: Date) { return Math.max(0, Math.round((b.getTime()-a.getTime())/60000)); }
function byStart(a: TimelineEvent, b: TimelineEvent) { return toDate(a.start).getTime() - toDate(b.start).getTime(); }

// Map a minutes gap to visual spacing (stream-like, not literal timeline)
function gapToSpace(mins: number) {
  // baseline 8px + smaller scaled gap; clamp so feed doesn't get too large
  // For gaps with cards, ensure minimum height to accommodate the card (40px minimum)
  if (mins >= 15) { // gaps that will show a card
    return Math.min(160, Math.max(48, 8 + Math.round(mins * 0.5)));
  } else {
    return Math.min(120, 8 + Math.round(mins * 0.5));
  }
}

// Energy sparkline path (simple sine if no samples)
function sparkPath(width = 160, height = 24, avg = 6) {
  const pts: Array<[number, number]> = Array.from({ length: 24 }, (_, i) => [i, 6 + Math.sin(i/2) * 2 + (avg-6)*0.2]);
  const max = 10, min = 1;
  const scaleX = width / (pts.length - 1);
  const scaleY = height / (max - min);
  let d = '';
  pts.forEach((p, i) => {
    const x = i * scaleX;
    const y = height - (p[1]-min) * scaleY;
    d += (i === 0 ? `M ${x},${y}` : ` L ${x},${y}`);
  });
  return d;
}

// Get type-specific properties for timeline items
function getTypeProperties(type: ItemType) {
  switch (type) {
    case 'task':
      return {
        label: 'Task',
        color: '#8B5CF6',
        bgColor: 'rgba(139, 92, 246, 0.1)', 
        icon: '✓'
      };
    case 'activity':
      return {
        label: 'Activity',
        color: '#10B981',
        bgColor: 'rgba(16, 185, 129, 0.1)',
        icon: '🎯'
      };
    case 'memory':
      return {
        label: 'Memory',
        color: '#EC4899',
        bgColor: 'rgba(236, 72, 153, 0.1)',
        icon: '💭'
      };
    case 'time_entry':
      return {
        label: 'Time',
        color: '#06B6D4',
        bgColor: 'rgba(6, 182, 212, 0.1)',
        icon: '⏱️'
      };
    default:
      return {
        label: 'Item',
        color: '#6B7280',
        bgColor: 'rgba(107, 114, 128, 0.1)',
        icon: '📄'
      };
  }
}

// Insert a pseudo NOW item index based on current time
function findNowIndex(sorted: TimelineEvent[], now: Date) {
  const t = now.getTime();
  for (let i = 0; i < sorted.length; i++) {
    const s = toDate(sorted[i].start).getTime();
    if (t < s) return i; // Now is before this event
  }
  return sorted.length; // after all
}

// ===== Main Component =====
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
  events: eventsProp = events0,
  categories: categoriesProp = categories,
  onEventClick,
  onCreateEvent,
  onUpdateTimeEntry,
  t,
  lang = 'en'
}) => {
  const [events, setEvents] = React.useState<TimelineEvent[]>(() => [...eventsProp].sort(byStart));
  const [now, setNow] = React.useState<Date>(new Date());

  // Update events when props change
  React.useEffect(() => {
    setEvents([...eventsProp].sort(byStart));
  }, [eventsProp]);

  // tick every minute for the Now marker
  React.useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const day = selectedDate;
  const startOfDay = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0);

  // Filter events for selected date (timezone-aware)
  const dayEvents = React.useMemo(() => {
    const dayStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 0, 0, 0, 0);
    const dayEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 23, 59, 59, 999);
    
    return events.filter(event => {
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);
      // Include event if it overlaps with the selected day in local time
      return eventStart <= dayEnd && eventEnd >= dayStart;
    });
  }, [events, selectedDate]);

  // build stream blocks: [Gap, Event, Gap, Event, ...] with Now marker injected
  const sorted = [...dayEvents].sort(byStart);
  const isToday = selectedDate.toDateString() === now.toDateString();
  const nowIndex = isToday ? findNowIndex(sorted, now) : -1;

  // Compute blocks
  type Block = { kind: 'gap'; from: Date; to: Date } | { kind: 'event'; ev: TimelineEvent } | { kind: 'now' };
  const blocks: Block[] = [];
  let cursor = startOfDay;
  sorted.forEach((ev, i) => {
    const s = toDate(ev.start);
    if (s > cursor) blocks.push({ kind: 'gap', from: cursor, to: s });
    if (i === nowIndex) blocks.push({ kind: 'now' });
    blocks.push({ kind: 'event', ev });
    const e = toDate(ev.end);
    cursor = e > cursor ? e : cursor;
  });
  // tail gap & possibly Now at end
  if (nowIndex >= sorted.length && isToday) blocks.push({ kind: 'now' });
  const endOfDay = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59);
  if (cursor < endOfDay) blocks.push({ kind: 'gap', from: cursor, to: endOfDay });

  return (
    <div style={{ background: TOKENS.color.canvas, color: TOKENS.color.text }} className="min-h-screen">
      <Header day={day} events={dayEvents} onCreateEvent={onCreateEvent} t={t} lang={lang} />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-8 pb-32">
        {/* vertical guide */}
        <div className="relative pl-12 sm:pl-0">
          <div className="absolute left-[12px] sm:left-[22px] top-0 bottom-0 w-px" style={{ background: TOKENS.color.grid }} />

          <div className="space-y-2">
            {blocks.map((b, idx) => (
              <BlockView key={idx} block={b} onEventClick={onEventClick} categories={categoriesProp} onUpdateTimeEntry={onUpdateTimeEntry} onCreateEvent={onCreateEvent} t={t} />
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}

// ===== Sub-Views =====
function BlockView({ block, onEventClick, categories, onUpdateTimeEntry, onCreateEvent, t }: { 
  block: any; 
  onEventClick?: (event: TimelineEvent) => void; 
  categories: Category[];
  onUpdateTimeEntry?: (timeEntryId: string, start: string, end: string) => Promise<void>;
  onCreateEvent?: (start: string, end: string) => void;
  t?: TranslationKeys;
}) {
  if (block.kind === 'gap') return <Gap from={block.from} to={block.to} onCreateEvent={onCreateEvent} t={t} />;
  if (block.kind === 'now') return <NowMarker t={t} />;
  return <EventCard ev={block.ev} onEventClick={onEventClick} categories={categories} onUpdateTimeEntry={onUpdateTimeEntry} />;
}

function Header({ day, events, onCreateEvent, t, lang }: { day: Date; events: TimelineEvent[]; onCreateEvent?: (start: string, end: string) => void; t?: TranslationKeys; lang?: Language }) {
  const totalMin = events.reduce((acc, ev) => acc + spanMinutes(toDate(ev.start), toDate(ev.end)), 0);

  return (
    <div className="sticky top-0 z-30 backdrop-blur" style={{ background: `${TOKENS.color.canvas}CC`, borderBottom: `1px solid ${TOKENS.color.border}` }}>
      <div className="max-w-3xl mx-auto h-16 flex items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <h1 className="text-[18px] sm:text-[20px] font-semibold tracking-[-0.2px]">
            {day.toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
          </h1>
        </div>
        <div className="flex items-center gap-3 text-sm" style={{ color: TOKENS.color.text2 }}>
          <div className="hidden sm:block">{t?.ui?.recorded ?? 'Recorded'}: <span style={{ color: TOKENS.color.text }} className="font-medium">{Math.round(totalMin/60*10)/10}h</span></div>
          <input placeholder={(t?.common?.search ?? 'Search') + '…'} className="hidden sm:block px-3 py-2 rounded-xl outline-none" style={{ background: 'rgba(0,0,0,0.04)', border: `1px solid ${TOKENS.color.border}` }} />
          <button 
            onClick={() => {
              const now = new Date();
              const start = new Date(now);
              const end = new Date(now.getTime() + 30 * 60000); // 30 minutes later
              onCreateEvent?.(start.toISOString(), end.toISOString());
            }}
            className="px-3 py-2 rounded-xl text-sm font-medium" 
            style={{ background: TOKENS.color.accent, color: 'white' }}
          >
            + {(t?.common?.create ?? 'New')}
          </button>
        </div>
      </div>
    </div>
  );
}

function Gap({ from, to, onCreateEvent, t }: { from: Date; to: Date; onCreateEvent?: (start: string, end: string) => void; t?: TranslationKeys }) {
  const mins = spanMinutes(from, to);
  const h = gapToSpace(mins);
  
  // Only show gap cards for gaps >= 15 minutes to avoid crowding
  if (mins < 15) {
    return <div style={{ height: h }} className="relative">
      {/* dotted hint on the guide line for small gaps */}
      <div className="absolute left-[1px] sm:left-[1px] top-1 bottom-1 w-2">
        <div className="w-px h-full border-l border-dashed opacity-30" style={{ borderColor: TOKENS.color.grid }} />
      </div>
    </div>;
  }

  return (
    <div style={{ height: h }} className="relative flex items-center">
      {/* dotted hint on the guide line */}
      <div className="absolute left-[1px] sm:left-[1px] top-2 bottom-2 w-2">
        <div className="w-px h-full border-l border-dashed" style={{ borderColor: TOKENS.color.grid }} />
      </div>
      {/* gap card - centered vertically within the available space */}
      <div className="ml-2 sm:ml-12 flex-1">
        <div className="inline-flex items-center gap-3 px-3 py-2 rounded-xl text-[12px] shadow-sm" 
             style={{ 
               background: 'rgba(0,0,0,0.02)', 
               border: `1px dashed ${TOKENS.color.border}`,
               backdropFilter: 'blur(4px)'
             }}>
          <span className="opacity-80">{fmtHM(from)} – {fmtHM(to)}</span>
          <span className="opacity-60">{t?.ui?.noData ?? 'No records'} · {mins}{t?.ui?.minutes ?? 'm'}</span>
          <button 
            onClick={() => onCreateEvent?.(from.toISOString(), to.toISOString())}
            className="px-2 py-1 rounded-lg text-[11px] font-medium transition-all hover:scale-105" 
            style={{ 
              background: TOKENS.color.accentSubtle, 
              color: TOKENS.color.accent 
            }}
          >
            + {(t?.ui?.addTimeEntry ?? 'Add')}
          </button>
        </div>
      </div>
    </div>
  );
}

function NowMarker({ t }: { t?: TranslationKeys }) {
  return (
    <div className="relative my-5">
      <div className="absolute left-[12px] sm:left-[22px] right-0 top-1/2 -translate-y-1/2 h-px" style={{ background: `${TOKENS.color.now}99` }} />
      <div className="ml-4 sm:ml-12 inline-flex items-center gap-2 px-2.5 py-1 rounded-lg text-[12px]" style={{ background: 'rgba(43,212,189,0.12)', color: TOKENS.color.now, border: `1px solid ${TOKENS.color.now}66` }}>
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: TOKENS.color.now }} />
        {t?.ui?.now ?? 'Now'}
      </div>
    </div>
  );
}

function EventCard({ ev, onEventClick, categories, onUpdateTimeEntry }: { 
  ev: TimelineEvent; 
  onEventClick?: (event: TimelineEvent) => void; 
  categories: Category[];
  onUpdateTimeEntry?: (timeEntryId: string, start: string, end: string) => Promise<void>;
}) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [editStart, setEditStart] = React.useState(ev.start);
  const [editEnd, setEditEnd] = React.useState(ev.end);
  
  const s = toDate(ev.start); 
  const e = toDate(ev.end);
  const mins = spanMinutes(s, e);
  const cat = categories.find(c => c.id === ev.categoryId) || { name: 'General', color: '#C6D2DE' };
  const typeProps = getTypeProperties(ev.type);
  
  const isTimeEntry = ev.meta?.originalType === 'time_entry';

  const handleSaveEdit = async () => {
    // Validate that end time is after start time
    const startTime = new Date(editStart);
    const endTime = new Date(editEnd);
    
    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      alert(t?.ui?.invalidTimeFormat ?? 'Invalid time format');
      return;
    }
    
    if (endTime <= startTime) {
      alert(t?.ui?.endTimeMustBeAfterStart ?? 'End time must be after start time');
      return;
    }
    
    if (isSaving) {
      return; // Prevent multiple concurrent saves
    }
    
    setIsSaving(true);
    
    try {
      // Call the callback to update the time entry
      if (onUpdateTimeEntry) {
        await onUpdateTimeEntry(ev.id, editStart, editEnd);
        setIsEditing(false);
      } else {
        console.log('Save time entry edit:', { 
          id: ev.id, 
          timelineItemId: ev.meta?.timelineItemId,
          start: editStart, 
          end: editEnd,
          duration: Math.round((endTime.getTime() - startTime.getTime()) / 60000)
        });
        setIsEditing(false);
      }
    } catch (error) {
      // Error is already handled in the parent component
      // Just keep the edit mode open so user can try again
      console.error('Save failed:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditStart(ev.start);
    setEditEnd(ev.end);
    setIsEditing(false);
  };

  const handleStartEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  // Convert ISO string to local time input format
  const toLocalTimeInput = (isoString: string) => {
    const date = new Date(isoString);
    return date.toTimeString().slice(0, 5); // HH:MM format
  };

  // Convert local time input to ISO string (keeping the same date)
  const fromLocalTimeInput = (timeString: string, baseDateIso: string) => {
    const baseDate = new Date(baseDateIso);
    const [hours, minutes] = timeString.split(':').map(Number);
    const newDate = new Date(baseDate);
    newDate.setHours(hours, minutes, 0, 0);
    return newDate.toISOString();
  };

  return (
    <article
      className="group relative ml-2 sm:ml-12 mb-6 cursor-pointer"
      aria-label={`${typeProps.label}: ${ev.title}, ${fmtHM(s)}–${fmtHM(e)}, ${mins} minutes, ${cat.name}`}
      onClick={() => onEventClick?.(ev)}
    >
      {/* dot on the guide - shows category color with type-specific styling */}
      <div 
        className={`absolute left-[-14px] sm:left-[-2px] top-4 w-3 h-3 ${ev.type === 'memory' ? 'rounded-md' : ev.type === 'task' ? 'rounded-sm' : ev.type === 'time_entry' ? 'rounded-md border-2' : 'rounded-full'}`}
        style={{ 
          background: cat.color, 
          boxShadow: `0 0 0 4px ${TOKENS.color.canvas}`,
          border: ev.meta?.isCrossDaySegment ? `1px dashed ${typeProps.color}` : `1px solid ${typeProps.color}`
        }} 
      />

      {/* time label */}
      <div className="absolute -left-14 sm:-left-20 top-3 text-[10px] sm:text-[12px] tabular-nums" style={{ color: TOKENS.color.text2 }}>
        <div>{fmtHM(s)}</div>
        {mins > 15 && (
          <div className="opacity-60 mt-0.5">{fmtHM(e)}</div>
        )}
      </div>

      {/* card */}
      <div
        className={`rounded-2xl overflow-hidden transition-all ${ev.meta?.isCrossDaySegment ? 'border-dashed' : 'border'}`}
        style={{ 
          background: TOKENS.color.elevated, 
          borderColor: ev.meta?.isCrossDaySegment ? TOKENS.color.accent : TOKENS.color.border, 
          boxShadow: TOKENS.shadowCard 
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = TOKENS.shadowHover
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = TOKENS.shadowCard
        }}
        title={ev.meta?.isCrossDaySegment ? `Cross-day segment: ${ev.title}` : ev.title}
      >
        {/* top bar */}
        <div className="flex items-center justify-between px-4 pt-3">
          <div className="flex items-center gap-2">
            {/* Type indicator */}
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-medium" 
                  style={{ background: typeProps.bgColor, color: typeProps.color }}>
              <span className="text-[10px]">{typeProps.icon}</span>
              <span>{typeProps.label}</span>
            </span>
            
            {/* Category indicator */}
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-medium" 
                  style={{ 
                    background: `${cat.color}22`, 
                    color: cat.color,
                    border: `1px solid ${cat.color}44`
                  }}>
              <i className="h-2 w-2 rounded-full" style={{ background: cat.color }} />
              <span>{cat.name}</span>
            </span>
          </div>
          
          {/* Time and duration */}
          <div className="flex items-center gap-2">
            {isEditing ? (
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={toLocalTimeInput(editStart)}
                  onChange={(e) => setEditStart(fromLocalTimeInput(e.target.value, editStart))}
                  disabled={isSaving}
                  className={`px-2 py-1 text-[10px] rounded border focus:outline-none focus:ring-1 focus:ring-blue-400 ${
                    isSaving ? 'bg-gray-100 cursor-not-allowed' : ''
                  }`}
                  onClick={(e) => e.stopPropagation()}
                />
                <span className="text-[10px]">–</span>
                <input
                  type="time"
                  value={toLocalTimeInput(editEnd)}
                  onChange={(e) => setEditEnd(fromLocalTimeInput(e.target.value, editEnd))}
                  disabled={isSaving}
                  className={`px-2 py-1 text-[10px] rounded border focus:outline-none focus:ring-1 focus:ring-blue-400 ${
                    isSaving ? 'bg-gray-100 cursor-not-allowed' : ''
                  }`}
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="flex gap-1">
                  <button
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      handleSaveEdit(); 
                    }}
                    disabled={isSaving}
                    className={`px-2 py-1 text-[9px] text-white rounded ${
                      isSaving 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-green-500 hover:bg-green-600'
                    }`}
                  >
                    {isSaving ? '⏳' : '✓'}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleCancelEdit(); }}
                    className="px-2 py-1 text-[9px] bg-gray-400 text-white rounded hover:bg-gray-500"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <span className="text-[11px] font-medium" style={{ color: TOKENS.color.text2 }}>
                  {fmtHM(s)} – {fmtHM(e)} · {mins}m
                </span>
                {isTimeEntry && (
                  <button
                    onClick={handleStartEdit}
                    className="text-[9px] px-1 py-0.5 rounded opacity-60 hover:opacity-100 hover:bg-blue-100 transition-all"
                    title="Edit time"
                  >
                    ✏️
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="px-4 pb-4 pt-1">
          <div className="flex items-start justify-between">
            <h3 className="text-[16px] font-semibold flex-1">{ev.title}</h3>
            {/* Source and time-entry indicator */}
            <div className="flex items-center gap-1">
              {ev.meta?.originalType === 'time_entry' && (
                <span className="text-[8px] px-1 py-0.5 rounded opacity-50" 
                      style={{ background: 'rgba(6, 182, 212, 0.1)', color: '#06B6D4' }}>
                  ⏱️
                </span>
              )}
              {ev.source && (
                <span className="text-[9px] px-1.5 py-0.5 rounded opacity-60" 
                      style={{ background: 'rgba(0,0,0,0.06)', color: TOKENS.color.textMuted }}>
                  {ev.source}
                </span>
              )}
            </div>
          </div>
          
          {/* Additional metadata */}
          {(ev.meta?.note || ev.meta?.tags?.length) && (
            <div className="mt-1">
              {ev.meta.note && (
                <p className="text-[12px] opacity-70 line-clamp-2" style={{ color: TOKENS.color.text2 }}>
                  {ev.meta.note}
                </p>
              )}
              {ev.meta.tags && ev.meta.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {ev.meta.tags.slice(0, 3).map(tag => (
                    <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded-md" 
                          style={{ background: 'rgba(0,0,0,0.06)', color: TOKENS.color.textMuted }}>
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* energy sparkline */}
          {ev.energy && (
            <div className="mt-3">
              <svg width="100%" height="28" viewBox="0 0 160 24" preserveAspectRatio="none" className="opacity-80">
                <path d={sparkPath(160, 24, ev.energy?.avg ?? 6)} fill="none" stroke={TOKENS.color.accent} strokeWidth="1.5" />
              </svg>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}


export default ModernTimelineView;
