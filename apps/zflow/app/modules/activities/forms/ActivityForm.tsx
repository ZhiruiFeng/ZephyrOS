'use client'

import React from 'react'
import { ChevronDown, Folder, Search } from 'lucide-react'

const ACTIVITY_TYPES = [
  { value: 'exercise', labelKey: 'typeExercise', icon: '🏃‍♂️' },
  { value: 'meditation', labelKey: 'typeMeditation', icon: '🧘‍♀️' },
  { value: 'reading', labelKey: 'typeReading', icon: '📚' },
  { value: 'music', labelKey: 'typeMusic', icon: '🎵' },
  { value: 'socializing', labelKey: 'typeSocial', icon: '👥' },
  { value: 'gaming', labelKey: 'typeGaming', icon: '🎮' },
  { value: 'walking', labelKey: 'typeWalking', icon: '🚶‍♀️' },
  { value: 'cooking', labelKey: 'typeCooking', icon: '👨‍🍳' },
  { value: 'rest', labelKey: 'typeRest', icon: '😴' },
  { value: 'creative', labelKey: 'typeCreative', icon: '🎨' },
  { value: 'learning', labelKey: 'typeLearning', icon: '📖' },
  { value: 'other', labelKey: 'typeOther', icon: '✨' },
]

export interface ActivityFormValue {
  title: string
  description: string
  activity_type: string
  categoryId: string
}

interface Props {
  value: ActivityFormValue
  onChange: (v: ActivityFormValue) => void
  categories: any[]
  t: any
  onOpenMobileCategoryPicker: () => void
}

export default function ActivityForm({ value, onChange, categories, t, onOpenMobileCategoryPicker }: Props) {
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

  const set = (patch: Partial<ActivityFormValue>) => onChange({ ...value, ...patch })

  return (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">{t.activity?.title || 'Title'} *</label>
        <input
          type="text"
          value={value.title}
          onChange={(e) => set({ title: e.target.value })}
          placeholder={t.activity?.activityTitle || 'Activity title...'}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">{t.activity?.description || 'Description'}</label>
        <textarea
          value={value.description}
          onChange={(e) => set({ description: e.target.value })}
          placeholder={t.activity?.activityDescription || 'Describe your activity...'}
          rows={3}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">{t.activity?.activityType || 'Activity Type'}</label>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {ACTIVITY_TYPES.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => set({ activity_type: type.value })}
              className={`p-3 rounded-xl border transition-all text-center ${value.activity_type === type.value ? 'bg-blue-50 border-blue-500 text-blue-600' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              <div className="text-xl mb-1">{type.icon}</div>
              <div className="text-xs font-medium">{(t.activity as any)[type.labelKey] ?? type.labelKey}</div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">{t.task?.category || 'Category'}</label>
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
    </>
  )
}
