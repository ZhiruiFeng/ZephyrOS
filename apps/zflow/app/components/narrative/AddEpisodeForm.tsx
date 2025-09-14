'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PlusIcon, X, CalendarIcon } from 'lucide-react'
import { useNarrativeTheme, useThemeMoodSuggestions, useThemeContentSuggestions } from '../../../hooks/useNarrativeTheme'
import type { Episode, SeasonTheme, CreateEpisodeRequest } from '../../../types/narrative'

interface AddEpisodeFormProps {
  seasonId: string
  seasonTheme: SeasonTheme
  onAdd: (episode: CreateEpisodeRequest) => Promise<Episode>
  onCancel?: () => void
  isInline?: boolean
  className?: string
}

export function AddEpisodeForm({
  seasonId,
  seasonTheme,
  onAdd,
  onCancel,
  isInline = true,
  className = ''
}: AddEpisodeFormProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [title, setTitle] = useState('')
  const [moodEmoji, setMoodEmoji] = useState('')
  const [reflection, setReflection] = useState('')
  const [dateRangeStart, setDateRangeStart] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() - 7) // Default to last week
    return date.toISOString().split('T')[0]
  })
  const [dateRangeEnd, setDateRangeEnd] = useState(() => {
    const date = new Date()
    return date.toISOString().split('T')[0]
  })

  const titleInputRef = useRef<HTMLInputElement>(null)
  const { colorClasses } = useNarrativeTheme(seasonTheme)
  const moodSuggestions = useThemeMoodSuggestions(seasonTheme)
  const contentSuggestions = useThemeContentSuggestions(seasonTheme)

  const handleOpen = () => {
    setIsOpen(true)
    setTimeout(() => {
      titleInputRef.current?.focus()
    }, 100)
  }

  const handleClose = () => {
    setIsOpen(false)
    resetForm()
    onCancel?.()
  }

  const resetForm = () => {
    setTitle('')
    setMoodEmoji('')
    setReflection('')
    const today = new Date()
    const weekAgo = new Date()
    weekAgo.setDate(today.getDate() - 7)
    setDateRangeStart(weekAgo.toISOString().split('T')[0])
    setDateRangeEnd(today.toISOString().split('T')[0])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      const episodeData: CreateEpisodeRequest = {
        season_id: seasonId,
        title: title.trim(),
        date_range_start: dateRangeStart,
        date_range_end: dateRangeEnd,
        mood_emoji: moodEmoji || undefined,
        reflection: reflection.trim() || undefined
      }

      await onAdd(episodeData)
      handleClose()
    } catch (error) {
      console.error('Failed to create episode:', error)
    } finally {
      setIsSubmitting(false)
    }
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
    titleInputRef.current?.focus()
  }

  const handleMoodSelect = (emoji: string) => {
    setMoodEmoji(emoji)
  }

  if (!isOpen && isInline) {
    return (
      <motion.button
        onClick={handleOpen}
        className={`w-full rounded-lg border-2 border-dashed ${colorClasses.border} ${colorClasses.hover} p-6 text-center transition-colors ${className}`}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <div className="flex flex-col items-center gap-2">
          <PlusIcon className={`h-6 w-6 ${colorClasses.primary}`} />
          <span className={`font-medium ${colorClasses.primary}`}>
            Add New Episode
          </span>
          <span className="text-sm text-gray-500">
            Capture a highlight or reflection from your season
          </span>
        </div>
      </motion.button>
    )
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className={`rounded-lg border ${colorClasses.border} bg-white p-6 shadow-lg dark:bg-gray-800 ${className}`}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h3 className={`text-lg font-medium ${colorClasses.primary}`}>
                Add New Episode
              </h3>
              <button
                type="button"
                onClick={handleClose}
                className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Title input */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Title
              </label>
              <input
                ref={titleInputRef}
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700"
                placeholder="What happened this week?"
                required
              />

              {/* Title suggestions */}
              {!title && (
                <div className="mt-2">
                  <div className="mb-1 text-xs text-gray-500">Suggestions:</div>
                  <div className="flex flex-wrap gap-1">
                    {contentSuggestions.episodeTitles.slice(0, 3).map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => handleTitleSuggestion(suggestion)}
                        className={`rounded-full px-2 py-1 text-xs transition-colors ${colorClasses.primaryBg} ${colorClasses.primary} hover:bg-opacity-80`}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Date range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Start Date
                </label>
                <div className="relative">
                  <CalendarIcon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <input
                    type="date"
                    value={dateRangeStart}
                    onChange={(e) => setDateRangeStart(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 pl-10 pr-3 py-3 outline-none focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  End Date
                </label>
                <div className="relative">
                  <CalendarIcon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <input
                    type="date"
                    value={dateRangeEnd}
                    onChange={(e) => setDateRangeEnd(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 pl-10 pr-3 py-3 outline-none focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Mood selection */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Mood (optional)
              </label>
              <div className="flex flex-wrap gap-2">
                {moodSuggestions.map((mood) => (
                  <button
                    key={mood.emoji}
                    type="button"
                    onClick={() => handleMoodSelect(mood.emoji)}
                    className={`rounded-lg p-3 text-lg transition-colors ${
                      moodEmoji === mood.emoji
                        ? 'bg-blue-100 ring-2 ring-blue-500 dark:bg-blue-900/50'
                        : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600'
                    }`}
                    title={mood.label}
                  >
                    {mood.emoji}
                  </button>
                ))}
              </div>
              {moodEmoji && (
                <div className="mt-2 text-sm text-gray-500">
                  Selected: {moodEmoji} {moodSuggestions.find(m => m.emoji === moodEmoji)?.label}
                </div>
              )}
            </div>

            {/* Reflection textarea */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Reflection (optional)
              </label>
              <textarea
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={4}
                className="w-full resize-none rounded-lg border border-gray-300 p-3 outline-none focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700"
                placeholder={contentSuggestions.reflectionPrompts[0] || "What did you learn? How did you grow?"}
              />
            </div>

            {/* Action buttons */}
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !title.trim()}
                className={`rounded-lg px-4 py-2 text-sm text-white transition-colors disabled:opacity-50 ${
                  colorClasses.primary.includes('green')
                    ? 'bg-green-500 hover:bg-green-600'
                    : colorClasses.primary.includes('amber')
                    ? 'bg-amber-500 hover:bg-amber-600'
                    : colorClasses.primary.includes('orange')
                    ? 'bg-orange-500 hover:bg-orange-600'
                    : 'bg-slate-500 hover:bg-slate-600'
                }`}
              >
                {isSubmitting ? 'Adding...' : 'Add Episode'}
              </button>
            </div>
          </form>
        </motion.div>
      )}
    </AnimatePresence>
  )
}