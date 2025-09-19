'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import {
  Users,
  Heart,
  Clock,
  Settings,
  Plus,
  RotateCcw,
  Save,
  ChevronDown,
  Trash2,
  Edit3,
  Loader2,
  Maximize2
} from 'lucide-react'
import {
  useCheckinQueue,
  useReconnectSuggestions,
  useBrokerageOpportunities,
  useRelationshipProfiles,
  useLogTouchpoint,
  usePeople,
  usePeopleManager,
  useRelationshipProfile,
  type CheckinItem,
  type Person,
  type RelationshipProfile,
  type Touchpoint
} from '../../../../hooks/useZRelations'
import { useTranslation } from '../../../../contexts/LanguageContext'
import type { ProfileModuleProps } from '../types'

const TIER_LABELS = {
  5: 'Core 5',
  15: 'Close 15',
  50: 'Active 50',
  150: 'Wider 150'
}

const TIER_COLORS = {
  5: 'bg-purple-100 text-purple-800 border-purple-200',
  15: 'bg-blue-100 text-blue-800 border-blue-200',
  50: 'bg-green-100 text-green-800 border-green-200',
  150: 'bg-gray-100 text-gray-800 border-gray-200'
}

const CADENCE_OPTIONS = {
  5: 14,   // 2 weeks
  15: 21,  // 3 weeks
  50: 45,  // 6 weeks
  150: 90  // 12 weeks
}

const CHANNEL_OPTIONS = [
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'text', label: 'Text' },
  { value: 'in_person', label: 'In Person' },
  { value: 'video_call', label: 'Video Call' },
  { value: 'social_media', label: 'Social Media' },
  { value: 'messaging_app', label: 'Messaging App' },
  { value: 'other', label: 'Other' }
]

interface LocalPerson extends Person {
  tier?: 5 | 15 | 50 | 150
  healthScore?: number
  nextCheckin?: string
  cadenceDays?: number
  relationshipContext?: string
}

