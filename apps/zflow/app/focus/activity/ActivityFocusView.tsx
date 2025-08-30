'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Save, Edit, Timer, Play, Pause, Square, Heart, Star, Smile, Frown } from 'lucide-react'
import { useAuth } from '../../../contexts/AuthContext'
import { useActivity, useUpdateActivity } from '../../../hooks/useActivities'
import { useCategories } from '../../../hooks/useCategories'
import { useTimer } from '../../../hooks/useTimer'

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

export default function ActivityFocusView() {
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const activityId = searchParams.get('activityId')
  
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
      
      setMoodBefore(activity.mood_before || null)
      setMoodAfter(activity.mood_after || null)
      setEnergyBefore(activity.energy_before || null)
      setEnergyAfter(activity.energy_after || null)
      setSatisfaction(activity.satisfaction_level || null)
    }
  }, [activity])

  // Auto-save functionality
  const autoSave = useCallback(async () => {
    if (!activity || isSaving) return
    
    const hasChanges = 
      notes !== originalNotes || 
      insights !== originalInsights || 
      gratitude !== originalGratitude ||
      moodBefore !== activity.mood_before ||
      moodAfter !== activity.mood_after ||
      energyBefore !== activity.energy_before ||
      energyAfter !== activity.energy_after ||
      satisfaction !== activity.satisfaction_level

    if (hasChanges) {
      setIsSaving(true)
      try {
        await updateActivity(activity.id, {
          notes: notes.trim() || undefined,
          insights: insights.trim() || undefined,
          gratitude: gratitude.trim() || undefined,
          mood_before: moodBefore || undefined,
          mood_after: moodAfter || undefined,
          energy_before: energyBefore || undefined,
          energy_after: energyAfter || undefined,
          satisfaction_level: satisfaction || undefined,
        })
        setOriginalNotes(notes)
        setOriginalInsights(insights)
        setOriginalGratitude(gratitude)
      } catch (error) {
        console.error('Auto-save failed:', error)
      } finally {
        setIsSaving(false)
      }
    }
  }, [activity, notes, insights, gratitude, originalNotes, originalInsights, originalGratitude, 
      moodBefore, moodAfter, energyBefore, energyAfter, satisfaction, updateActivity, isSaving])

  // Auto-save with debounce
  useEffect(() => {
    const timer = setTimeout(autoSave, 2000)
    return () => clearTimeout(timer)
  }, [autoSave])

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">加载中...</div>
      </div>
    )
  }

  if (!activity) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-500 mb-4">活动不存在</div>
          <button
            onClick={() => router.push('/')}
            className="text-blue-600 hover:text-blue-700"
          >
            返回首页
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
                onClick={() => router.push('/?view=activities')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{activity.title}</h1>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span>
                    {activity.activity_type === 'exercise' && '🏃‍♂️ 运动'}
                    {activity.activity_type === 'meditation' && '🧘‍♀️ 冥想'}
                    {activity.activity_type === 'reading' && '📚 阅读'}
                    {activity.activity_type === 'music' && '🎵 音乐'}
                    {activity.activity_type === 'socializing' && '👥 社交'}
                    {activity.activity_type === 'gaming' && '🎮 游戏'}
                    {activity.activity_type === 'walking' && '🚶‍♀️ 散步'}
                    {activity.activity_type === 'cooking' && '👨‍🍳 烹饪'}
                    {activity.activity_type === 'rest' && '😴 休息'}
                    {activity.activity_type === 'creative' && '🎨 创作'}
                    {activity.activity_type === 'learning' && '📖 学习'}
                    {(!activity.activity_type || activity.activity_type === 'other') && '✨ 其他'}
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
            <div className="flex items-center gap-2">
              {isSaving && (
                <div className="text-sm text-gray-500">保存中...</div>
              )}
              <button
                onClick={() => router.push(`/?view=activities`)}
                className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                编辑
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Timer and Activity Info */}
        <div className="lg:col-span-1 space-y-6">
          {/* Timer */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Timer className="w-5 h-5" />
              活动计时
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
                    开始计时
                  </button>
                ) : (
                  <button
                    onClick={stopTimer}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                  >
                    <Square className="w-4 h-4" />
                    结束计时
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Mood & Energy Tracking */}
          <div className="bg-white rounded-xl p-6 shadow-sm space-y-6">
            <h3 className="text-lg font-semibold">心情与能量</h3>
            
            <RatingScale
              value={moodBefore}
              onChange={setMoodBefore}
              label="开始前心情"
              icon={<Smile className="w-4 h-4" />}
            />
            
            <RatingScale
              value={energyBefore}
              onChange={setEnergyBefore}
              label="开始前能量"
              icon={<Star className="w-4 h-4" />}
            />
            
            <RatingScale
              value={moodAfter}
              onChange={setMoodAfter}
              label="结束后心情"
              icon={<Heart className="w-4 h-4" />}
            />
            
            <RatingScale
              value={energyAfter}
              onChange={setEnergyAfter}
              label="结束后能量"
              icon={<Star className="w-4 h-4" />}
            />
            
            <RatingScale
              value={satisfaction}
              onChange={setSatisfaction}
              label="满意度"
              icon={<Heart className="w-4 h-4" />}
            />
          </div>
        </div>

        {/* Right: Journal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Notes */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold mb-4">活动记录</h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="记录活动过程、感受、收获..."
              className="w-full h-40 p-4 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Insights */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold mb-4">心得体会</h3>
            <textarea
              value={insights}
              onChange={(e) => setInsights(e.target.value)}
              placeholder="这次活动让你学到了什么？有什么新的认识？"
              className="w-full h-32 p-4 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Gratitude */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold mb-4">感恩记录</h3>
            <textarea
              value={gratitude}
              onChange={(e) => setGratitude(e.target.value)}
              placeholder="感恩这次活动带来的美好时光..."
              className="w-full h-32 p-4 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
