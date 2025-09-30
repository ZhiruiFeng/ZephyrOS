'use client'

import React, { useEffect, useMemo, useState } from 'react'
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
  GripVertical,
  Info,
  Bot,
  X
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
import { useSubtasks, useSubtaskActions } from '@/features/tasks/hooks'
import { TaskMemory } from '@/lib/api'
import { Task } from '@/types/domain/task'
import { useTranslation } from '@/contexts/LanguageContext'
import { StatusBadge } from '@/shared/components'

// Helper function to detect if a task is an AI task
const isAITask = (task: TaskMemory): boolean => {
  return task.is_ai_task === true
}

interface SubtaskSectionProps {
  taskId: string
  onSubtaskSelect?: (subtask: TaskMemory) => void
  selectedSubtaskId?: string
  autoSelectSubtaskId?: string | null
  onSubtaskCompleted?: () => void
}

interface SubtaskItemProps {
  subtask: TaskMemory
  depth: number
  onSelect?: (subtask: TaskMemory) => void
  isSelected: boolean
  onEdit?: (subtask: TaskMemory) => void
  onDelete?: (subtaskId: string) => void
  onStatusToggle?: (subtaskId: string, newStatus: Task['status']) => void
  onAddChild?: (parent: TaskMemory) => void
  isCollapsed?: boolean
  onToggleCollapse?: (taskId: string) => void
  isRoot?: boolean
  onAITaskClick?: (task: TaskMemory) => void
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
  onStatusToggle,
  onAddChild,
  isCollapsed,
  onToggleCollapse,
  isRoot,
  onAITaskClick
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
        onAddChild={onAddChild}
        isCollapsed={isCollapsed}
        onToggleCollapse={onToggleCollapse}
        onAITaskClick={onAITaskClick}
        isRoot={isRoot}
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
  onAddChild,
  isCollapsed,
  onToggleCollapse,
  onAITaskClick,
  isRoot,
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
        {/* Collapse/expand toggle (if has children) */}
        {typeof subtask.subtask_count === 'number' && subtask.subtask_count > 0 ? (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggleCollapse?.(subtask.id)
            }}
            className="text-gray-400 hover:text-gray-600"
            title={isCollapsed ? 'Expand' : 'Collapse'}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        ) : (
          <span className="w-4 h-4" />
        )}
        {/* Drag handle (hide for root) */}
        {isRoot ? (
          <span className="w-4 h-4" />
        ) : (
          <div
            {...dragHandleProps?.attributes}
            {...dragHandleProps?.listeners}
            className="cursor-grab active:cursor-grabbing"
            title="Drag to reorder"
          >
            <GripVertical className="w-4 h-4 text-gray-400 opacity-30 group-hover:opacity-100 hover:text-gray-600 transition-all" />
          </div>
        )}
        
        {/* Status icon (non-clickable for root) */}
        {isRoot ? (
          <span>{getStatusIcon(subtask.content.status)}</span>
        ) : (
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
        )}
        
        {/* Task content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium truncate ${
              subtask.content.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-900'
            }`}>
              {subtask.content.title}
            </span>
            {isAITask(subtask) && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onAITaskClick?.(subtask)
                }}
                className="flex items-center justify-center p-1 hover:bg-blue-100 rounded transition-colors"
                title="View AI Task Details"
              >
                <Bot className="w-3 h-3 text-blue-600" />
              </button>
            )}
            {subtask.content.description && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowDescription(!showDescription)
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                title="View description"
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
            {typeof subtask.subtask_count === 'number' && subtask.subtask_count > 0 && (
              <div className="flex items-center gap-1 ml-auto" title={`${subtask.completed_subtask_count || 0}/${subtask.subtask_count}`}>
                <div className="w-16 bg-gray-200 rounded-full h-1.5">
                  <div
                    className="bg-primary-600 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${Math.round(((subtask.completed_subtask_count || 0) / subtask.subtask_count) * 100)}%` }}
                  />
                </div>
                <span className="text-[10px] leading-none text-gray-500">
                  {Math.round(((subtask.completed_subtask_count || 0) / subtask.subtask_count) * 100)}%
                </span>
              </div>
            )}
            {/* 无子任务时，右对齐展示 content.progress */}
            {(!(typeof subtask.subtask_count === 'number' && subtask.subtask_count > 0)) &&
             subtask.content.progress !== undefined && subtask.content.progress > 0 && (
              <div className="flex items-center gap-1 ml-auto" title={`${subtask.content.progress}%`}>
                <div className="w-16 bg-gray-200 rounded-full h-1.5">
                  <div
                    className="bg-primary-600 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${subtask.content.progress}%` }}
                  />
                </div>
                <span className="text-[10px] leading-none text-gray-500">{subtask.content.progress}%</span>
              </div>
            )}
          </div>
          
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
              onAddChild?.(subtask)
            }}
            title={t.ui.addSubtask}
          >
            <Plus className="w-4 h-4" />
          </button>
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
                {!isRoot && (
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
                )}
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
      const parentStatus = (
        (parentTask?.content?.status as Task['status'] | undefined) ||
        ((parentTask as any)?.status as Task['status'] | undefined) ||
        'pending'
      )

      await createSubtask(parentTaskId, {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        priority: 'medium', // 默认中等优先级
        status: parentStatus,
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

export default function SubtaskSection({ taskId, onSubtaskSelect, selectedSubtaskId, autoSelectSubtaskId, onSubtaskCompleted }: SubtaskSectionProps) {
  const { t } = useTranslation()
  const { data, isLoading, error, refresh } = useSubtasks(taskId, { 
    format: 'flat', 
    include_completed: true 
  })
  const { updateSubtask, deleteSubtask, reorderSubtasks, moveToParent, isUpdating, isDeleting, isReordering } = useSubtaskActions()
  const [editingSubtask, setEditingSubtask] = useState<TaskMemory | null>(null)
  const [creatingForParentId, setCreatingForParentId] = useState<string | null>(null)
  const [collapsedTaskIds, setCollapsedTaskIds] = useState<Set<string>>(new Set())
  const [autoSelectedId, setAutoSelectedId] = useState<string | null>(null)
  const [showAITaskDetails, setShowAITaskDetails] = useState(false)
  const [selectedAITask, setSelectedAITask] = useState<TaskMemory | null>(null)
  const [isShiftPressed, setIsShiftPressed] = useState(false)

  // Track Shift key for cross-parent moving
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setIsShiftPressed(true)
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setIsShiftPressed(false)
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  const handleAITaskClick = (task: TaskMemory) => {
    setSelectedAITask(task)
    setShowAITaskDetails(true)
  }
  

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


  // Root task item (displayed like a subtask) and visibility calculations
  const rootTask = data?.task
  const rootItem = useMemo(() => {
    if (!rootTask) return null
    return {
      ...rootTask,
      depth: (rootTask as any).hierarchy_level || 0
    } as TaskMemory & { depth: number }
  }, [rootTask])

  const allItems = useMemo(() => {
    if (!rootItem) return groupedSubtasks
    return [rootItem, ...groupedSubtasks]
  }, [rootItem, groupedSubtasks])

  const visibleItems = useMemo(() => {
    return allItems.filter((item: any, index: number, all: any[]) => {
      let currentDepth = item.hierarchy_level || item.depth || 0
      for (let i = index - 1; i >= 0; i--) {
        const candidate: any = all[i]
        const candidateDepth = candidate.hierarchy_level ?? candidate.depth ?? 0
        if (candidateDepth < currentDepth) {
          if (collapsedTaskIds.has((candidate as TaskMemory).id)) return false
          currentDepth = candidateDepth
        }
        if (candidateDepth === 0 && currentDepth === 0) break
      }
      return true
    })
  }, [allItems, collapsedTaskIds])

  const visibleSubtasks = useMemo(() => {
    const rootId = rootItem?.id
    return visibleItems.filter((i: any) => i.id !== rootId)
  }, [visibleItems, rootItem])

  useEffect(() => {
    if (!autoSelectSubtaskId || !onSubtaskSelect || !data?.subtasks) return
    if (autoSelectedId === autoSelectSubtaskId) return

    const target = data.subtasks.find(subtask => subtask.id === autoSelectSubtaskId)
    if (target) {
      onSubtaskSelect(target)
      setAutoSelectedId(autoSelectSubtaskId)
    }
  }, [autoSelectSubtaskId, autoSelectedId, data?.subtasks, onSubtaskSelect])


  const handleStatusToggle = async (subtaskId: string, newStatus: Task['status']) => {
    try {
      await updateSubtask(subtaskId, { status: newStatus })

      // Trigger celebration animation when subtask is completed
      if (newStatus === 'completed') {
        onSubtaskCompleted?.()
      }

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

  const handleAddChildSubtask = (parent: TaskMemory) => {
    setCreatingForParentId(prev => (prev === parent.id ? null : parent.id))
  }

  const handleChildCreateSuccess = () => {
    setCreatingForParentId(null)
    refresh()
  }

  const handleToggleCollapse = (taskId: string) => {
    setCollapsedTaskIds(prev => {
      const next = new Set(prev)
      if (next.has(taskId)) {
        next.delete(taskId)
      } else {
        next.add(taskId)
      }
      return next
    })
  }

  

  // Helper function to extract parent ID from hierarchy path
  const getParentId = (subtask: TaskMemory): string | null => {
    const path = subtask.hierarchy_path
    if (!path) return null
    const parts = path.split('/')
    // The last part is the task itself, second to last is the immediate parent
    return parts.length > 1 ? parts[parts.length - 2] : null
  }

  // Helper function to get hierarchy level
  const getLevel = (subtask: TaskMemory): number => {
    return subtask.hierarchy_level ?? 0
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!active.id || !over?.id || active.id === over.id) {
      return
    }

    const draggedSubtask = groupedSubtasks.find(s => s.id === active.id)
    const targetSubtask = groupedSubtasks.find(s => s.id === over.id)

    if (!draggedSubtask || !targetSubtask) {
      console.warn('Invalid drag operation: subtask not found', { active: active.id, over: over.id })
      return
    }

    const draggedParentId = getParentId(draggedSubtask)
    const targetParentId = getParentId(targetSubtask)
    const draggedLevel = getLevel(draggedSubtask)
    const targetLevel = getLevel(targetSubtask)

    // Check if dragging within the same parent (same level and same parent)
    const isSameParent = draggedParentId === targetParentId && draggedLevel === targetLevel

    if (!isSameParent) {
      // Cross-parent or cross-level move
      if (!isShiftPressed) {
        console.warn('Cross-parent or cross-level moving requires Shift key', {
          draggedId: active.id,
          draggedParentId,
          draggedLevel,
          targetId: over.id,
          targetParentId,
          targetLevel
        })
        alert('To move subtasks between different parents or levels, hold the Shift key while dragging.')
        return
      }

      // Handle cross-parent move
      try {
        console.log('Moving subtask to new parent:', {
          subtaskId: draggedSubtask.id,
          oldParentId: draggedParentId,
          newParentId: targetParentId,
          targetId: over.id
        })

        // Move to the target's parent
        await moveToParent(draggedSubtask.id, targetParentId || taskId)
        console.log('Move to parent successful')

        // Refresh data to ensure consistency
        setTimeout(() => refresh(), 100)
      } catch (error) {
        console.error('Failed to move subtask to new parent:', error)

        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
        console.error('Detailed error:', errorMessage)

        setTimeout(() => refresh(), 100)
        alert(`Failed to move subtask: ${errorMessage}`)
      }
      return
    }

    // Filter to only siblings (same parent and same level)
    const siblings = groupedSubtasks.filter(subtask => {
      const parentId = getParentId(subtask)
      const level = getLevel(subtask)
      return parentId === draggedParentId && level === draggedLevel
    })

    const oldIndex = siblings.findIndex(s => s.id === active.id)
    const newIndex = siblings.findIndex(s => s.id === over.id)

    if (oldIndex === -1 || newIndex === -1) {
      console.warn('Invalid drag operation: subtask not found in siblings', {
        active: active.id,
        over: over.id,
        siblings: siblings.map(s => s.id)
      })
      return
    }

    // Reorder within siblings
    const reorderedSiblings = arrayMove(siblings, oldIndex, newIndex)

    try {
      // Map siblings to the format expected by the API
      const reorderData = reorderedSiblings.map((subtask, index) => ({
        task_id: subtask.id,
        new_order: index
      }))

      console.log('Reordering subtasks within same parent:', {
        parentId: draggedParentId || taskId,
        level: draggedLevel,
        activeId: active.id,
        overId: over.id,
        oldIndex,
        newIndex,
        totalSiblings: siblings.length,
        reorderData
      })

      // Call API to reorder - use the immediate parent ID
      const parentIdForApi = draggedParentId || taskId
      const result = await reorderSubtasks(parentIdForApi, reorderData)
      console.log('Reorder successful:', result)

      // Refresh data to ensure consistency
      setTimeout(() => refresh(), 100)
    } catch (error) {
      console.error('Failed to reorder subtasks:', error)

      // Show user-friendly error message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      console.error('Detailed error:', errorMessage)

      // Refresh data to revert optimistic update on error
      setTimeout(() => refresh(), 100)

      // TODO: Show toast notification to user about the error
      alert(`Failed to reorder subtasks: ${errorMessage}`)
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
    <div className="border border-gray-200 rounded-lg p-4 space-y-3 w-full max-w-full overflow-x-hidden relative">
      {/* Shift key indicator */}
      {isShiftPressed && (
        <div className="absolute top-2 right-2 z-10 bg-blue-500 text-white text-xs px-2 py-1 rounded-md shadow-md flex items-center gap-1">
          <span className="font-semibold">Shift</span>
          <span>Cross-parent mode enabled</span>
        </div>
      )}

      {/* Root task */}
      {rootItem && (
        <>
          <SubtaskItem
            subtask={rootItem as unknown as TaskMemory}
            depth={(rootItem as any).depth || 0}
            onSelect={onSubtaskSelect}
            isSelected={selectedSubtaskId === rootItem.id}
            onEdit={handleEditSubtask}
            onDelete={undefined}
            onStatusToggle={handleStatusToggle}
            onAddChild={handleAddChildSubtask}
            isCollapsed={collapsedTaskIds.has(rootItem.id)}
            onToggleCollapse={handleToggleCollapse}
            onAITaskClick={handleAITaskClick}
            isRoot
          />
          {creatingForParentId === rootItem.id && (
            <div style={{ marginLeft: `${((rootItem as any).depth + 1) * 20}px` }}>
              <CreateSubtaskForm
                parentTaskId={rootItem.id}
                parentTask={rootItem as unknown as TaskMemory}
                onSuccess={handleChildCreateSuccess}
                onCancel={() => setCreatingForParentId(null)}
              />
            </div>
          )}
        </>
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
              {visibleSubtasks.map((subtask) => (
                <React.Fragment key={`${subtask.id}-${subtask.updated_at}`}>
                  <SortableSubtaskItem
                    id={subtask.id}
                    subtask={subtask}
                    depth={(subtask as any).depth || (subtask as any).hierarchy_level || 0}
                    onSelect={onSubtaskSelect}
                    isSelected={selectedSubtaskId === subtask.id}
                    onEdit={handleEditSubtask}
                    onDelete={handleDeleteSubtask}
                    onStatusToggle={handleStatusToggle}
                    onAddChild={handleAddChildSubtask}
                    isCollapsed={collapsedTaskIds.has(subtask.id)}
                    onToggleCollapse={handleToggleCollapse}
                    onAITaskClick={handleAITaskClick}
                    isRoot={false}
                  />
                  {creatingForParentId === subtask.id && (
                    <div style={{ marginLeft: `${(((subtask as any).depth || (subtask as any).hierarchy_level || 0) + 1) * 20}px` }}>
                      <CreateSubtaskForm
                        parentTaskId={subtask.id}
                        parentTask={subtask}
                        onSuccess={handleChildCreateSuccess}
                        onCancel={() => setCreatingForParentId(null)}
                      />
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* AI Task Details Floating Window */}
      {showAITaskDetails && selectedAITask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowAITaskDetails(false)}>
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">AI Task Details</h3>
              </div>
              <button
                onClick={() => setShowAITaskDetails(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Task Title */}
              <div>
                <h4 className="text-base font-medium text-gray-900 mb-2">{selectedAITask.content.title}</h4>
                <div className="flex items-center gap-2 mb-3">
                  <StatusBadge status={selectedAITask.content.status} />
                  <span className="text-sm text-gray-600 capitalize">Priority: {selectedAITask.content.priority}</span>
                </div>
              </div>

              {/* Description */}
              {selectedAITask.content.description && (
                <div>
                  <h5 className="text-sm font-medium text-gray-700 mb-1">Description</h5>
                  <p className="text-sm text-gray-600">{selectedAITask.content.description}</p>
                </div>
              )}

              {/* Progress */}
              {selectedAITask.content.progress !== undefined && (
                <div>
                  <h5 className="text-sm font-medium text-gray-700 mb-1">Progress</h5>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${selectedAITask.content.progress}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600">{selectedAITask.content.progress}%</span>
                  </div>
                </div>
              )}

              {/* Due Date */}
              {selectedAITask.content.due_date && (
                <div>
                  <h5 className="text-sm font-medium text-gray-700 mb-1">Due Date</h5>
                  <p className="text-sm text-gray-600">{new Date(selectedAITask.content.due_date).toLocaleDateString()}</p>
                </div>
              )}

              {/* Estimated Duration */}
              {selectedAITask.content.estimated_duration && (
                <div>
                  <h5 className="text-sm font-medium text-gray-700 mb-1">Estimated Duration</h5>
                  <p className="text-sm text-gray-600">{selectedAITask.content.estimated_duration} minutes</p>
                </div>
              )}

              {/* Notes */}
              {selectedAITask.content.notes && (
                <div>
                  <h5 className="text-sm font-medium text-gray-700 mb-1">Notes</h5>
                  <p className="text-sm text-gray-600">{selectedAITask.content.notes}</p>
                </div>
              )}

              {/* Tags */}
              {selectedAITask.tags && selectedAITask.tags.length > 0 && (
                <div>
                  <h5 className="text-sm font-medium text-gray-700 mb-1">Tags</h5>
                  <div className="flex flex-wrap gap-1">
                    {selectedAITask.tags.map((tag, index) => (
                      <span key={index} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Timestamps */}
              <div className="pt-2 border-t border-gray-200">
                <div className="grid grid-cols-2 gap-4 text-xs text-gray-500">
                  <div>
                    <span className="font-medium">Created:</span><br />
                    {new Date(selectedAITask.created_at).toLocaleString()}
                  </div>
                  <div>
                    <span className="font-medium">Updated:</span><br />
                    {new Date(selectedAITask.updated_at).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => {
                    onSubtaskSelect?.(selectedAITask)
                    setShowAITaskDetails(false)
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Select Task
                </button>
                <button
                  onClick={() => setShowAITaskDetails(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
