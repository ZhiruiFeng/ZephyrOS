'use client'

import React, { useState, useEffect } from 'react'
import { Mic, Settings, History, Maximize2, CheckCircle, AlertCircle, Settings2, Zap, Shield, Lightbulb, ChevronDown, ChevronUp, Calendar } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { useTranslation } from '@/contexts/LanguageContext'
import { useSTTConfig } from '@/contexts/STTConfigContext'
import { mindflowApi, type MindflowSTTInteraction } from '@/lib/api/mindflow-api'
import type { ProfileModuleProps } from '@/profile'
import type { STTProvider, STTConfig } from '@/types/stt-config'

type TabType = 'settings' | 'recordings'

// STT Provider definitions
const STT_PROVIDERS = {
  elevenlabs: {
    id: 'elevenlabs' as const,
    name: 'ElevenLabs Scribe',
    description: 'High-accuracy transcription with 99 languages support',
    icon: Shield,
    color: 'purple',
    features: [
      '99+ languages',
      '>98% accuracy',
      'Speaker diarization',
      'Audio event detection',
      'Character-level timestamps'
    ],
    limitations: [
      'Optimized for accuracy over speed',
      'Better for longer recordings'
    ]
  },
  openai: {
    id: 'openai' as const,
    name: 'OpenAI Whisper',
    description: 'Fast, real-time transcription for voice input',
    icon: Zap,
    color: 'green',
    features: [
      '99+ languages',
      'Real-time optimized',
      'Fast processing',
      'Interactive voice input'
    ],
    limitations: [
      'Slightly lower accuracy',
      'Less detailed timestamps'
    ]
  }
} as const

