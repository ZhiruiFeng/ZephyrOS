'use client'

import React from 'react'
import { Calendar, ChevronDown, Folder, Search, Star, Tag } from 'lucide-react'

export interface TaskFormValue {
  title: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  categoryId: string
  dueDate: string
  tags: string
  joinAttention: boolean
}

interface Props {
  value: TaskFormValue
  onChange: (v: TaskFormValue) => void
  createMode: 'normal' | 'current'
  onCreateModeChange: (v: 'normal' | 'current') => void
  categories: any[]
  t: any
  onOpenMobileCategoryPicker: () => void
}

export default function TaskForm({ value, onChange, createMode, onCreateModeChange, categories, t, onOpenMobileCategoryPicker }: Props) {
  const [showDesktopCategory, setShowDesktopCategory] = React.useState(false)
  const [desktopCategoryQuery, setDesktopCategoryQuery] = React.useState('')
  const desktopCatRef = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!showDesktopCategory) return
      const target = e.target as Node
      if (desktopCatRef.current && !desktopCatRef.current.contains(target)) {
        setShowDesktopCategory(false)
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setShowDesktopCategory(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [showDesktopCategory])

  const set = (patch: Partial<TaskFormValue>) => onChange({ ...value, ...patch })

  return (
    <>
      <div className="bg-gray-50 rounded-xl p-4">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onCreateModeChange('normal')}
            className={`p-3 rounded-lg border transition-all ${createMode === 'normal' ? 'bg-white border-blue-500 text-blue-600 shadow-sm' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}
          >
            <div className="text-sm font-medium">{t.task.createTask}</div>
            <div className="text-xs text-gray-500 mt-1">{t.task.createNormalTaskDesc}</div>
          </button>
          <button
            type="button"
            onClick={() => onCreateModeChange('current')}
            className={`p-3 rounded-lg border transition-all ${createMode === 'current' ? 'bg-white border-green-500 text-green-600 shadow-sm' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}
          >
            <div className="text-sm font-medium">{t.task.createCurrentTask}</div>
            <div className="text-xs text-gray-500 mt-1">{t.task.createCurrentTaskDesc}</div>
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">{t.task.title} *</label>
        <input
          type="text"
          value={value.title}
          onChange={(e) => set({ title: e.target.value })}
          placeholder={t.task.taskTitle}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">{t.task.description}</label>
        <textarea
          value={value.description}
          onChange={(e) => set({ description: e.target.value })}
          placeholder={t.task.taskDescription}
          rows={3}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        />
      </div>

      <div className={`grid grid-cols-1 ${createMode === 'normal' ? 'md:grid-cols-2' : ''} gap-4`}>
        {createMode === 'normal' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t.task.priority}</label>
            {(() => {
              const levels = [
                { key: 'low', label: t.task.priorityLow, dot: 'bg-gray-400' },
                { key: 'medium', label: t.task.priorityMedium, dot: 'bg-blue-500' },
                { key: 'high', label: t.task.priorityHigh, dot: 'bg-orange-500' },
                { key: 'urgent', label: t.task.priorityUrgent, dot: 'bg-red-600' },
              ] as const
              const idxOf = (k: any) => (k === 'low' ? 0 : k === 'medium' ? 1 : k === 'high' ? 2 : 3)
              const keyOf = (i: number) => (i <= 0 ? 'low' : i === 1 ? 'medium' : i === 2 ? 'high' : 'urgent') as typeof levels[number]['key']
              const valueIdx = idxOf(value.priority)
              return (
                <div>
                  <input
                    type="range"
                    min={0}
                    max={3}
                    step={1}
                    value={valueIdx}
                    onChange={(e) => set({ priority: keyOf(parseInt(e.target.value, 10)) as any })}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-600 mt-2">
                    {levels.map((lvl, i) => (
                      <div key={lvl.key} className="flex items-center gap-1">
                        <span className={`w-2 h-2 rounded-full ${lvl.dot}`} />
                        <span className={i === valueIdx ? 'font-medium' : ''}>{lvl.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })()}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t.task.category}</label>
          {/* Desktop dropdown */}
          <div className="relative hidden sm:block" ref={desktopCatRef}>
            <button
              type="button"
              onClick={() => setShowDesktopCategory((v) => !v)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-left flex items-center justify-between hover:bg-gray-50"
            >
              <span className="inline-flex items-center gap-2">
                {(() => {
                  const current = categories.find((c: any) => c.id === value.categoryId)
                  if (current) {
                    return (
                      <>
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: current.color }} />
                        <span className="text-sm">{current.name}</span>
                      </>
                    )
                  }
                  return <span className="text-gray-500 text-sm">{t.ui?.noCategory || 'No Category'}</span>
                })()}
              </span>
              <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${showDesktopCategory ? 'rotate-180' : ''}`} />
            </button>
            {showDesktopCategory && (
              <div className="absolute z-50 mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-xl p-3">
                <div className="relative mb-2">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={desktopCategoryQuery}
                    onChange={(e) => setDesktopCategoryQuery(e.target.value)}
                    placeholder={t.ui?.searchCategories || 'Search categories...'}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="max-h-64 overflow-auto space-y-1">
                  <button
                    onClick={() => { set({ categoryId: '' }); setShowDesktopCategory(false) }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 text-sm"
                  >
                    <span className="w-3 h-3 rounded-full bg-gray-300" />
                    <span className="text-gray-700">{t.ui?.noCategory || 'No Category'}</span>
                  </button>
                  {categories.filter((c: any) => !desktopCategoryQuery || c.name.toLowerCase().includes(desktopCategoryQuery.toLowerCase())).map((cat: any) => (
                    <button
                      key={cat.id}
                      onClick={() => { set({ categoryId: cat.id }); setShowDesktopCategory(false) }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 text-sm"
                    >
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                      <span className="truncate">{cat.name}</span>
                    </button>
                  ))}
                  {categories.filter((c: any) => !desktopCategoryQuery || c.name.toLowerCase().includes(desktopCategoryQuery.toLowerCase())).length === 0 && (
                    <div className="text-center py-4 text-xs text-gray-500">{t.common.none}</div>
                  )}
                </div>
              </div>
            )}
          </div>
          {/* Mobile trigger */}
          <button
            type="button"
            onClick={onOpenMobileCategoryPicker}
            className="sm:hidden w-full px-4 py-3 border border-gray-300 rounded-xl text-left flex items-center justify-between hover:bg-gray-50"
          >
            <span className="inline-flex items-center gap-2">
              {(() => {
                const current = categories.find((c: any) => c.id === value.categoryId)
                if (current) {
                  return (
                    <>
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: current.color }} />
                      <span className="text-base sm:text-sm">{current.name}</span>
                    </>
                  )
                }
                return <span className="text-gray-500 text-base sm:text-sm">{t.ui.noCategory}</span>
              })()}
            </span>
            <Folder className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      {createMode === 'normal' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t.task.dueDate}</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="datetime-local"
                value={value.dueDate}
                onChange={(e) => set({ dueDate: e.target.value })}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t.task.tags}</label>
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={value.tags}
                onChange={(e) => set({ tags: e.target.value })}
                placeholder={t.ui.tagsPlaceholder}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      )}

      {createMode === 'normal' && (
        <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl">
          <input
            type="checkbox"
            id="joinAttention"
            checked={value.joinAttention}
            onChange={(e) => set({ joinAttention: e.target.checked })}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="joinAttention" className="text-sm text-gray-700">{t.task.joinAttentionPool}</label>
        </div>
      )}
    </>
  )
}