export function ZRelationsModule({ config, onConfigChange, isFullscreen = false, onToggleFullscreen, fullScreenPath }: ProfileModuleProps) {
  const { t } = useTranslation()
  // API hooks
  const { queue, isLoading: queueLoading, error: queueError, refresh: refreshQueue } = useCheckinQueue()
  const { profiles, isLoading: profilesLoading, refresh: refreshProfiles } = useRelationshipProfiles()
  const { people, isLoading: peopleLoading, refresh: refreshPeople } = usePeople()
  const { logTouchpoint, isLoading: loggingTouchpoint } = useLogTouchpoint()
  const { createPerson, updatePerson, isLoading: creatingPerson } = usePeopleManager()
  const { createProfile, updateProfile, isLoading: managingProfile } = useRelationshipProfile()

  // Local state
  const [selectedPerson, setSelectedPerson] = useState<LocalPerson | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [draggedPerson, setDraggedPerson] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'queue' | 'manage'>('queue')

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    job_title: '',
    tier: 5 as 5 | 15 | 50 | 150,
    relationship_context: '',
    cadence_days: CADENCE_OPTIONS[5],
    how_met: ''
  })

  // Quick touchpoint form
  const [touchpointData, setTouchpointData] = useState({
    person_id: '',
    channel: 'email' as const,
    direction: 'outbound' as 'inbound' | 'outbound',
    summary: '',
    sentiment: 1,
    duration_minutes: undefined as number | undefined,
    is_give: false,
    give_ask_type: '',
    context: '',
    tags: [] as string[],
    needs_followup: false,
    followup_date: '',
    followup_notes: ''
  })

  // Get current profile for selected person
  const selectedProfile = useMemo(() => {
    return selectedPerson ? profiles.find(p => p.person_id === selectedPerson.id) : null
  }, [selectedPerson, profiles])

  // Reset form when selectedPerson changes
  useEffect(() => {
    if (selectedPerson && selectedProfile !== undefined) {
      setFormData({
        name: selectedPerson.name || '',
        email: selectedPerson.email || '',
        company: selectedPerson.company || '',
        job_title: selectedPerson.job_title || '',
        tier: selectedProfile?.tier || 50,
        relationship_context: selectedProfile?.relationship_context || '',
        cadence_days: selectedProfile?.cadence_days || CADENCE_OPTIONS[selectedProfile?.tier || 50],
        how_met: selectedProfile?.how_met || ''
      })
    } else if (!selectedPerson && !showAddForm) {
      setFormData({
        name: '',
        email: '',
        company: '',
        job_title: '',
        tier: 5,
        relationship_context: '',
        cadence_days: CADENCE_OPTIONS[5],
        how_met: ''
      })
    }
  }, [selectedPerson, selectedProfile, showAddForm])

  // Handle creating or updating person
  const handleSavePerson = async () => {
    if (!formData.name.trim()) return

    try {
      let personId = selectedPerson?.id

      // Create or update person basic info
      if (!selectedPerson) {
        const newPerson = await createPerson({
          name: formData.name,
          email: formData.email || undefined,
          company: formData.company || undefined,
          job_title: formData.job_title || undefined
        })
        personId = newPerson.id
      } else {
        await updatePerson(selectedPerson.id, {
          name: formData.name || undefined,
          email: formData.email || undefined,
          company: formData.company || undefined,
          job_title: formData.job_title || undefined
        })
      }

      if (!personId) return

      // Check if profile exists for this person
      const existingProfile = selectedPerson ? selectedProfile : profiles.find(p => p.person_id === personId)

      const profileData = {
        person_id: personId,
        tier: formData.tier,
        cadence_days: formData.cadence_days,
        relationship_context: formData.relationship_context || undefined,
        how_met: formData.how_met || undefined
      }

      if (existingProfile) {
        const { person_id, ...updateFields } = profileData
        await updateProfile(existingProfile.id, updateFields)
      } else {
        await createProfile(profileData)
      }

      // Refresh data
      refreshPeople()
      refreshProfiles()
      refreshQueue()

      // Reset form
      setSelectedPerson(null)
      setShowAddForm(false)
    } catch (error) {
      console.error('Failed to save person:', error)
    }
  }

  // Handle quick touchpoint logging
  const handleLogTouchpoint = async () => {
    if (!touchpointData.person_id || !touchpointData.summary.trim()) return

    try {
      await logTouchpoint(touchpointData)

      // Reset form
      setTouchpointData({
        person_id: '',
        channel: 'email',
        direction: 'outbound',
        summary: '',
        sentiment: 1,
        duration_minutes: undefined,
        is_give: false,
        give_ask_type: '',
        context: '',
        tags: [],
        needs_followup: false,
        followup_date: '',
        followup_notes: ''
      })

      // Refresh data
      refreshQueue()
      refreshProfiles()
    } catch (error) {
      console.error('Failed to log touchpoint:', error)
    }
  }

  // Handle tier change via drag and drop
  const handleTierChange = async (personId: string, newTier: 5 | 15 | 50 | 150) => {
    try {
      const profile = profiles.find(p => p.person_id === personId)

      if (profile) {
        await updateProfile(profile.id, {
          tier: newTier,
          cadence_days: CADENCE_OPTIONS[newTier]
        })
      } else {
        await createProfile({
          person_id: personId,
          tier: newTier,
          cadence_days: CADENCE_OPTIONS[newTier]
        })
      }

      refreshProfiles()
      refreshQueue()
    } catch (error) {
      console.error('Failed to update tier:', error)
    }
  }

  // Handle quick actions on people in queue
  const handlePersonAction = async (personId: string, action: 'active-constructive' | 'log' | 'quick-hello') => {
    const person = people.find(p => p.id === personId)
    if (!person) return

    if (action === 'log') {
      setSelectedPerson(person)
      setTouchpointData(prev => ({ ...prev, person_id: personId }))
      return
    }

    let summary = ''
    let sentiment = 1
    let is_give = false

    switch (action) {
      case 'active-constructive':
        summary = 'Active-constructive response to their good news'
        sentiment = 2
        is_give = true
        break
      case 'quick-hello':
        summary = 'Quick hello to check in'
        sentiment = 1
        break
    }

    try {
      await logTouchpoint({
        person_id: personId,
        channel: 'email',
        direction: 'outbound',
        summary: summary,
        sentiment: sentiment,
        is_give: is_give,
        context: action === 'active-constructive' ? 'personal' : 'social',
        tags: action === 'active-constructive' ? ['celebration', 'support'] : ['check-in']
      })

      refreshQueue()
      refreshProfiles()
    } catch (error) {
      console.error('Failed to log touchpoint:', error)
    }
  }

  // Get health score color
  const getHealthColor = (score: number) => {
    if (score >= 90) return 'text-green-600'
    if (score >= 70) return 'text-yellow-600'
    if (score >= 50) return 'text-orange-600'
    return 'text-red-600'
  }

  // Get people by tier for Dunbar rings
  const getPeopleByTier = (tier: 5 | 15 | 50 | 150) => {
    return profiles.filter(profile => profile.tier === tier)
  }

  // Get person name by ID
  const getPersonName = (personId: string) => {
    return people.find(p => p.id === personId)?.name || 'Unknown'
  }

  const isLoading = queueLoading || profilesLoading || peopleLoading

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 min-h-[400px] flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-600">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading Z-Relations...</span>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${isFullscreen ? 'p-8' : 'p-6'} ${isFullscreen ? 'h-full' : 'min-h-[800px]'}`}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Z-Relations</h2>
              <p className="text-gray-600 text-sm">Manage relationships and social connections</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {fullScreenPath && (
              <Link
                href={fullScreenPath}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="查看完整页面"
                aria-label="查看完整页面"
              >
                <Maximize2 className="w-4 h-4" />
              </Link>
            )}
            
            {onToggleFullscreen && (
              <button
                onClick={onToggleFullscreen}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title={isFullscreen ? "退出全屏" : "全屏显示"}
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('queue')}
          className={`px-4 py-2 text-sm font-medium border-b-2 ${
            activeTab === 'queue'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Clock className="w-4 h-4 inline mr-2" />
          Check-in Queue ({queue?.summary.total_due || 0})
        </button>
        <button
          onClick={() => setActiveTab('manage')}
          className={`px-4 py-2 text-sm font-medium border-b-2 ${
            activeTab === 'manage'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Users className="w-4 h-4 inline mr-2" />
          Manage People
        </button>
      </div>

      {activeTab === 'queue' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Check-in Queue */}
          <div className="lg:col-span-2">
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Check-in Queue</h3>
                <button
                  onClick={() => refreshQueue()}
                  className="flex items-center gap-2 px-3 py-1 bg-white border border-gray-300 rounded text-sm hover:bg-gray-50 text-gray-700"
                >
                  <RotateCcw className="w-4 h-4" />
                  Refresh
                </button>
              </div>

              {queueError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
                  <p className="text-red-800 text-sm">
                    Failed to load check-in queue. Please check your API connection.
                  </p>
                </div>
              )}

              <p className="text-gray-600 text-sm mb-4">Showing contacts that need attention based on cadence.</p>

              <div className="space-y-3">
                {queue?.checkins && queue.checkins.length > 0 ? (
                  queue.checkins.slice(0, 6).map((item) => (
                    <div key={item.person_id} className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-medium">{item.person.name?.charAt(0) || '?'}</span>
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{item.person.name}</div>
                            <div className="text-sm text-gray-500">
                              {item.person.job_title && item.person.company
                                ? `${item.person.job_title} at ${item.person.company}`
                                : item.person.company || 'No company info'
                              }
                            </div>
                          </div>
                        </div>
                        <div className={`text-sm font-medium ${getHealthColor(item.health_score)}`}>
                          Health {item.health_score}
                        </div>
                      </div>

                      {item.days_overdue > 0 && (
                        <div className="text-sm text-red-600 mb-3 font-medium">
                          {item.days_overdue} days overdue
                        </div>
                      )}

                      <div className="flex gap-2">
                        <button
                          onClick={() => handlePersonAction(item.person_id, 'active-constructive')}
                          disabled={loggingTouchpoint}
                          className="flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-800 rounded text-sm hover:bg-orange-200 disabled:opacity-50"
                        >
                          🎉 Active-Constructive
                        </button>
                        <button
                          onClick={() => handlePersonAction(item.person_id, 'log')}
                          className="flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-800 rounded text-sm hover:bg-gray-200"
                        >
                          📝 Log
                        </button>
                        <button
                          onClick={() => handlePersonAction(item.person_id, 'quick-hello')}
                          disabled={loggingTouchpoint}
                          className="flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-800 rounded text-sm hover:bg-yellow-200 disabled:opacity-50"
                        >
                          👋 Quick Hello
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Clock className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p>No check-ins due right now. All caught up!</p>
                  </div>
                )}
              </div>
            </div>

            {/* Dunbar Rings */}
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 mt-6">
              <h3 className="text-lg font-semibold mb-2 text-gray-900">Dunbar Rings</h3>
              <p className="text-gray-600 text-sm mb-4">Drag people between tiers. Cadences auto-update.</p>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {([5, 15, 50, 150] as const).map((tier) => (
                  <div
                    key={tier}
                    className="bg-white border border-gray-200 rounded-lg p-3"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault()
                      if (draggedPerson) {
                        handleTierChange(draggedPerson, tier)
                        setDraggedPerson(null)
                      }
                    }}
                  >
                    <h4 className="font-medium mb-2 text-gray-900">{TIER_LABELS[tier]}</h4>
                    <div className="space-y-1">
                      {getPeopleByTier(tier).map((profile) => (
                        <div
                          key={profile.id}
                          draggable
                          onDragStart={() => setDraggedPerson(profile.person_id)}
                          className={`${TIER_COLORS[tier]} rounded px-2 py-1 text-sm cursor-move hover:opacity-80 border`}
                        >
                          {getPersonName(profile.person_id)}
                        </div>
                      ))}
                      {getPeopleByTier(tier).length === 0 && (
                        <div className="text-gray-400 text-sm text-center py-2">
                          No one in this tier
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Quick Touchpoint */}
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">Quick Touchpoint</h3>

              <div className="space-y-3">
                <select
                  value={touchpointData.person_id}
                  onChange={(e) => setTouchpointData({...touchpointData, person_id: e.target.value})}
                  className="w-full p-2 bg-white border border-gray-300 rounded text-gray-900"
                >
                  <option value="">Select person</option>
                  {people.map(person => (
                    <option key={person.id} value={person.id}>{person.name}</option>
                  ))}
                </select>

                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={touchpointData.channel}
                    onChange={(e) => setTouchpointData({...touchpointData, channel: e.target.value as any})}
                    className="p-2 bg-white border border-gray-300 rounded text-gray-900"
                  >
                    {CHANNEL_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>

                  <select
                    value={touchpointData.direction}
                    onChange={(e) => setTouchpointData({...touchpointData, direction: e.target.value as 'inbound' | 'outbound'})}
                    className="p-2 bg-white border border-gray-300 rounded text-gray-900"
                  >
                    <option value="outbound">Outbound</option>
                    <option value="inbound">Inbound</option>
                  </select>
                </div>

                <select
                  value={touchpointData.sentiment}
                  onChange={(e) => setTouchpointData({...touchpointData, sentiment: parseInt(e.target.value)})}
                  className="w-full p-2 bg-white border border-gray-300 rounded text-gray-900"
                >
                  <option value={-2}>Very Negative (-2)</option>
                  <option value={-1}>Negative (-1)</option>
                  <option value={0}>Neutral (0)</option>
                  <option value={1}>Positive (+1)</option>
                  <option value={2}>Very Positive (+2)</option>
                </select>

                <textarea
                  placeholder="Summary (e.g., Congratulated on promotion)"
                  value={touchpointData.summary}
                  onChange={(e) => setTouchpointData({...touchpointData, summary: e.target.value})}
                  className="w-full p-2 bg-white border border-gray-300 rounded text-gray-900 placeholder-gray-500"
                  rows={3}
                />

                <button
                  onClick={handleLogTouchpoint}
                  disabled={loggingTouchpoint || !touchpointData.person_id || !touchpointData.summary.trim()}
                  className="w-full flex items-center justify-center gap-2 p-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loggingTouchpoint && <Loader2 className="w-4 h-4 animate-spin" />}
                  Log Touchpoint
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'manage' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - People List */}
          <div className="lg:col-span-2">
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">People</h3>
                <button
                  onClick={() => {
                    setSelectedPerson(null)
                    setShowAddForm(true)
                  }}
                  className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" />
                  Add Person
                </button>
              </div>

              <div className="space-y-3">
                {people.length > 0 ? (
                  people.map((person) => {
                    const profile = profiles.find(p => p.person_id === person.id)
                    return (
                      <div key={person.id} className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-blue-600 font-medium">{person.name?.charAt(0) || '?'}</span>
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{person.name}</div>
                              <div className="text-sm text-gray-500">
                                {person.job_title && person.company
                                  ? `${person.job_title} at ${person.company}`
                                  : person.company || person.email || 'No details'
                                }
                              </div>
                              {profile && (
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-1 ${TIER_COLORS[profile.tier]}`}>
                                  {TIER_LABELS[profile.tier]}
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedPerson(person)
                              setShowAddForm(true)
                            }}
                            className="flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200"
                          >
                            <Edit3 className="w-4 h-4" />
                            Edit
                          </button>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p>No people added yet. Click &ldquo;Add Person&rdquo; to get started.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Add/Edit Form */}
          <div className="space-y-6">
            {(showAddForm || selectedPerson) && (
              <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                <h3 className="text-lg font-semibold mb-4 text-gray-900">
                  {selectedPerson ? 'Edit Person' : 'Add Person'}
                </h3>

                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Full name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full p-2 bg-white border border-gray-300 rounded text-gray-900 placeholder-gray-500"
                  />

                  <input
                    type="email"
                    placeholder="Email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full p-2 bg-white border border-gray-300 rounded text-gray-900 placeholder-gray-500"
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Company"
                      value={formData.company}
                      onChange={(e) => setFormData({...formData, company: e.target.value})}
                      className="p-2 bg-white border border-gray-300 rounded text-gray-900 placeholder-gray-500"
                    />

                    <input
                      type="text"
                      placeholder="Job title"
                      value={formData.job_title}
                      onChange={(e) => setFormData({...formData, job_title: e.target.value})}
                      className="p-2 bg-white border border-gray-300 rounded text-gray-900 placeholder-gray-500"
                    />
                  </div>

                  <textarea
                    placeholder="Relationship context (how you know them)"
                    value={formData.relationship_context}
                    onChange={(e) => setFormData({...formData, relationship_context: e.target.value})}
                    className="w-full p-2 bg-white border border-gray-300 rounded text-gray-900 placeholder-gray-500"
                    rows={2}
                  />

                  <input
                    type="text"
                    placeholder="How you met"
                    value={formData.how_met}
                    onChange={(e) => setFormData({...formData, how_met: e.target.value})}
                    className="w-full p-2 bg-white border border-gray-300 rounded text-gray-900 placeholder-gray-500"
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <select
                      value={formData.tier}
                      onChange={(e) => {
                        const newTier = parseInt(e.target.value) as 5 | 15 | 50 | 150
                        setFormData({
                          ...formData,
                          tier: newTier,
                          cadence_days: CADENCE_OPTIONS[newTier]
                        })
                      }}
                      className="p-2 bg-white border border-gray-300 rounded text-gray-900"
                    >
                      <option value={5}>Core 5</option>
                      <option value={15}>Close 15</option>
                      <option value={50}>Active 50</option>
                      <option value={150}>Wider 150</option>
                    </select>

                    <select
                      value={formData.cadence_days}
                      onChange={(e) => setFormData({...formData, cadence_days: parseInt(e.target.value)})}
                      className="p-2 bg-white border border-gray-300 rounded text-gray-900"
                    >
                      <option value={CADENCE_OPTIONS[formData.tier]}>Default ({CADENCE_OPTIONS[formData.tier]} days)</option>
                      <option value={7}>Weekly (7 days)</option>
                      <option value={14}>Bi-weekly (14 days)</option>
                      <option value={21}>3 weeks (21 days)</option>
                      <option value={30}>Monthly (30 days)</option>
                      <option value={60}>2 months (60 days)</option>
                      <option value={90}>3 months (90 days)</option>
                    </select>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleSavePerson}
                      disabled={creatingPerson || managingProfile || !formData.name.trim()}
                      className="flex-1 flex items-center justify-center gap-2 p-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {(creatingPerson || managingProfile) && <Loader2 className="w-4 h-4 animate-spin" />}
                      <Save className="w-4 h-4" />
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setSelectedPerson(null)
                        setShowAddForm(false)
                      }}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}