// =====================================================
// Narrative Feature - Main Page Component
// =====================================================

'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PlusIcon, BookOpenIcon } from 'lucide-react'
import { useSeasons } from '@/strategy'
import { useEpisodes } from './hooks/useEpisodes'
import { SeasonCover } from '@/app/components/narrative/SeasonCover'
import { EpisodeCard } from '@/app/components/narrative/EpisodeCard'
import { AddEpisodeForm } from '@/app/components/narrative/AddEpisodeForm'
import { CreateSeasonModal } from '@/app/components/narrative/CreateSeasonModal'
import { SeasonSelector } from '@/app/components/narrative/SeasonSelector'
import type { CreateSeasonRequest, CreateEpisodeRequest } from './types/narrative'

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
    return await updateEpisode(episodeId, updates)
  }

  // Handle episode deletion
  const handleDeleteEpisode = async (episodeId: string) => {
    return await deleteEpisode(episodeId)
  }

  const isLoading = seasonsLoading || episodesLoading

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <div className="sticky top-14 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200/60 dark:bg-gray-900/80">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BookOpenIcon className="w-8 h-8 text-primary-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Life Narrative</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Live your life as a story composed of seasons and episodes
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSeasonSelectorExpanded(!isSeasonSelectorExpanded)}
                className="flex items-center gap-2 px-4 py-2 bg-primary-100 hover:bg-primary-200 text-primary-700 rounded-lg transition-colors dark:bg-primary-900/50 dark:hover:bg-primary-900/70 dark:text-primary-300"
              >
                <PlusIcon className="w-4 h-4" />
                {currentSeason ? 'Switch Season' : 'Select Season'}
              </button>
              
              <button
                onClick={() => setShowCreateSeason(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
              >
                <PlusIcon className="w-4 h-4" />
                New Season
              </button>
            </div>
          </div>

          {/* Season Selector */}
          <AnimatePresence>
            {isSeasonSelectorExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="mt-4"
              >
                <SeasonSelector
                  seasons={seasons}
                  activeSeasonId={activeSeason?.id}
                  selectedSeasonId={selectedSeasonId}
                  onSelectSeason={selectSeason}
                  onCreateSeason={() => setShowCreateSeason(true)}
                  isExpanded={isSeasonSelectorExpanded}
                  onToggle={() => setSeasonSelectorExpanded(!isSeasonSelectorExpanded)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading your narrative...</p>
            </div>
          </div>
        ) : currentSeason ? (
          <div className="space-y-8">
            {/* Season Cover */}
            <SeasonCover
              season={currentSeason}
              isEditable={true}
              onUpdate={handleUpdateSeason}
              onDelete={() => deleteSeason(currentSeason.id)}
            />

            {/* Episodes Section */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Episodes ({episodes.length})
                </h2>
                <AddEpisodeForm
                  seasonId={currentSeason.id}
                  seasonTheme={currentSeason.theme}
                  onAdd={handleCreateEpisode}
                />
              </div>

              {episodes.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {episodes.map((episode) => (
                    <EpisodeCard
                      key={episode.id}
                      episode={episode}
                      seasonTheme={currentSeason.theme}
                      isEditable={true}
                      onUpdate={async (updates) => {
                        await handleUpdateEpisode(episode.id, updates)
                      }}
                      onDelete={() => handleDeleteEpisode(episode.id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <BookOpenIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No episodes yet
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Start documenting your journey by creating your first episode.
                  </p>
                  <AddEpisodeForm
                    seasonId={currentSeason.id}
                    seasonTheme={currentSeason.theme}
                    onAdd={handleCreateEpisode}
                  />
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <BookOpenIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Welcome to your Life Narrative
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
              Start your journey by creating your first season. Think of seasons as chapters in your life story.
            </p>
            <button
              onClick={() => setShowCreateSeason(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
            >
              <PlusIcon className="w-5 h-5" />
              Create Your First Season
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
