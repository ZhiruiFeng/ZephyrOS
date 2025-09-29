// Example usage of the shared Task Selector components
// This file demonstrates how to use TaskSelectorModal and TaskSelectorDropdown

import React, { useState } from 'react'
import { TaskSelectorModal, TaskSelectorDropdown } from './TaskSelector'
import { TaskMemory } from '@/lib/api/api-base'

export function TaskSelectorExample() {
  const [selectedTaskId, setSelectedTaskId] = useState<string | undefined>()
  const [showModal, setShowModal] = useState(false)

  const handleTaskSelect = (task: TaskMemory | null) => {
    setSelectedTaskId(task?.id)
    console.log('Selected task:', task)
  }

  const handleCreateNewTask = () => {
    console.log('Create new task requested')
    setShowModal(false)
    // Implement your create task logic here
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-bold">Task Selector Examples</h1>

      {/* Example 1: Dropdown Selector */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Example 1: Dropdown Selector</h2>
        <p className="text-sm text-gray-600">
          Perfect for forms, modals, and inline selection. Based on the AITaskEditor pattern.
        </p>
        <TaskSelectorDropdown
          selectedTaskId={selectedTaskId}
          onSelectTask={handleTaskSelect}
          label="Select Task"
          placeholder="Choose a task to assign..."
          helperText="Only pending and in-progress tasks are shown"
          allowClear={true}
        />
      </div>

      {/* Example 2: Dropdown with Custom Config */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Example 2: Dropdown with Custom Config</h2>
        <p className="text-sm text-gray-600">
          Showing only completed tasks. Note: Parent tasks are automatically included for context
          even if they don't match the status filter.
        </p>
        <TaskSelectorDropdown
          selectedTaskId={selectedTaskId}
          onSelectTask={handleTaskSelect}
          label="Completed Tasks"
          placeholder="Choose a completed task..."
          config={{
            statuses: ['completed'],
            includeSubtasks: true,
            limit: 20
          }}
        />
      </div>

      {/* Example 3: Modal Selector */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Example 3: Modal Selector</h2>
        <p className="text-sm text-gray-600">
          Full-featured modal with search and create new option. Based on the daily rhythm pattern.
        </p>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Open Task Selector Modal
        </button>
      </div>

      {/* Selected Task Display */}
      {selectedTaskId && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="font-medium text-green-800">Selected Task ID:</h3>
          <p className="text-green-700 font-mono text-sm">{selectedTaskId}</p>
        </div>
      )}

      {/* Modal */}
      <TaskSelectorModal
        isOpen={showModal}
        onSelectTask={handleTaskSelect}
        onCreateNew={handleCreateNewTask}
        onCancel={() => setShowModal(false)}
        title="Choose a Task"
        createNewText="Create New Task"
        createNewDescription="Start with a fresh task"
      />
    </div>
  )
}

// Usage Examples for Different Contexts:

// 1. Daily Rhythm / Strategy Page
export function DailyRhythmTaskSelector() {
  const [showTaskSelector, setShowTaskSelector] = useState(false)
  const [selectedTask, setSelectedTask] = useState<TaskMemory | null>(null)

  return (
    <>
      <button onClick={() => setShowTaskSelector(true)}>
        Link Task to Priority
      </button>

      <TaskSelectorModal
        isOpen={showTaskSelector}
        onSelectTask={(task) => {
          setSelectedTask(task)
          setShowTaskSelector(false)
        }}
        onCreateNew={() => {
          // Create new task logic
          setShowTaskSelector(false)
        }}
        onCancel={() => setShowTaskSelector(false)}
        title="Select a Task for Priority"
        createNewText="Create New Priority Task"
        createNewDescription="Create a new task for this priority"
      />
    </>
  )
}

// 2. AI Task Creation Modal
export function AITaskCreationSelector() {
  const [selectedTaskId, setSelectedTaskId] = useState<string>()

  return (
    <TaskSelectorDropdown
      selectedTaskId={selectedTaskId}
      onSelectTask={(task) => setSelectedTaskId(task?.id)}
      label="Link to Task"
      placeholder="Choose a task to assign to AI..."
      disabled={false} // Set to true when editing existing AI tasks
      config={{
        statuses: ['pending', 'in_progress'],
        includeSubtasks: true
      }}
      helperText="Only pending/in-progress tasks can be assigned to AI"
    />
  )
}

// 3. Memory Focus Page Anchor
export function MemoryFocusTaskAnchor() {
  const [anchoredTask, setAnchoredTask] = useState<TaskMemory | null>(null)

  return (
    <TaskSelectorDropdown
      selectedTaskId={anchoredTask?.id}
      onSelectTask={setAnchoredTask}
      label="Anchor Current Task"
      placeholder="Select task to focus on..."
      config={{
        statuses: ['pending', 'in_progress'],
        limit: 30
      }}
    />
  )
}