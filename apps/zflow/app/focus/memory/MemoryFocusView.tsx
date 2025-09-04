'use client'

import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Calendar, MapPin, Star, Tag, Pencil, Trash2 } from 'lucide-react'
import { useAuth } from '../../../contexts/AuthContext'
import { useTranslation } from '../../../contexts/LanguageContext'
import { Memory } from '../../types/memory'
import { memoriesApi } from '../../../lib/memories-api'

function formatDateTime(ts?: string | null) {
  if (!ts) return '—'
  try {
    const d = new Date(ts)
    return d.toLocaleString()
  } catch {
    return ts
  }
}

export default function MemoryFocusView() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const memoryId = searchParams.get('memoryId') || ''

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [memory, setMemory] = useState<Memory | null>(null)
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [emotionValence, setEmotionValence] = useState<number | null>(null)
  const [placeName, setPlaceName] = useState<string>('')
  const [tags, setTags] = useState<string>('')
  const [isSaving, setIsSaving] = useState(false)

  // Load memory detail
  useEffect(() => {
    let mounted = true
    const load = async () => {
      if (!memoryId) return
      setLoading(true)
      try {
        const m = await memoriesApi.getById(memoryId)
        if (!mounted) return
        setMemory(m)
        setTitle(m.title || m.title_override || (m.note?.split('\n')[0] || ''))
        setNote(m.note || '')
        setEmotionValence(m.emotion_valence ?? null)
        setPlaceName(m.place_name || '')
        setTags((m.tags || []).join(', '))
        setError(null)
      } catch (e) {
        console.error('Failed to load memory', e)
        setError('Failed to load memory')
      } finally {
        setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [memoryId])

  // Auto-save changes (debounced)
  const autoSave = useCallback(async () => {
    if (!memory || !memoryId) return
    setIsSaving(true)
    try {
      const trimmedTitle = title.trim()
      const trimmedNote = note.trim()
      const trimmedPlace = placeName.trim()
      const tagArray = tags.split(',').map(s => s.trim()).filter(Boolean)

      const updated = await memoriesApi.update(memoryId, {
        title: trimmedTitle || undefined,
        note: trimmedNote.length > 0 ? trimmedNote : undefined,
        emotion_valence: emotionValence ?? undefined,
        place_name: trimmedPlace || undefined,
        tags: tagArray.length > 0 ? tagArray : undefined,
      })
      setMemory(updated)
    } catch (e) {
      console.error('Auto-save failed', e)
    } finally {
      setIsSaving(false)
    }
  }, [memory, memoryId, title, note, emotionValence, placeName, tags])

  useEffect(() => {
    const h = setTimeout(autoSave, 1500)
    return () => clearTimeout(h)
  }, [autoSave])

  const displayTitle = useMemo(() => {
    const base = title?.trim() || memory?.title_override || (memory?.note?.split('\n')[0] || '')
    return base || 'Untitled Memory'
  }, [title, memory])

  const handleToggleHighlight = async () => {
    if (!memory || !memoryId) return
    try {
      const updated = await memoriesApi.update(memoryId, { is_highlight: !memory.is_highlight })
      setMemory(updated)
    } catch (e) {
      console.error('Toggle highlight failed', e)
    }
  }

  const handleDelete = async () => {
    if (!memoryId) return
    if (!confirm('Archive this memory? It will be hidden from lists.')) return
    try {
      await memoriesApi.delete(memoryId)
      router.push('/memories')
    } catch (e) {
      alert('Failed to archive memory')
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Sign in to view memory</div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    )
  }

  if (error || !memory) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-500 mb-4">{error || 'Memory not found'}</div>
          <button onClick={() => router.push('/memories')} className="text-blue-600 hover:text-blue-700">Back to Memories</button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/memories')} className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={displayTitle}
              className="text-lg sm:text-xl font-semibold text-gray-900 bg-transparent border-none outline-none focus:ring-0"
            />
          </div>
          <div className="flex items-center gap-2 text-sm">
            {isSaving && <span className="text-gray-500">Saving…</span>}
            <button onClick={handleToggleHighlight} className={`px-3 py-1.5 rounded-lg border ${memory.is_highlight ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-gray-600 hover:text-amber-700 hover:border-amber-300'}`}>
              <Star className={`w-4 h-4 ${memory.is_highlight ? 'fill-current' : ''}`} />
            </button>
            <button onClick={handleDelete} className="px-3 py-1.5 rounded-lg border text-red-600 hover:bg-red-50">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Metadata */}
        <div className="space-y-6">
          <div className="bg-white/80 backdrop-blur-md rounded-xl p-5 shadow-sm border border-white/40">
            <h3 className="text-sm font-semibold text-gray-800 mb-4">Details</h3>
            <div className="space-y-3 text-sm text-gray-700">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span>Captured: {formatDateTime(memory.captured_at)}</span>
              </div>
              {memory.happened_range?.start && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span>Happened: {formatDateTime(memory.happened_range.start)}{memory.happened_range.end ? ` → ${formatDateTime(memory.happened_range.end)}` : ''}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-500" />
                <input
                  value={placeName}
                  onChange={(e) => setPlaceName(e.target.value)}
                  placeholder="Add a place"
                  className="flex-1 bg-white/60 border border-gray-200 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-gray-500" />
                  <span>Tags</span>
                </div>
                <input
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="tag1, tag2"
                  className="w-full bg-white/60 border border-gray-200 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <div className="mb-2 text-sm font-medium text-gray-700">Emotion Valence</div>
                <input
                  type="range"
                  min={-5}
                  max={5}
                  step={1}
                  value={emotionValence ?? 0}
                  onChange={(e) => setEmotionValence(parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="text-xs text-gray-500 mt-1">{emotionValence ?? 0}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Content */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white/80 backdrop-blur-md rounded-xl p-5 shadow-sm border border-white/40">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-800">Content</h3>
              <div className="text-xs text-gray-500 flex items-center gap-2">
                <Pencil className="w-3.5 h-3.5" />
                <span>Autosaves</span>
              </div>
            </div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Write your memory details…"
              className="w-full min-h-[280px] p-4 border border-gray-200 rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white/70"
            />
          </div>

          {/* Meta preview */}
          <div className="bg-white/70 rounded-xl p-5 border border-white/40">
            <div className="text-xs text-gray-500">ID: {memory.id}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
