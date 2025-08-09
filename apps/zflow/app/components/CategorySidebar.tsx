'use client'

import React, { useState } from 'react'
import { Category } from '../types/task'

type SpecialCategory = 'all' | 'uncategorized'

export interface CategoryCounts {
  byId: Record<string, number>
  uncategorized: number
  total: number
}

interface CategorySidebarProps {
  categories: Category[]
  selected: string | SpecialCategory
  counts: CategoryCounts
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
  onSelect,
  onCreate,
  onUpdate,
  onDelete,
  className = ''
}: CategorySidebarProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(presetColors[0])
  const [submitting, setSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('')

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
    if (!confirm('Are you sure you want to delete this category? Associated tasks will become uncategorized.')) return
    setSubmitting(true)
    try {
      await onDelete(categoryId)
    } catch (error) {
      alert('Delete failed, please try again')
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
    <aside className={`w-full sm:w-60 lg:w-64 xl:w-72 shrink-0 bg-white border-r border-gray-200 ${className}`}>
      <div className="p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Categories</h2>
        <nav className="space-y-1">
          <button
            onClick={() => onSelect('all')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded text-sm ${
              selected === 'all' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <span>All</span>
            <span className="text-xs opacity-70">{counts.total}</span>
          </button>
          <button
            onClick={() => onSelect('uncategorized')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded text-sm ${
              selected === 'uncategorized' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <span>Uncategorized</span>
            <span className="text-xs opacity-70">{counts.uncategorized}</span>
          </button>
          <div className="h-px bg-gray-200 my-2" />
          {categories.map((cat) => (
            <div key={cat.id}>
              {editingId === cat.id ? (
                <div className="p-3 border border-gray-200 rounded space-y-2 bg-gray-50">
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Category name"
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                  />
                  <div className="flex items-center gap-2 flex-wrap">
                    {presetColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setEditColor(color)}
                        className={`w-6 h-6 rounded-full border ${editColor === color ? 'ring-2 ring-blue-500' : ''}`}
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleUpdate}
                      disabled={!editName.trim() || submitting}
                      className="flex-1 text-sm px-3 py-1.5 rounded bg-blue-600 text-white disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="flex-1 text-sm px-3 py-1.5 rounded border border-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="group flex items-center">
                  <button
                    onClick={() => onSelect(cat.id)}
                    className={`flex-1 flex items-center justify-between px-3 py-2 rounded text-sm ${
                      selected === cat.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                    title={cat.description}
                  >
                    <span className="inline-flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                      <span className="truncate max-w-[7rem]">{cat.name}</span>
                    </span>
                    <span className="text-xs opacity-70">{counts.byId[cat.id] || 0}</span>
                  </button>
                  {(onUpdate || onDelete) && (
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 ml-1">
                      {onUpdate && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            startEdit(cat)
                          }}
                          className="p-1 text-gray-400 hover:text-gray-600 rounded"
                          title="Edit category"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                      )}
                      {onDelete && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(cat.id)
                          }}
                          className="p-1 text-gray-400 hover:text-red-500 rounded"
                          title="Delete category"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        </nav>

        <div className="mt-4">
          {!isCreating ? (
            <button
              onClick={() => setIsCreating(true)}
              className="w-full text-sm px-3 py-2 rounded border border-gray-300 hover:bg-gray-50"
            >
              + New Category
            </button>
          ) : (
            <div className="p-3 border border-gray-200 rounded space-y-2 bg-gray-50">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Category name"
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
              />
              <div className="flex items-center gap-2 flex-wrap">
                {presetColors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewColor(color)}
                    className={`w-6 h-6 rounded-full border ${newColor === color ? 'ring-2 ring-blue-500' : ''}`}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCreate}
                  disabled={!newName.trim() || submitting}
                  className="flex-1 text-sm px-3 py-1.5 rounded bg-blue-600 text-white disabled:opacity-50"
                >
                  Create
                </button>
                <button
                  onClick={() => { setIsCreating(false); setNewName(''); }}
                  className="flex-1 text-sm px-3 py-1.5 rounded border border-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}


