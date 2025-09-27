'use client'

import React, { useState, useEffect } from 'react'
import { Search, Plus, Clock, User } from 'lucide-react'
import { Button } from '../ui'
import { tasksApi } from '@/lib/api'
import { TaskMemory } from '@/lib/api/api-base'

interface TaskSelectorProps {
  onSelectExisting: (task: TaskMemory) => void
  onCreateNew: () => void
  onCancel: () => void
}

export function TaskSelector({ onSelectExisting, onCreateNew, onCancel }: TaskSelectorProps) {
  const [tasks, setTasks] = useState<TaskMemory[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredTasks, setFilteredTasks] = useState<TaskMemory[]>([])

  // Load available tasks (pending and in-progress only)
  useEffect(() => {
    const loadTasks = async () => {
      setLoading(true)
      try {
        const allTasks = await tasksApi.getAll({
          limit: 50,
          sort_by: 'updated_at',
          sort_order: 'desc'
        })
        
        // Filter to only show pending and in-progress tasks
        const availableTasks = allTasks.filter(task => 
          task.content.status === 'pending' || task.content.status === 'in_progress'
        )
        
        setTasks(availableTasks)
        setFilteredTasks(availableTasks)
      } catch (error) {
        console.error('Failed to load tasks:', error)
      } finally {
        setLoading(false)
      }
    }

    loadTasks()
  }, [])

  // Filter tasks based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredTasks(tasks)
    } else {
      const query = searchQuery.toLowerCase()
      const filtered = tasks.filter(task =>
        task.content.title.toLowerCase().includes(query) ||
        (task.content.description && task.content.description.toLowerCase().includes(query))
      )
      setFilteredTasks(filtered)
    }
  }, [searchQuery, tasks])

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString()
    } catch {
      return 'No date'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-50'
      case 'high': return 'text-orange-600 bg-orange-50'
      case 'medium': return 'text-yellow-600 bg-yellow-50'
      case 'low': return 'text-green-600 bg-green-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-blue-600 bg-blue-50'
      case 'in_progress': return 'text-purple-600 bg-purple-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Select a Task</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={onCancel}
        >
          Cancel
        </Button>
      </div>

      {/* Create New Task Option */}
      <div 
        className="p-4 border-2 border-dashed border-blue-300 rounded-lg hover:border-blue-400 cursor-pointer transition-colors"
        onClick={onCreateNew}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <Plus className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <div className="font-medium text-gray-900">Create New Task</div>
            <div className="text-sm text-gray-500">Create a new task for this priority</div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search existing tasks..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Task List */}
      <div className="max-h-60 overflow-y-auto space-y-2">
        {loading ? (
          <div className="text-center py-4">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-sm text-gray-600">Loading tasks...</p>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {searchQuery ? 'No tasks found matching your search' : 'No available tasks'}
          </div>
        ) : (
          filteredTasks.map((task) => (
            <div
              key={task.id}
              className="p-3 border border-gray-200 rounded-lg hover:border-blue-300 cursor-pointer transition-colors"
              onClick={() => onSelectExisting(task)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900 truncate">
                    {task.content.title}
                  </h4>
                  {task.content.description && (
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                      {task.content.description}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-4 mt-2">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.content.status)}`}>
                      {task.content.status}
                    </span>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.content.priority)}`}>
                      {task.content.priority}
                    </span>
                    
                    {task.content.due_date && (
                      <div className="flex items-center text-xs text-gray-500">
                        <Clock className="w-3 h-3 mr-1" />
                        {formatDate(task.content.due_date)}
                      </div>
                    )}
                    
                    {task.content.assignee && (
                      <div className="flex items-center text-xs text-gray-500">
                        <User className="w-3 h-3 mr-1" />
                        {task.content.assignee}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
