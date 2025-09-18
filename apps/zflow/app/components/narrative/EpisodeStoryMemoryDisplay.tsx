'use client'

import React from 'react'
import RelationTypeBadge, { type RelationType, relationConfig } from '../memory/RelationTypeBadge'

interface StoryMemory {
  memory_id: string
  episode_id: string
  relation_type: RelationType
  local_time_range?: { start: string; end?: string } | null
  weight?: number
  notes?: string
  created_at: string
  memory?: {
    id: string
    title?: string
    note?: string
    tags?: string[]
  }
}

interface EpisodeStoryMemoryDisplayProps {
  episodeId: string
  memories: StoryMemory[]
  onAddMemory?: () => void
  onOpenMemory?: (memoryId: string) => void
  onRemoveMemory?: (memoryId: string) => void | Promise<void>
  isLoading?: boolean
}

const gradientPresets: Array<{ background: string; shadow: string }> = [
  {
    background:
      'radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.55), rgba(255, 255, 255, 0) 55%), linear-gradient(135deg, #6fb1fc, #9be7ff)',
    shadow: 'rgba(111, 177, 252, 0.45)'
  },
  {
    background:
      'radial-gradient(circle at 80% 10%, rgba(255, 255, 255, 0.5), rgba(255, 255, 255, 0) 52%), linear-gradient(135deg, #f8a4c7, #ffd6a5)',
    shadow: 'rgba(248, 164, 199, 0.45)'
  },
  {
    background:
      'radial-gradient(circle at 15% 80%, rgba(255, 255, 255, 0.45), rgba(255, 255, 255, 0) 50%), linear-gradient(135deg, #d3b3ff, #f6b6ff)',
    shadow: 'rgba(211, 179, 255, 0.45)'
  },
  {
    background:
      'radial-gradient(circle at 10% 30%, rgba(255, 255, 255, 0.4), rgba(255, 255, 255, 0) 55%), linear-gradient(135deg, #9fffc7, #7be9f6)',
    shadow: 'rgba(123, 233, 246, 0.45)'
  },
  {
    background:
      'radial-gradient(circle at 70% 70%, rgba(255, 255, 255, 0.47), rgba(255, 255, 255, 0) 55%), linear-gradient(135deg, #ffe29f, #ffa99f)',
    shadow: 'rgba(255, 169, 159, 0.45)'
  },
  {
    background:
      'radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.5), rgba(255, 255, 255, 0) 55%), linear-gradient(135deg, #b9d1ff, #c8afff)',
    shadow: 'rgba(184, 209, 255, 0.45)'
  }
]

function getGradientPreset(key: string) {
  const hash = key.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return gradientPresets[Math.abs(hash) % gradientPresets.length]
}

function getNotePreview(note?: string | null, fallback?: string | null) {
  const source = (note || fallback || '').trim()
  if (!source) return null
  return source.replace(/\s+/g, ' ')
}

function formatTimestamp(timestamp: string) {
  try {
    const date = new Date(timestamp)
    if (Number.isNaN(date.getTime())) return null
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  } catch {
    return null
  }
}

export default function EpisodeStoryMemoryDisplay({
  memories,
  onOpenMemory,
  onRemoveMemory,
  isLoading
}: EpisodeStoryMemoryDisplayProps) {
  void onRemoveMemory
  if (isLoading) {
    return (
      <div className="px-4 pb-3">
        <div className="text-sm text-gray-500">Loading...</div>
      </div>
    )
  }

  if (!memories || memories.length === 0) {
    return null
  }

  return (
    <div className="px-4 pb-3">
      <div className="flex items-stretch gap-4 overflow-x-auto py-3 no-scrollbar">
        {memories.map((m) => {
          const preset = getGradientPreset(m.memory_id)
          const relationMeta = relationConfig[m.relation_type]
          const memoryTitle = (m.memory?.title || '').trim() || 'Untitled memory'
          const createdAt = formatTimestamp(m.created_at)
          const notePreview = getNotePreview(m.memory?.note, m.notes)
          const tags = m.memory?.tags?.slice(0, 4) || []

          return (
            <div
              key={`${m.memory_id}-${m.relation_type}`}
              className="group relative flex flex-col items-center"
            >
              <button
                type="button"
                onClick={() => onOpenMemory?.(m.memory_id)}
                className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full transition duration-300 ease-out hover:scale-[1.05] focus-visible:scale-[1.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900"
                style={{ boxShadow: `0 18px 30px -18px ${preset.shadow}` }}
                aria-label={`Open memory ${memoryTitle}`}
              >
                <div
                  className="absolute inset-0 rounded-full"
                  style={{ background: preset.background }}
                />
                <div className="absolute inset-[2px] rounded-full border border-white/40 dark:border-white/10" />
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/30 via-transparent to-black/20 mix-blend-overlay" />
                <div className="absolute inset-0 rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ background: 'radial-gradient(circle at 50% 100%, rgba(255,255,255,0.35), rgba(255,255,255,0))' }} />
                <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/55 text-sm font-semibold text-gray-700 shadow-sm backdrop-blur-md dark:bg-gray-900/50 dark:text-gray-100">
                  {memoryTitle.charAt(0).toUpperCase()}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 z-20">
                  <RelationTypeBadge type={m.relation_type} showLabel={false} size="xs" />
                </div>
              </button>

              <div className="pointer-events-none absolute bottom-[calc(100%+0.9rem)] left-1/2 z-30 hidden w-56 -translate-x-1/2 flex-col gap-2 rounded-2xl border border-black/5 bg-white/95 p-3 text-left text-xs text-gray-700 shadow-xl ring-1 ring-black/5 backdrop-blur-xl transition-opacity duration-200 group-hover:flex group-focus-within:flex dark:border-white/10 dark:bg-gray-900/95 dark:text-gray-200">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                      {memoryTitle}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      <span>{relationMeta.label}</span>
                      {createdAt && (
                        <span>
                          {createdAt.date} · {createdAt.time}
                        </span>
                      )}
                    </div>
                  </div>
                  <RelationTypeBadge
                    type={m.relation_type}
                    size="sm"
                    className="shrink-0 text-[10px]"
                  />
                </div>

                {notePreview && (
                  <p className="line-clamp-3 text-[11px] leading-4 text-gray-600 dark:text-gray-300">
                    {notePreview}
                  </p>
                )}

                {(tags.length > 0 || m.notes) && (
                  <div className="flex flex-wrap gap-1">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                      >
                        #{tag}
                      </span>
                    ))}
                    {!tags.length && m.notes && (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500 dark:bg-gray-800 dark:text-gray-300">
                        {m.notes}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="pointer-events-none absolute bottom-[calc(100%+0.35rem)] left-1/2 hidden h-3 w-3 -translate-x-1/2 rotate-45 bg-white/95 shadow-sm group-hover:block group-focus-within:block dark:bg-gray-900/95" />
            </div>
          )
        })}
      </div>
    </div>
  )
}
