import { useState, useMemo } from 'react'

interface UseStrategyFiltersProps {
  initiatives: any[]
  myTasks: any[]
  agentTasks: any[]
}

export const useStrategyFilters = ({ initiatives, myTasks, agentTasks }: UseStrategyFiltersProps) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  const filteredInitiatives = useMemo(() => {
    if (!initiatives) return []

    return initiatives.filter(initiative => {
      // Search filter
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase()
        const matchesSearch =
          initiative.title?.toLowerCase().includes(searchLower) ||
          initiative.description?.toLowerCase().includes(searchLower) ||
          initiative.category?.toLowerCase().includes(searchLower)
        if (!matchesSearch) return false
      }

      // Status filter
      if (statusFilter !== 'all' && initiative.status !== statusFilter) return false

      // Priority filter
      if (priorityFilter !== 'all' && initiative.priority !== priorityFilter) return false

      // Category filter
      if (categoryFilter !== 'all' && initiative.category !== categoryFilter) return false

      return true
    })
  }, [initiatives, searchQuery, statusFilter, priorityFilter, categoryFilter])

  const filteredMyTasks = useMemo(() => {
    if (!myTasks) return []

    return myTasks.filter(task => {
      // Search filter
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase()
        const matchesSearch =
          task.title?.toLowerCase().includes(searchLower) ||
          task.description?.toLowerCase().includes(searchLower) ||
          task.initiativeTitle?.toLowerCase().includes(searchLower)
        if (!matchesSearch) return false
      }

      // Status filter
      if (statusFilter !== 'all' && task.status !== statusFilter) return false

      // Priority filter
      if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false

      return true
    })
  }, [myTasks, searchQuery, statusFilter, priorityFilter])

  const filteredAgentTasks = useMemo(() => {
    if (!agentTasks) return []

    return agentTasks.filter(task => {
      // Search filter
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase()
        const matchesSearch =
          task.title?.toLowerCase().includes(searchLower) ||
          task.description?.toLowerCase().includes(searchLower) ||
          task.assignee?.toLowerCase().includes(searchLower) ||
          task.initiativeTitle?.toLowerCase().includes(searchLower)
        if (!matchesSearch) return false
      }

      // Status filter
      if (statusFilter !== 'all' && task.status !== statusFilter) return false

      // Priority filter
      if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false

      return true
    })
  }, [agentTasks, searchQuery, statusFilter, priorityFilter])

  const clearFilters = () => {
    setSearchQuery('')
    setStatusFilter('all')
    setPriorityFilter('all')
    setCategoryFilter('all')
  }

  const hasActiveFilters = searchQuery || statusFilter !== 'all' || priorityFilter !== 'all' || categoryFilter !== 'all'

  return {
    // State
    searchQuery,
    statusFilter,
    priorityFilter,
    categoryFilter,

    // Setters
    setSearchQuery,
    setStatusFilter,
    setPriorityFilter,
    setCategoryFilter,

    // Filtered data
    filteredInitiatives,
    filteredMyTasks,
    filteredAgentTasks,

    // Utilities
    clearFilters,
    hasActiveFilters
  }
}