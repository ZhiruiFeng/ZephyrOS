'use client'

import React from 'react'
import Link from 'next/link'
import { Tag, ChevronDown, Grid, Focus, Clock } from 'lucide-react'

export type ViewKey = 'current' | 'future' | 'archive' | 'activities'
export type DisplayMode = 'list' | 'grid'

interface FilterControlsProps {
  // Filter states
  search: string
  filterPriority: 'all' | 'low' | 'medium' | 'high' | 'urgent'
  selectedCategory: 'all' | 'uncategorized' | string
  displayMode: DisplayMode
  sortMode: 'none' | 'priority' | 'due_date'
  
  // Filter handlers
  onSearchChange: (value: string) => void
  onPriorityChange: (value: 'all' | 'low' | 'medium' | 'high' | 'urgent') => void
  onDisplayModeChange: (mode: DisplayMode) => void
  onSortModeChange: (mode: 'none' | 'priority' | 'due_date') => void
  onOpenMobileCategorySelector: () => void
  onOpenDailyModal: () => void
  
  // Data
  categories: any[]
  
  // Translations
  t: any
}

export default function FilterControls({
  search,
  filterPriority,
  selectedCategory,
  displayMode,
  sortMode,
  onSearchChange,
  onPriorityChange,
  onDisplayModeChange,
  onSortModeChange,
  onOpenMobileCategorySelector,
  onOpenDailyModal,
  categories,
  t
}: FilterControlsProps) {
  return (
    <>
      {/* Current Category Display (Mobile) */}
      <div className="md:hidden mb-3">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Tag className="w-4 h-4" />
          <span>
            {t.ui?.currentCategory || '当前分类'}: {
              selectedCategory === 'all' ? (t.common?.all || '全部') : 
              selectedCategory === 'uncategorized' ? (t.ui?.uncategorized || '未分类') : 
              categories.find(c => c.id === selectedCategory)?.name || 'Unknown'
            }
          </span>
        </div>
      </div>

      {/* Search, Filters and View Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 md:gap-4 mb-4 md:mb-6">
        {/* Left: Search and Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          <div className="flex items-center glass rounded-full px-3 md:px-4 py-2">
            <input 
              value={search} 
              onChange={(e) => onSearchChange(e.target.value)} 
              placeholder={t.ui?.searchTasks || '搜索任务'} 
              className="bg-transparent outline-none text-sm text-gray-700 placeholder:text-gray-500 w-full sm:w-48"
            />
          </div>
          <select 
            value={filterPriority} 
            onChange={(e) => onPriorityChange(e.target.value as any)} 
            className="glass rounded-full px-3 md:px-4 py-2 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">{t.ui?.allPriority || '所有优先级'}</option>
            <option value="urgent">{t.task?.priorityUrgent || '紧急'}</option>
            <option value="high">{t.task?.priorityHigh || '高'}</option>
            <option value="medium">{t.task?.priorityMedium || '中'}</option>
            <option value="low">{t.task?.priorityLow || '低'}</option>
          </select>
          
          {/* Sort Mode Selector */}
          <select 
            value={sortMode} 
            onChange={(e) => onSortModeChange(e.target.value as any)} 
            className="glass rounded-full px-3 md:px-4 py-2 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="none">{t.ui?.noSort || '无排序'}</option>
            <option value="priority">{t.ui?.sortByPriority || '按优先级排序'}</option>
            <option value="due_date">{t.ui?.sortByDueDate || '按截止日期排序'}</option>
          </select>
          
          {/* Mobile Category Selector Button */}
          <button
            onClick={onOpenMobileCategorySelector}
            className="md:hidden flex items-center justify-between glass rounded-full px-3 py-2 text-sm text-gray-700 hover:bg-white/50 transition-colors duration-200"
          >
            <span className="flex items-center gap-2">
              <Tag className="w-4 h-4" />
              <span>
                {selectedCategory === 'all' ? (t.ui?.allCategories || '所有分类') : 
                 selectedCategory === 'uncategorized' ? (t.ui?.uncategorized || '未分类') : 
                 categories.find(c => c.id === selectedCategory)?.name || (t.ui?.selectCategory || '选择分类')}
              </span>
            </span>
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>

        {/* Right: View Controls and Current View Indicator */}
        <div className="flex items-center justify-center sm:justify-end gap-2 md:gap-4">
          {/* Display Mode Toggle */}
          <div className="flex items-center glass rounded-full p-1">
            <button
              onClick={() => onDisplayModeChange('list')}
              className={`px-2 md:px-3 py-1.5 rounded-full text-xs md:text-sm font-medium transition-all duration-200 ${
                displayMode === 'list' 
                  ? 'bg-primary-600 text-white shadow-sm' 
                  : 'text-gray-600 hover:bg-white/50'
              }`}
            >
              {t.ui?.listView || '列表'}
            </button>
            <button
              onClick={() => onDisplayModeChange('grid')}
              className={`px-2 md:px-3 py-1.5 rounded-full text-xs md:text-sm font-medium transition-all duration-200 flex items-center gap-1 ${
                displayMode === 'grid' 
                  ? 'bg-primary-600 text-white shadow-sm' 
                  : 'text-gray-600 hover:bg-white/50'
              }`}
            >
              <Grid className="w-3 h-3" />
              {t.ui?.gridView || '网格'}
            </button>
          </div>

          {/* Focus Button */}
          <Link href="/focus?view=work" className="bg-primary-600 text-white px-3 md:px-4 py-2 rounded-lg font-medium hover:bg-primary-700 transition-colors duration-200 flex items-center gap-1 md:gap-2 text-xs md:text-sm">
            <Focus className="w-3 h-3 md:w-4 md:h-4" />
            <span className="hidden sm:inline">Focus</span>
          </Link>

          {/* Daily time overview */}
          <button
            onClick={onOpenDailyModal}
            className="glass px-3 md:px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center gap-1 md:gap-2 text-xs md:text-sm hover:shadow-sm hover:-translate-y-0.5"
          >
            <Clock className="w-3 h-3 md:w-4 md:h-4" />
            <span className="hidden sm:inline">Time</span>
          </button>
        </div>
      </div>
    </>
  )
}