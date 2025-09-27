'use client'

import React, { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Save, Edit, Timer, Play, Square, Heart, Star, Smile, Frown } from 'lucide-react'
import { NotionEditor } from '@/shared/components/editors'
import { useAuth } from '@/contexts/AuthContext'
import { useTranslation } from '@/contexts/LanguageContext'
import { useActivity, useUpdateActivity } from '@/hooks/useActivities'
import { useCategories } from '@/hooks/useCategories'
import { useTimer } from '@/hooks/useTimer'
import { useAutoSave } from '@/hooks/useAutoSave'

interface ActivityWithCategory {
  id: string
  title: string
  description?: string
  activity_type: string
  status: string
  started_at?: string
  ended_at?: string
  duration_minutes?: number
  mood_before?: number
  mood_after?: number
  energy_before?: number
  energy_after?: number
  satisfaction_level?: number
  intensity_level?: string
  location?: string
  weather?: string
  notes?: string
  insights?: string
  gratitude?: string
  category_id?: string
  tags?: string[]
  created_at: string
  updated_at: string
}

function ActivityFocusViewContent() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const activityId = searchParams.get('activityId')
  const returnTo = searchParams.get('returnTo')
  const from = searchParams.get('from')

  const { activity, isLoading } = useActivity(activityId || '')
  const { updateActivity } = useUpdateActivity()
  const { categories } = useCategories()
  const timer = useTimer()

  // Journal states
  const [notes, setNotes] = useState('')
  const [insights, setInsights] = useState('')
  const [gratitude, setGratitude] = useState('')
  const [originalNotes, setOriginalNotes] = useState('')
  const [originalInsights, setOriginalInsights] = useState('')
  const [originalGratitude, setOriginalGratitude] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [description, setDescription] = useState('')
  const [showDescription, setShowDescription] = useState(false)
  const [editingDescription, setEditingDescription] = useState(false)

  // Activity core fields
  const [activityType, setActivityType] = useState<string>('other')
  const [status, setStatus] = useState<string>('active')
  const [intensity, setIntensity] = useState<string>('moderate')
  const [categoryId, setCategoryId] = useState<string>('')
  const [tags, setTags] = useState<string>('')
  const [location, setLocation] = useState<string>('')
  const [weather, setWeather] = useState<string>('')
  const [companions, setCompanions] = useState<string>('')
  const [startedAt, setStartedAt] = useState<string>('')
  const [endedAt, setEndedAt] = useState<string>('')

  // Mood and energy tracking
  const [moodBefore, setMoodBefore] = useState<number | null>(null)
  const [moodAfter, setMoodAfter] = useState<number | null>(null)
  const [energyBefore, setEnergyBefore] = useState<number | null>(null)
  const [energyAfter, setEnergyAfter] = useState<number | null>(null)
  const [satisfaction, setSatisfaction] = useState<number | null>(null)

  // Timer states (using global timer)
  const isTimerRunning = timer.runningTimelineItemId === activityId && timer.runningTimelineItemType === 'activity'
  const elapsedMs = isTimerRunning ? timer.elapsedMs : 0

  // Initialize data from activity
  useEffect(() => {
    if (activity) {
      setNotes(activity.notes || '')
      setInsights(activity.insights || '')
      setGratitude(activity.gratitude || '')
      setOriginalNotes(activity.notes || '')
      setOriginalInsights(activity.insights || '')
      setOriginalGratitude(activity.gratitude || '')
      setDescription(activity.description || '')
      setActivityType(activity.activity_type || 'other')
      setStatus(activity.status || 'active')
      setIntensity(activity.intensity_level || 'moderate')
      setCategoryId(activity.category_id || '')
      setTags((activity.tags || []).join(', '))
      setLocation(activity.location || '')
      setWeather(activity.weather || '')
      setCompanions((activity.companions || []).join(', '))
      setStartedAt(activity.started_at ? new Date(activity.started_at).toISOString().slice(0,16) : '')
      setEndedAt(activity.ended_at ? new Date(activity.ended_at).toISOString().slice(0,16) : '')

      setMoodBefore(activity.mood_before || null)
      setMoodAfter(activity.mood_after || null)
      setEnergyBefore(activity.energy_before || null)
      setEnergyAfter(activity.energy_after || null)
      setSatisfaction(activity.satisfaction_level || null)
    }
  }, [activity])

  // Perform save of changed fields
  const performSave = useCallback(async () => {
    if (!activity) return
    setIsSaving(true)
    try {
      const payload: any = {}
      const tNotes = notes.trim(); const tInsights = insights.trim(); const tGratitude = gratitude.trim(); const tDesc = description.trim()
      if (tNotes !== (activity.notes || '').trim()) payload.notes = tNotes || undefined
      if (tInsights !== (activity.insights || '').trim()) payload.insights = tInsights || undefined
      if (tGratitude !== (activity.gratitude || '').trim()) payload.gratitude = tGratitude || undefined
      if (tDesc !== (activity.description || '').trim()) payload.description = tDesc || undefined
      if ((moodBefore ?? null) !== (activity.mood_before ?? null)) payload.mood_before = moodBefore || undefined
      if ((moodAfter ?? null) !== (activity.mood_after ?? null)) payload.mood_after = moodAfter || undefined
      if ((energyBefore ?? null) !== (activity.energy_before ?? null)) payload.energy_before = energyBefore || undefined
      if ((energyAfter ?? null) !== (activity.energy_after ?? null)) payload.energy_after = energyAfter || undefined
      if ((satisfaction ?? null) !== (activity.satisfaction_level ?? null)) payload.satisfaction_level = satisfaction || undefined
      if (activityType !== activity.activity_type) payload.activity_type = activityType
      if (status !== activity.status) payload.status = status
      if (intensity !== (activity.intensity_level || 'moderate')) payload.intensity_level = intensity
      if ((categoryId || '') !== (activity.category_id || '')) payload.category_id = categoryId || undefined
      const tagArr = tags.split(',').map(s => s.trim()).filter(Boolean)
      if (JSON.stringify(tagArr) !== JSON.stringify(activity.tags || [])) payload.tags = tagArr
      if (location !== (activity.location || '')) payload.location = location || undefined
      if (weather !== (activity.weather || '')) payload.weather = weather || undefined
      const companionsArr = companions.split(',').map(s => s.trim()).filter(Boolean)
      if (JSON.stringify(companionsArr) !== JSON.stringify(activity.companions || [])) payload.companions = companionsArr
      if ((startedAt || '') !== (activity.started_at ? new Date(activity.started_at).toISOString().slice(0,16) : '')) payload.started_at = startedAt ? new Date(startedAt).toISOString() : undefined
      if ((endedAt || '') !== (activity.ended_at ? new Date(activity.ended_at).toISOString().slice(0,16) : '')) payload.ended_at = endedAt ? new Date(endedAt).toISOString() : undefined
      if (Object.keys(payload).length > 0) {
        await updateActivity(activity.id, payload)
        setOriginalNotes(tNotes); setOriginalInsights(tInsights); setOriginalGratitude(tGratitude)
      }
    } finally {
      setIsSaving(false)
    }
  }, [activity, notes, insights, gratitude, description, moodBefore, moodAfter, energyBefore, energyAfter, satisfaction, activityType, status, intensity, categoryId, tags, location, weather, companions, startedAt, endedAt, updateActivity])

  // Meaningful change detection
  const hasMeaningfulChanges = useCallback(() => {
    if (!activity) return false
    const pairs: Array<[string, string]> = [
      [notes, activity.notes || ''],
      [insights, activity.insights || ''],
      [gratitude, activity.gratitude || ''],
    ]
    for (const [a, bRaw] of pairs) {
      const b = bRaw
      const aa = a.trim(); const bb = b.trim()
      if (aa !== bb) {
        const diff = Math.abs(aa.length - bb.length)
        const minLen = Math.min(aa.length, bb.length)
        const ratio = minLen > 0 ? diff / minLen : 1
        if (diff >= 20 || ratio >= 0.3) return true
      }
    }
    if ((description || '').trim() !== (activity.description || '').trim()) return true
    if ((moodBefore ?? null) !== (activity.mood_before ?? null)) return true
    if ((moodAfter ?? null) !== (activity.mood_after ?? null)) return true
    if ((energyBefore ?? null) !== (activity.energy_before ?? null)) return true
    if ((energyAfter ?? null) !== (activity.energy_after ?? null)) return true
    if ((satisfaction ?? null) !== (activity.satisfaction_level ?? null)) return true
    if (activityType !== activity.activity_type) return true
    if (status !== activity.status) return true
    if (intensity !== (activity.intensity_level || 'moderate')) return true
    if ((categoryId || '') !== (activity.category_id || '')) return true
    const tagArr = tags.split(',').map(s => s.trim()).filter(Boolean)
    if (JSON.stringify(tagArr) !== JSON.stringify(activity.tags || [])) return true
    if (location !== (activity.location || '')) return true
    if (weather !== (activity.weather || '')) return true
    const companionsArr = companions.split(',').map(s => s.trim()).filter(Boolean)
    if (JSON.stringify(companionsArr) !== JSON.stringify(activity.companions || [])) return true
    if ((startedAt || '') !== (activity.started_at ? new Date(activity.started_at).toISOString().slice(0,16) : '')) return true
    if ((endedAt || '') !== (activity.ended_at ? new Date(activity.ended_at).toISOString().slice(0,16) : '')) return true
    return false
  }, [activity, notes, insights, gratitude, description, moodBefore, moodAfter, energyBefore, energyAfter, satisfaction, activityType, status, intensity, categoryId, tags, location, weather, companions, startedAt, endedAt])

  const autoSave = useAutoSave({ delay: 5000, enabled: !!activity, onSave: performSave, hasChanges: hasMeaningfulChanges })

  // Timer functions using global timer
  const startTimer = async () => {
    if (!activity) return

    try {
      await timer.startActivity(activity.id)

      // Update activity status
      await updateActivity(activity.id, {
        started_at: new Date().toISOString(),
        status: 'active'
      })
    } catch (error) {
      console.error('Failed to start timer:', error)
      throw error
    }
  }

  const stopTimer = async () => {
    if (!activity) return

    try {
      await timer.stopActivity(activity.id)

      // Update activity status
      await updateActivity(activity.id, {
        ended_at: new Date().toISOString(),
        status: 'completed'
      })
    } catch (error) {
      console.error('Failed to stop timer:', error)
      throw error
    }
  }

  // Format time helper
  const formatTime = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    return hours > 0
      ? `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      : `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  // Mood/Energy rating component
  const RatingScale = ({ value, onChange, label, icon }: {
    value: number | null
    onChange: (value: number) => void
    label: string
    icon: React.ReactNode
  }) => (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
        {icon}
        <span>{label}</span>
        {value && <span className="text-blue-600">({value}/10)</span>}
      </div>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rating) => (
          <button
            key={rating}
            onClick={() => onChange(rating)}
            className={`w-8 h-8 rounded-full border-2 transition-all ${
              value === rating
                ? 'bg-blue-500 border-blue-500 text-white'
                : 'border-gray-300 hover:border-blue-300 text-gray-500'
            }`}
          >
            {rating}
          </button>
        ))}
      </div>
    </div>
  )

  // Context-aware back navigation
  const handleBack = () => {
    if (returnTo) {
      router.push(returnTo)
      return
    }
    if (from) {
      try { router.back(); return } catch {}
    }
    router.push('/?view=activities')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">{t.common.loading}</div>
      </div>
    )
  }

  if (!activity) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-500 mb-4">{t.activity?.notFound ?? 'Activity not found'}</div>
          <button
            onClick={() => router.push('/')}
            className="text-blue-600 hover:text-blue-700"
          >
            {t.ui.backToHome}
          </button>
        </div>
      </div>
    )
  }

  const category = categories.find(c => c.id === activity.category_id)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBack}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{activity.title}</h1>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span>
                    {activity.activity_type === 'exercise' && `🏃‍♂️ ${t.activity.typeExercise}`}
                    {activity.activity_type === 'meditation' && `🧘‍♀️ ${t.activity.typeMeditation ?? 'Meditation'}`}
                    {activity.activity_type === 'reading' && `📚 ${t.activity.typeReading}`}
                    {activity.activity_type === 'music' && `🎵 ${t.activity.typeMusic ?? 'Music'}`}
                    {activity.activity_type === 'socializing' && `👥 ${t.activity.typeSocial}`}
                    {activity.activity_type === 'gaming' && `🎮 ${t.activity.typeGaming ?? 'Gaming'}`}
                    {activity.activity_type === 'walking' && `🚶‍♀️ ${t.activity.typeWalking ?? 'Walking'}`}
                    {activity.activity_type === 'cooking' && `👨‍🍳 ${t.activity.typeCooking ?? 'Cooking'}`}
                    {activity.activity_type === 'rest' && `😴 ${t.activity.typeRest ?? 'Rest'}`}
                    {activity.activity_type === 'creative' && `🎨 ${t.activity.typeCreative ?? 'Creative'}`}
                    {activity.activity_type === 'learning' && `📖 ${t.activity.typeLearning ?? 'Learning'}`}
                    {(!activity.activity_type || activity.activity_type === 'other') && `✨ ${t.activity.typeOther}`}
                  </span>
                  {category && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                        {category.name}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm">
              {autoSave.status === 'saving' && <span className="text-gray-500">{t.ui.saving}</span>}
              {autoSave.status === 'saved' && autoSave.lastSaved && (
                <span className="text-gray-400">Auto-saved {autoSave.lastSaved.toLocaleTimeString()}</span>
              )}
              {autoSave.status === 'error' && (
                <span className="text-red-500">Save failed</span>
              )}
              <button onClick={autoSave.forceAutoSave} className="px-3 py-1.5 rounded-lg border text-gray-700 hover:bg-gray-50" disabled={autoSave.status === 'saving'}>
                Save
              </button>
            </div>
          </div>
          {!editingDescription ? (
            <div className="mt-2 flex items-start justify-between gap-2">
              <p className="text-gray-600 text-sm break-words flex-1 min-h-[1.5rem]">{description || <span className="text-gray-400">Add a short description…</span>}</p>
              <button onClick={() => setEditingDescription(true)} className="px-2 py-1 text-xs border rounded text-gray-700 hover:bg-gray-50">Edit</button>
            </div>
          ) : (
            <div className="mt-2 space-y-2">
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Add a short description…" className="w-full p-2 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" rows={2} />
              <div className="flex gap-2">
                <button onClick={async () => { await autoSave.forceAutoSave(); setEditingDescription(false) }} className="px-3 py-1.5 rounded-lg border text-gray-700 hover:bg-gray-50" disabled={autoSave.status === 'saving'}>Save</button>
                <button onClick={() => { setDescription(activity.description || ''); setEditingDescription(false) }} className="px-3 py-1.5 rounded-lg border text-gray-500 hover:bg-gray-50">Cancel</button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Timer and Activity Info */}
        <div className="lg:col-span-1 space-y-6">
          {/* Timer */}
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Timer className="w-5 h-5" />
              {t.activity.activityTime}
            </h3>

            <div className="text-center">
              <div className="text-4xl font-mono font-bold text-gray-900 mb-4">
                {formatTime(elapsedMs)}
              </div>

              <div className="flex justify-center gap-2">
                {!isTimerRunning ? (
                  <button
                    onClick={startTimer}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                  >
                    <Play className="w-4 h-4" />
                    {t.activity.startTimer}
                  </button>
                ) : (
                  <button
                    onClick={stopTimer}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                  >
                    <Square className="w-4 h-4" />
                    {t.activity.stopTimer}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Mood & Energy Tracking */}
          <div className="bg-white rounded-xl p-6 border border-gray-200 space-y-6">
            <h3 className="text-lg font-semibold">{t.activity.moodBefore} & {t.activity.energyBefore}</h3>

            <RatingScale
              value={moodBefore}
              onChange={setMoodBefore}
              label={t.activity.moodBefore}
              icon={<Smile className="w-4 h-4" />}
            />

            <RatingScale
              value={energyBefore}
              onChange={setEnergyBefore}
              label={t.activity.energyBefore}
              icon={<Star className="w-4 h-4" />}
            />

            <RatingScale
              value={moodAfter}
              onChange={setMoodAfter}
              label={t.activity.moodAfter}
              icon={<Heart className="w-4 h-4" />}
            />

            <RatingScale
              value={energyAfter}
              onChange={setEnergyAfter}
              label={t.activity.energyAfter}
              icon={<Star className="w-4 h-4" />}
            />

            <RatingScale
              value={satisfaction}
              onChange={setSatisfaction}
              label={t.activity.satisfactionLevel}
              icon={<Heart className="w-4 h-4" />}
            />
          </div>

          {/* Details panel */}
          <div className="bg-white rounded-xl p-6 border border-gray-200 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-sm text-gray-700 mb-1">Type</div>
                <select value={activityType} onChange={(e) => setActivityType(e.target.value)} className="w-full bg-white/60 border border-gray-200 rounded-md px-2 py-1">
                  {['exercise','meditation','reading','music','socializing','gaming','walking','cooking','rest','creative','learning','other'].map(x => <option key={x} value={x}>{x}</option>)}
                </select>
              </div>
              <div>
                <div className="text-sm text-gray-700 mb-1">Status</div>
                <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full bg-white/60 border border-gray-200 rounded-md px-2 py-1">
                  {['active','completed','cancelled'].map(x => <option key={x} value={x}>{x}</option>)}
                </select>
              </div>
              <div>
                <div className="text-sm text-gray-700 mb-1">Intensity</div>
                <select value={intensity} onChange={(e) => setIntensity(e.target.value)} className="w-full bg-white/60 border border-gray-200 rounded-md px-2 py-1">
                  {['low','moderate','high'].map(x => <option key={x} value={x}>{x}</option>)}
                </select>
              </div>
              <div>
                <div className="text-sm text-gray-700 mb-1">Category</div>
                <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full bg-white/60 border border-gray-200 rounded-md px-2 py-1">
                  <option value="">Uncategorized</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-sm text-gray-700 mb-1">Started At</div>
                <input type="datetime-local" value={startedAt} onChange={(e) => setStartedAt(e.target.value)} className="w-full bg-white/60 border border-gray-200 rounded-md px-2 py-1" />
              </div>
              <div>
                <div className="text-sm text-gray-700 mb-1">Ended At</div>
                <input type="datetime-local" value={endedAt} onChange={(e) => setEndedAt(e.target.value)} className="w-full bg-white/60 border border-gray-200 rounded-md px-2 py-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-sm text-gray-700 mb-1">Location</div>
                <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Where?" className="w-full bg-white/60 border border-gray-200 rounded-md px-2 py-1" />
              </div>
              <div>
                <div className="text-sm text-gray-700 mb-1">Weather</div>
                <input value={weather} onChange={(e) => setWeather(e.target.value)} placeholder="Weather" className="w-full bg-white/60 border border-gray-200 rounded-md px-2 py-1" />
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-700 mb-1">Companions</div>
              <input value={companions} onChange={(e) => setCompanions(e.target.value)} placeholder="Comma separated" className="w-full bg-white/60 border border-gray-200 rounded-md px-2 py-1" />
            </div>
            <div>
              <div className="text-sm text-gray-700 mb-1">Tags</div>
              <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="tag1, tag2" className="w-full bg-white/60 border border-gray-200 rounded-md px-2 py-1" />
            </div>
          </div>
        </div>

        {/* Right: Journal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Notes */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 pt-4">
              <h3 className="text-lg font-semibold">{t.activity.notes}</h3>
            </div>
            <div className="p-0">
              <NotionEditor
                value={notes}
                onChange={setNotes}
                placeholder={t.activity.notesPlaceholder}
                output="text"
              />
            </div>
          </div>

          {/* Insights */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 pt-4">
              <h3 className="text-lg font-semibold">{t.activity.insights}</h3>
            </div>
            <div className="p-0">
              <NotionEditor
                value={insights}
                onChange={setInsights}
                placeholder={t.activity.insightsPlaceholder}
                output="text"
              />
            </div>
          </div>

          {/* Gratitude */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 pt-4">
              <h3 className="text-lg font-semibold">{t.activity.gratitude}</h3>
            </div>
            <div className="p-0">
              <NotionEditor
                value={gratitude}
                onChange={setGratitude}
                placeholder={t.activity.gratitudePlaceholder}
                output="text"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ActivityFocusView() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    }>
      <ActivityFocusViewContent />
    </Suspense>
  )
}