'use client'

import { memo, useMemo } from 'react'
import type { CSSProperties } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CalendarIcon, PinIcon, SparklesIcon, PlusIcon, LayoutGrid } from 'lucide-react'
import { useNarrativeTheme } from '../../../hooks/useNarrativeTheme'
import type { Season, SeasonStatus } from '../../../types/narrative'

interface SeasonSelectorProps {
  seasons: Season[]
  selectedSeasonId: string | null
  activeSeasonId?: string | null
  onSelectSeason: (seasonId: string) => void
  onCreateSeason: () => void
  isExpanded: boolean
  onToggle: () => void
}

export function SeasonSelector({
  seasons,
  selectedSeasonId,
  activeSeasonId,
  onSelectSeason,
  onCreateSeason,
  isExpanded,
  onToggle
}: SeasonSelectorProps) {
  const headingCopy = useMemo(() => {
    if (!seasons.length) {
      return 'Craft your narrative by naming life chapters and capturing the episodes that shape you.'
    }

    return ''
  }, [seasons.length])

  const shortLabelForSeason = useMemo(() => {
    if (!seasons.length) return () => 'Season 1'
    const sortedByCreated = [...seasons].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

    const idToIndex = new Map<string, number>()
    sortedByCreated.forEach((season, index) => {
      idToIndex.set(season.id, index + 1)
    })

    return (seasonId: string) => {
      const order = idToIndex.get(seasonId)
      return order ? `Season ${order}` : 'Season'
    }
  }, [seasons])

  return (
    <section className="rounded-3xl border border-gray-200/70 bg-white/80 px-5 py-5 shadow-lg shadow-blue-500/5 backdrop-blur sm:px-7 dark:border-gray-800 dark:bg-gray-900/70 dark:shadow-none">
      <div className="flex flex-col gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-medium uppercase tracking-wide text-blue-600 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-200">
            <SparklesIcon className="h-3.5 w-3.5" />
            Seasons
          </div>
          <div className="mt-4 flex items-center justify-between gap-3">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 sm:text-2xl">
              Create Your Life Stories
            </h1>
            <button
              type="button"
              onClick={onToggle}
              className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-gray-300/70 text-gray-600 transition-colors hover:border-gray-400 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 dark:border-gray-700 dark:text-gray-300 dark:hover:text-white"
              aria-label={isExpanded ? 'Hide season gallery' : 'Browse seasons'}
              title={isExpanded ? 'Hide season gallery' : 'Browse seasons'}
            >
              <LayoutGrid className="h-5 w-5" />
            </button>
          </div>
          <p className="mt-2 max-w-2xl text-sm text-gray-600 dark:text-gray-400">
            {headingCopy}
          </p>
        </div>
      </div>

      <AnimatePresence initial={false} mode="wait">
        {isExpanded ? (
          <motion.div
            key="expanded"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="mt-5 overflow-hidden"
          >
            <div className="-mx-1 flex gap-4 overflow-x-auto pb-3 pl-1 pr-8 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300/60 dark:[&::-webkit-scrollbar-thumb]:bg-gray-700/60">
              {seasons.map((season) => (
                <SeasonSelectorCard
                  key={season.id}
                  season={season}
                  isSelected={season.id === selectedSeasonId}
                  isActive={season.id === activeSeasonId}
                  onSelect={onSelectSeason}
                />
              ))}

              <CreateSeasonCard onCreateSeason={onCreateSeason} />
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="collapsed"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="mt-5 rounded-2xl border border-dashed border-gray-200 bg-white/80 px-4 py-4 shadow-inner dark:border-gray-700/60 dark:bg-gray-900/50"
          >
            <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto flex-nowrap px-1 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300/60 dark:[&::-webkit-scrollbar-thumb]:bg-gray-700/60">
              <button
                type="button"
                onClick={onCreateSeason}
                className="inline-flex flex-shrink-0 items-center gap-2 rounded-full border border-dashed border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:border-blue-300 hover:text-blue-600 dark:border-gray-700 dark:text-gray-400 dark:hover:border-blue-700 dark:hover:text-blue-300"
              >
                <PlusIcon className="h-4 w-4" />
                New
              </button>

              {seasons.map((season) => (
                <button
                  key={season.id}
                  type="button"
                  onClick={() => onSelectSeason(season.id)}
                  className={`group inline-flex flex-shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-all ${
                    season.id === selectedSeasonId
                      ? 'border-gray-900 bg-gray-900 text-white shadow-sm dark:border-white/80 dark:bg-white/90 dark:text-gray-900'
                      : 'border-gray-300 bg-white/70 text-gray-700 hover:border-gray-400 hover:bg-white dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`}
                >
                  <span className="font-medium truncate max-w-[8rem] group-hover:max-w-[10rem]">
                    {shortLabelForSeason(season.id)}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

interface SeasonSelectorCardProps {
  season: Season
  isSelected: boolean
  isActive: boolean
  onSelect: (seasonId: string) => void
}

const STATUS_COPY: Record<SeasonStatus, { label: string; tone: string }> = {
  active: { label: 'Currently unfolding', tone: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300' },
  completed: { label: 'Completed chapter', tone: 'bg-blue-500/15 text-blue-600 dark:text-blue-300' },
  paused: { label: 'On pause', tone: 'bg-amber-500/15 text-amber-600 dark:text-amber-300' }
}

const SeasonSelectorCard = memo(function SeasonSelectorCard({
  season,
  isSelected,
  isActive,
  onSelect
}: SeasonSelectorCardProps) {
  const { theme, gradientClasses, cssVariables } = useNarrativeTheme(season.theme)

  const intentionPreview = useMemo(() => {
    if (!season.intention) return 'Set an intention to anchor this season.'
    if (season.intention.length <= 96) return season.intention
    return `${season.intention.slice(0, 93)}…`
  }, [season.intention])

  const startDateLabel = useMemo(() => {
    if (!season.start_date) return 'Beginning to unfold'
    try {
      return new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }).format(new Date(season.start_date))
    } catch (error) {
      console.error('Failed to format start date', error)
      return 'Beginning to unfold'
    }
  }, [season.start_date])

  const statusTone = STATUS_COPY[season.status]

  return (
    <motion.button
      type="button"
      onClick={() => onSelect(season.id)}
      whileHover={{ translateY: -8 }}
      whileTap={{ scale: 0.98 }}
      className={`relative w-72 flex-shrink-0 overflow-hidden rounded-2xl border px-0.5 pb-0.5 pt-0.5 text-left transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900 ${
        isSelected
          ? 'border-black/10 shadow-xl shadow-blue-500/10 focus-visible:ring-blue-500 dark:border-white/20'
          : 'border-transparent shadow-lg shadow-gray-900/5 hover:shadow-xl hover:shadow-blue-500/10 dark:shadow-none'
      }`}
      style={cssVariables as CSSProperties}
    >
      <div className={`relative h-full rounded-[1.65rem] ${gradientClasses.subtle} bg-white/70 p-5 dark:bg-white/5`}>
        {/* Glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background:
              'linear-gradient(140deg, var(--season-primary) 0%, transparent 55%),\n               radial-gradient(600px at 0% 0%, var(--season-secondary) 0%, transparent 60%)'
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex h-full flex-col gap-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
              <span aria-hidden className="text-xl">{theme.emoji}</span>
              <span>{theme.name}</span>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusTone.tone}`}>
              {isActive ? 'Now unfolding' : statusTone.label}
            </span>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {season.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-gray-700 dark:text-gray-200/80">
              {intentionPreview}
            </p>
          </div>

          <div className="mt-auto space-y-3 text-xs text-gray-600 dark:text-gray-300/80">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              <span>{startDateLabel}</span>
            </div>
            {season.metadata?.keywords && Array.isArray(season.metadata.keywords) && season.metadata.keywords.length > 0 ? (
              <div className="flex items-center gap-2">
                <PinIcon className="h-4 w-4" />
                <div className="flex flex-wrap gap-1">
                  {season.metadata.keywords.slice(0, 3).map((keyword: string) => (
                    <span
                      key={keyword}
                      className="rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-medium text-gray-700 shadow-sm dark:bg-white/10 dark:text-white/80"
                    >
                      #{keyword}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <PinIcon className="h-4 w-4" />
                <span>Add keywords or rituals to personalize this chapter.</span>
              </div>
            )}
          </div>
        </div>

        {/* Selection indicator */}
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-x-6 bottom-3 h-1 rounded-full transition-opacity ${
            isSelected ? 'bg-white/80 shadow-[0_0_18px_rgba(255,255,255,0.6)]' : 'opacity-0'
          }`}
        />
      </div>
    </motion.button>
  )
})

SeasonSelectorCard.displayName = 'SeasonSelectorCard'

interface CreateSeasonCardProps {
  onCreateSeason: () => void
}

const CreateSeasonCard = memo(function CreateSeasonCard({ onCreateSeason }: CreateSeasonCardProps) {
  return (
    <motion.button
      type="button"
      onClick={onCreateSeason}
      whileHover={{ translateY: -6 }}
      whileTap={{ scale: 0.97 }}
      className="flex w-64 flex-shrink-0 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-gray-300/80 bg-white/60 p-6 text-center text-gray-600 transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-gray-700/60 dark:bg-gray-900/40 dark:text-gray-300 dark:hover:border-blue-700 dark:hover:bg-blue-950/40 dark:hover:text-blue-300"
    >
      <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/15 text-blue-600 shadow-inner shadow-white/40 dark:bg-blue-500/20 dark:text-blue-200">
        <PlusIcon className="h-5 w-5" />
      </div>
      <div>
        <h4 className="text-base font-semibold text-gray-900 dark:text-gray-100">Begin a fresh chapter</h4>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Capture the shift you feel and name the season you are stepping into.
        </p>
      </div>
    </motion.button>
  )
})

CreateSeasonCard.displayName = 'CreateSeasonCard'
