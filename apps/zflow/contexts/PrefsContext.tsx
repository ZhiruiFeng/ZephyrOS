'use client'

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

export type Priority = 'low' | 'medium' | 'high' | 'urgent'
export type FilterPriority = 'all' | Priority
export type SortMode = 'none' | 'priority' | 'due_date'

interface PrefsContextValue {
  hideCompleted: boolean
  setHideCompleted: (v: boolean) => void

  showCompletedCounts: boolean
  setShowCompletedCounts: (v: boolean) => void

  filterPriority: FilterPriority
  setFilterPriority: (v: FilterPriority) => void

  sortMode: SortMode
  setSortMode: (v: SortMode) => void

  selectedCategory: 'all' | 'uncategorized' | string
  setSelectedCategory: (v: 'all' | 'uncategorized' | string) => void
}

const PrefsContext = createContext<PrefsContextValue | undefined>(undefined)

const STORAGE_KEYS = {
  hideCompleted: 'zflow:prefs:hideCompleted',
  showCompletedCounts: 'zflow:prefs:sidebar:showCompletedCounts',
  filterPriority: 'zflow:prefs:filterPriority',
  sortMode: 'zflow:prefs:sortMode',
  selectedCategory: 'zflow:prefs:selectedCategory',
}

export function PrefsProvider({ children }: { children: React.ReactNode }) {
  const [hideCompleted, setHideCompleted] = useState<boolean>(true)
  const [showCompletedCounts, setShowCompletedCounts] = useState<boolean>(true)
  const [filterPriority, setFilterPriority] = useState<FilterPriority>('all')
  const [sortMode, setSortMode] = useState<SortMode>('none')
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'uncategorized' | string>('all')
  const [isClient, setIsClient] = useState(false)

  // Ensure we're on the client side
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Initialize from localStorage (with some legacy keys support)
  useEffect(() => {
    if (!isClient) return
    
    try {
      const storedHide = localStorage.getItem(STORAGE_KEYS.hideCompleted)
      const legacyHide = localStorage.getItem('zflow:hideCompleted')
      if (storedHide != null) setHideCompleted(storedHide === '1')
      else if (legacyHide != null) setHideCompleted(legacyHide === '1')

      const storedCounts = localStorage.getItem(STORAGE_KEYS.showCompletedCounts)
      if (storedCounts != null) setShowCompletedCounts(storedCounts === '1')

      const storedPriority = localStorage.getItem(STORAGE_KEYS.filterPriority) as FilterPriority | null
      const legacyPriority = localStorage.getItem('zflow:filterPriority') as FilterPriority | null
      if (storedPriority) setFilterPriority(storedPriority)
      else if (legacyPriority) setFilterPriority(legacyPriority)

      const storedSort = localStorage.getItem(STORAGE_KEYS.sortMode) as SortMode | null
      if (storedSort) setSortMode(storedSort)

      const storedCategory = localStorage.getItem(STORAGE_KEYS.selectedCategory) as any
      if (storedCategory) setSelectedCategory(storedCategory)
    } catch {}
  }, [isClient])

  useEffect(() => {
    if (!isClient) return
    try { localStorage.setItem(STORAGE_KEYS.hideCompleted, hideCompleted ? '1' : '0') } catch {}
  }, [hideCompleted, isClient])

  useEffect(() => {
    if (!isClient) return
    try { localStorage.setItem(STORAGE_KEYS.showCompletedCounts, showCompletedCounts ? '1' : '0') } catch {}
  }, [showCompletedCounts, isClient])

  useEffect(() => {
    if (!isClient) return
    try { localStorage.setItem(STORAGE_KEYS.filterPriority, filterPriority) } catch {}
  }, [filterPriority, isClient])

  useEffect(() => {
    if (!isClient) return
    try { localStorage.setItem(STORAGE_KEYS.sortMode, sortMode) } catch {}
  }, [sortMode, isClient])

  useEffect(() => {
    if (!isClient) return
    try { localStorage.setItem(STORAGE_KEYS.selectedCategory, String(selectedCategory)) } catch {}
  }, [selectedCategory, isClient])

  const value: PrefsContextValue = useMemo(() => ({
    hideCompleted, setHideCompleted,
    showCompletedCounts, setShowCompletedCounts,
    filterPriority, setFilterPriority,
    sortMode, setSortMode,
    selectedCategory, setSelectedCategory,
  }), [hideCompleted, showCompletedCounts, filterPriority, sortMode, selectedCategory])

  return (
    <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>
  )
}

export function usePrefs(): PrefsContextValue {
  const context = useContext(PrefsContext)
  if (context === undefined) {
    throw new Error('usePrefs must be used within a PrefsProvider')
  }
  return context
}


