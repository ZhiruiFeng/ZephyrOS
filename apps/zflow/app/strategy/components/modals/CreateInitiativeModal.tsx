import React, { useState } from 'react'
import { X, Rocket, Calendar, Target, Flag, Tag } from 'lucide-react'
import { Button, Textarea } from '../ui'
import { useCreateInitiative, type CreateInitiativeData } from '../../../../features/strategy/hooks/useCreateInitiative'

interface CreateInitiativeModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (initiative: any) => void
  seasonId?: string
}

export const CreateInitiativeModal = ({
  isOpen,
  onClose,
  onSuccess,
  seasonId
}: CreateInitiativeModalProps) => {
  const { createInitiative, isCreating, error } = useCreateInitiative()
  
  const [formData, setFormData] = useState<CreateInitiativeData>({
    title: '',
    description: '',
    anchor_goal: '',
    success_metric: '',
    status: 'planning',
    priority: 'medium',
    progress: 0,
    progress_calculation: 'manual',
    start_date: '',
    due_date: '',
    season_id: seasonId,
    tags: [],
    metadata: {}
  })

  const [tagInput, setTagInput] = useState('')

  if (!isOpen) return null

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    
    try {
      const result = await createInitiative(formData)
      onSuccess?.(result)
      onClose()
      // Reset form
      setFormData({
        title: '',
        description: '',
        anchor_goal: '',
        success_metric: '',
        status: 'planning',
        priority: 'medium',
        progress: 0,
        progress_calculation: 'manual',
        start_date: '',
        due_date: '',
        season_id: seasonId,
        tags: [],
        metadata: {}
      })
      setTagInput('')
    } catch (err) {
      // Error is handled by the hook
      console.error('Failed to create initiative:', err)
    }
  }

  const handleInputChange = (field: keyof CreateInitiativeData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const addTag = () => {
    if (tagInput.trim() && !formData.tags?.includes(tagInput.trim())) {
      handleInputChange('tags', [...(formData.tags || []), tagInput.trim()])
      setTagInput('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    handleInputChange('tags', formData.tags?.filter(tag => tag !== tagToRemove) || [])
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
      e.preventDefault()
      addTag()
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-full overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-primary-600 to-primary-700 rounded-lg flex items-center justify-center">
              <Rocket className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-lg font-semibold">Create New Initiative</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              Initiative Title *
            </label>
            <input
              type="text"
              id="title"
              required
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter initiative title..."
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <Textarea
              value={formData.description || ''}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Describe the initiative..."
              className="min-h-[80px]"
            />
          </div>

          {/* Anchor Goal */}
          <div>
            <label htmlFor="anchor_goal" className="block text-sm font-medium text-gray-700 mb-2">
              <Target className="inline w-4 h-4 mr-1" />
              Anchor Goal
            </label>
            <input
              type="text"
              id="anchor_goal"
              value={formData.anchor_goal || ''}
              onChange={(e) => handleInputChange('anchor_goal', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="What is the main goal of this initiative?"
            />
          </div>

          {/* Success Metric */}
          <div>
            <label htmlFor="success_metric" className="block text-sm font-medium text-gray-700 mb-2">
              <Flag className="inline w-4 h-4 mr-1" />
              Success Metric
            </label>
            <input
              type="text"
              id="success_metric"
              value={formData.success_metric || ''}
              onChange={(e) => handleInputChange('success_metric', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="How will you measure success?"
            />
          </div>

          {/* Status and Priority */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="planning">Planning</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              <select
                id="priority"
                value={formData.priority}
                onChange={(e) => handleInputChange('priority', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          {/* Timeline */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="inline w-4 h-4 mr-1" />
                Start Date
              </label>
              <input
                type="date"
                id="start_date"
                value={formData.start_date || ''}
                onChange={(e) => handleInputChange('start_date', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="due_date" className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="inline w-4 h-4 mr-1" />
                Due Date
              </label>
              <input
                type="date"
                id="due_date"
                value={formData.due_date || ''}
                onChange={(e) => handleInputChange('due_date', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-2">
              <Tag className="inline w-4 h-4 mr-1" />
              Tags
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Add a tag..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <Button
                variant="outline"
                onClick={addTag}
                disabled={!tagInput.trim()}
              >
                Add
              </Button>
            </div>
            {formData.tags && formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                  >
                    {tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="ml-1 text-blue-600 hover:text-blue-800"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isCreating || !formData.title.trim()}
              className="bg-primary-600 hover:bg-primary-700 text-white"
            >
              {isCreating ? 'Creating...' : 'Create Initiative'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
