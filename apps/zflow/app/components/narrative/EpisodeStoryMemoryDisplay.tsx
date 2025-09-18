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

type FormattedTimestamp = { date: string; time: string }

interface HoverPayload {
  memoryId: string
  title: string
  relationType: RelationType
  relationLabel: string
  createdAt: FormattedTimestamp | null
  notePreview: string | null
  tags: string[]
}

interface HoveredMemoryState extends HoverPayload {
  position: {
    x: number
    y: number
  }
}

function getGradientPreset(key: string) {
  const hash = key.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return gradientPresets[Math.abs(hash) % gradientPresets.length]
}

function getNotePreview(note?: string | null, fallback?: string | null) {
  const source = (note || fallback || '').trim()
  if (!source) return null
  return source.replace(/\s+/g, ' ')
}

function formatTimestamp(timestamp: string): FormattedTimestamp | null {
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
  episodeId: _episodeId,
  memories,
  onOpenMemory,
  onAddMemory: _onAddMemory,
  onRemoveMemory: _onRemoveMemory,
  isLoading
}: EpisodeStoryMemoryDisplayProps) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const scrollerRef = React.useRef<HTMLDivElement>(null)
  const [hoveredMemory, setHoveredMemory] = React.useState<HoveredMemoryState | null>(null)

  React.useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return

    const handleScroll = () => setHoveredMemory(null)
    scroller.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      scroller.removeEventListener('scroll', handleScroll)
    }
  }, [])

  const updateHoverCard = React.useCallback((target: HTMLElement, payload: HoverPayload) => {
    const container = containerRef.current
    if (!container) return

    const containerRect = container.getBoundingClientRect()
    const targetRect = target.getBoundingClientRect()

    const x = targetRect.left - containerRect.left + targetRect.width / 2
    const y = targetRect.top - containerRect.top

    const maxTooltipWidth = 260
    const availableWidth = Math.max(containerRect.width - 24, 120)
    const tooltipWidth = Math.min(maxTooltipWidth, availableWidth)
    const halfWidth = tooltipWidth / 2

    const minCenterX = halfWidth + 12
    const maxCenterX = containerRect.width - halfWidth - 12

    const clampedX = maxCenterX < minCenterX
      ? containerRect.width / 2
      : Math.min(maxCenterX, Math.max(minCenterX, x))

    setHoveredMemory({
      ...payload,
      position: { x: clampedX, y }
    })
  }, [])

  const clearHoverCard = React.useCallback(() => {
    setHoveredMemory(null)
  }, [])

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
      <div ref={containerRef} className="relative">
        <div
          ref={scrollerRef}
          className="flex items-stretch gap-4 overflow-x-auto py-3 no-scrollbar"
          onPointerLeave={clearHoverCard}
        >
          {memories.map((m) => {
            const preset = getGradientPreset(m.memory_id)
            const relationMeta = relationConfig[m.relation_type]
            const memoryTitle = (m.memory?.title || '').trim() || 'Untitled memory'
            const createdAt = formatTimestamp(m.created_at)
            const notePreview = getNotePreview(m.memory?.note, m.notes)
            const tags = m.memory?.tags?.slice(0, 4) || []
            const relationLabel = relationMeta?.label ?? m.relation_type

            const hoverPayload: HoverPayload = {
              memoryId: m.memory_id,
              title: memoryTitle,
              relationType: m.relation_type,
              relationLabel,
              createdAt,
              notePreview,
              tags
            }

            const handlePointerEnter = (event: React.PointerEvent<HTMLButtonElement>) => {
              if (event.pointerType === 'touch') return
              updateHoverCard(event.currentTarget, hoverPayload)
            }

            const handlePointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
              if (event.pointerType === 'touch') return
              updateHoverCard(event.currentTarget, hoverPayload)
            }

            const handleFocus = (event: React.FocusEvent<HTMLButtonElement>) => {
              updateHoverCard(event.currentTarget, hoverPayload)
            }

            return (
              <div
                key={`${m.memory_id}-${m.relation_type}`}
                className="relative flex flex-col items-center"
              >
                <button
                  type="button"
                  onClick={() => onOpenMemory?.(m.memory_id)}
                  className="group relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full transition duration-300 ease-out hover:scale-[1.05] focus-visible:scale-[1.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900"
                  style={{ boxShadow: `0 18px 30px -18px ${preset.shadow}` }}
                  aria-label={`Open memory ${memoryTitle}`}
                  onPointerEnter={handlePointerEnter}
                  onPointerMove={handlePointerMove}
                  onPointerLeave={clearHoverCard}
                  onFocus={handleFocus}
                  onBlur={clearHoverCard}
                >
                  <div
                    className="absolute inset-0 rounded-full"
                    style={{ background: preset.background }}
                  />
                  <div className="absolute inset-[2px] rounded-full border border-white/40 dark:border-white/10" />
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/30 via-transparent to-black/20 mix-blend-overlay" />
                  <div
                    className="absolute inset-0 rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100"
                    style={{ background: 'radial-gradient(circle at 50% 100%, rgba(255,255,255,0.35), rgba(255,255,255,0))' }}
                  />
                  <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/55 text-sm font-semibold text-gray-700 shadow-sm backdrop-blur-md dark:bg-gray-900/50 dark:text-gray-100">
                    {memoryTitle.charAt(0).toUpperCase()}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 z-20">
                    <RelationTypeBadge type={m.relation_type} showLabel={false} size="xs" />
                  </div>
                </button>

                <div className="mt-2 w-16 text-center text-[10px] font-medium uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500">
                  {relationLabel}
                </div>
              </div>
            )
          })}
        </div>

        {hoveredMemory && (
          <div
            className="pointer-events-none absolute z-40 w-64 max-w-[calc(100%-1.5rem)] rounded-2xl border border-black/5 bg-white/95 p-3 text-left text-xs text-gray-700 shadow-xl ring-1 ring-black/5 backdrop-blur-xl dark:border-white/10 dark:bg-gray-900/95 dark:text-gray-200"
            style={{
              left: hoveredMemory.position.x,
              top: Math.max(hoveredMemory.position.y - 12, 0),
              transform: 'translate(-50%, -100%)'
            }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                  {hoveredMemory.title}
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  <span>{hoveredMemory.relationLabel}</span>
                  {hoveredMemory.createdAt && (
                    <span>
                      {hoveredMemory.createdAt.date} · {hoveredMemory.createdAt.time}
                    </span>
                  )}
                </div>
              </div>
              <RelationTypeBadge
                type={hoveredMemory.relationType}
                size="sm"
                className="shrink-0 text-[10px]"
              />
            </div>

            {hoveredMemory.notePreview && (
              <p className="mt-2 text-[12px] leading-5 text-gray-600 dark:text-gray-300">
                {hoveredMemory.notePreview}
              </p>
            )}

            {hoveredMemory.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {hoveredMemory.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            <div className="pointer-events-none absolute left-1/2 top-full h-3 w-3 -translate-x-1/2 -translate-y-[5px] rotate-45 border border-black/5 bg-white/95 shadow-sm dark:border-white/10 dark:bg-gray-900/95" />
          </div>
        )}
      </div>
    </div>
  )
}
