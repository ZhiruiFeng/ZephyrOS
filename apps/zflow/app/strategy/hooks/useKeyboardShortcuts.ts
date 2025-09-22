import { useEffect, useRef } from 'react'
import type { StrategyLens } from '../../../lib/types/strategy'

interface UseKeyboardShortcutsProps {
  lens: StrategyLens
  onLensChange: (lens: StrategyLens) => void
  searchQuery: string
  onSearchQueryChange: (query: string) => void
  showFilters: boolean
  onToggleFilters: () => void
  showKeyboardShortcuts: boolean
  onToggleKeyboardShortcuts: () => void
  showAgentModal: boolean
  onCloseAgentModal: () => void
  onRefresh: () => void
}

export const useKeyboardShortcuts = ({
  lens,
  onLensChange,
  searchQuery,
  onSearchQueryChange,
  showFilters,
  onToggleFilters,
  showKeyboardShortcuts,
  onToggleKeyboardShortcuts,
  showAgentModal,
  onCloseAgentModal,
  onRefresh
}: UseKeyboardShortcutsProps) => {
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement) {
        // Allow Escape to clear search when focused on search input
        if (event.key === 'Escape' && event.target === searchInputRef.current) {
          onSearchQueryChange('')
          searchInputRef.current?.blur()
          return
        }
        return
      }

      // Don't trigger shortcuts when modifiers are pressed (except for specific combos)
      if (event.ctrlKey || event.metaKey || event.altKey) return

      switch (event.key) {
        case '1':
          event.preventDefault()
          onLensChange('vision')
          break
        case '2':
          event.preventDefault()
          onLensChange('execution')
          break
        case '3':
          event.preventDefault()
          onLensChange('delegation')
          break
        case '4':
          event.preventDefault()
          onLensChange('reflection')
          break
        case '/':
          event.preventDefault()
          searchInputRef.current?.focus()
          break
        case 'Escape':
          event.preventDefault()
          if (showKeyboardShortcuts) {
            onToggleKeyboardShortcuts()
          } else if (showFilters) {
            onToggleFilters()
          } else if (searchQuery) {
            onSearchQueryChange('')
          } else if (showAgentModal) {
            onCloseAgentModal()
          }
          break
        case 'f':
          event.preventDefault()
          onToggleFilters()
          break
        case 'r':
          event.preventDefault()
          onRefresh()
          break
        case '?':
          event.preventDefault()
          onToggleKeyboardShortcuts()
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [
    lens,
    onLensChange,
    searchQuery,
    onSearchQueryChange,
    showFilters,
    onToggleFilters,
    showKeyboardShortcuts,
    onToggleKeyboardShortcuts,
    showAgentModal,
    onCloseAgentModal,
    onRefresh
  ])

  return {
    searchInputRef
  }
}
