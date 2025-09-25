'use client'

import React, { useEffect } from 'react'
import AddTaskModal from '../modals/AddTaskModal'
import { useCategories } from '../../../hooks/ui/useCategories'
import { useCreateTask } from '../../../hooks/memory/useMemories'
import { useTimer } from '../../../hooks/activities/useTimer'
import { usePrefs } from '../../../contexts/PrefsContext'
import eventBus from '../../core/events/event-bus'

/**
 * Global portal to open AddTaskModal from anywhere via event bus.
 * Listens to `zflow:addTask` and opens with optional category context.
 */
export default function AddTaskPortal() {
  const { categories } = useCategories()
  const { createTask } = useCreateTask()
  const timer = useTimer()
  const { selectedCategory } = usePrefs()
  const [open, setOpen] = React.useState(false)
  const [defaultCat, setDefaultCat] = React.useState<string | undefined>(undefined)

  useEffect(() => {
    const off = eventBus.onAddTask((detail) => {
      const categoryId = detail?.categoryId ||
        (selectedCategory !== 'all' && selectedCategory !== 'uncategorized' ? selectedCategory : undefined)
      setDefaultCat(categoryId)
      setOpen(true)
    })
    return off
  }, [selectedCategory])

  return (
    <AddTaskModal
      isOpen={open}
      onClose={() => setOpen(false)}
      onSubmit={async (payload) => {
        try {
          await createTask(payload)
          setOpen(false)
        } catch (error) {
          console.error('Failed to create task:', error)
        }
      }}
      onSubmitAndStart={async (payload) => {
        try {
          const task = await createTask(payload)
          if (task && task.id) {
            await timer.start(task.id, { autoSwitch: true })
          }
          setOpen(false)
        } catch (error) {
          console.error('Failed to create task:', error)
        }
      }}
      categories={categories}
      defaultCategoryId={defaultCat}
    />
  )
}
