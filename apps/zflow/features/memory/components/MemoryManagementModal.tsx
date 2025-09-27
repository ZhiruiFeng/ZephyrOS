'use client'

import React, { useState, useEffect } from 'react'
import {
  X,
  Plus,
  Link,
  Search,
  Clock,
  Star,
  Save,
  ArrowLeft,
  Loader,
  Tag as TagIcon,
  BookOpen,
  Calendar
} from 'lucide-react'
import RelationTypeBadge, { type RelationType, relationConfig } from './RelationTypeBadge'
import { type MemoryAnchor } from './MemoryAnchorCard'

interface Memory {
  id: string
  title: string
  note: string
  tags?: string[]
  created_at: string
  updated_at: string
}

interface MemoryManagementModalProps {
  isOpen: boolean
  onClose: () => void
  taskId: string
  taskTitle: string
  onMemoryCreated?: (memory: Memory, anchor: Omit<MemoryAnchor, 'memory_id' | 'created_at'>) => void
  onMemoryLinked?: (memoryId: string, anchor: Omit<MemoryAnchor, 'memory_id' | 'created_at'>) => void
  existingMemories?: Memory[]
  isLoading?: boolean
}

type ModalStep = 'choice' | 'create' | 'link' | 'anchor'

interface AnchorData {
  relation_type: RelationType
  weight: number
  local_time_range?: {
    start: string
    end?: string
  }
  notes?: string
}

