'use client'

import React, { useMemo, useState } from 'react'
import { X, Search } from 'lucide-react'
import { Category } from '../types/task'
import { CategoryCounts } from './CategorySidebar'
import { useTranslation } from '../../../contexts/LanguageContext'

const presetColors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#6B7280', '#9CA3AF']

export interface MobileCategorySheetProps {
  open: boolean
  onClose: () => void
  categories: Category[]
  counts: CategoryCounts
  selected: 'all' | 'uncategorized' | string
  onSelect: (key: 'all' | 'uncategorized' | string) => void
  onCreate: (payload: { name: string; color?: string }) => Promise<void>
  onUpdate?: (id: string, payload: { name: string; color?: string; description?: string }) => Promise<void>
  onDelete?: (id: string) => Promise<void>
}

export default function MobileCategorySheet({
  open,
  onClose,
  categories,
  counts,
  selected,
  onSelect,
  onCreate,
  onUpdate,
  onDelete,
}: MobileCategorySheetProps) {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(presetColors[0])
  const [submitting, setSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('')

  const filtered = useMemo(() => {
    if (!query) return categories
    return categories.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()))
  }, [categories, query])

  const startEdit = (cat: Category) => {
    setEditingId(cat.id)
    setEditName(cat.name)
    setEditColor(cat.color)
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

  const handleDelete = async (id: string) => {
    if (!onDelete) return
    if (!confirm(t.messages.confirmDeleteCategory)) return
    setSubmitting(true)
    try {
      await onDelete(id)
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] sm:hidden">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 bg-white rounded-t-2xl shadow-2xl p-4 border-t border-gray-200 pb-[max(1rem,env(safe-area-inset-bottom))] max-h-[85vh] flex flex-col">
        <div className="mx-auto w-10 h-1.5 bg-gray-300 rounded-full mb-3" />
        <div className="flex items-center justify-between mb-2">
          <div className="text-base font-semibold text-gray-900">{t.ui.categories}</div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.ui.searchTasks}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Quick entries */}
        <div className="space-y-2 overflow-y-auto">
          <button
            onClick={() => { onSelect('all'); onClose() }}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-colors border ${selected === 'all' ? 'bg-primary-600 text-white border-primary-600' : 'hover:bg-gray-50'}`}
          >
            <span className="text-base sm:text-sm">{t.common.all}</span>
            <span className={`px-2 py-1 rounded-full text-xs ${selected === 'all' ? 'bg-white/20 text-white' : 'bg-primary-50 text-primary-700'}`}>{counts.total}</span>
          </button>
          <button
            onClick={() => { onSelect('uncategorized'); onClose() }}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-colors border ${selected === 'uncategorized' ? 'bg-primary-600 text-white border-primary-600' : 'hover:bg-gray-50'}`}
          >
            <span className="text-base sm:text-sm">{t.ui.uncategorized}</span>
            <span className={`px-2 py-1 rounded-full text-xs ${selected === 'uncategorized' ? 'bg-white/20 text-white' : 'bg-primary-50 text-primary-700'}`}>{counts.uncategorized}</span>
          </button>

          {/* Category list */}
          {filtered.map((cat) => (
            <div key={cat.id} className="border rounded-xl">
              {editingId === cat.id ? (
                <div className="p-3 space-y-3">
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder={t.ui.categoryName}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex items-center gap-2 flex-wrap">
                    {presetColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setEditColor(color)}
                        className={`w-6 h-6 rounded-full border-2 ${editColor === color ? 'ring-2 ring-blue-500 scale-110' : ''}`}
                        style={{ backgroundColor: color, borderColor: editColor === color ? '#3B82F6' : 'transparent' }}
                        title={color}
                      />
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleUpdate}
                      disabled={!editName.trim() || submitting}
                      className="flex-1 text-sm px-3 py-2 rounded-lg bg-primary-600 text-white disabled:opacity-50"
                    >
                      {t.common.save}
                    </button>
                    <button
                      onClick={() => { setEditingId(null); setEditName(''); setEditColor('') }}
                      className="flex-1 text-sm px-3 py-2 rounded-lg border"
                    >
                      {t.common.cancel}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center">
                  <button
                    onClick={() => { onSelect(cat.id); onClose() }}
                    className={`flex-1 flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-colors ${selected === cat.id ? 'bg-primary-600 text-white' : 'hover:bg-gray-50'}`}
                    title={cat.description}
                  >
                    <span className="inline-flex items-center gap-3">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                      <span className="truncate max-w-[12rem] text-base sm:text-sm">{cat.name}</span>
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs ${selected === cat.id ? 'bg-white/20 text-white' : 'bg-primary-50 text-primary-700'}`}>
                      {counts.byId[cat.id] || 0}
                    </span>
                  </button>
                  {(onUpdate || onDelete) && (
                    <div className="flex items-center gap-1 pr-2">
                      {onUpdate && (
                        <button
                          onClick={(e) => { e.stopPropagation(); startEdit(cat) }}
                          className="p-2 text-gray-500 hover:text-primary-600"
                          title={t.ui.editCategory}
                        >
                          {/* pencil icon */}
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      )}
                      {onDelete && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(cat.id) }}
                          className="p-2 text-gray-500 hover:text-red-600"
                          title={t.ui.deleteCategory}
                        >
                          {/* trash icon */}
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Create new */}
          <div className="pt-2">
            {isCreating ? (
              <div className="p-3 border rounded-xl space-y-3">
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder={t.ui.newCategoryName}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex items-center gap-2 flex-wrap">
                  {presetColors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewColor(color)}
                      className={`w-6 h-6 rounded-full border-2 ${newColor === color ? 'ring-2 ring-blue-500 scale-110' : ''}`}
                      style={{ backgroundColor: color, borderColor: newColor === color ? '#3B82F6' : 'transparent' }}
                      title={color}
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCreate}
                    disabled={!newName.trim() || submitting}
                    className="flex-1 text-sm px-3 py-2 rounded-lg bg-primary-600 text-white disabled:opacity-50"
                  >
                    {t.common.create}
                  </button>
                  <button
                    onClick={() => setIsCreating(false)}
                    className="flex-1 text-sm px-3 py-2 rounded-lg border"
                  >
                    {t.common.cancel}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsCreating(true)}
                className="w-full px-4 py-3 text-sm font-medium text-primary-600 hover:bg-primary-50 rounded-xl border"
              >
                {t.ui.newCategory}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}


