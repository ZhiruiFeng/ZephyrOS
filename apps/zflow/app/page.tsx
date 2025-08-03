'use client'

import React, { useState } from 'react'
import { Plus, CheckCircle, Circle, Clock, AlertCircle, Trash2 } from 'lucide-react'
import { useTasks, useCreateMemory, useUpdateMemory, useDeleteMemory } from '../hooks/useMemories'

// 任务类型定义
interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  created_at: string;
  updated_at: string;
  due_date?: string;
  tags?: string[];
}

export default function ZFlowPage() {
  const [newTask, setNewTask] = useState('')
  const [newTaskDescription, setNewTaskDescription] = useState('')
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [showAddForm, setShowAddForm] = useState(false)

  // 使用 API hooks
  const { memories: tasks, isLoading, error, refetch } = useTasks()
  const { createMemory } = useCreateMemory()
  const { updateMemory } = useUpdateMemory()
  const { deleteMemory } = useDeleteMemory()

  const addTask = async () => {
    if (!newTask.trim()) return

    try {
      const taskData = {
        title: newTask,
        description: newTaskDescription,
        status: 'pending' as const,
        priority: newTaskPriority,
        due_date: null,
        tags: ['zflow', 'task']
      }

      await createMemory({
        type: 'task',
        content: taskData,
        tags: ['zflow', 'task']
      })

      // 重置表单
      setNewTask('')
      setNewTaskDescription('')
      setNewTaskPriority('medium')
      setShowAddForm(false)
    } catch (error) {
      console.error('Failed to create task:', error)
      alert('Failed to create task, please try again')
    }
  }

  const toggleTaskStatus = async (taskId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'completed' ? 'pending' : 'completed'
      
      await updateMemory(taskId, {
        content: {
          ...tasks.find(t => t.id === taskId)?.content,
          status: newStatus
        }
      })
    } catch (error) {
      console.error('Failed to update task:', error)
      alert('Failed to update task, please try again')
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return

    try {
      await deleteMemory(taskId)
    } catch (error) {
      console.error('Failed to delete task:', error)
      alert('Failed to delete task, please try again')
    }
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return <AlertCircle className="w-4 h-4 text-red-500" />
      case 'medium':
        return <Clock className="w-4 h-4 text-yellow-500" />
      case 'low':
        return <Circle className="w-4 h-4 text-gray-400" />
      default:
        return <Clock className="w-4 h-4 text-yellow-500" />
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
          <p className="text-red-600">Failed to load tasks</p>
          <button 
            onClick={() => refetch()}
            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">ZFlow</h1>
        <p className="text-gray-600">Manage your daily tasks</p>
      </div>

      {/* 添加任务 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        {!showAddForm ? (
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors duration-200 flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add New Task
          </button>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-4">
              <input
                type="text"
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addTask()}
                placeholder="Task title..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <select
                value={newTaskPriority}
                onChange={(e) => setNewTaskPriority(e.target.value as 'low' | 'medium' | 'high')}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
              </select>
            </div>
            <textarea
              value={newTaskDescription}
              onChange={(e) => setNewTaskDescription(e.target.value)}
              placeholder="Task description (optional)..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              rows={3}
            />
            <div className="flex gap-2">
              <button
                onClick={addTask}
                disabled={!newTask.trim()}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors duration-200 disabled:opacity-50"
              >
                Create Task
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors duration-200"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 任务列表 */}
      <div className="space-y-4">
        {tasks.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center text-gray-500">
            <CheckCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No tasks yet, start by adding your first task!</p>
          </div>
        ) : (
          tasks.map((task) => {
            const taskContent = task.content as Task
            return (
              <div key={task.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => toggleTaskStatus(task.id, taskContent.status)}
                    className="flex-shrink-0"
                  >
                    {taskContent.status === 'completed' ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <Circle className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                  <div className="flex-1">
                    <h3 className={`font-medium ${taskContent.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                      {taskContent.title}
                    </h3>
                    {taskContent.description && (
                      <p className="text-sm text-gray-600 mt-1">{taskContent.description}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-2">
                      Created on {new Date(task.created_at).toLocaleDateString('en-US')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getPriorityIcon(taskContent.priority)}
                    {taskContent.due_date && (
                      <span className="text-xs text-gray-500">
                        {new Date(taskContent.due_date).toLocaleDateString('en-US')}
                      </span>
                    )}
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
} 