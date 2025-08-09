'use client'

import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Plus,
  CheckCircle,
  Circle,
  Clock,
  AlertCircle,
  Trash2,
  ChevronDown,
  Filter,
  BarChart3,
  Calendar,
  User,
  ListTodo,
  KanbanSquare,
  Tag,
  Pencil,
} from 'lucide-react'
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask } from '../hooks/useMemories'
import CategorySidebar from './components/CategorySidebar'
import { categoriesApi, tasksApi } from '../lib/api'
import TaskEditor from './components/TaskEditor'
import { getPriorityIcon } from './components/TaskIcons'
import { 
  getStatusColor, 
  getPriorityColor, 
  isOverdue, 
  formatDate,
  formatTagsString
} from './utils/taskUtils'
import { Task, FilterStatus, FilterPriority, ViewMode } from './types/task'

export default function ZFlowPage() {
  const [newTask, setNewTask] = useState('')
  const [newTaskDescription, setNewTaskDescription] = useState('')
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium')
  const [newTaskDueDate, setNewTaskDueDate] = useState<string>('')
  const [newTaskTags, setNewTaskTags] = useState('')
  const [newTaskCategoryId, setNewTaskCategoryId] = useState<string | undefined>(undefined)
  const [showAddForm, setShowAddForm] = useState(false)
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [filterPriority, setFilterPriority] = useState<FilterPriority>('all')
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [editorOpen, setEditorOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<any>(null)
  const [categories, setCategories] = useState<any[]>([])
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'uncategorized' | string>('all')

  // 使用 API hooks
  const { tasks, isLoading, error, refetch } = useTasks({})
  // 加载分类
  React.useEffect(() => {
    categoriesApi.getAll().then(setCategories).catch(() => setCategories([]))
  }, [])

  // 统计各分类的任务计数
  const categoryCounts = React.useMemo(() => {
    const byId: Record<string, number> = {}
    let uncategorized = 0
    tasks.forEach((t: any) => {
      const c = t.content as Task
      const catId = (t as any).category_id || (t as any).content?.category_id
      if (catId) byId[catId] = (byId[catId] || 0) + 1
      else uncategorized += 1
    })
    return {
      byId,
      uncategorized,
      total: tasks.length,
    }
  }, [tasks])
  const { createTask } = useCreateTask()
  const { updateTask } = useUpdateTask()
  const { deleteTask } = useDeleteTask()

  const addTask = async () => {
    if (!newTask.trim()) return

    try {
      console.log('=== TASK CREATION DEBUG ===');
      console.log('selectedCategory:', selectedCategory);
      console.log('newTaskCategoryId:', newTaskCategoryId);
      
      const tagsArray = newTaskTags
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0)

      const finalCategoryId = newTaskCategoryId || (selectedCategory !== 'all' && selectedCategory !== 'uncategorized' ? selectedCategory : undefined);
      console.log('finalCategoryId:', finalCategoryId);

      const taskData = {
        title: newTask,
        description: newTaskDescription,
        status: 'pending' as const,
        priority: newTaskPriority,
        category_id: finalCategoryId,
        due_date: newTaskDueDate ? new Date(newTaskDueDate).toISOString() : undefined,
      }

      console.log('taskData being sent:', JSON.stringify(taskData, null, 2));

      await createTask({
        type: 'task',
        content: taskData,
        tags: ['zflow', 'task', ...tagsArray]
      })

      // 重置表单
      setNewTask('')
      setNewTaskDescription('')
      setNewTaskPriority('medium')
      setNewTaskDueDate('')
      setNewTaskTags('')
      setNewTaskCategoryId(undefined)
      setShowAddForm(false)
    } catch (error) {
      console.error('Failed to create task:', error)
      alert('创建任务失败，请重试')
    }
  }

  const toggleTaskStatus = async (taskId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'completed' ? 'pending' : 'completed'
      
      await updateTask(taskId, {
        content: {
          ...tasks.find(t => t.id === taskId)?.content,
          status: newStatus
        }
      })
    } catch (error) {
      console.error('Failed to update task:', error)
      alert('更新任务失败，请重试')
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('确定要删除这个任务吗？')) return

    try {
      await deleteTask(taskId)
    } catch (error) {
      console.error('Failed to delete task:', error)
      alert('删除任务失败，请重试')
    }
  }

  const openEditor = (taskMemory: any) => {
    // Convert TaskMemory to Task format expected by TaskEditor
    const task = {
      id: taskMemory.id,
      ...taskMemory.content,
      tags: taskMemory.tags,
      created_at: taskMemory.created_at,
      updated_at: taskMemory.updated_at,
      // Add category_id from the top level if available
      category_id: (taskMemory as any).category_id || taskMemory.content.category_id,
    }
    setSelectedTask(task)
    setEditorOpen(true)
  }

  const closeEditor = () => {
    setEditorOpen(false)
    setSelectedTask(null)
  }

  const handleSaveTask = async (taskId: string, data: any) => {
    await updateTask(taskId, data)
  }

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const c = t.content as Task
      // 分类筛选：all 显示全部；uncategorized 显示没有 category_id 的任务；否则按 category_id 匹配
      const catId = (t as any).category_id || (t as any).content?.category_id
      const matchCategory = selectedCategory === 'all'
        ? true
        : selectedCategory === 'uncategorized'
          ? !catId
          : catId === selectedCategory
      const matchStatus = filterStatus === 'all' || c.status === filterStatus
      const matchPriority = filterPriority === 'all' || c.priority === filterPriority
      const matchSearch = !search || c.title.toLowerCase().includes(search.toLowerCase()) || (c.description || '').toLowerCase().includes(search.toLowerCase())
      return matchCategory && matchStatus && matchPriority && matchSearch
    })
  }, [tasks, selectedCategory, filterStatus, filterPriority, search])

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
          <p className="text-red-600">加载任务失败</p>
          <button 
            onClick={() => refetch()}
            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg"
          >
            重试
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="py-8">
      <div className="flex gap-4">
        {/* 左侧分类栏 */}
        <CategorySidebar
          categories={categories}
          selected={selectedCategory}
          counts={categoryCounts}
          onSelect={(key) => setSelectedCategory(key as any)}
          onCreate={async (payload) => {
            await categoriesApi.create({ name: payload.name, color: payload.color })
            const next = await categoriesApi.getAll()
            setCategories(next)
          }}
          onUpdate={async (id, payload) => {
            await categoriesApi.update(id, payload)
            const next = await categoriesApi.getAll()
            setCategories(next)
          }}
          onDelete={async (id) => {
            await categoriesApi.delete(id)
            const next = await categoriesApi.getAll()
            setCategories(next)
            // If the deleted category was selected, switch to 'all'
            if (selectedCategory === id) {
              setSelectedCategory('all')
            }
          }}
          className="hidden md:block rounded-lg"
        />

        {/* 右侧主内容 */}
        <div className="flex-1">
          
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
              <ListTodo className="w-7 h-7" /> ZFlow
            </h1>
            <p className="text-gray-600">现代化任务管理（列表/网格/看板/统计）</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1 rounded text-sm ${viewMode === 'list' ? 'bg-primary-100 text-primary-700' : 'text-gray-600'}`}
              >
                列表
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1 rounded text-sm ${viewMode === 'grid' ? 'bg-primary-100 text-primary-700' : 'text-gray-600'}`}
              >
                网格
              </button>
            </div>
            <Link href="/kanban" className="btn btn-primary flex items-center gap-2">
              <KanbanSquare className="w-4 h-4" /> 看板视图
            </Link>
          </div>
        </div>
      </div>

      {/* 筛选器 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value as FilterStatus)} 
              className="text-sm border border-gray-300 rounded px-3 py-1 outline-none"
            >
              <option value="all">全部状态</option>
              <option value="pending">待办</option>
              <option value="in_progress">进行中</option>
              <option value="completed">已完成</option>
              <option value="on_hold">搁置</option>
              <option value="cancelled">取消</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select 
              value={filterPriority} 
              onChange={(e) => setFilterPriority(e.target.value as FilterPriority)} 
              className="text-sm border border-gray-300 rounded px-3 py-1 outline-none"
            >
              <option value="all">全部优先级</option>
              <option value="urgent">紧急</option>
              <option value="high">高</option>
              <option value="medium">中</option>
              <option value="low">低</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              placeholder="搜索标题或描述..." 
              className="text-sm border border-gray-300 rounded px-3 py-1 outline-none"
            />
          </div>
        </div>
      </div>

      {/* 添加任务 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        {!showAddForm ? (
          <button
            onClick={() => {
              setNewTaskCategoryId(selectedCategory !== 'all' && selectedCategory !== 'uncategorized' ? selectedCategory : undefined)
              setShowAddForm(true)
            }}
            className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors duration-200 flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {selectedCategory !== 'all' && selectedCategory !== 'uncategorized' && categories.find(cat => cat.id === selectedCategory) 
              ? `添加新任务到「${categories.find(cat => cat.id === selectedCategory)?.name}」`
              : '添加新任务'
            }
          </button>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                type="text"
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addTask()}
                placeholder="任务标题..."
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <select
                value={newTaskPriority}
                onChange={(e) => setNewTaskPriority(e.target.value as 'low' | 'medium' | 'high' | 'urgent')}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="low">低优先级</option>
                <option value="medium">中优先级</option>
                <option value="high">高优先级</option>
                <option value="urgent">紧急</option>
              </select>
              <select
                value={newTaskCategoryId || (selectedCategory !== 'all' && selectedCategory !== 'uncategorized' ? selectedCategory : '')}
                onChange={(e) => setNewTaskCategoryId(e.target.value || undefined)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">无分类</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <textarea
              value={newTaskDescription}
              onChange={(e) => setNewTaskDescription(e.target.value)}
              placeholder="任务描述（可选）..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              rows={3}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <input
                  type="datetime-local"
                  value={newTaskDueDate}
                  onChange={(e) => setNewTaskDueDate(e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  value={newTaskTags}
                  onChange={(e) => setNewTaskTags(e.target.value)}
                  placeholder="标签（逗号分隔）..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={addTask}
                disabled={!newTask.trim()}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors duration-200 disabled:opacity-50"
              >
                创建任务
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false)
                  setNewTaskCategoryId(undefined)
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors duration-200"
              >
                取消
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 任务列表 */}
      <div className="space-y-4">
        {filteredTasks.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center text-gray-500">
            <CheckCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>暂无任务，开始添加您的第一个任务吧！</p>
          </div>
        ) : (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-4'}>
            {filteredTasks.map((task) => {
              const taskContent = task.content as Task
              return (
                <div key={task.id} className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${viewMode === 'grid' ? 'h-fit' : ''}`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3 flex-1">
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
                      <div className="flex-1 min-w-0">
                        <h3 className={`font-medium text-lg ${taskContent.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                          {taskContent.title}
                        </h3>
                        {taskContent.description && (
                          <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                            {taskContent.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getPriorityIcon(taskContent.priority)}
                      <button
                        onClick={() => openEditor(task)}
                        className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* 标签 */}
                  {task.tags && task.tags.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                      {task.tags.slice(0, 4).map((tag: string) => (
                        <span key={tag} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-blue-50 text-blue-700 border border-blue-100">
                          <Tag className="w-3 h-3" /> {tag}
                        </span>
                      ))}
                      {task.tags.length > 4 && (
                        <span className="text-xs text-gray-500">+{task.tags.length - 4}</span>
                      )}
                    </div>
                  )}

                  {/* 状态和优先级标签 */}
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <span className={`inline-flex items-center text-xs px-2 py-1 rounded border ${getStatusColor(taskContent.status)}`}>
                      {taskContent.status}
                    </span>
                    <span className={`inline-flex items-center text-xs px-2 py-1 rounded border ${getPriorityColor(taskContent.priority)}`}>
                      {taskContent.priority}
                    </span>
                  </div>

                  {/* 时间信息 */}
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>创建于 {formatDate(task.created_at)}</span>
                    {taskContent.due_date && (
                      <span className={`inline-flex items-center gap-1 ${isOverdue(taskContent.due_date) ? 'text-red-600' : ''}`}>
                        <Calendar className="w-3 h-3" />
                        {formatDate(taskContent.due_date)}
                        {isOverdue(taskContent.due_date) && ' (已逾期)'}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

          {/* 使用共享的TaskEditor组件 */}
          <TaskEditor
            isOpen={editorOpen}
            onClose={closeEditor}
            task={selectedTask}
            categories={categories}
            onSave={handleSaveTask}
            title="编辑任务"
          />
        </div>
      </div>
    </div>
  )
} 