'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PlusIcon, BookOpenIcon } from 'lucide-react'
import { useSeasons } from '@/strategy'
import { useEpisodes } from '@/narrative'
import { SeasonCover } from './components/SeasonCover'
import { EpisodeCard } from './components/EpisodeCard'
import { AddEpisodeForm } from './components/AddEpisodeForm'
import { CreateSeasonModal } from './components/CreateSeasonModal'
import { SeasonSelector } from './components/SeasonSelector'
import type { CreateSeasonRequest, CreateEpisodeRequest } from '@/narrative'

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
    if (!manualSelectionRef.current) return

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
    } catch (error) {
      console.error('Failed to create season:', error)
    }
  }

  // Handle episode creation
  const handleCreateEpisode = async (data: CreateEpisodeRequest) => {
    try {
      await createEpisode(data)
    } catch (error) {
      console.error('Failed to create episode:', error)
    }
  }

  // Handle episode update
  const handleUpdateEpisode = async (episodeId: string, data: Partial<CreateEpisodeRequest>) => {
    try {
      await updateEpisode(episodeId, data)
    } catch (error) {
      console.error('Failed to update episode:', error)
    }
  }

  // Handle episode deletion
  const handleDeleteEpisode = async (episodeId: string) => {
    try {
      await deleteEpisode(episodeId)
    } catch (error) {
      console.error('Failed to delete episode:', error)
    }
  }

  if (seasonsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* Season Selector */}
        <div className="mb-6">
          <SeasonSelector
            seasons={seasons}
            selectedSeasonId={selectedSeasonId}
            activeSeasonId={selectedSeasonId}
            onSelectSeason={selectSeason}
            onCreateSeason={() => setShowCreateSeason(true)}
            isExpanded={isSeasonSelectorExpanded}
            onToggle={() => setSeasonSelectorExpanded(!isSeasonSelectorExpanded)}
          />
        </div>

        {currentSeason ? (
          <div className="space-y-6">
            {/* Season Cover */}
            <SeasonCover
              season={currentSeason}
              isEditable={true}
              onUpdate={async (updates) => {
                await updateSeason(currentSeason.id, updates)
              }}
            />

            {/* Episodes Section */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Episodes
                </h2>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {episodes.length} episode{episodes.length !== 1 ? 's' : ''}
                </div>
              </div>

              {/* Add Episode Form */}
              <div className="mb-6">
                <AddEpisodeForm
                  seasonId={currentSeason.id}
                  seasonTheme={currentSeason.theme}
                  onAdd={async (episodeData) => {
                    await createEpisode(episodeData)
                    return {} as any // Return dummy episode for type compatibility
                  }}
                />
              </div>

              {/* Episodes List */}
              {episodesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                </div>
              ) : episodes.length > 0 ? (
                <div className="space-y-4">
                  <AnimatePresence>
                    {episodes.map((episode) => (
                      <motion.div
                        key={episode.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.2 }}
                      >
                        <EpisodeCard
                          episode={episode}
                          seasonTheme={currentSeason.theme}
                          isEditable={true}
                          onUpdate={async (updates) => {
                            await updateEpisode(episode.id, updates)
                          }}
                          onDelete={async () => {
                            await deleteEpisode(episode.id)
                          }}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="text-center py-12">
                  <BookOpenIcon className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No episodes yet
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Create your first episode to start documenting your journey.
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <BookOpenIcon className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No seasons yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Create your first season to start organizing your narrative.
            </p>
            <button
              onClick={() => setShowCreateSeason(true)}
              className="flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors mx-auto"
            >
              <PlusIcon className="w-5 h-5" />
              Create First Season
            </button>
          </div>
        )}
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