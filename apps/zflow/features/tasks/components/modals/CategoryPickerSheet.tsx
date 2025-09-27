'use client'

import React from 'react'
import { X, Search } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  categories: any[]
  query: string
  setQuery: (q: string) => void
  onSelect: (val: string) => void
  t: any
}

export default function CategoryPickerSheet({ open, onClose, categories, query, setQuery, onSelect, t }: Props) {
  if (!open) return null
  const filtered = (categories || []).filter((c: any) =>
    !query || c.name.toLowerCase().includes(query.toLowerCase())
  )
  return (
    <div className="fixed inset-0 z-[60] sm:z-[60]">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 bg-white rounded-t-2xl shadow-2xl p-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-gray-200 max-h-[80vh]">
        <div className="mx-auto w-10 h-1.5 bg-gray-300 rounded-full mb-3" />
        <div className="flex items-center gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.ui.searchTasks}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>
        <div className="space-y-2 overflow-y-auto max-h-[60vh]">
          <button
            onClick={() => { onSelect(''); onClose() }}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-colors border hover:bg-gray-50"
          >
            <span className="text-base sm:text-sm text-gray-700">{t.ui.noCategory}</span>
          </button>
          {filtered.map((cat: any) => (
            <button
              key={cat.id}
              onClick={() => { onSelect(cat.id); onClose() }}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-colors border hover:bg-gray-50"
            >
              <span className="inline-flex items-center gap-3">
                <span className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: cat.color }} />
                <span className="text-base sm:text-sm">{cat.name}</span>
              </span>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-6 text-gray-500 text-sm">{t.common.none}</div>
          )}
        </div>
      </div>
    </div>
  )
}

