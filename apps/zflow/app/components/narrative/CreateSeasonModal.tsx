'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, SparklesIcon } from 'lucide-react'
import { useNarrativeTheme, useAdaptiveTheme, useThemeContentSuggestions } from '../../../hooks/useNarrativeTheme'
import type { CreateSeasonRequest, SeasonTheme } from '../../../types/narrative'
import { SEASON_THEMES } from '../../../types/narrative'

interface CreateSeasonModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: CreateSeasonRequest) => Promise<void>
}

export function CreateSeasonModal({ isOpen, onClose, onSubmit }: CreateSeasonModalProps) {
  const adaptiveTheme = useAdaptiveTheme()

  const [title, setTitle] = useState('')
  const [intention, setIntention] = useState('')
  const [theme, setTheme] = useState<SeasonTheme>(adaptiveTheme)
  const [startDate, setStartDate] = useState(() => {
    return new Date().toISOString().split('T')[0]
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { gradientClasses } = useNarrativeTheme(theme)
  const contentSuggestions = useThemeContentSuggestions(theme)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      await onSubmit({
        title: title.trim(),
        intention: intention.trim() || undefined,
        theme,
        start_date: startDate
      })
      handleClose()
    } catch (error) {
      console.error('Failed to create season:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setTitle('')
    setIntention('')
    setTheme(adaptiveTheme)
    setStartDate(new Date().toISOString().split('T')[0])
    onClose()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.metaKey) {
      e.preventDefault()
      handleSubmit(e as any)
    } else if (e.key === 'Escape') {
      handleClose()
    }
  }

  const handleTitleSuggestion = (suggestedTitle: string) => {
    setTitle(suggestedTitle)
  }

  const handleIntentionSuggestion = (suggestedIntention: string) => {
    setIntention(suggestedIntention)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-md sm:max-w-lg max-h-[95vh] sm:max-h-[90vh] overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-gray-800 flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header with theme gradient */}
              <div className={`bg-gradient-to-r ${gradientClasses.background} px-4 sm:px-6 py-3 sm:py-4 flex-shrink-0`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <SparklesIcon className="h-6 w-6 text-white" />
                    <h2 className="text-lg sm:text-xl font-bold text-white">Create New Season</h2>
                  </div>
                  <button
                    onClick={handleClose}
                    className="rounded-lg p-2 text-white/80 transition-colors hover:bg-white/10"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Form */}
              <div className="flex-1 overflow-y-auto">
                <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                {/* Theme Selection */}
                <div>
                  <label className="mb-3 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Choose Your Theme
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                    {Object.entries(SEASON_THEMES).map(([themeKey, themeConfig]) => (
                      <button
                        key={themeKey}
                        type="button"
                        onClick={() => setTheme(themeKey as SeasonTheme)}
                        className={`rounded-lg border-2 p-3 sm:p-4 text-left transition-all ${
                          theme === themeKey
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 hover:border-gray-300 dark:border-gray-600 dark:hover:border-gray-500'
                        }`}
                      >
                        <div className="flex items-center gap-2 sm:gap-3">
                          <span className="text-xl sm:text-2xl" role="img" aria-label={themeConfig.name}>
                            {themeConfig.emoji}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-gray-900 dark:text-gray-100 text-sm sm:text-base">
                              {themeConfig.name}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400 truncate sm:whitespace-normal">
                              {themeConfig.description}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Title Input */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Season Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full rounded-lg border border-gray-300 p-2 sm:p-3 text-sm sm:text-base outline-none focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700"
                    placeholder="Give your season a meaningful name..."
                    required
                  />

                  {/* Title suggestions */}
                  {!title && (
                    <div className="mt-2">
                      <div className="mb-1 text-xs text-gray-500">Suggestions:</div>
                      <div className="flex flex-wrap gap-1">
                        {contentSuggestions.episodeTitles.slice(0, 2).map((suggestion) => (
                          <button
                            key={suggestion}
                            type="button"
                            onClick={() => handleTitleSuggestion(suggestion)}
                            className="rounded-full bg-gray-100 px-2 sm:px-3 py-1 text-xs text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 truncate max-w-32 sm:max-w-none"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Intention Input */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Season Intention (optional)
                  </label>
                  <textarea
                    value={intention}
                    onChange={(e) => setIntention(e.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={2}
                    className="w-full resize-none rounded-lg border border-gray-300 p-2 sm:p-3 text-sm sm:text-base outline-none focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700"
                    placeholder="What do you hope to achieve or explore this season?"
                  />

                  {/* Intention suggestions */}
                  {!intention && (
                    <div className="mt-2">
                      <div className="mb-1 text-xs text-gray-500">Ideas:</div>
                      <div className="space-y-1">
                        {contentSuggestions.intentions.slice(0, 1).map((suggestion) => (
                          <button
                            key={suggestion}
                            type="button"
                            onClick={() => handleIntentionSuggestion(suggestion)}
                            className="block w-full rounded bg-gray-100 px-2 sm:px-3 py-2 text-left text-xs text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 line-clamp-2"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Start Date */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 p-2 sm:p-3 text-sm sm:text-base outline-none focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-4">
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={isSubmitting}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:hover:bg-gray-700 order-2 sm:order-1"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !title.trim()}
                    className={`rounded-lg px-6 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50 order-1 sm:order-2 ${
                      theme === 'spring'
                        ? 'bg-green-500 hover:bg-green-600'
                        : theme === 'summer'
                        ? 'bg-amber-500 hover:bg-amber-600'
                        : theme === 'autumn'
                        ? 'bg-orange-500 hover:bg-orange-600'
                        : 'bg-slate-500 hover:bg-slate-600'
                    }`}
                  >
                    {isSubmitting ? 'Creating...' : 'Create Season'}
                  </button>
                </div>
              </form>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}