export default function MemoryManagementModal({
  isOpen,
  onClose,
  taskId,
  taskTitle,
  onMemoryCreated,
  onMemoryLinked,
  existingMemories = [],
  isLoading = false
}: MemoryManagementModalProps) {
  const [step, setStep] = useState<ModalStep>('choice')
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Memory creation form
  const [newMemory, setNewMemory] = useState({
    title: '',
    note: '',
    tags: [] as string[]
  })

  // Anchor configuration
  const [anchorData, setAnchorData] = useState<AnchorData>({
    relation_type: 'about' as RelationType,
    weight: 3,
    local_time_range: undefined,
    notes: ''
  })

  // Tag input
  const [tagInput, setTagInput] = useState('')

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setStep('choice')
      setSelectedMemory(null)
      setSearchTerm('')
      setNewMemory({ title: '', note: '', tags: [] })
      setAnchorData({
        relation_type: 'about',
        weight: 3,
        local_time_range: undefined,
        notes: ''
      })
      setTagInput('')
    }
  }, [isOpen, existingMemories])

  // Filter memories for linking
  const filteredMemories = existingMemories.filter(memory =>
    memory.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    memory.note.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (memory.tags && memory.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())))
  )

  const handleAddTag = () => {
    const tag = tagInput.trim()
    if (tag && !newMemory.tags.includes(tag)) {
      setNewMemory(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }))
      setTagInput('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setNewMemory(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }

  const handleCreateMemory = async () => {
    if (!newMemory.title.trim() || !newMemory.note.trim()) return

    setIsSubmitting(true)
    try {
      // In a real implementation, this would call the API
      const createdMemory: Memory = {
        id: Date.now().toString(), // Mock ID
        title: newMemory.title.trim(),
        note: newMemory.note.trim(),
        tags: newMemory.tags,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const anchor = {
        anchor_item_id: taskId,
        relation_type: anchorData.relation_type,
        weight: anchorData.weight,
        local_time_range: anchorData.local_time_range,
        notes: anchorData.notes
      }

      onMemoryCreated?.(createdMemory, anchor)
      onClose()
    } catch (error) {
      console.error('Failed to create memory:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleLinkMemory = async () => {
    if (!selectedMemory) return

    setIsSubmitting(true)
    try {
      const anchor = {
        anchor_item_id: taskId,
        relation_type: anchorData.relation_type,
        weight: anchorData.weight,
        local_time_range: anchorData.local_time_range,
        notes: anchorData.notes
      }

      onMemoryLinked?.(selectedMemory.id, anchor)
      onClose()
    } catch (error) {
      console.error('Failed to link memory:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderWeightStars = () => {
    const stars = Math.round(anchorData.weight / 2)
    return (
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }, (_, i) => (
          <Star
            key={i}
            className={`w-4 h-4 cursor-pointer transition-colors ${
              i < stars ? 'text-yellow-400 fill-current' : 'text-gray-300 hover:text-yellow-200'
            }`}
            onClick={() => setAnchorData(prev => ({ ...prev, weight: (i + 1) * 2 }))}
          />
        ))}
        <span className="ml-2 text-sm text-gray-600">{anchorData.weight}/10</span>
      </div>
    )
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />

        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-2">
              {step !== 'choice' && (
                <button
                  onClick={() => {
                    if (step === 'anchor') {
                      setStep(selectedMemory ? 'link' : 'create')
                    } else {
                      setStep('choice')
                    }
                  }}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              )}
              <h2 className="text-lg font-semibold text-gray-900">
                {step === 'choice' && 'Add Memory to Task'}
                {step === 'create' && 'Create New Memory'}
                {step === 'link' && 'Link Existing Memory'}
                {step === 'anchor' && 'Configure Anchor'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
            {/* Task context */}
            <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-blue-800">
                <BookOpen className="w-4 h-4" />
                <span className="font-medium">Task:</span>
                <span className="truncate">{taskTitle}</span>
              </div>
            </div>

            {/* Step: Choice */}
            {step === 'choice' && (
              <div className="space-y-4">
                <p className="text-gray-600 mb-6">
                  How would you like to add a memory to this task?
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    onClick={() => setStep('create')}
                    className="p-6 border-2 border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <Plus className="w-6 h-6 text-blue-600" />
                      <h3 className="font-medium text-gray-900">Create New Memory</h3>
                    </div>
                    <p className="text-sm text-gray-600">
                      Create a fresh memory and anchor it to this task
                    </p>
                  </button>

                  <button
                    onClick={() => setStep('link')}
                    className="p-6 border-2 border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-left"
                    disabled={existingMemories.length === 0}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <Link className="w-6 h-6 text-blue-600" />
                      <h3 className="font-medium text-gray-900">Link Existing Memory</h3>
                    </div>
                    <p className="text-sm text-gray-600">
                      {existingMemories.length > 0
                        ? `Choose from ${existingMemories.length} existing memories`
                        : 'No existing memories available'
                      }
                    </p>
                  </button>
                </div>
              </div>
            )}

            {/* Step: Create Memory */}
            {step === 'create' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Memory Title *
                  </label>
                  <input
                    type="text"
                    value={newMemory.title}
                    onChange={(e) => setNewMemory(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter a descriptive title for your memory"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Memory Content *
                  </label>
                  <textarea
                    value={newMemory.note}
                    onChange={(e) => setNewMemory(prev => ({ ...prev, note: e.target.value }))}
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Describe your memory, insights, or takeaways..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tags
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {newMemory.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm"
                      >
                        {tag}
                        <button
                          onClick={() => handleRemoveTag(tag)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Add a tag"
                    />
                    <button
                      onClick={handleAddTag}
                      className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                    >
                      <TagIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    onClick={() => setStep('choice')}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setStep('anchor')}
                    disabled={!newMemory.title.trim() || !newMemory.note.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next: Configure Anchor
                  </button>
                </div>
              </div>
            )}

            {/* Step: Link Memory */}
            {step === 'link' && (
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Search existing memories..."
                  />
                </div>

                <div className="max-h-96 overflow-y-auto space-y-2">
                  {filteredMemories.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      {searchTerm ? 'No memories match your search.' : 'No memories available.'}
                    </div>
                  ) : (
                    filteredMemories.map((memory) => (
                      <button
                        key={memory.id}
                        onClick={() => setSelectedMemory(memory)}
                        className={`w-full p-4 border-2 rounded-lg text-left transition-colors ${
                          selectedMemory?.id === memory.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="font-medium text-gray-900 mb-1">{memory.title}</div>
                        <div className="text-sm text-gray-600 line-clamp-2 mb-2">
                          {memory.note.length > 150
                            ? memory.note.substring(0, 150) + '...'
                            : memory.note
                          }
                        </div>
                        {memory.tags && memory.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {memory.tags.slice(0, 3).map((tag, index) => (
                              <span
                                key={index}
                                className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs"
                              >
                                {tag}
                              </span>
                            ))}
                            {memory.tags.length > 3 && (
                              <span className="text-xs text-gray-400">
                                +{memory.tags.length - 3} more
                              </span>
                            )}
                          </div>
                        )}
                        <div className="text-xs text-gray-400 mt-2">
                          Created {new Date(memory.created_at).toLocaleDateString()}
                        </div>
                      </button>
                    ))
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    onClick={() => setStep('choice')}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setStep('anchor')}
                    disabled={!selectedMemory}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next: Configure Anchor
                  </button>
                </div>
              </div>
            )}

            {/* Step: Configure Anchor */}
            {step === 'anchor' && (
              <div className="space-y-6">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">
                    {selectedMemory ? 'Linking Memory' : 'Creating Memory'}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {selectedMemory ? selectedMemory.title : newMemory.title}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Relationship Type *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {Object.entries(relationConfig).map(([type, config]) => (
                      <button
                        key={type}
                        onClick={() => setAnchorData(prev => ({ ...prev, relation_type: type as RelationType }))}
                        className={`p-3 border-2 rounded-lg text-left transition-colors ${
                          anchorData.relation_type === type
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <config.icon className="w-4 h-4" />
                          <span className="font-medium">{config.label}</span>
                        </div>
                        <p className="text-xs text-gray-600">{config.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Importance Weight
                  </label>
                  {renderWeightStars()}
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={anchorData.weight}
                    onChange={(e) => setAnchorData(prev => ({ ...prev, weight: parseInt(e.target.value) }))}
                    className="w-full mt-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Time Range (Optional)
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Start Time</label>
                      <input
                        type="datetime-local"
                        value={anchorData.local_time_range?.start || ''}
                        onChange={(e) => setAnchorData(prev => ({
                          ...prev,
                          local_time_range: e.target.value ? {
                            start: e.target.value,
                            end: prev.local_time_range?.end
                          } : undefined
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">End Time</label>
                      <input
                        type="datetime-local"
                        value={anchorData.local_time_range?.end || ''}
                        onChange={(e) => setAnchorData(prev => ({
                          ...prev,
                          local_time_range: prev.local_time_range ? {
                            ...prev.local_time_range,
                            end: e.target.value || undefined
                          } : undefined
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        disabled={!anchorData.local_time_range?.start}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={anchorData.notes || ''}
                    onChange={(e) => setAnchorData(prev => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Add any additional context about this relationship..."
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    onClick={() => setStep(selectedMemory ? 'link' : 'create')}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={selectedMemory ? handleLinkMemory : handleCreateMemory}
                    disabled={isSubmitting}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSubmitting ? (
                      <Loader className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    {selectedMemory ? 'Link Memory' : 'Create & Anchor Memory'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
