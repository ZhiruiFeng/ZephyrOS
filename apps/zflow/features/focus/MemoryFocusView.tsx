'use client'

import React, { useEffect, useMemo, useState, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Calendar, MapPin, Star, Tag, Trash2, Info, ChevronDown, Plus } from 'lucide-react'
import { NotionEditor } from '@/shared/components/editors'
import { useAuth } from '@/contexts/AuthContext'
import { useTranslation } from '@/contexts/LanguageContext'
import { Memory } from '@/types/domain/memory'
import { memoriesApi } from '@/lib/api/memories-api'
import { useAutoSave } from '@/hooks/useAutoSave'
import { useCategories } from '@/hooks/useCategories'
import { TimelineItemSelector, type TimelineItem, type TimelineItemType } from '@/shared/components/selectors'

function formatDateTime(ts?: string | null) {
  if (!ts) return '—'
  try {
    const d = new Date(ts)
    return d.toLocaleString()
  } catch {
    return ts
  }
}

function MemoryFocusViewContent() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const memoryId = searchParams.get('memoryId') || ''
  const returnTo = searchParams.get('returnTo')
  const from = searchParams.get('from')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [memory, setMemory] = useState<Memory | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [note, setNote] = useState('')
  const [emotionValence, setEmotionValence] = useState<number | null>(null)
  const [emotionArousal, setEmotionArousal] = useState<number | null>(null)
  const [energyDelta, setEnergyDelta] = useState<number | null>(null)
  const [placeName, setPlaceName] = useState<string>('')
  const [latitude, setLatitude] = useState<string>('')
  const [longitude, setLongitude] = useState<string>('')
  const [tags, setTags] = useState<string>('')
  const [memoryType, setMemoryType] = useState<'note' | 'link' | 'file' | 'thought' | 'quote' | 'insight'>('note')
  const [status, setStatus] = useState<'active' | 'archived' | 'deleted'>('active')
  const [salience, setSalience] = useState<number>(0)
  const [categoryId, setCategoryId] = useState<string>('')
  const [capturedAt, setCapturedAt] = useState<string>('')
  const { categories } = useCategories()

  // Anchors
  const [anchors, setAnchors] = useState<Array<{
    memory_id: string
    anchor_item_id: string
    relation_type: string
    timeline_item?: { id: string; type: string; title: string }
  }>>([])
  const [newAnchorItemId, setNewAnchorItemId] = useState('')
  const [newAnchorRelation, setNewAnchorRelation] = useState<'context_of' | 'result_of' | 'insight_from' | 'about' | 'co_occurred' | 'triggered_by' | 'reflects_on'>('insight_from')
  const [isAddingAnchor, setIsAddingAnchor] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showDescription, setShowDescription] = useState(false)
  const [editingDescription, setEditingDescription] = useState(false)
  const [showTimelineSelector, setShowTimelineSelector] = useState(false)

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
        setDescription(m.description || '')
        setNote(m.note || '')
        setEmotionValence(m.emotion_valence ?? null)
        setEmotionArousal(m.emotion_arousal ?? null)
        setEnergyDelta(m.energy_delta ?? null)
        setPlaceName(m.place_name || '')
        setLatitude(m.latitude != null ? String(m.latitude) : '')
        setLongitude(m.longitude != null ? String(m.longitude) : '')
        setTags((m.tags || []).join(', '))
        setMemoryType(m.memory_type)
        setStatus(m.status)
        setSalience(m.salience_score ?? 0)
        setCategoryId(m.category_id || '')
        setCapturedAt(m.captured_at ? new Date(m.captured_at).toISOString().slice(0,16) : '')
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

  // Load anchors list (optional UI)
  useEffect(() => {
    let mounted = true
    const loadAnchors = async () => {
      if (!memoryId) return
      try {
        const list = await memoriesApi.getAnchors(memoryId, { limit: 20 })
        if (!mounted) return
        setAnchors(list)
      } catch {}
    }
    loadAnchors()
    return () => { mounted = false }
  }, [memoryId])

  // Auto-save changes (less sensitive, aligned with Work Mode)
  const performSave = useCallback(async () => {
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
        description: description.trim() !== (memory.description || '').trim() ? description.trim() : undefined,
        memory_type: memoryType,
        status,
        emotion_valence: emotionValence ?? undefined,
        emotion_arousal: emotionArousal ?? undefined,
        energy_delta: energyDelta ?? undefined,
        place_name: trimmedPlace || undefined,
        latitude: latitude ? parseFloat(latitude) : undefined,
        longitude: longitude ? parseFloat(longitude) : undefined,
        captured_at: capturedAt ? new Date(capturedAt).toISOString() : undefined,
        salience_score: salience,
        category_id: categoryId || undefined,
        tags: tagArray.length > 0 ? tagArray : undefined,
      })
      setMemory(updated)
    } catch (e) {
      console.error('Auto-save failed', e)
    } finally {
      setIsSaving(false)
    }
  }, [memory, memoryId, title, note, description, memoryType, status, emotionValence, emotionArousal, energyDelta, placeName, latitude, longitude, capturedAt, salience, categoryId, tags])

  // Determine if there are meaningful changes to save
  const hasMeaningfulChanges = useCallback(() => {
    if (!memory) return false

    // Compare title
    const currentTitle = (title || '').trim()
    const savedTitle = (memory.title || memory.title_override || '').trim()
    if (currentTitle !== savedTitle) return true

    // Compare note with threshold (less sensitive like Work Mode)
    const currentNote = (note || '').trim()
    const savedNote = (memory.note || '').trim()
    if (currentNote !== savedNote) {
      const lengthDiff = Math.abs(currentNote.length - savedNote.length)
      const minLen = Math.min(currentNote.length, savedNote.length)
      const changeRatio = minLen > 0 ? lengthDiff / minLen : 1
      if (lengthDiff >= 20 || changeRatio >= 0.3) return true
      // If only very small change in note, don't auto-save yet
    }

    // Compare description (simple equality)
    const currentDesc = (description || '').trim()
    const savedDesc = (memory.description || '').trim()
    if (currentDesc !== savedDesc) return true

    // Compare place name
    const currentPlace = (placeName || '').trim()
    const savedPlace = (memory.place_name || '').trim()
    if (currentPlace !== savedPlace) return true

    // Compare emotion valence
    const savedVal = memory.emotion_valence ?? null
    if ((emotionValence ?? null) !== savedVal) return true

    // Compare emotion arousal, energy delta
    const savedArousal = memory.emotion_arousal ?? null
    if ((emotionArousal ?? null) !== savedArousal) return true
    const savedEnergy = memory.energy_delta ?? null
    if ((energyDelta ?? null) !== savedEnergy) return true

    // Compare coordinates
    const savedLat = memory.latitude != null ? String(memory.latitude) : ''
    const savedLng = memory.longitude != null ? String(memory.longitude) : ''
    if ((latitude || '') !== savedLat) return true
    if ((longitude || '') !== savedLng) return true

    // Compare memory_type, status, category, salience
    if (memoryType !== memory.memory_type) return true
    if (status !== memory.status) return true
    if ((categoryId || '') !== (memory.category_id || '')) return true
    // salience compare with small tolerance
    const savedSal = memory.salience_score ?? 0
    if (Math.abs(savedSal - salience) >= 0.05) return true

    // Compare captured_at
    const savedCaptured = memory.captured_at ? new Date(memory.captured_at).toISOString().slice(0,16) : ''
    if ((capturedAt || '') !== savedCaptured) return true

    // Compare tags (order-insensitive basic check)
    const currentTags = tags.split(',').map(s => s.trim()).filter(Boolean).sort().join(',')
    const savedTags = (memory.tags || []).slice().sort().join(',')
    if (currentTags !== savedTags) return true

    return false
  }, [memory, title, note, description, placeName, emotionValence, emotionArousal, energyDelta, latitude, longitude, memoryType, status, categoryId, salience, capturedAt, tags])

  const autoSave = useAutoSave({
    delay: 5000,
    enabled: !!memory && !!memoryId,
    onSave: performSave,
    hasChanges: hasMeaningfulChanges,
  })

  // Trigger auto-save when inputs change
  useEffect(() => {
    autoSave.triggerAutoSave()
  }, [title, note, description, placeName, tags, emotionValence, emotionArousal, energyDelta, latitude, longitude, memoryType, status, categoryId, salience, capturedAt, autoSave])

  // Reset auto-save state when switching memory
  useEffect(() => {
    autoSave.resetAutoSave()
  }, [memoryId, autoSave])

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

  const handleBack = () => {
    if (returnTo) {
      router.push(returnTo)
      return
    }
    if (from) {
      // Prefer history back when we know we came from inside the app
      try { router.back(); return } catch {}
    }
    router.push('/memories')
  }

  const handleSelectTimelineItem = async (item: TimelineItem, type: TimelineItemType) => {
    if (!memoryId) return
    try {
      setIsAddingAnchor(true)
      await memoriesApi.addAnchor(memoryId, {
        anchor_item_id: item.id,
        relation_type: newAnchorRelation
      })
      const list = await memoriesApi.getAnchors(memoryId, { limit: 20 })
      setAnchors(list)
      setShowTimelineSelector(false)
    } catch (e) {
      console.error('Failed to add anchor:', e)
    } finally {
      setIsAddingAnchor(false)
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={handleBack} className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={displayTitle}
              className="text-lg sm:text-xl font-semibold text-gray-900 bg-transparent border-none outline-none focus:ring-0"
            />
            {memory?.description && (
              <button
                onClick={() => setShowDescription(v => !v)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                title={showDescription ? 'Hide description' : 'Show description'}
              >
                {showDescription ? <ChevronDown className="w-4 h-4" /> : <Info className="w-4 h-4" />}
              </button>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm">
            {/* Auto-save indicator */}
            {autoSave.status === 'saving' && <span className="text-gray-500">Saving…</span>}
            {autoSave.status === 'saved' && autoSave.lastSaved && (
              <span className="text-gray-400">Auto-saved {autoSave.lastSaved.toLocaleTimeString()}</span>
            )}
            {autoSave.status === 'error' && (
              <span className="text-red-500">Save failed</span>
            )}
            {/* Manual save */}
            <button
              onClick={autoSave.forceAutoSave}
              className="px-3 py-1.5 rounded-lg border text-gray-700 hover:bg-gray-50"
              disabled={autoSave.status === 'saving'}
            >
              Save
            </button>
            <button onClick={handleToggleHighlight} className={`px-3 py-1.5 rounded-lg border ${memory.is_highlight ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-gray-600 hover:text-amber-700 hover:border-amber-300'}`}>
              <Star className={`w-4 h-4 ${memory.is_highlight ? 'fill-current' : ''}`} />
            </button>
            <button onClick={handleDelete} className="px-3 py-1.5 rounded-lg border text-red-600 hover:bg-red-50">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {showDescription && (
        <div className="max-w-5xl mx-auto px-4 pt-3">
          {!editingDescription ? (
            <div className="flex items-start justify-between gap-2">
              <p className="text-gray-600 text-sm break-words flex-1 min-h-[1.5rem]">
                {description || <span className="text-gray-400">Add a short description…</span>}
              </p>
              <button
                onClick={() => setEditingDescription(true)}
                className="px-2 py-1 text-xs border rounded text-gray-700 hover:bg-gray-50"
              >
                Edit
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a short description…"
                className="w-full p-2 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                rows={2}
              />
              <div className="flex gap-2">
                <button
                  onClick={async () => { await autoSave.forceAutoSave(); setEditingDescription(false); }}
                  className="px-3 py-1.5 rounded-lg border text-gray-700 hover:bg-gray-50"
                  disabled={autoSave.status === 'saving'}
                >
                  Save
                </button>
                <button
                  onClick={() => { setDescription(memory.description || ''); setEditingDescription(false); }}
                  className="px-3 py-1.5 rounded-lg border text-gray-500 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          {categoryId && (() => {
            const cat = categories.find(c => c.id === categoryId)
            return cat ? (
              <div className="flex items-center gap-2 mt-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                <span className="text-xs text-gray-500">{cat.name}</span>
              </div>
            ) : null
          })()}
        </div>
      )}

      <div className="max-w-5xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Metadata */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-800 mb-4">Details</h3>
            <div className="space-y-3 text-sm text-gray-700">
              <div className="space-y-2">
                <div className="text-gray-700 font-medium flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span>Captured</span>
                </div>
                <input type="datetime-local" value={capturedAt} onChange={(e) => setCapturedAt(e.target.value)} className="w-full bg-white/60 border border-gray-200 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              {/* Memory type and status */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="mb-1">Type</div>
                  <select value={memoryType} onChange={(e) => setMemoryType(e.target.value as any)} className="w-full bg-white/60 border border-gray-200 rounded-md px-2 py-1">
                    {['note','link','file','thought','quote','insight'].map(mt => (
                      <option key={mt} value={mt}>{mt}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className="mb-1">Status</div>
                  <select value={status} onChange={(e) => setStatus(e.target.value as any)} className="w-full bg-white/60 border border-gray-200 rounded-md px-2 py-1">
                    {['active','archived','deleted'].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
              {/* Category */}
              <div>
                <div className="mb-1">Category</div>
                <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full bg-white/60 border border-gray-200 rounded-md px-2 py-1">
                  <option value="">Uncategorized</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-500" />
                <input
                  value={placeName}
                  onChange={(e) => setPlaceName(e.target.value)}
                  placeholder="Add a place"
                  className="flex-1 bg-white/60 border border-gray-200 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input value={latitude} onChange={(e) => setLatitude(e.target.value)} placeholder="Latitude" className="bg-white/60 border border-gray-200 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500" />
                <input value={longitude} onChange={(e) => setLongitude(e.target.value)} placeholder="Longitude" className="bg-white/60 border border-gray-200 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500" />
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
              <div>
                <div className="mb-2 text-sm font-medium text-gray-700">Emotion Arousal</div>
                <input type="range" min={0} max={5} step={1} value={emotionArousal ?? 0} onChange={(e) => setEmotionArousal(parseInt(e.target.value))} className="w-full" />
                <div className="text-xs text-gray-500 mt-1">{emotionArousal ?? 0}</div>
              </div>
              <div>
                <div className="mb-2 text-sm font-medium text-gray-700">Energy Delta</div>
                <input type="range" min={-5} max={5} step={1} value={energyDelta ?? 0} onChange={(e) => setEnergyDelta(parseInt(e.target.value))} className="w-full" />
                <div className="text-xs text-gray-500 mt-1">{energyDelta ?? 0}</div>
              </div>
              <div>
                <div className="mb-2 text-sm font-medium text-gray-700">Salience</div>
                <input type="range" min={0} max={1} step={0.05} value={salience} onChange={(e) => setSalience(parseFloat(e.target.value))} className="w-full" />
                <div className="text-xs text-gray-500 mt-1">{salience.toFixed(2)}</div>
              </div>
            </div>
          </div>

          {/* Anchors */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Anchors</h3>
            <div className="space-y-2">
              {anchors.length === 0 && (
                <div className="text-xs text-gray-500">No anchors yet</div>
              )}
              {anchors.map((a) => (
                <div key={`${a.memory_id}-${a.anchor_item_id}-${a.relation_type}`} className="flex items-center justify-between text-sm">
                  <div className="truncate">
                    <span className="px-2 py-0.5 bg-gray-100 rounded mr-2 text-gray-700">{a.relation_type}</span>
                    <span className="text-gray-800">{a.timeline_item?.title || a.anchor_item_id}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 border-t pt-3 space-y-2">
              <div className="text-xs text-gray-600">Add anchor</div>
              <select value={newAnchorRelation} onChange={(e) => setNewAnchorRelation(e.target.value as any)} className="w-full bg-white/60 border border-gray-200 rounded-md px-2 py-1">
                {['context_of','result_of','insight_from','about','co_occurred','triggered_by','reflects_on'].map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <button
                onClick={() => setShowTimelineSelector(true)}
                disabled={isAddingAnchor}
                className="w-full mt-1 px-3 py-1.5 rounded-lg border text-gray-700 hover:bg-gray-50 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                {isAddingAnchor ? 'Adding…' : 'Link Task or Activity'}
              </button>
            </div>
          </div>
        </div>

        {/* Right: Content */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl p-0 shadow-sm border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <h3 className="sr-only">Content</h3>
            </div>
            <NotionEditor
              value={note}
              onChange={(val) => setNote(val)}
              placeholder="Write your memory details…"
              output="text"
            />
          </div>

          {/* Meta preview */}
          <div className="bg-white rounded-xl p-5 border border-gray-200">
            <div className="text-xs text-gray-500">ID: {memory.id}</div>
          </div>
        </div>
      </div>

      {/* Timeline Item Selector Modal */}
      <TimelineItemSelector
        isOpen={showTimelineSelector}
        onSelectItem={handleSelectTimelineItem}
        onCancel={() => setShowTimelineSelector(false)}
        title="Link to Task or Activity"
        config={{
          enabledTypes: ['task', 'activity'], // Only tasks and activities for memory focus
          taskConfig: {
            statuses: ['pending', 'in_progress', 'completed'],
            includeSubtasks: true
          },
          activityConfig: {
            statuses: ['active', 'completed']
          }
        }}
      />
    </div>
  )
}

export default function MemoryFocusView() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    }>
      <MemoryFocusViewContent />
    </Suspense>
  )
}