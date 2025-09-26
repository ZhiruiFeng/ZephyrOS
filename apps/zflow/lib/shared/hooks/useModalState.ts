import { useState, useCallback } from 'react'

interface UseModalStateReturn {
  // Add task modal
  showAddModal: boolean
  setShowAddModal: (show: boolean) => void
  openAddModal: () => void
  closeAddModal: () => void

  // Task editor
  editingTask: any
  showTaskEditor: boolean
  openTaskEditor: (task: any) => void
  closeTaskEditor: () => void

  // Activity editor
  editingActivity: any
  showActivityEditor: boolean
  openActivityEditor: (activity: any) => void
  closeActivityEditor: () => void

  // Mobile category selector
  showMobileCategorySelector: boolean
  setShowMobileCategorySelector: (show: boolean) => void

  // Time modals
  timeModalTask: { id: string; title: string } | null
  timeModalActivity: { id: string; title: string } | null
  setTimeModalTask: (task: { id: string; title: string } | null) => void
  setTimeModalActivity: (activity: { id: string; title: string } | null) => void

  // Daily time modal
  showDailyModal: boolean
  setShowDailyModal: (show: boolean) => void

  // Energy review modal
  energyReviewOpen: boolean
  energyReviewEntry: any
  setEnergyReviewOpen: (open: boolean) => void
  setEnergyReviewEntry: (entry: any) => void

  // Description expansion state
  expandedDescriptions: Set<string>
  toggleDescriptionExpansion: (taskId: string) => void
}

export function useModalState(): UseModalStateReturn {
  // Add task modal
  const [showAddModal, setShowAddModal] = useState(false)
  const openAddModal = useCallback(() => setShowAddModal(true), [])
  const closeAddModal = useCallback(() => setShowAddModal(false), [])

  // Task editor
  const [editingTask, setEditingTask] = useState<any>(null)
  const [showTaskEditor, setShowTaskEditor] = useState(false)

  const openTaskEditor = useCallback((task: any) => {
    setEditingTask(task)
    setShowTaskEditor(true)
  }, [])

  const closeTaskEditor = useCallback(() => {
    setShowTaskEditor(false)
    setEditingTask(null)
  }, [])

  // Activity editor
  const [editingActivity, setEditingActivity] = useState<any>(null)
  const [showActivityEditor, setShowActivityEditor] = useState(false)

  const openActivityEditor = useCallback((activity: any) => {
    setEditingActivity(activity)
    setShowActivityEditor(true)
  }, [])

  const closeActivityEditor = useCallback(() => {
    setShowActivityEditor(false)
    setEditingActivity(null)
  }, [])

  // Mobile category selector
  const [showMobileCategorySelector, setShowMobileCategorySelector] = useState(false)

  // Time modals
  const [timeModalTask, setTimeModalTask] = useState<{ id: string; title: string } | null>(null)
  const [timeModalActivity, setTimeModalActivity] = useState<{ id: string; title: string } | null>(null)

  // Daily time modal
  const [showDailyModal, setShowDailyModal] = useState(false)

  // Energy review modal
  const [energyReviewOpen, setEnergyReviewOpen] = useState(false)
  const [energyReviewEntry, setEnergyReviewEntry] = useState<any>(null)

  // Description expansion state
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(new Set())

  const toggleDescriptionExpansion = useCallback((taskId: string) => {
    setExpandedDescriptions(prev => {
      const newExpanded = new Set(prev)
      if (newExpanded.has(taskId)) {
        newExpanded.delete(taskId)
      } else {
        newExpanded.add(taskId)
      }
      return newExpanded
    })
  }, [])

  return {
    showAddModal,
    setShowAddModal,
    openAddModal,
    closeAddModal,

    editingTask,
    showTaskEditor,
    openTaskEditor,
    closeTaskEditor,

    editingActivity,
    showActivityEditor,
    openActivityEditor,
    closeActivityEditor,

    showMobileCategorySelector,
    setShowMobileCategorySelector,

    timeModalTask,
    timeModalActivity,
    setTimeModalTask,
    setTimeModalActivity,

    showDailyModal,
    setShowDailyModal,

    energyReviewOpen,
    energyReviewEntry,
    setEnergyReviewOpen,
    setEnergyReviewEntry,

    expandedDescriptions,
    toggleDescriptionExpansion
  }
}