export function VoiceModule({ config, onConfigChange, fullScreenPath }: ProfileModuleProps) {
  const { user } = useAuth()
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<TabType>('recordings')

  if (!user) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="text-center py-8">
          <Mic className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h4 className="text-lg font-medium text-gray-900 mb-2">Authentication Required</h4>
          <p className="text-gray-600">Please sign in to access voice features.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      {/* Header with Tabs */}
      <div className="border-b border-gray-100">
        <div className="p-6 pb-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Mic className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Voice Features</h3>
                <p className="text-sm text-gray-600">Manage voice input settings and recordings</p>
              </div>
            </div>

            {fullScreenPath && (
              <Link
                href={fullScreenPath}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title={t.profile.viewFullModule}
                aria-label={t.profile.viewFullModule}
              >
                <Maximize2 className="w-4 h-4" />
              </Link>
            )}
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('recordings')}
              className={`flex items-center gap-2 px-4 py-2 font-medium text-sm rounded-t-lg transition-colors ${
                activeTab === 'recordings'
                  ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <History className="w-4 h-4" />
              Recordings
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-2 px-4 py-2 font-medium text-sm rounded-t-lg transition-colors ${
                activeTab === 'settings'
                  ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Settings className="w-4 h-4" />
              Settings
            </button>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'recordings' ? (
          <RecordingsTab config={config} onConfigChange={onConfigChange} />
        ) : (
          <SettingsTab config={config} onConfigChange={onConfigChange} />
        )}
      </div>
    </div>
  )
}

// Settings Tab Component
function SettingsTab({ config, onConfigChange }: Pick<ProfileModuleProps, 'config' | 'onConfigChange'>) {
  const { user } = useAuth()
  const { config: contextConfig, updateConfig: updateContextConfig } = useSTTConfig()
  const [sttConfig, setSTTConfig] = useState<STTConfig>(contextConfig)
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  // Sync local state with context
  useEffect(() => {
    setSTTConfig(contextConfig)
  }, [contextConfig])

  // Save configuration using context
  const saveConfig = async (newConfig: STTConfig) => {
    if (!user) return

    setIsSaving(true)
    setSaveStatus('saving')

    try {
      await updateContextConfig(newConfig)
      onConfigChange({
        ...config,
        config: { ...config.config, ...newConfig }
      })
      setSTTConfig(newConfig)
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (error) {
      console.error('Failed to save STT configuration:', error)
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 3000)
    } finally {
      setIsSaving(false)
    }
  }

  const handleProviderChange = (provider: STTProvider) => {
    const newConfig = { ...sttConfig, provider }
    if (sttConfig.autoSave) {
      saveConfig(newConfig)
    } else {
      setSTTConfig(newConfig)
    }
  }

  const handleSettingChange = (key: keyof STTConfig, value: any) => {
    const newConfig = { ...sttConfig, [key]: value }
    if (sttConfig.autoSave) {
      saveConfig(newConfig)
    } else {
      setSTTConfig(newConfig)
    }
  }

  const handleManualSave = () => {
    saveConfig(sttConfig)
  }

  return (
    <div className="space-y-6">
      {/* Save Status */}
      {saveStatus !== 'idle' && (
        <div className="flex items-center gap-2">
          {saveStatus === 'saving' && (
            <div className="flex items-center gap-2 text-blue-600">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Saving...</span>
            </div>
          )}
          {saveStatus === 'saved' && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm">Saved</span>
            </div>
          )}
          {saveStatus === 'error' && (
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">Error saving configuration</span>
            </div>
          )}
        </div>
      )}

      {/* Provider Selection */}
      <div>
        <h4 className="text-md font-medium text-gray-900 mb-3">Speech-to-Text Provider</h4>
        <p className="text-sm text-gray-600 mb-4">
          Choose which AI service to use for converting your voice to text
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.values(STT_PROVIDERS).map((provider) => {
            const Icon = provider.icon
            const isSelected = sttConfig.provider === provider.id
            const colorClasses = {
              purple: isSelected
                ? 'border-purple-500 bg-purple-50'
                : 'border-gray-200 hover:border-purple-300',
              green: isSelected
                ? 'border-green-500 bg-green-50'
                : 'border-gray-200 hover:border-green-300'
            }

            return (
              <div
                key={provider.id}
                className={`relative border-2 rounded-lg p-4 cursor-pointer transition-all ${
                  colorClasses[provider.color]
                }`}
                onClick={() => handleProviderChange(provider.id)}
              >
                {isSelected && (
                  <div className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center ${
                    provider.color === 'purple' ? 'bg-purple-500' : 'bg-green-500'
                  }`}>
                    <CheckCircle className="w-4 h-4 text-white" />
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <Icon className={`w-8 h-8 flex-shrink-0 ${
                    provider.color === 'purple' ? 'text-purple-600' : 'text-green-600'
                  }`} />
                  <div>
                    <h5 className="font-semibold text-gray-900 mb-1">{provider.name}</h5>
                    <p className="text-sm text-gray-600 mb-3">{provider.description}</p>

                    <div className="mb-2">
                      <h6 className="text-xs font-medium text-gray-500 uppercase mb-1">Features</h6>
                      <ul className="text-xs text-gray-600 space-y-0.5">
                        {provider.features.map((feature, index) => (
                          <li key={index}>• {feature}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h6 className="text-xs font-medium text-gray-500 uppercase mb-1">Notes</h6>
                      <ul className="text-xs text-gray-500 space-y-0.5">
                        {provider.limitations.map((limitation, index) => (
                          <li key={index}>• {limitation}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Additional Settings */}
      <div className="border-t border-gray-100 pt-6">
        <h4 className="text-md font-medium text-gray-900 mb-3 flex items-center gap-2">
          <Settings2 className="w-4 h-4" />
          Additional Settings
        </h4>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Auto-save changes</label>
              <p className="text-xs text-gray-500">Automatically save configuration changes</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only"
                checked={sttConfig.autoSave}
                onChange={(e) => handleSettingChange('autoSave', e.target.checked)}
              />
              <div className={`w-11 h-6 rounded-full transition-colors ${
                sttConfig.autoSave ? 'bg-blue-600' : 'bg-gray-200'
              }`}>
                <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                  sttConfig.autoSave ? 'translate-x-5' : 'translate-x-0'
                } mt-0.5 ml-0.5`} />
              </div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Show provider in UI</label>
              <p className="text-xs text-gray-500">Display which STT provider is active in voice input</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only"
                checked={sttConfig.showProviderInUI}
                onChange={(e) => handleSettingChange('showProviderInUI', e.target.checked)}
              />
              <div className={`w-11 h-6 rounded-full transition-colors ${
                sttConfig.showProviderInUI ? 'bg-blue-600' : 'bg-gray-200'
              }`}>
                <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                  sttConfig.showProviderInUI ? 'translate-x-5' : 'translate-x-0'
                } mt-0.5 ml-0.5`} />
              </div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Refined transcription</label>
              <p className="text-xs text-gray-500">Remove filler words and improve readability using AI</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only"
                checked={sttConfig.useRefinedTranscription}
                onChange={(e) => handleSettingChange('useRefinedTranscription', e.target.checked)}
              />
              <div className={`w-11 h-6 rounded-full transition-colors ${
                sttConfig.useRefinedTranscription ? 'bg-blue-600' : 'bg-gray-200'
              }`}>
                <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                  sttConfig.useRefinedTranscription ? 'translate-x-5' : 'translate-x-0'
                } mt-0.5 ml-0.5`} />
              </div>
            </label>
          </div>
        </div>

        {!sttConfig.autoSave && (
          <div className="mt-6 pt-4 border-t border-gray-100">
            <button
              onClick={handleManualSave}
              disabled={isSaving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        )}
      </div>

      {/* Current Status */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <h5 className="text-sm font-medium text-gray-700 mb-2">Current Configuration</h5>
        <div className="text-sm text-gray-600 space-y-1">
          <p>
            <span className="font-medium">Active Provider:</span> {STT_PROVIDERS[sttConfig.provider].name}
          </p>
          <p>
            <span className="font-medium">Auto-save:</span> {sttConfig.autoSave ? 'Enabled' : 'Disabled'}
          </p>
          <p>
            <span className="font-medium">Show in UI:</span> {sttConfig.showProviderInUI ? 'Yes' : 'No'}
          </p>
          <p>
            <span className="font-medium">Transcription Type:</span> {sttConfig.useRefinedTranscription ? 'Refined (AI-enhanced)' : 'Raw'}
          </p>
        </div>
      </div>
    </div>
  )
}

// Helper function to parse teacher notes
interface ParsedTeacherNotes {
  score?: string
  bulletPoints: string[]
  rawText: string
}

function parseTeacherNotes(text: string): ParsedTeacherNotes {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0)

  let score: string | undefined
  const bulletPoints: string[] = []

  for (const line of lines) {
    // Extract score
    const scoreMatch = line.match(/^Score:\s*(.+)$/i)
    if (scoreMatch) {
      score = scoreMatch[1]
      continue
    }

    // Extract bullet points
    if (line.startsWith('•') || line.startsWith('-') || line.startsWith('*')) {
      bulletPoints.push(line.replace(/^[•\-*]\s*/, ''))
    } else if (line.match(/^\d+\./)) {
      bulletPoints.push(line.replace(/^\d+\.\s*/, ''))
    }
  }

  return {
    score,
    bulletPoints: bulletPoints.length > 0 ? bulletPoints : [],
    rawText: text
  }
}

// Recordings Tab Component
function RecordingsTab({ config, onConfigChange }: Pick<ProfileModuleProps, 'config' | 'onConfigChange'>) {
  const [recordings, setRecordings] = useState<MindflowSTTInteraction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [currentOffset, setCurrentOffset] = useState(0)
  const [expandedRecordings, setExpandedRecordings] = useState<Set<string>>(new Set())

  // Filter states
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')

  // Settings from config
  const pageSize = config.config.pageSize || 20
  const showTeacherNotes = config.config.showTeacherNotes !== false
  const showMetadata = config.config.showMetadata !== false

  const loadRecordings = async (offset = 0, isLoadingMore = false) => {
    try {
      setIsLoading(true)
      setError(null)

      const result = await mindflowApi.list({
        limit: pageSize,
        offset,
        start_date: startDate || undefined,
        end_date: endDate || undefined
      })

      if (isLoadingMore) {
        setRecordings(prev => [...prev, ...result.interactions])
      } else {
        setRecordings(result.interactions)
      }

      setHasMore(result.has_more || false)
      setCurrentOffset(offset)
    } catch (err) {
      console.error('Failed to load recordings:', err)
      setError('Failed to load recordings. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadRecordings()
  }, [startDate, endDate, pageSize])

  const handleLoadMore = () => {
    loadRecordings(currentOffset + pageSize, true)
  }

  const toggleRecording = (id: string) => {
    setExpandedRecordings(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (isLoading && recordings.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <p className="text-red-600">{error}</p>
        <button
          onClick={() => loadRecordings()}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Date Range Filter */}
      <div className="flex flex-col sm:flex-row gap-4 p-4 bg-gray-50 rounded-lg">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <Calendar className="w-4 h-4 inline mr-1" />
            From Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <Calendar className="w-4 h-4 inline mr-1" />
            To Date
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        {(startDate || endDate) && (
          <div className="flex items-end">
            <button
              onClick={() => {
                setStartDate('')
                setEndDate('')
              }}
              className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Recordings List */}
      {recordings.length === 0 ? (
        <div className="text-center py-12">
          <History className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">No recordings found</p>
          <p className="text-sm text-gray-500 mt-1">Try adjusting your date filters or make a new recording</p>
        </div>
      ) : (
        <div className="space-y-4">
          {recordings.map((recording) => {
            const isExpanded = expandedRecordings.has(recording.id)
            const hasRefinement = recording.refined_text && recording.refined_text !== recording.original_transcription

            return (
              <div
                key={recording.id}
                className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
              >
                <div
                  className="p-4 cursor-pointer"
                  onClick={() => toggleRecording(recording.id)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-gray-900">
                          {formatDate(recording.created_at || '')}
                        </span>
                        {hasRefinement && (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                            Refined
                          </span>
                        )}
                      </div>
                      {showMetadata && (
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span>{recording.transcription_api}</span>
                          {recording.audio_duration && (
                            <span>{recording.audio_duration.toFixed(1)}s</span>
                          )}
                        </div>
                      )}
                    </div>
                    <button className="text-gray-400 hover:text-gray-600">
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                  </div>

                  <p className="text-sm text-gray-700 line-clamp-2">
                    {hasRefinement ? recording.refined_text : recording.original_transcription}
                  </p>
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-200 p-4 bg-gray-50 space-y-3">
                    {hasRefinement && (
                      <>
                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                          <h5 className="text-xs font-medium text-green-800 mb-1">Refined Text</h5>
                          <p className="text-sm text-gray-700">{recording.refined_text}</p>
                        </div>
                        <div className="p-3 bg-gray-100 border border-gray-200 rounded-lg">
                          <h5 className="text-xs font-medium text-gray-600 mb-1">Original Text</h5>
                          <p className="text-sm text-gray-600">{recording.original_transcription}</p>
                        </div>
                      </>
                    )}

                    {!hasRefinement && (
                      <div className="p-3 bg-gray-100 border border-gray-200 rounded-lg">
                        <p className="text-sm text-gray-700">{recording.original_transcription}</p>
                      </div>
                    )}

                    {showTeacherNotes && recording.teacher_explanation && (
                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="text-xs font-medium text-yellow-800 flex items-center gap-1">
                            <Lightbulb className="w-3 h-3" />
                            Teacher Notes
                          </h5>
                          {(() => {
                            const parsed = parseTeacherNotes(recording.teacher_explanation)
                            return parsed.score ? (
                              <span className="text-sm font-semibold text-yellow-900">
                                {parsed.score}
                              </span>
                            ) : null
                          })()}
                        </div>
                        {(() => {
                          const parsed = parseTeacherNotes(recording.teacher_explanation)
                          if (parsed.bulletPoints.length > 0) {
                            return (
                              <ul className="space-y-2">
                                {parsed.bulletPoints.map((point, idx) => (
                                  <li key={idx} className="text-sm text-gray-700 flex gap-2">
                                    <span className="text-yellow-600 flex-shrink-0">•</span>
                                    <span>{point}</span>
                                  </li>
                                ))}
                              </ul>
                            )
                          } else {
                            return <p className="text-sm text-gray-700">{parsed.rawText}</p>
                          }
                        })()}
                      </div>
                    )}

                    {showMetadata && (
                      <div className="text-xs text-gray-500 space-y-1">
                        {recording.transcription_model && (
                          <p>Transcription Model: {recording.transcription_model}</p>
                        )}
                        {recording.optimization_model && (
                          <p>Optimization Model: {recording.optimization_model}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Load More Button */}
      {hasMore && (
        <div className="text-center">
          <button
            onClick={handleLoadMore}
            disabled={isLoading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
    </div>
  )
}
