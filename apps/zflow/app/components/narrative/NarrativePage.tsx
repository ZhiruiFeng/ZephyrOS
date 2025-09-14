'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PlusIcon, ArrowLeftIcon, ArrowRightIcon, BookOpenIcon } from 'lucide-react'
import { useSeasons } from '../../../hooks/useSeasons'
import { useEpisodes } from '../../../hooks/useEpisodes'
import { useNarrativeTheme } from '../../../hooks/useNarrativeTheme'
import { SeasonCover } from './SeasonCover'
import { EpisodeCard } from './EpisodeCard'
import { AddEpisodeForm } from './AddEpisodeForm'
import { CreateSeasonModal } from './CreateSeasonModal'
import type { CreateSeasonRequest, CreateEpisodeRequest, SeasonTheme } from '../../../types/narrative'

export function NarrativePage() {
  const [currentSeasonIndex, setCurrentSeasonIndex] = useState(0)
  const [showCreateSeason, setShowCreateSeason] = useState(false)

  const { seasons, activeSeason, loading: seasonsLoading, createSeason, updateSeason } = useSeasons()

  // Use active season or fallback to first season
  const currentSeason = activeSeason || seasons[currentSeasonIndex] || null

  const {
    episodes,
    loading: episodesLoading,
    createEpisode,
    updateEpisode,
    deleteEpisode
  } = useEpisodes(currentSeason?.id)

  const { gradientClasses, colorClasses } = useNarrativeTheme(currentSeason?.theme)

  // Handle season creation
  const handleCreateSeason = async (data: CreateSeasonRequest) => {
    try {
      const newSeason = await createSeason(data)
      // Switch to the new season
      const newIndex = seasons.findIndex(s => s.id === newSeason.id)
      if (newIndex >= 0) {
        setCurrentSeasonIndex(newIndex)
      }
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

  // Navigation between seasons
  const handlePreviousSeason = () => {
    setCurrentSeasonIndex(Math.max(0, currentSeasonIndex - 1))
  }

  const handleNextSeason = () => {
    setCurrentSeasonIndex(Math.min(seasons.length - 1, currentSeasonIndex + 1))
  }

  const handleSeasonSelect = (index: number) => {
    setCurrentSeasonIndex(index)
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
    <div className="min-h-screen">
      {/* Season Navigation */}
      {seasons.length > 1 && (
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-gray-200 dark:bg-gray-900/80 dark:border-gray-700">
          <div className="max-w-4xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={handlePreviousSeason}
                  disabled={currentSeasonIndex === 0}
                  className="rounded-lg p-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <ArrowLeftIcon className="h-5 w-5" />
                </button>

                <div className="flex gap-2">
                  {seasons.map((season, index) => (
                    <button
                      key={season.id}
                      onClick={() => handleSeasonSelect(index)}
                      className={`rounded-lg px-3 py-1 text-sm font-medium transition-colors ${
                        index === currentSeasonIndex
                          ? `${colorClasses.primaryBg} ${colorClasses.primary}`
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
                      }`}
                    >
                      <span className="mr-1">{season.theme === 'spring' ? '🌱' : season.theme === 'summer' ? '☀️' : season.theme === 'autumn' ? '🍂' : '❄️'}</span>
                      {season.title}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleNextSeason}
                  disabled={currentSeasonIndex === seasons.length - 1}
                  className="rounded-lg p-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <ArrowRightIcon className="h-5 w-5" />
                </button>
              </div>

              <button
                onClick={() => setShowCreateSeason(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white font-medium hover:bg-blue-700 transition-colors"
              >
                <PlusIcon className="h-4 w-4" />
                New Season
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {currentSeason && (
            <motion.div
              key={currentSeason.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              {/* Season Cover */}
              <SeasonCover
                season={currentSeason}
                isEditable={true}
                onUpdate={handleUpdateSeason}
              />

              {/* Episodes Section */}
              <div>
                <div className="mb-6 flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    Episodes
                  </h2>
                  <div className="text-sm text-gray-500">
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
                    <div className="flex items-center justify-center py-8">
                      <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-blue-600"></div>
                      <span className="ml-2 text-sm text-gray-600">Loading episodes...</span>
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
                    <div className="text-center py-12 text-gray-500">
                      <p>No episodes yet in this season.</p>
                      <p className="text-sm mt-1">Add your first episode to start capturing your story.</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Create Season Modal */}
        <CreateSeasonModal
          isOpen={showCreateSeason}
          onClose={() => setShowCreateSeason(false)}
          onSubmit={handleCreateSeason}
        />
      </div>
    </div>
  )
}