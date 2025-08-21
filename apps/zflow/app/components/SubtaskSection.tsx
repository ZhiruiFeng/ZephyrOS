'use client'

import React, { useState, useMemo } from 'react'
import { 
  Plus, 
  ChevronRight, 
  ChevronDown, 
  Circle, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  MoreVertical,
  Edit,
  Trash2,
  Move,
  GripVertical,
  Info
} from 'lucide-react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useSubtasks, useSubtaskActions } from '../../hooks/useSubtasks'
import { TaskMemory } from '../../lib/api'
import { Task } from '../../app/types/task'
import { useTranslation } from '../../contexts/LanguageContext'
import { StatusBadge } from './shared/StatusBadge'

interface SubtaskSectionProps {
  taskId: string
  onSubtaskSelect?: (subtask: TaskMemory) => void
  selectedSubtaskId?: string
}

interface SubtaskItemProps {
  subtask: TaskMemory
  depth: number
  onSelect?: (subtask: TaskMemory) => void
  isSelected: boolean
  onEdit?: (subtask: TaskMemory) => void
  onDelete?: (subtaskId: string) => void
  onStatusToggle?: (subtaskId: string, newStatus: Task['status']) => void
}

interface SortableSubtaskItemProps extends SubtaskItemProps {
  id: string
}

const SortableSubtaskItem: React.FC<SortableSubtaskItemProps> = ({
  id,
  subtask,
  depth,
  onSelect,
  isSelected,
  onEdit,
  onDelete,
  onStatusToggle
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${isDragging ? 'opacity-50' : ''}`}
    >
      <SubtaskItem
        subtask={subtask}
        depth={depth}
        onSelect={onSelect}
        isSelected={isSelected}
        onEdit={onEdit}
        onDelete={onDelete}
        onStatusToggle={onStatusToggle}
        dragHandleProps={{ attributes, listeners }}
      />
    </div>
  )
}

const SubtaskItem: React.FC<SubtaskItemProps & { dragHandleProps?: any }> = ({
  subtask,
  depth,
  onSelect,
  isSelected,
  onEdit,
  onDelete,
  onStatusToggle,
  dragHandleProps
}) => {
  const { t } = useTranslation()
  const [showActions, setShowActions] = useState(false)
  const [showDescription, setShowDescription] = useState(false)
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'in_progress':
        return <Clock className="w-4 h-4 text-blue-600" />
      case 'on_hold':
        return <AlertCircle className="w-4 h-4 text-yellow-600" />
      default:
        return <Circle className="w-4 h-4 text-gray-400" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'border-l-red-500'
      case 'high':
        return 'border-l-orange-500'
      case 'medium':
        return 'border-l-yellow-500'
      case 'low':
        return 'border-l-green-500'
      default:
        return 'border-l-gray-300'
    }
  }

  return (
    <div 
      className={`group relative border-l-2 ${getPriorityColor(subtask.content.priority || 'medium')} ${
        isSelected ? 'bg-primary-50' : 'hover:bg-gray-50'
      }`}
      style={{ marginLeft: `${depth * 20}px` }}
    >
      <div className="flex items-center gap-2 p-2 cursor-pointer" onClick={() => onSelect?.(subtask)}>
        {/* Drag handle */}
        <div
          {...dragHandleProps?.attributes}
          {...dragHandleProps?.listeners}
          className="cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100" />
        </div>
        
        {/* Status icon */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            const currentStatus = subtask.content.status
            const newStatus = currentStatus === 'completed' ? 'pending' : 'completed'
            onStatusToggle?.(subtask.id, newStatus)
          }}
          className="hover:scale-110 transition-transform"
        >
          {getStatusIcon(subtask.content.status)}
        </button>
        
        {/* Task content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium truncate ${
              subtask.content.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-900'
            }`}>
              {subtask.content.title}
            </span>
            {subtask.content.description && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowDescription(!showDescription)
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                title="查看描述"
              >
                <Info className="w-3 h-3" />
              </button>
            )}
            {subtask.content.priority && subtask.content.priority !== 'medium' && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                subtask.content.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                subtask.content.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                'bg-green-100 text-green-700'
              }`}>
                {subtask.content.priority}
              </span>
            )}
          </div>
          {subtask.content.progress !== undefined && subtask.content.progress > 0 && (
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                <div 
                  className="bg-primary-600 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${subtask.content.progress}%` }}
                />
              </div>
              <span className="text-xs text-gray-500">{subtask.content.progress}%</span>
            </div>
          )}
          
          {/* Description display */}
          {showDescription && subtask.content.description && (
            <div className="mt-2 p-2 bg-gray-50 rounded-md border border-gray-200">
              <p className="text-xs text-gray-700 whitespace-pre-wrap">
                {subtask.content.description}
              </p>
            </div>
          )}
        </div>

        {/* Actions menu */}
        <div className="relative">
          <button
            className="p-1 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation()
              setShowActions(!showActions)
            }}
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          
          {showActions && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setShowActions(false)}
              />
              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-20 min-w-[120px]">
                <button
                  className="flex items-center gap-2 w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                  onClick={(e) => {
                    e.stopPropagation()
                    onEdit?.(subtask)
                    setShowActions(false)
                  }}
                >
                  <Edit className="w-4 h-4" />
                  {t.common.edit}
                </button>
                <button
                  className="flex items-center gap-2 w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete?.(subtask.id)
                    setShowActions(false)
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                  {t.common.delete}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

