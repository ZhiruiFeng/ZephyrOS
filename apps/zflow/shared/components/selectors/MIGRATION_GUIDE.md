# Task Selector Migration Guide

This guide shows how to migrate from the old task selector implementations to the new shared components.

## Overview

The new shared task selector provides two components:
- **TaskSelectorModal** - Full-featured modal (replaces the daily rhythm TaskSelector)
- **TaskSelectorDropdown** - Compact dropdown (inspired by AITaskEditor pattern)

Both share the same underlying logic through the `useTaskSelector` hook.

## Migration Examples

### 1. Daily Rhythm Modal → TaskSelectorModal

**Before (DailyPlanningModal.tsx):**
```tsx
import { TaskSelector } from './TaskSelector'

// In render:
{showTaskSelector && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-hidden">
      <TaskSelector
        onSelectExisting={handleSelectExistingTask}
        onCreateNew={handleCreateNewTask}
        onCancel={() => setShowTaskSelector(null)}
      />
    </div>
  </div>
)}
```

**After:**
```tsx
import { TaskSelectorModal } from '@/shared/components'

// In render:
<TaskSelectorModal
  isOpen={!!showTaskSelector}
  onSelectTask={handleSelectExistingTask}
  onCreateNew={handleCreateNewTask}
  onCancel={() => setShowTaskSelector(null)}
  title="Select a Task for Priority"
  createNewText="Create New Priority Task"
  createNewDescription="Create a new task for this priority"
/>
```

### 2. AITaskEditor → TaskSelectorDropdown

**Before (AITaskEditor.tsx):**
```tsx
// Complex dropdown implementation with manual state management
const [taskMenuOpen, setTaskMenuOpen] = useState(false)
const [taskQuery, setTaskQuery] = useState('')
// ... lots of dropdown logic

// In render:
<div ref={taskSelectRef} className="relative">
  <button /* ... complex button */ />
  {taskMenuOpen && (
    <div /* ... complex dropdown menu */ />
  )}
</div>
```

**After:**
```tsx
import { TaskSelectorDropdown } from '@/shared/components'

// In render:
<TaskSelectorDropdown
  selectedTaskId={form.task_id}
  onSelectTask={(task) => handleChange({ task_id: task?.id })}
  label="Link to Task"
  placeholder="Choose a task to assign to AI..."
  disabled={isTaskSelectDisabled}
  helperText="Only pending/in-progress tasks can be assigned to AI"
  config={{
    statuses: ['pending', 'in_progress'],
    includeSubtasks: true
  }}
/>
```

## Configuration Options

### TaskSelectorConfig
```tsx
interface TaskSelectorConfig {
  statuses?: ('pending' | 'in_progress' | 'completed' | 'cancelled')[]
  limit?: number
  sortBy?: 'updated_at' | 'created_at' | 'title'
  sortOrder?: 'asc' | 'desc'
  includeSubtasks?: boolean
}
```

### Common Configurations

**Default (Daily Rhythm style):**
```tsx
{
  statuses: ['pending', 'in_progress'],
  limit: 50,
  sortBy: 'updated_at',
  sortOrder: 'desc',
  includeSubtasks: true
}
```

**AI Task Assignment:**
```tsx
{
  statuses: ['pending', 'in_progress'],
  includeSubtasks: true,
  limit: 100
}
```

**Completed Tasks Only:**
```tsx
{
  statuses: ['completed'],
  includeSubtasks: false,
  limit: 20
}
```

## Benefits of Migration

1. **Consistency** - Unified UX across all task selection contexts
2. **Maintenance** - Single source of truth for task selection logic
3. **Features** - Built-in search, hierarchical display, status filtering
4. **Performance** - Optimized task loading and filtering
5. **Accessibility** - Proper ARIA attributes and keyboard navigation
6. **Smart Context** - Automatically includes parent tasks when their children are selected

## Smart Parent Context Feature

The new task selector automatically includes parent tasks for hierarchical context:

- When filtering for specific statuses (e.g., only `pending` tasks)
- If a subtask matches the filter but its parent doesn't
- The parent task is automatically included and marked as "(parent context)"
- Context tasks are visually distinct and non-selectable
- This maintains the hierarchical structure for better UX

**Example**: If you filter for `in_progress` tasks and find "Subtask A" under a `completed` parent task, the parent will still be shown grayed out for context.

## Implementation Notes

- The new components handle all task loading automatically
- Search functionality works across title, description, category, and status
- Subtasks are displayed with `↳` indentation
- Status and priority badges use consistent styling
- All components are fully typed with TypeScript

## File Locations

- Hook: `shared/components/selectors/useTaskSelector.ts`
- Modal: `shared/components/selectors/TaskSelectorModal.tsx`
- Dropdown: `shared/components/selectors/TaskSelectorDropdown.tsx`
- Examples: `shared/components/selectors/TaskSelectorExample.tsx`