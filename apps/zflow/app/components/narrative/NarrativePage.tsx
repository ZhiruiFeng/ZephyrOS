'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PlusIcon, BookOpenIcon } from 'lucide-react'
import { useSeasons } from '../../../features/strategy'
import { useEpisodes } from '../../../hooks/memory/useEpisodes'
import { SeasonCover } from './SeasonCover'
import { EpisodeCard } from './EpisodeCard'
import { AddEpisodeForm } from './AddEpisodeForm'
import { CreateSeasonModal } from './CreateSeasonModal'
import { SeasonSelector } from './SeasonSelector'
import type { CreateSeasonRequest, CreateEpisodeRequest } from '../../../types/narrative'

export function NarrativePage() {
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null)
  const [showCreateSeason, setShowCreateSeason] = useState(false)
  const [isSeasonSelectorExpanded, setSeasonSelectorExpanded] = useState(false)

  const { seasons, activeSeason, loading: seasonsLoading, createSeason, updateSeason, deleteSeason } = useSeasons()

  const manualSelectionRef = useRef<string | null>(null)

  const selectSeason = (seasonId: string) => {
    manualSelectionRef.current = seasonId
    setSelectedSeasonId(seasonId)
  }

  useEffect(() => {
    if (!manualSelectionRef.current) return

    const isResolved =
      seasons.some(season => season.id === manualSelectionRef.current) ||
      (activeSeason?.id === manualSelectionRef.current)

    if (isResolved) {
      manualSelectionRef.current = null
    }
  }, [seasons, activeSeason])

  useEffect(() => {
    if (manualSelectionRef.current) return

    if (!selectedSeasonId) {
      if (activeSeason) {
        setSelectedSeasonId(activeSeason.id)
        return
      }

      if (seasons.length > 0) {
        setSelectedSeasonId(seasons[0].id)
      }
      return
    }

    const existsInList = seasons.some(season => season.id === selectedSeasonId)
    const matchesActive = activeSeason?.id === selectedSeasonId

    if (!existsInList && !matchesActive) {
      if (activeSeason) {
        setSelectedSeasonId(activeSeason.id)
        return
      }

      if (seasons.length > 0) {
        setSelectedSeasonId(seasons[0].id)
      } else {
        setSelectedSeasonId(null)
      }
    }
  }, [activeSeason, seasons, selectedSeasonId])

  // Use active season or fallback to first season
  const currentSeason = useMemo(() => {
    if (!selectedSeasonId) {
      return activeSeason || seasons[0] || null
    }

    return (
      seasons.find(season => season.id === selectedSeasonId) ||
      (activeSeason?.id === selectedSeasonId ? activeSeason : null) ||
      seasons[0] ||
      null
    )
  }, [activeSeason, seasons, selectedSeasonId])

  const {
    episodes,
    loading: episodesLoading,
    createEpisode,
    updateEpisode,
    deleteEpisode
  } = useEpisodes(currentSeason?.id)

  // Handle season creation
  const handleCreateSeason = async (data: CreateSeasonRequest) => {
    try {
      const newSeason = await createSeason(data)
      selectSeason(newSeason.id)
      setSeasonSelectorExpanded(false)
      setShowCreateSeason(false)
    } catch (error) {
      console.error('Failed to create season:', error)
      throw error
    }
  }

  // Handle season updates
  const handleUpdateSeason = async (updates: any) => {
    if (!currentSeason) return
    await updateSeason(currentSeason.id, updates)
  }

  // Handle episode creation
  const handleCreateEpisode = async (data: CreateEpisodeRequest) => {
    return await createEpisode(data)
  }

  // Handle episode updates
  const handleUpdateEpisode = async (episodeId: string, updates: any) => {
    await updateEpisode(episodeId, updates)
  }

  // Handle episode deletion
  const handleDeleteEpisode = async (episodeId: string) => {
    await deleteEpisode(episodeId)
  }

  const handleDeleteSeason = async () => {
    if (!currentSeason) return
    try {
      await deleteSeason(currentSeason.id)
      manualSelectionRef.current = null
      setSelectedSeasonId(null)
      setSeasonSelectorExpanded(false)
    } catch (error) {
      console.error('Failed to delete season:', error)
    }
  }

  // Loading state
  if (seasonsLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
          <p className="mt-2 text-sm text-gray-600">Loading your narrative...</p>
        </div>
      </div>
    )
  }

  // Empty state - no seasons
  if (seasons.length === 0) {
    return (
      <div className="text-center py-12">
        <BookOpenIcon className="mx-auto h-16 w-16 text-gray-400" />
        <h2 className="mt-4 text-2xl font-bold text-gray-900 dark:text-gray-100">
          Start Your Life Narrative
        </h2>
        <p className="mt-2 text-gray-600 dark:text-gray-400 max-w-md mx-auto">
          Your life story begins with seasons - chapters that give meaning and structure to your experiences.
        </p>
        <button
          onClick={() => setShowCreateSeason(true)}
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-white font-medium hover:bg-blue-700 transition-colors"
        >
          <PlusIcon className="h-5 w-5" />
          Create Your First Season
        </button>

        <CreateSeasonModal
          isOpen={showCreateSeason}
          onClose={() => setShowCreateSeason(false)}
          onSubmit={handleCreateSeason}
        />
      </div>
    )
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-slate-50 via-white to-white dark:from-slate-950 dark:via-gray-950 dark:to-gray-900" />
      <div aria-hidden className="pointer-events-none absolute -left-24 top-16 h-72 w-72 rounded-full bg-blue-200/40 blur-3xl dark:bg-blue-900/30" />
      <div aria-hidden className="pointer-events-none absolute right-0 top-40 h-80 w-80 translate-x-1/3 rounded-full bg-amber-200/30 blur-3xl dark:bg-amber-900/20" />

      <div className="relative z-10 mx-auto w-full max-w-5xl px-4 pb-16 pt-10 sm:px-6">
        <SeasonSelector
          seasons={seasons}
          selectedSeasonId={currentSeason?.id || null}
          activeSeasonId={activeSeason?.id || null}
          onSelectSeason={selectSeason}
          onCreateSeason={() => setShowCreateSeason(true)}
          isExpanded={isSeasonSelectorExpanded}
          onToggle={() => setSeasonSelectorExpanded((prev) => !prev)}
        />

        <div className="mt-10">
          <AnimatePresence mode="wait">
            {currentSeason ? (
              <motion.div
                key={currentSeason.id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -24 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="space-y-10"
              >
                {/* Season Cover */}
                <SeasonCover
                  season={currentSeason}
                  isEditable={true}
                  onUpdate={handleUpdateSeason}
                  onDelete={handleDeleteSeason}
                />

                {/* Episodes Section */}
                <div className="rounded-3xl border border-gray-200/70 bg-white/80 p-6 shadow-lg shadow-blue-500/5 backdrop-blur-md dark:border-gray-800 dark:bg-gray-900/70 dark:shadow-none">
                  <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                      Episodes
                    </h2>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {episodes.length} episode{episodes.length !== 1 ? 's' : ''}
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Add Episode Form */}
                    <AddEpisodeForm
                      seasonId={currentSeason.id}
                      seasonTheme={currentSeason.theme}
                      onAdd={handleCreateEpisode}
                    />

                    {/* Episodes Loading */}
                    {episodesLoading && (
                      <div className="flex items-center justify-center py-8 text-sm text-gray-600 dark:text-gray-400">
                        <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-blue-600"></div>
                        <span className="ml-2">Loading episodes...</span>
                      </div>
                    )}

                    {/* Episodes List */}
                    <AnimatePresence>
                      {episodes.map((episode) => (
                        <EpisodeCard
                          key={episode.id}
                          episode={episode}
                          seasonTheme={currentSeason.theme}
                          isEditable={true}
                          onUpdate={(updates) => handleUpdateEpisode(episode.id, updates)}
                          onDelete={() => handleDeleteEpisode(episode.id)}
                        />
                      ))}
                    </AnimatePresence>

                    {/* Empty Episodes State */}
                    {!episodesLoading && episodes.length === 0 && (
                      <div className="rounded-2xl border border-dashed border-gray-200 bg-white/70 py-10 text-center text-gray-500 shadow-inner dark:border-gray-700/60 dark:bg-gray-900/50 dark:text-gray-400">
                        <p>Your canvas is open.</p>
                        <p className="mt-1 text-sm">Capture a moment to begin this season&apos;s story.</p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="no-season"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-3xl border border-dashed border-gray-300 bg-white/80 p-10 text-center text-gray-500 shadow-inner dark:border-gray-700 dark:bg-gray-900/40"
              >
                Select or create a season to see its chapters.
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Create Season Modal */}
      <CreateSeasonModal
        isOpen={showCreateSeason}
        onClose={() => setShowCreateSeason(false)}
        onSubmit={handleCreateSeason}
      />
    </div>
  )
}
