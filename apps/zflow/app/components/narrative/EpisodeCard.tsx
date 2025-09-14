'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PencilIcon, TrashIcon, CheckIcon, X, Calendar } from 'lucide-react'
import { useNarrativeTheme } from '../../../hooks/useNarrativeTheme'
import type { Episode, SeasonTheme } from '../../../types/narrative'

interface EpisodeCardProps {
  episode: Episode
  seasonTheme: SeasonTheme
  isEditable?: boolean
  onUpdate?: (updates: Partial<Episode>) => Promise<void>
  onDelete?: () => Promise<void>
  className?: string
}

export function EpisodeCard({
  episode,
  seasonTheme,
  isEditable = false,
  onUpdate,
  onDelete,
  className = ''
}: EpisodeCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  const [editedTitle, setEditedTitle] = useState(episode.title)
  const [editedMoodEmoji, setEditedMoodEmoji] = useState(episode.mood_emoji || '')
  const [editedReflection, setEditedReflection] = useState(episode.reflection || '')
  const [editedStartDate, setEditedStartDate] = useState(episode.date_range_start)
  const [editedEndDate, setEditedEndDate] = useState(episode.date_range_end)

  const titleInputRef = useRef<HTMLInputElement>(null)
  const { colorClasses } = useNarrativeTheme(seasonTheme)

  // Calculate episode duration
  const startDate = new Date(episode.date_range_start)
  const endDate = new Date(episode.date_range_end)
  const daysDuration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1

  const formatDateRange = () => {
    if (episode.date_range_start === episode.date_range_end) {
      return startDate.toLocaleDateString()
    }
    return `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`
  }

  const handleEdit = () => {
    setIsEditing(true)
    setTimeout(() => {
      titleInputRef.current?.focus()
      titleInputRef.current?.select()
    }, 100)
  }

  const handleCancel = () => {
    setEditedTitle(episode.title)
    setEditedMoodEmoji(episode.mood_emoji || '')
    setEditedReflection(episode.reflection || '')
    setEditedStartDate(episode.date_range_start)
    setEditedEndDate(episode.date_range_end)
    setIsEditing(false)
  }

  const handleSave = async () => {
    if (!onUpdate || !editedTitle.trim()) return

    setIsUpdating(true)
    try {
      const updates: any = {}
      if (editedTitle !== episode.title) updates.title = editedTitle.trim()
      if (editedMoodEmoji !== (episode.mood_emoji || '')) updates.mood_emoji = editedMoodEmoji || undefined
      if (editedReflection !== (episode.reflection || '')) updates.reflection = editedReflection.trim() || undefined
      if (editedStartDate !== episode.date_range_start) updates.date_range_start = editedStartDate
      if (editedEndDate !== episode.date_range_end) updates.date_range_end = editedEndDate

      if (Object.keys(updates).length > 0) {
        await onUpdate(updates)
      }
      setIsEditing(false)
    } catch (error) {
      console.error('Failed to update episode:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDelete = async () => {
    if (!onDelete) return

    setIsDeleting(true)
    try {
      await onDelete()
    } catch (error) {
      console.error('Failed to delete episode:', error)
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.metaKey) {
      handleSave()
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className={`relative overflow-hidden rounded-lg border ${colorClasses.border} bg-white dark:bg-gray-800 ${className}`}
    >
      {/* Header */}
      <div className={`px-4 py-3 ${colorClasses.primaryBg} border-b ${colorClasses.border}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Mood emoji */}
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/80 dark:bg-gray-700">
              {isEditing ? (
                <input
                  type="text"
                  value={editedMoodEmoji}
                  onChange={(e) => setEditedMoodEmoji(e.target.value.slice(0, 2))}
                  className="h-6 w-6 bg-transparent text-center text-lg outline-none"
                  placeholder="😊"
                />
              ) : (
                <span className="text-lg" role="img">
                  {episode.mood_emoji || '📝'}
                </span>
              )}
            </div>

            {/* Title and date */}
            <div className="flex-1">
              {isEditing ? (
                <input
                  ref={titleInputRef}
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className={`w-full bg-transparent font-medium ${colorClasses.primary} outline-none`}
                  placeholder="Episode title..."
                />
              ) : (
                <h3 className={`font-medium ${colorClasses.primary}`}>
                  {episode.title}
                </h3>
              )}

              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <Calendar className="h-3 w-3" />
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={editedStartDate}
                      onChange={(e) => setEditedStartDate(e.target.value)}
                      className="bg-transparent text-xs outline-none"
                    />
                    <span>-</span>
                    <input
                      type="date"
                      value={editedEndDate}
                      onChange={(e) => setEditedEndDate(e.target.value)}
                      className="bg-transparent text-xs outline-none"
                    />
                  </div>
                ) : (
                  <span>{formatDateRange()} ({daysDuration} day{daysDuration !== 1 ? 's' : ''})</span>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          {isEditable && (
            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <button
                    onClick={handleSave}
                    disabled={isUpdating || !editedTitle.trim()}
                    className="rounded-lg bg-green-500 p-2 text-white transition-colors hover:bg-green-600 disabled:opacity-50"
                    title="Save changes"
                  >
                    <CheckIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={isUpdating}
                    className="rounded-lg bg-gray-500 p-2 text-white transition-colors hover:bg-gray-600 disabled:opacity-50"
                    title="Cancel editing"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleEdit}
                    className={`rounded-lg p-2 transition-colors ${colorClasses.hover}`}
                    title="Edit episode"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="rounded-lg p-2 text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
                    title="Delete episode"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      {(episode.reflection || isEditing) && (
        <div className="p-4">
          {isEditing ? (
            <textarea
              value={editedReflection}
              onChange={(e) => setEditedReflection(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={4}
              className="w-full resize-none rounded-lg border border-gray-300 p-3 text-sm outline-none focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700"
              placeholder="Share your thoughts about this episode..."
            />
          ) : (
            <div className="prose max-w-none text-sm text-gray-700 dark:text-gray-300">
              {episode.reflection?.split('\n').map((line, index) => (
                <p key={index} className={index > 0 ? 'mt-2' : ''}>
                  {line}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Delete confirmation modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-black/50"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="rounded-lg bg-white p-6 dark:bg-gray-800"
            >
              <h4 className="mb-2 font-medium text-gray-900 dark:text-gray-100">
                Delete Episode
              </h4>
              <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                Are you sure you want to delete &quot;{episode.title}&quot;? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="rounded-lg bg-red-500 px-4 py-2 text-sm text-white transition-colors hover:bg-red-600 disabled:opacity-50"
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}