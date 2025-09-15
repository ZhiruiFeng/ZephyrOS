"use client"

import React from 'react'
import { TOKENS } from './Tokens'
import type { TimelineEvent, Category } from './types'
import type { TranslationKeys } from '../../../../lib/i18n'
import { toDate, spanMinutes, fmtHM, sparkPath, getTypeProperties } from './utils'

interface Props {
  ev: TimelineEvent
  categories: Category[]
  onEventClick?: (event: TimelineEvent) => void
  onUpdateTimeEntry?: (timeEntryId: string, start: string, end: string) => Promise<void>
  t?: TranslationKeys
}

export function EventCard({ ev, categories, onEventClick, onUpdateTimeEntry, t }: Props) {
  const [isEditing, setIsEditing] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const [editStart, setEditStart] = React.useState(ev.start)
  const [editEnd, setEditEnd] = React.useState(ev.end)

  const s = toDate(ev.start)
  const e = toDate(ev.end)
  const mins = spanMinutes(s, e)
  const cat = categories.find(c => c.id === ev.categoryId) || { name: 'General', color: '#C6D2DE' }
  const typeProps = getTypeProperties(ev.type)
  const isTimeEntry = ev.meta?.originalType === 'time_entry'
  const isOldTask = ev.type === 'task' && ev.meta?.isOldTask
  const isCreationOnly = (ev.type === 'task' && !isTimeEntry) || ev.meta?.isCreationEvent

  const handleSaveEdit = async () => {
    const startTime = new Date(editStart)
    const endTime = new Date(editEnd)
    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) { alert(t?.ui?.invalidTimeFormat ?? 'Invalid time format'); return }
    if (endTime <= startTime) { alert(t?.ui?.endTimeMustBeAfterStart ?? 'End time must be after start time'); return }
    if (isSaving) return

    setIsSaving(true)
    try {
      if (onUpdateTimeEntry) {
        await onUpdateTimeEntry(ev.id, editStart, editEnd)
        setIsEditing(false)
      } else {
        setIsEditing(false)
      }
    } catch (error) {
      console.error('Save failed:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancelEdit = () => { setEditStart(ev.start); setEditEnd(ev.end); setIsEditing(false) }
  const handleStartEdit = (e: React.MouseEvent) => { e.stopPropagation(); setIsEditing(true) }

  const toLocalTimeInput = (isoString: string) => new Date(isoString).toTimeString().slice(0, 5)
  const fromLocalTimeInput = (timeString: string, baseDateIso: string) => {
    const baseDate = new Date(baseDateIso)
    const [hours, minutes] = timeString.split(':').map(Number)
    const newDate = new Date(baseDate)
    newDate.setHours(hours, minutes, 0, 0)
    return newDate.toISOString()
  }

  // Energy rendering disabled by request
  const showEnergy = false

  return (
    <article
      className="group relative ml-2 sm:ml-12 mb-6 cursor-pointer"
      aria-label={
        ev.type === 'memory' || isCreationOnly
          ? `${isCreationOnly ? 'New task created' : typeProps.label}: ${ev.title}, at ${fmtHM(s)}, ${cat.name}`
          : `${typeProps.label}: ${ev.title}, ${fmtHM(s)}–${fmtHM(e)}, ${mins} minutes, ${cat.name}`
      }
      onClick={() => onEventClick?.(ev)}
    >
      <div
        className={`absolute left-[-14px] sm:left-[-2px] top-4 w-3 h-3 ${ev.type === 'memory' || isCreationOnly ? 'rounded-md' : ev.type === 'task' ? 'rounded-sm' : ev.type === 'time_entry' ? 'rounded-md border-2' : 'rounded-full'}`}
        style={{ background: cat.color, boxShadow: `0 0 0 4px ${TOKENS.color.canvas}`, border: (ev.meta?.isCrossDaySegment || isCreationOnly) ? `1px dashed ${typeProps.color}` : `1px solid ${typeProps.color}` }}
      />

      <div className="absolute -left-14 sm:-left-20 top-3 text-[10px] sm:text-[12px] tabular-nums" style={{ color: TOKENS.color.text2 }}>
        <div>{fmtHM(s)}</div>
        {mins > 15 && (<div className="opacity-60 mt-0.5">{fmtHM(e)}</div>)}
      </div>

      <div
        className={`rounded-2xl overflow-hidden transition-all ${(ev.meta?.isCrossDaySegment || isCreationOnly) ? 'border-dashed' : 'border'} ${isOldTask ? 'opacity-75' : ''}`}
        style={{
          background: isCreationOnly ? 'rgba(139, 92, 246, 0.06)' : (isOldTask ? '#fef3c7' : TOKENS.color.elevated),
          borderColor: isCreationOnly ? '#8B5CF6' : (isOldTask ? '#f59e0b' : (ev.meta?.isCrossDaySegment ? TOKENS.color.accent : TOKENS.color.border)),
          boxShadow: TOKENS.shadowCard
        }}
        onMouseEnter={(e) => { e.currentTarget.style.boxShadow = TOKENS.shadowHover }}
        onMouseLeave={(e) => { e.currentTarget.style.boxShadow = TOKENS.shadowCard }}
        title={
          isCreationOnly
            ? `New task created: ${ev.title}`
            : isOldTask
              ? `Old task (created: ${new Date(ev.meta?.createdAt || '').toLocaleDateString()}): ${ev.title}`
              : (ev.meta?.isCrossDaySegment ? `Cross-day segment: ${ev.title}` : ev.title)
        }
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 pt-3">
          <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 sm:gap-1.5 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-lg text-[10px] sm:text-[11px] font-medium" style={{ background: isCreationOnly ? 'rgba(139, 92, 246, 0.12)' : typeProps.bgColor, color: typeProps.color }}>
              <span className="text-[9px] sm:text-[10px]">{isCreationOnly ? '🆕' : typeProps.icon}</span>
              <span>{isCreationOnly ? 'New Task' : (isOldTask ? `⏰ ${typeProps.label}` : typeProps.label)}</span>
            </span>
            <span className="inline-flex items-center gap-1 sm:gap-1.5 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-lg text-[10px] sm:text-[11px] font-medium" style={{ background: `${cat.color}22`, color: cat.color, border: `1px solid ${cat.color}44` }}>
              <i className="h-2 w-2 rounded-full" style={{ background: cat.color }} />
              <span>{cat.name}</span>
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            {ev.type === 'memory' || isCreationOnly ? (
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-medium" style={{ color: TOKENS.color.text2 }}>{fmtHM(s)}</span>
              </div>
            ) : isEditing ? (
              <div className="flex items-center gap-2">
                <input type="time" value={toLocalTimeInput(editStart)} onChange={(e) => setEditStart(fromLocalTimeInput(e.target.value, editStart))} disabled={isSaving} className={`px-2 py-1 text-[10px] rounded border focus:outline-none focus:ring-1 focus:ring-primary-400 ${isSaving ? 'bg-gray-100 cursor-not-allowed' : ''}`} onClick={(e) => e.stopPropagation()} />
                <span className="text-[10px]">–</span>
                <input type="time" value={toLocalTimeInput(editEnd)} onChange={(e) => setEditEnd(fromLocalTimeInput(e.target.value, editEnd))} disabled={isSaving} className={`px-2 py-1 text-[10px] rounded border focus:outline-none focus:ring-1 focus:ring-primary-400 ${isSaving ? 'bg-gray-100 cursor-not-allowed' : ''}`} onClick={(e) => e.stopPropagation()} />
                <div className="flex gap-1">
                  <button onClick={(e) => { e.stopPropagation(); handleSaveEdit() }} disabled={isSaving} className={`px-2 py-1 text-[9px] text-white rounded ${isSaving ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600'}`}>{isSaving ? '⏳' : '✓'}</button>
                  <button onClick={(e) => { e.stopPropagation(); handleCancelEdit() }} className="px-2 py-1 text-[9px] bg-gray-400 text-white rounded hover:bg-gray-500">✕</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <span className="text-[11px] font-medium" style={{ color: TOKENS.color.text2 }}>{fmtHM(s)} – {fmtHM(e)} · {mins}m</span>
                {isTimeEntry && (
                  <button onClick={handleStartEdit} className="text-[9px] px-1 py-0.5 rounded opacity-60 hover:opacity-100 hover:bg-primary-100 transition-all" title="Edit time">✏️</button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="px-4 pb-4 pt-1">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1">
            <h3 className="text-[15px] sm:text-[16px] font-semibold flex-1 truncate">
              <span className="line-clamp-2">{isCreationOnly ? ev.title : ev.title}</span>
            </h3>
            <div className="hidden sm:flex items-center gap-1">
              {ev.meta?.originalType === 'time_entry' && (
                <span className="text-[8px] px-1 py-0.5 rounded opacity-50" style={{ background: 'rgba(6, 182, 212, 0.1)', color: '#06B6D4' }}>⏱️</span>
              )}
              {isCreationOnly && (
                <span className="text-[9px] px-1.5 py-0.5 rounded opacity-70" style={{ background: 'rgba(139, 92, 246, 0.12)', color: '#8B5CF6' }}>created</span>
              )}
              {ev.source && (
                <span className="text-[9px] px-1.5 py-0.5 rounded opacity-60" style={{ background: 'rgba(0,0,0,0.06)', color: TOKENS.color.textMuted }}>{ev.source}</span>
              )}
            </div>
          </div>

          {(() => {
            const rawNote = ev.meta?.note as any
            const noteText = typeof rawNote === 'string' ? rawNote.trim() : (rawNote != null ? String(rawNote).trim() : '')
            const shouldShowNote = noteText.length > 0 && noteText !== '0'
            const hasTags = !!(ev.meta?.tags && ev.meta?.tags.length > 0)
            return (shouldShowNote || hasTags)
          })() && (
            <div className="mt-1">
              {(() => {
                const rawNote = ev.meta?.note as any
                const noteText = typeof rawNote === 'string' ? rawNote.trim() : (rawNote != null ? String(rawNote).trim() : '')
                const shouldShowNote = noteText.length > 0 && noteText !== '0'
                return shouldShowNote ? (
                  <p className="text-[12px] opacity-80 line-clamp-2" style={{ color: TOKENS.color.text2 }}>{noteText}</p>
                ) : null
              })()}
              {ev.meta?.tags && ev.meta?.tags.length > 0 && (
                <div className="hidden sm:flex flex-wrap gap-1 mt-1">
                  {ev.meta?.tags.slice(0, 4).map(tag => (
                    <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded-md" style={{ background: 'rgba(0,0,0,0.06)', color: TOKENS.color.textMuted }}>#{tag}</span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Energy sparkline disabled */}
        </div>
      </div>
    </article>
  )
}
