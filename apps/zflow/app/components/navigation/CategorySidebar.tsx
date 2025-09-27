'use client'

import React, { useEffect, useState } from 'react'
import { Category } from '@/types/domain/task'
import { usePrefs } from '../../../contexts/PrefsContext'
import { useTranslation } from '../../../contexts/LanguageContext'

type SpecialCategory = 'all' | 'uncategorized'

export interface CategoryCounts {
  byId: Record<string, number>
  byIdCompleted: Record<string, number>
  byIdIncomplete: Record<string, number>
  uncategorized: number
  uncategorizedCompleted: number
  uncategorizedIncomplete: number
  total: number
  totalCompleted: number
  totalIncomplete: number
}

interface CategorySidebarProps {
  categories: Category[]
  selected: string | SpecialCategory
  counts: CategoryCounts
  view?: 'current' | 'future' | 'archive' | 'activities'
  onSelect: (key: string | SpecialCategory) => void
  onCreate: (payload: { name: string; color?: string }) => Promise<void>
  onUpdate?: (id: string, payload: { name: string; color?: string; description?: string }) => Promise<void>
  onDelete?: (id: string) => Promise<void>
  className?: string
}

const presetColors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#6B7280', '#9CA3AF']

export default function CategorySidebar({
  categories,
  selected,
  counts,
  view = 'current',
  onSelect,
  onCreate,
  onUpdate,
  onDelete,
  className = ''
}: CategorySidebarProps) {
  const { t } = useTranslation()
  const [isCreating, setIsCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(presetColors[0])
  const [submitting, setSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('')
  // using shared prefs from PrefsProvider

  const handleCreate = async () => {
    if (!newName.trim()) return
    setSubmitting(true)
    try {
      await onCreate({ name: newName.trim(), color: newColor })
      setNewName('')
      setNewColor(presetColors[0])
      setIsCreating(false)
    } finally {
      setSubmitting(false)
    }
  }

  const startEdit = (category: Category) => {
    setEditingId(category.id)
    setEditName(category.name)
    setEditColor(category.color)
  }

  const handleUpdate = async () => {
    if (!editingId || !editName.trim() || !onUpdate) return
    setSubmitting(true)
    try {
      await onUpdate(editingId, { name: editName.trim(), color: editColor })
      setEditingId(null)
      setEditName('')
      setEditColor('')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (categoryId: string) => {
    if (!onDelete) return
    if (!confirm(t.messages.confirmDeleteCategory)) return
    setSubmitting(true)
    try {
      await onDelete(categoryId)
    } catch (error) {
      alert(t.messages.categoryDeleteFailed)
    } finally {
      setSubmitting(false)
    }
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditName('')
    setEditColor('')
  }

  return (
    <aside className={`w-full sm:w-60 lg:w-64 xl:w-72 shrink-0 glass rounded-xl shadow-sm ${className}`}>
      <div className="p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-800">{t.ui.categories}</h2>
        </div>
        <nav className="space-y-2">
          <button
            onClick={() => onSelect('all')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
              selected === 'all' 
                ? 'bg-primary-600 text-white shadow-sm' 
                : 'text-gray-700 hover:bg-white/50 bg-white/30'
            }`}
          >
            <span>{t.common.all}</span>
            <span className="text-xs inline-flex items-center gap-1 opacity-80 ml-auto">
                              <span className={`px-2 py-1 rounded-full ${selected === 'all' ? 'bg-white/20 text-white' : 'bg-primary-50 text-primary-700'}`}>
                  {counts.total}
                </span>
            </span>
          </button>
          <button
            onClick={() => onSelect('uncategorized')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
              selected === 'uncategorized' 
                ? 'bg-primary-600 text-white shadow-sm' 
                : 'text-gray-700 hover:bg-white/50 bg-white/30'
            }`}
          >
            <span>{t.ui.uncategorized}</span>
            <span className="text-xs inline-flex items-center gap-1 opacity-80 ml-auto">
                              <span className={`px-2 py-1 rounded-full ${selected === 'uncategorized' ? 'bg-white/20 text-white' : 'bg-primary-50 text-primary-700'}`}>
                  {counts.uncategorized}
                </span>
            </span>
          </button>
          <div className="h-px bg-white/40 my-3" />
          {categories.map((cat) => (
            <div key={cat.id}>
              {editingId === cat.id ? (
                <div className="p-4 border border-white/60 rounded-xl space-y-3 bg-white/50 backdrop-blur-sm">
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder={t.ui.categoryName}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white/70 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex items-center gap-2 flex-wrap">
                    {presetColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setEditColor(color)}
                        className={`w-6 h-6 rounded-full border-2 transition-all duration-200 ${editColor === color ? 'ring-2 ring-blue-500 scale-110' : 'hover:scale-105'}`}
                        style={{ backgroundColor: color, borderColor: editColor === color ? '#3B82F6' : 'transparent' }}
                        title={color}
                      />
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleUpdate}
                      disabled={!editName.trim() || submitting}
                      className="flex-1 text-sm px-3 py-2 rounded-lg bg-primary-600 text-white disabled:opacity-50 hover:bg-primary-700 transition-colors duration-200"
                    >
                      {t.common.save}
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="flex-1 text-sm px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors duration-200"
                    >
                      {t.common.cancel}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="group flex items-center">
                  <button
                    onClick={() => onSelect(cat.id)}
                    className={`flex-1 flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                      selected === cat.id 
                        ? 'bg-primary-600 text-white shadow-sm' 
                        : 'text-gray-700 hover:bg-white/50 bg-white/30'
                    }`}
                    title={cat.description}
                  >
                    <span className="inline-flex items-center gap-3">
                      <span className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: cat.color }} />
                      <span className="truncate max-w-[7rem]">{cat.name}</span>
                    </span>
                    <span className="text-xs inline-flex items-center gap-1 opacity-80 ml-auto">
                      <span className={`px-2 py-1 rounded-full ${selected === cat.id ? 'bg-white/20 text-white' : 'bg-primary-50 text-primary-700'}`}>
                        {counts.byId[cat.id] || 0}
                      </span>
                    </span>
                  </button>
                  {(onUpdate || onDelete) && (
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 ml-2">
                      <div className="flex items-center gap-1">
                        {onUpdate && (
                          <button
                            onClick={(e) => { e.stopPropagation(); startEdit(cat) }}
                            className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-white/50 rounded-lg transition-all duration-200"
                            title={t.ui.editCategory}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        )}
                        {onDelete && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(cat.id) }}
                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-white/50 rounded-lg transition-all duration-200"
                            title={t.ui.deleteCategory}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          <div className="pt-2">
            {isCreating ? (
              <div className="p-4 border border-white/60 rounded-xl space-y-3 bg-white/50 backdrop-blur-sm">
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder={t.ui.newCategoryName}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white/70 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                />
                <div className="flex items-center gap-2 flex-wrap">
                  {presetColors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewColor(color)}
                      className={`w-6 h-6 rounded-full border-2 transition-all duration-200 ${newColor === color ? 'ring-2 ring-blue-500 scale-110' : 'hover:scale-105'}`}
                      style={{ backgroundColor: color, borderColor: newColor === color ? '#3B82F6' : 'transparent' }}
                      title={color}
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCreate}
                    disabled={!newName.trim() || submitting}
                    className="flex-1 text-sm px-3 py-2 rounded-lg bg-primary-600 text-white disabled:opacity-50 hover:bg-primary-700 transition-colors duration-200"
                  >
                    {t.common.create}
                  </button>
                  <button
                    onClick={() => setIsCreating(false)}
                    className="flex-1 text-sm px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors duration-200"
                  >
                    {t.common.cancel}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsCreating(true)}
                className="w-full px-4 py-3 text-sm font-medium text-primary-600 hover:bg-primary-50 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                {t.ui.newCategory}
              </button>
            )}
          </div>
        </nav>

      </div>
    </aside>
  )
}


