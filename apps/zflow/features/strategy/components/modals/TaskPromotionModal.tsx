'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { TrendingUp, CheckCircle, AlertTriangle, Search } from 'lucide-react'
import { FullscreenModal } from '@/shared/components'
import { Card, CardHeader, CardTitle, CardContent, Button, Badge } from '../ui'
import { useStrategyTasks } from '../../hooks/useStrategyTasks'
import { useStrategyDashboard } from '../../hooks/useStrategyDashboard'
import { tasksApi } from '../../../../lib/api'
import type { TaskMemory } from '../../../../lib/api/api-base'

interface TaskPromotionModalProps {
  isOpen: boolean
  onClose: () => void
  seasonId?: string
}

export function TaskPromotionModal({ isOpen, onClose, seasonId }: TaskPromotionModalProps) {
  const { dashboard } = useStrategyDashboard()
  const { promoteTimelineTaskToStrategy, myTasks } = useStrategyTasks(seasonId)

  const [availableTimelineTasks, setAvailableTimelineTasks] = useState<TaskMemory[]>([])
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set())
  const [selectedInitiative, setSelectedInitiative] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [loadingTasks, setLoadingTasks] = useState(false)

  // Get already linked task IDs to filter them out
  const linkedTaskIds = React.useMemo(
    () => new Set(myTasks.map(task => task.timelineTaskId).filter(Boolean)),
    [myTasks]
  )

  const loadTimelineTasks = useCallback(async () => {
    setLoadingTasks(true)
    try {
      const tasks = await tasksApi.getAll({
        status: 'pending,in_progress',
        limit: 50,
        sort_by: 'created_at',
        sort_order: 'desc'
      })

      // Filter out already strategy-linked tasks
      const unlinkedTasks = tasks.filter(task =>
        !task.tags?.includes('strategy-linked') &&
        !linkedTaskIds.has(task.id)
      )

      setAvailableTimelineTasks(unlinkedTasks)
    } catch (error) {
      console.error('Error loading timeline tasks:', error)
    } finally {
      setLoadingTasks(false)
    }
  }, [linkedTaskIds])

  // Load timeline tasks when modal opens
  useEffect(() => {
    if (isOpen) {
      loadTimelineTasks()
    }
  }, [isOpen, loadTimelineTasks])

  // Filter tasks based on search
  const filteredTasks = availableTimelineTasks.filter(task =>
    task.content.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (task.content.description?.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const handleTaskToggle = (taskId: string) => {
    const newSelected = new Set(selectedTasks)
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId)
    } else {
      newSelected.add(taskId)
    }
    setSelectedTasks(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedTasks.size === filteredTasks.length) {
      setSelectedTasks(new Set())
    } else {
      setSelectedTasks(new Set(filteredTasks.map(task => task.id)))
    }
  }

  const handlePromoteSelected = async () => {
    if (!selectedInitiative || selectedTasks.size === 0) return

    setIsLoading(true)
    try {
      const promotionPromises = Array.from(selectedTasks).map(taskId =>
        promoteTimelineTaskToStrategy(taskId, selectedInitiative)
      )

      await Promise.all(promotionPromises)

      // Refresh the timeline tasks list
      await loadTimelineTasks()
      setSelectedTasks(new Set())

      // Show success message
      alert(`Successfully promoted ${selectedTasks.size} task(s) to strategic!`)
    } catch (error) {
      console.error('Error promoting tasks:', error)
      alert(`Failed to promote tasks: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'in_progress': return 'bg-blue-100 text-blue-800'
      case 'pending': return 'bg-gray-100 text-gray-800'
      case 'on_hold': return 'bg-yellow-100 text-yellow-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <FullscreenModal
      isOpen={isOpen}
      onClose={onClose}
      title="Promote Timeline Tasks"
      icon={<TrendingUp className="w-6 h-6 text-blue-600" />}
    >
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Convert Timeline Tasks to Strategic</h3>
          <p className="text-gray-600">Select timeline tasks to promote to strategic initiatives for better planning and tracking.</p>
        </div>

        {/* Initiative Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Select Target Initiative</CardTitle>
          </CardHeader>
          <CardContent>
            <select
              value={selectedInitiative}
              onChange={(e) => setSelectedInitiative(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Choose an initiative...</option>
              {dashboard?.initiatives?.map(initiative => (
                <option key={initiative.id} value={initiative.id}>
                  {initiative.title}
                </option>
              ))}
            </select>
            {dashboard?.initiatives?.length === 0 && (
              <p className="text-sm text-gray-500 mt-2">
                No initiatives available. Create an initiative first to promote tasks.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Search and Controls */}
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search timeline tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <Button
            variant="secondary"
            onClick={handleSelectAll}
            disabled={filteredTasks.length === 0}
          >
            {selectedTasks.size === filteredTasks.length ? 'Deselect All' : 'Select All'}
          </Button>
          <Button
            onClick={handlePromoteSelected}
            disabled={!selectedInitiative || selectedTasks.size === 0 || isLoading}
            className="px-6"
          >
            {isLoading ? 'Promoting...' : `Promote ${selectedTasks.size} Task${selectedTasks.size !== 1 ? 's' : ''}`}
          </Button>
        </div>

        {/* Tasks List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Available Timeline Tasks
              <Badge variant="secondary">{filteredTasks.length} found</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingTasks ? (
              <div className="text-center py-8 text-gray-500">Loading timeline tasks...</div>
            ) : filteredTasks.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {searchQuery ? 'No tasks match your search.' : 'No available timeline tasks to promote.'}
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredTasks.map(task => (
                  <div
                    key={task.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      selectedTasks.has(task.id)
                        ? 'border-blue-300 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-200 hover:bg-blue-25'
                    }`}
                    onClick={() => handleTaskToggle(task.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-5 h-5 border-2 rounded mt-0.5 flex items-center justify-center ${
                        selectedTasks.has(task.id)
                          ? 'border-blue-500 bg-blue-500'
                          : 'border-gray-300'
                      }`}>
                        {selectedTasks.has(task.id) && (
                          <CheckCircle className="h-3 w-3 text-white" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-medium text-gray-900">{task.content.title}</h4>
                          <div className="flex items-center gap-2">
                            <Badge className={`text-xs ${getStatusColor(task.content.status)}`}>
                              {task.content.status}
                            </Badge>
                            <Badge className={`text-xs ${getPriorityColor(task.content.priority)}`}>
                              {task.content.priority}
                            </Badge>
                          </div>
                        </div>

                        {task.content.description && (
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                            {task.content.description}
                          </p>
                        )}

                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span>Created: {new Date(task.created_at).toLocaleDateString()}</span>
                          {task.content.due_date && (
                            <span>Due: {new Date(task.content.due_date).toLocaleDateString()}</span>
                          )}
                          {task.content.progress !== undefined && (
                            <span>Progress: {task.content.progress}%</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Panel */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h4 className="text-lg font-semibold text-blue-800 mb-3 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            How Task Promotion Works
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-700">
            <div>
              <div className="font-medium mb-2">What happens when you promote:</div>
              <ul className="space-y-1">
                <li>• Creates strategic task linked to timeline task</li>
                <li>• Adds strategic importance and initiative context</li>
                <li>• Timeline task is tagged as &apos;strategy-linked&apos;</li>
                <li>• Both tasks stay synchronized</li>
              </ul>
            </div>
            <div>
              <div className="font-medium mb-2">Benefits:</div>
              <ul className="space-y-1">
                <li>• Strategic planning on existing work</li>
                <li>• Initiative progress tracking</li>
                <li>• Unified execution and planning view</li>
                <li>• Agent delegation capabilities</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </FullscreenModal>
  )
}
