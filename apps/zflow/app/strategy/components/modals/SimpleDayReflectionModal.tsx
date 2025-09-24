'use client'

import React, { useState, useEffect } from 'react'
import { Moon, CheckCircle, Target, Edit3, Trash2, Plus } from 'lucide-react'
import { FullscreenModal } from './FullscreenModal'
import { Card, CardHeader, CardTitle, CardContent, Button, Textarea, Badge } from '../ui'
import { ReflectionTypeSelector, ReflectionType, REFLECTION_TYPES } from './ReflectionTypeSelector'
import { useDayReflection } from '../../../../hooks/useDayReflection'
import { DailyStrategyItemWithDetails } from '../../../../lib/api/daily-strategy-api'

interface SimpleDayReflectionModalProps {
  isOpen: boolean
  onClose: () => void
  seasonId?: string
}

interface EditingReflection {
  id?: string
  type: ReflectionType
  title: string
  content: string
}

export function SimpleDayReflectionModal({ isOpen, onClose, seasonId }: SimpleDayReflectionModalProps) {
  const today = new Date().toISOString().split('T')[0]
  const { 
    data, 
    loading, 
    error, 
    reflectionsByType, 
    addReflection, 
    updateReflection, 
    deleteReflection,
    loadData 
  } = useDayReflection(today, seasonId)

  const [showTypeSelector, setShowTypeSelector] = useState(false)
  const [editing, setEditing] = useState<EditingReflection | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadData()
    }
  }, [isOpen, loadData])

  // Get reflection type info
  const getReflectionTypeInfo = (type: ReflectionType) => {
    return REFLECTION_TYPES.find(rt => rt.type === type)
  }

  // Start editing a reflection
  const startEditing = (reflection: DailyStrategyItemWithDetails, type: ReflectionType) => {
    setEditing({
      id: reflection.id,
      type,
      title: reflection.title,
      content: reflection.description || ''
    })
  }

  // Start creating new reflection
  const startCreating = (type: ReflectionType) => {
    const typeInfo = getReflectionTypeInfo(type)
    setEditing({
      type,
      title: '',
      content: ''
    })
    setShowTypeSelector(false)
  }

  // Cancel editing
  const cancelEditing = () => {
    setEditing(null)
  }

  // Save reflection
  const saveReflection = async () => {
    if (!editing || !editing.title.trim()) return

    setIsSubmitting(true)
    try {
      if (editing.id) {
        // Update existing reflection
        await updateReflection(editing.id, editing.title, editing.content)
      } else {
        // Create new reflection
        await addReflection(editing.type, editing.title, editing.content)
      }
      setEditing(null)
    } catch (err) {
      console.error('Failed to save reflection:', err)
      alert(err instanceof Error ? err.message : 'Failed to save reflection')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Delete reflection
  const handleDeleteReflection = async (id: string) => {
    if (!confirm('Are you sure you want to delete this reflection?')) return

    try {
      await deleteReflection(id)
    } catch (err) {
      console.error('Failed to delete reflection:', err)
      alert(err instanceof Error ? err.message : 'Failed to delete reflection')
    }
  }

  // Render reflection item
  const renderReflectionItem = (reflection: DailyStrategyItemWithDetails, type: ReflectionType) => {
    const typeInfo = getReflectionTypeInfo(type)
    const isEditing = editing?.id === reflection.id

    return (
      <Card key={reflection.id} className={`border-l-4 border-l-${typeInfo?.color}-500`}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {typeInfo?.icon}
              <span className="text-base font-medium">{typeInfo?.title}</span>
            </div>
            {!isEditing && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => startEditing(reflection, type)}
                  className="opacity-60 hover:opacity-100"
                >
                  <Edit3 className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteReflection(reflection.id)}
                  className="opacity-60 hover:opacity-100 text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div className="space-y-3">
              <input
                type="text"
                value={editing.title}
                onChange={(e) => setEditing(prev => prev ? { ...prev, title: e.target.value } : null)}
                placeholder="Title..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Textarea
                value={editing.content}
                onChange={(e) => setEditing(prev => prev ? { ...prev, content: e.target.value } : null)}
                placeholder={typeInfo?.placeholder}
                className="w-full min-h-[100px]"
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={cancelEditing}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={saveReflection}
                  disabled={isSubmitting || !editing.title.trim()}
                >
                  {isSubmitting ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <h4 className="font-medium text-gray-900 mb-2">{reflection.title}</h4>
              {reflection.description && (
                <p className="text-sm text-gray-600 whitespace-pre-wrap">
                  {reflection.description}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  // Render empty state for reflection type
  const renderEmptyReflectionType = (type: ReflectionType) => {
    const typeInfo = getReflectionTypeInfo(type)
    if (!typeInfo) return null

    return (
      <Card className={`border-l-4 border-l-${typeInfo.color}-500 border-dashed`}>
        <CardContent className="py-6">
          <div 
            className="text-center cursor-pointer hover:bg-gray-50 p-4 rounded-lg transition-colors"
            onClick={() => startCreating(type)}
          >
            <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full bg-${typeInfo.color}-100 mb-3`}>
              {typeInfo.icon}
            </div>
            <p className="text-sm text-gray-600 mb-1">No {typeInfo.title.toLowerCase()} yet</p>
            <p className="text-xs text-gray-500">{typeInfo.placeholder}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <FullscreenModal
      isOpen={isOpen}
      onClose={onClose}
      title="Day Reflection"
      icon={<Moon className="w-6 h-6 text-purple-600" />}
    >
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Reflect on Your Day</h3>
          <p className="text-gray-600">Capture insights and celebrate progress - {new Date().toLocaleDateString()}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Priority Performance */}
          <div className="space-y-6">
            {/* Completion Rate */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-blue-600" />
                  Priority Tasks Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Completion Rate Display */}
                  <div className="text-center p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                    <div className="text-4xl font-bold text-blue-600 mb-2">
                      {data.completionRate}%
                    </div>
                    <p className="text-sm text-gray-600">
                      Completion Rate ({data.completedCount} of {data.totalCount} priorities)
                    </p>
                    <div className="mt-3">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${data.completionRate}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  {/* Priority Tasks List */}
                  {data.priorities.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-3">Today&apos;s Priorities:</h4>
                      <div className="space-y-2">
                        {data.priorities.map((priority, index) => (
                          <div
                            key={priority.id}
                            className={`p-3 border rounded-lg ${
                              priority.status === 'completed'
                                ? 'border-green-300 bg-green-50'
                                : 'border-gray-200 bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{index + 1}.</span>
                              {priority.status === 'completed' && <CheckCircle className="h-4 w-4 text-green-600" />}
                              <span className={`text-sm ${
                                priority.status === 'completed' ? 'text-green-700 line-through' : 'text-gray-700'
                              }`}>
                                {priority.title}
                              </span>
                              <Badge variant={priority.status === 'completed' ? 'default' : 'secondary'}>
                                {priority.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {data.priorities.length === 0 && (
                    <div className="text-center text-gray-500 py-6">
                      <p>No priorities were set for today</p>
                      <p className="text-xs mt-1">Set priorities in your daily planning to track completion rate</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Reflections */}
          <div className="space-y-6">
            {/* Add Reflection Button */}
            <Card className="border-dashed border-2 border-blue-300">
              <CardContent className="py-6">
                <div 
                  className="text-center cursor-pointer hover:bg-blue-50 p-4 rounded-lg transition-colors"
                  onClick={() => setShowTypeSelector(true)}
                >
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 mb-3">
                    <Plus className="w-6 h-6 text-blue-600" />
                  </div>
                  <p className="text-sm text-gray-600 mb-1">Add a Reflection</p>
                  <p className="text-xs text-gray-500">Share insights, learnings, or gratitude from today</p>
                </div>
              </CardContent>
            </Card>

            {/* Reflections by Type */}
            {REFLECTION_TYPES.map(typeInfo => {
              const reflections = reflectionsByType[typeInfo.type]
              if (reflections.length > 0) {
                return (
                  <div key={typeInfo.type} className="space-y-3">
                    {reflections.map(reflection => 
                      renderReflectionItem(reflection, typeInfo.type)
                    )}
                  </div>
                )
              }
              return null
            })}

            {/* Show placeholder if no reflections */}
            {data.reflections.length === 0 && !editing && (
              <div className="text-center text-gray-500 py-8">
                <p>No reflections added yet</p>
                <p className="text-xs mt-1">Click &ldquo;Add a Reflection&rdquo; to get started</p>
              </div>
            )}
          </div>
        </div>

        {/* New Reflection Editor */}
        {editing && !editing.id && (
          <Card className="border-2 border-blue-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {getReflectionTypeInfo(editing.type)?.icon}
                <span>New {getReflectionTypeInfo(editing.type)?.title}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <input
                  type="text"
                  value={editing.title}
                  onChange={(e) => setEditing(prev => prev ? { ...prev, title: e.target.value } : null)}
                  placeholder="Title..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Textarea
                  value={editing.content}
                  onChange={(e) => setEditing(prev => prev ? { ...prev, content: e.target.value } : null)}
                  placeholder={getReflectionTypeInfo(editing.type)?.placeholder}
                  className="w-full min-h-[100px]"
                />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={cancelEditing}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={saveReflection}
                    disabled={isSubmitting || !editing.title.trim()}
                  >
                    {isSubmitting ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Type Selector Modal */}
        {showTypeSelector && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <ReflectionTypeSelector
                onAddReflection={startCreating}
                onCancel={() => setShowTypeSelector(false)}
              />
            </div>
          </div>
        )}

        {/* Loading and Error States */}
        {loading && (
          <div className="text-center py-4">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
            <p className="mt-2 text-sm text-gray-600">Loading reflection data...</p>
          </div>
        )}

        {error && (
          <div className="text-center py-4">
            <p className="text-red-600">{error}</p>
            <Button variant="outline" size="sm" onClick={loadData} className="mt-2">
              Try Again
            </Button>
          </div>
        )}

        {/* Close Button */}
        <div className="flex justify-center pt-6 border-t">
          <Button onClick={onClose} className="px-8">
            Done
          </Button>
        </div>
      </div>
    </FullscreenModal>
  )
}
