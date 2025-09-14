'use client'

import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { PencilIcon, CheckIcon, X } from 'lucide-react'
import { useNarrativeTheme } from '../../../hooks/useNarrativeTheme'
import type { Season, SeasonTheme } from '../../../types/narrative'

interface SeasonCoverProps {
  season: Season
  isEditable?: boolean
  onUpdate?: (updates: { title?: string; intention?: string; theme?: SeasonTheme }) => Promise<void>
  className?: string
}

export function SeasonCover({
  season,
  isEditable = false,
  onUpdate,
  className = ''
}: SeasonCoverProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedTitle, setEditedTitle] = useState(season.title)
  const [editedIntention, setEditedIntention] = useState(season.intention || '')
  const [editedTheme, setEditedTheme] = useState(season.theme)
  const [isUpdating, setIsUpdating] = useState(false)

  const titleInputRef = useRef<HTMLInputElement>(null)
  const intentionTextareaRef = useRef<HTMLTextAreaElement>(null)

  const { theme, gradientClasses, cssVariables } = useNarrativeTheme(season.theme)

  // Pre-compute theme configs for all seasons to avoid calling hooks inside callbacks
  const springTheme = useNarrativeTheme('spring').theme
  const summerTheme = useNarrativeTheme('summer').theme
  const autumnTheme = useNarrativeTheme('autumn').theme
  const winterTheme = useNarrativeTheme('winter').theme

  const themeConfigs = {
    spring: springTheme,
    summer: summerTheme,
    autumn: autumnTheme,
    winter: winterTheme
  }

  const handleEdit = () => {
    setIsEditing(true)
    setTimeout(() => {
      titleInputRef.current?.focus()
      titleInputRef.current?.select()
    }, 100)
  }

  const handleCancel = () => {
    setEditedTitle(season.title)
    setEditedIntention(season.intention || '')
    setEditedTheme(season.theme)
    setIsEditing(false)
  }

  const handleSave = async () => {
    if (!onUpdate || !editedTitle.trim()) return

    setIsUpdating(true)
    try {
      const updates: any = {}
      if (editedTitle !== season.title) updates.title = editedTitle.trim()
      if (editedIntention !== (season.intention || '')) updates.intention = editedIntention.trim() || undefined
      if (editedTheme !== season.theme) updates.theme = editedTheme

      if (Object.keys(updates).length > 0) {
        await onUpdate(updates)
      }
      setIsEditing(false)
    } catch (error) {
      console.error('Failed to update season:', error)
    } finally {
      setIsUpdating(false)
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
      className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${gradientClasses.background} p-6 ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Background pattern and contrast overlay */}
      <div className="absolute inset-0 opacity-10">
        <div className="h-full w-full bg-gradient-to-br from-white/20 to-transparent" />
      </div>

      {/* Artistic colorful glow (themed by season) */}
      <div aria-hidden className="absolute inset-0 pointer-events-none">
        <div
          className="absolute -inset-16 blur-3xl opacity-40"
          style={{
            ...cssVariables,
            background:
              'radial-gradient(600px circle at 0% 10%, var(--season-primary) 0%, transparent 60%),\n               radial-gradient(500px circle at 90% 20%, var(--season-accent) 0%, transparent 60%),\n               radial-gradient(420px circle at 10% 90%, var(--season-secondary) 0%, transparent 55%)',
            transform: 'translateZ(0)'
          }}
        />
      </div>

      {/* Subtle contrast overlay for better text readability */}
      <div className="absolute inset-0 bg-white/20 dark:bg-black/30" />

      {/* Content */}
      <div className="relative z-10">
        {/* Header with edit button */}
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl" role="img" aria-label={theme.name}>
              {theme.emoji}
            </span>
            <div className="text-sm font-medium text-gray-700 dark:text-white/80">
              {theme.name} Season
            </div>
          </div>

          {isEditable && !isEditing && (
            <button
              onClick={handleEdit}
              className="rounded-lg bg-black/10 dark:bg-white/10 p-2 text-gray-700 dark:text-white/80 transition-colors hover:bg-black/20 dark:hover:bg-white/20"
              title="Edit season"
            >
              <PencilIcon className="h-4 w-4" />
            </button>
          )}

          {isEditing && (
            <div className="flex items-center gap-2">
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
                className="rounded-lg bg-black/10 dark:bg-white/10 p-2 text-gray-700 dark:text-white/80 transition-colors hover:bg-black/20 dark:hover:bg-white/20 disabled:opacity-50"
                title="Cancel editing"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* Title */}
        <div className="mb-4">
          {isEditing ? (
            <input
              ref={titleInputRef}
              type="text"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full bg-transparent text-2xl font-bold text-gray-800 dark:text-white placeholder-gray-500 dark:placeholder-white/60 outline-none md:text-3xl"
              placeholder="Season title..."
            />
          ) : (
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white md:text-3xl">
              {season.title}
            </h1>
          )}
        </div>

        {/* Theme selector (when editing) */}
        {isEditing && (
          <div className="mb-4">
            <div className="mb-2 text-sm font-medium text-gray-700 dark:text-white/80">Theme</div>
            <div className="flex gap-2">
              {(['spring', 'summer', 'autumn', 'winter'] as SeasonTheme[]).map((themeOption) => {
                const themeConfig = themeConfigs[themeOption]
                return (
                  <button
                    key={themeOption}
                    onClick={() => setEditedTheme(themeOption)}
                    className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      editedTheme === themeOption
                        ? 'bg-black/20 dark:bg-white/20 text-gray-800 dark:text-white'
                        : 'bg-black/10 dark:bg-white/10 text-gray-600 dark:text-white/70 hover:bg-black/15 dark:hover:bg-white/15'
                    }`}
                  >
                    {themeConfig.emoji} {themeConfig.name}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Intention */}
        <div className="mb-6">
          {isEditing ? (
            <div>
              <div className="mb-2 text-sm font-medium text-gray-700 dark:text-white/80">Intention</div>
              <textarea
                ref={intentionTextareaRef}
                value={editedIntention}
                onChange={(e) => setEditedIntention(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={3}
                className="w-full resize-none bg-black/5 dark:bg-white/10 rounded-lg p-3 text-gray-800 dark:text-white placeholder-gray-500 dark:placeholder-white/60 outline-none focus:bg-black/10 dark:focus:bg-white/15"
                placeholder="What's your intention for this season?"
              />
            </div>
          ) : (
            season.intention && (
              <div>
                <div className="mb-2 text-sm font-medium text-gray-700 dark:text-white/80">Intention</div>
                <p className="text-gray-700 dark:text-white/90 leading-relaxed">
                  {season.intention}
                </p>
              </div>
            )
          )}
        </div>

        {/* Season metadata */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-white/70">
          <div className="flex items-center gap-2">
            <span className="font-medium">Status:</span>
            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
              season.status === 'active'
                ? 'bg-green-500/20 text-green-100'
                : season.status === 'completed'
                ? 'bg-blue-500/20 text-blue-100'
                : 'bg-orange-500/20 text-orange-100'
            }`}>
              {season.status}
            </span>
          </div>

          {season.start_date && (
            <div className="flex items-center gap-2">
              <span className="font-medium">Started:</span>
              <span>{new Date(season.start_date).toLocaleDateString()}</span>
            </div>
          )}

          {season.end_date && (
            <div className="flex items-center gap-2">
              <span className="font-medium">Ended:</span>
              <span>{new Date(season.end_date).toLocaleDateString()}</span>
            </div>
          )}
        </div>

        {/* Theme description */}
        <div className="mt-4 text-sm text-gray-500 dark:text-white/60">
          {theme.description}
        </div>
      </div>
    </motion.div>
  )
}