const EditSubtaskForm: React.FC<{
  subtask: TaskMemory
  onSuccess: () => void
  onCancel: () => void
}> = ({ subtask, onSuccess, onCancel }) => {
  const { t } = useTranslation()
  const { updateSubtask, isUpdating } = useSubtaskActions()
  const [formData, setFormData] = useState({
    title: subtask.content.title,
    description: subtask.content.description || '',
    priority: subtask.content.priority || 'medium' as const,
    estimated_duration: subtask.content.estimated_duration || 0
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim()) return

    try {
      await updateSubtask(subtask.id, {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        priority: formData.priority,
        estimated_duration: formData.estimated_duration || undefined
      })
      onSuccess()
    } catch (error) {
      console.error('Failed to update subtask:', error)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 border border-gray-200 rounded-lg bg-gray-50 space-y-3">
      <div>
        <input
          type="text"
          placeholder={t.task.title}
          value={formData.title}
          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          required
          autoFocus
        />
      </div>
      
      <div>
        <textarea
          placeholder={t.task.description}
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <select
            value={formData.priority}
            onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as any }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="low">{t.task.priorityLow}</option>
            <option value="medium">{t.task.priorityMedium}</option>
            <option value="high">{t.task.priorityHigh}</option>
            <option value="urgent">{t.task.priorityUrgent}</option>
          </select>
        </div>
        
        <div>
          <input
            type="number"
            placeholder={t.ui.estimatedDurationMinutes}
            value={formData.estimated_duration}
            onChange={(e) => setFormData(prev => ({ ...prev, estimated_duration: parseInt(e.target.value) || 0 }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            min="0"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 pt-2">
        <button
          type="submit"
          disabled={!formData.title.trim() || isUpdating}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 text-sm"
        >
          {isUpdating ? 'Updating...' : t.common.save}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-600 hover:text-gray-900 text-sm"
        >
          {t.common.cancel}
        </button>
      </div>
    </form>
  )
}

const CreateSubtaskForm: React.FC<{
  parentTaskId: string
  parentTask?: TaskMemory
  onSuccess: () => void
  onCancel: () => void
}> = ({ parentTaskId, parentTask, onSuccess, onCancel }) => {
  const { t } = useTranslation()
  const { createSubtask, isCreating } = useSubtaskActions()
  const [formData, setFormData] = useState({
    title: '',
    description: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim()) return

    try {
      await createSubtask(parentTaskId, {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        priority: 'medium', // 默认中等优先级
        status: 'pending',
        // 继承父任务的类别
        category_id: parentTask?.category_id
      })
      // 重置表单
      setFormData({
        title: '',
        description: ''
      })
      onSuccess()
    } catch (error) {
      console.error('Failed to create subtask:', error)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 border border-gray-200 rounded-lg bg-gray-50 space-y-3">
      <div>
        <input
          type="text"
          placeholder={t.task.title}
          value={formData.title}
          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          required
          autoFocus
        />
      </div>
      
      <div>
        <textarea
          placeholder={t.task.description}
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      <div className="flex items-center gap-2 pt-2">
        <button
          type="submit"
          disabled={!formData.title.trim() || isCreating}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 text-sm"
        >
          <Plus className="w-4 h-4" />
          {isCreating ? t.ui.creating : t.ui.createSubtask}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-600 hover:text-gray-900 text-sm"
        >
          {t.common.cancel}
        </button>
      </div>
    </form>
  )
}

export default function SubtaskSection({ taskId, onSubtaskSelect, selectedSubtaskId }: SubtaskSectionProps) {
  const { t } = useTranslation()
  const { data, isLoading, error, refresh } = useSubtasks(taskId, { 
    format: 'flat', 
    include_completed: true 
  })
  const { updateSubtask, deleteSubtask, reorderSubtasks, isUpdating, isDeleting, isReordering } = useSubtaskActions()
  const [isExpanded, setIsExpanded] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingSubtask, setEditingSubtask] = useState<TaskMemory | null>(null)

  // 设置拖拽传感器
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Group subtasks by depth for proper hierarchy display
  const groupedSubtasks = useMemo(() => {
    if (!data?.subtasks) return []
    
    return data.subtasks.map(subtask => ({
      ...subtask,
      // Calculate depth from hierarchy path or level
      depth: (subtask as any).hierarchy_level || 0
    }))
  }, [data?.subtasks])

  // 添加一个key来强制重新渲染子任务列表
  const subtasksKey = useMemo(() => {
    if (!data?.subtasks) return 'no-subtasks'
    // 基于子任务的数量和更新时间生成key
    return `${data.subtasks.length}-${data.subtasks.map(s => s.updated_at).join('-')}`
  }, [data?.subtasks])

  // Safe access to tree stats
  const treeStats = data?.tree_stats

  const handleCreateSuccess = () => {
    setShowCreateForm(false)
    refresh()
  }

  const handleStatusToggle = async (subtaskId: string, newStatus: Task['status']) => {
    try {
      await updateSubtask(subtaskId, { status: newStatus })
      // 立即刷新数据以确保UI更新
      setTimeout(() => refresh(), 100)
    } catch (error) {
      console.error('Failed to toggle subtask status:', error)
    }
  }

  const handleEditSubtask = (subtask: TaskMemory) => {
    setEditingSubtask(subtask)
  }

  const handleEditSuccess = () => {
    setEditingSubtask(null)
    // 立即刷新数据以确保UI更新
    setTimeout(() => refresh(), 100)
  }

  const handleDeleteSubtask = async (subtaskId: string) => {
    if (window.confirm('Are you sure you want to delete this subtask?')) {
      try {
        await deleteSubtask(subtaskId)
        // 立即刷新数据以确保UI更新
        setTimeout(() => refresh(), 100)
      } catch (error) {
        console.error('Failed to delete subtask:', error)
      }
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (active.id !== over?.id) {
      const oldIndex = groupedSubtasks.findIndex(subtask => subtask.id === active.id)
      const newIndex = groupedSubtasks.findIndex(subtask => subtask.id === over?.id)

      if (oldIndex !== -1 && newIndex !== -1) {
        try {
          // 准备重新排序的数据
          const reorderData = groupedSubtasks.map((subtask, index) => ({
            task_id: subtask.id,
            new_order: index
          }))

          // 交换位置
          const newOrder = arrayMove(reorderData, oldIndex, newIndex)

          // 调用API重新排序
          await reorderSubtasks(taskId, newOrder)
          
          // 刷新数据
          setTimeout(() => refresh(), 100)
        } catch (error) {
          console.error('Failed to reorder subtasks:', error)
        }
      }
    }
  }

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-4 h-4 bg-gray-200 rounded animate-pulse" />
          <div className="w-20 h-4 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-600">
        <p className="text-sm">{t.messages.failedToLoadSubtasks}</p>
        <button 
          onClick={refresh}
          className="mt-2 text-sm text-primary-600 hover:text-primary-700"
        >
          {t.messages.retry}
        </button>
      </div>
    )
  }

  return (
    <div className="border border-gray-200 rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-sm font-medium text-gray-900 hover:text-gray-700"
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
          {t.ui.subtasks} ({treeStats?.total_subtasks || 0})
        </button>
        
        <div className="flex items-center gap-3">
          {treeStats && treeStats.total_subtasks > 0 && (
            <div className="text-xs text-gray-500">
              {treeStats.completed_subtasks}/{treeStats.total_subtasks} {t.ui.completed} 
              ({Math.round(treeStats.completion_percentage || 0)}%)
            </div>
          )}
          
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="flex items-center gap-1 px-3 py-1.5 bg-primary-600 text-white rounded-md hover:bg-primary-700 text-sm"
          >
            <Plus className="w-4 h-4" />
            {t.ui.addSubtask}
          </button>
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="p-4 space-y-3">
          {/* Create form */}
          {showCreateForm && (
            <CreateSubtaskForm
              parentTaskId={taskId}
              parentTask={data?.task}
              onSuccess={handleCreateSuccess}
              onCancel={() => setShowCreateForm(false)}
            />
          )}

          {/* Edit form */}
          {editingSubtask && (
            <EditSubtaskForm
              subtask={editingSubtask}
              onSuccess={handleEditSuccess}
              onCancel={() => setEditingSubtask(null)}
            />
          )}

          {/* Subtasks list */}
          {groupedSubtasks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Circle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">{t.ui.noSubtasksYet}</p>
              <p className="text-xs text-gray-400 mt-1">{t.ui.addSubtaskToGetStarted}</p>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={groupedSubtasks.map(subtask => subtask.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-1" key={subtasksKey}>
                  {groupedSubtasks.map((subtask) => (
                    <SortableSubtaskItem
                      key={`${subtask.id}-${subtask.updated_at}`}
                      id={subtask.id}
                      subtask={subtask}
                      depth={subtask.depth}
                      onSelect={onSubtaskSelect}
                      isSelected={selectedSubtaskId === subtask.id}
                      onEdit={handleEditSubtask}
                      onDelete={handleDeleteSubtask}
                      onStatusToggle={handleStatusToggle}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      )}
    </div>
  )
}