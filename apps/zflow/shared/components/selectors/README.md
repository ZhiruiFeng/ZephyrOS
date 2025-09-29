# Shared Selector Components

This directory contains reusable selector components for tasks, activities, and memories throughout the ZFlow application.

## Components

### Task Selectors
- **TaskSelectorModal** - Full-featured modal for task selection
- **TaskSelectorDropdown** - Compact dropdown for inline task selection
- **useTaskSelector** - Hook providing shared task selection logic

### Activity Selectors
- **ActivitySelectorModal** - Full-featured modal for activity selection
- **ActivitySelectorDropdown** - Compact dropdown for inline activity selection
- **useActivitySelector** - Hook providing shared activity selection logic

### Memory Selectors
- **MemorySelectorModal** - Full-featured modal for memory selection
- **MemorySelectorDropdown** - Compact dropdown for inline memory selection
- **useMemorySelector** - Hook providing shared memory selection logic

### Unified Timeline Item Selector
- **TimelineItemSelector** - Unified modal with tab switching between tasks, activities, and memories

## Usage Examples

### Task Selector Modal
```tsx
import { TaskSelectorModal } from '@/shared/components/selectors'

<TaskSelectorModal
  isOpen={showTaskSelector}
  onSelectTask={handleSelectTask}
  onCreateNew={handleCreateNew}
  onCancel={() => setShowTaskSelector(false)}
  title="Select a Task"
  config={{
    statuses: ['pending', 'in_progress'],
    includeSubtasks: true
  }}
/>
```

### Activity Selector Dropdown
```tsx
import { ActivitySelectorDropdown } from '@/shared/components/selectors'

<ActivitySelectorDropdown
  selectedActivityId={selectedId}
  onSelectActivity={handleSelectActivity}
  label="Choose Activity"
  config={{
    statuses: ['active', 'completed'],
    activityTypes: ['exercise', 'meditation']
  }}
/>
```

### Timeline Item Selector
```tsx
import { TimelineItemSelector } from '@/shared/components/selectors'

<TimelineItemSelector
  isOpen={showSelector}
  onSelectItem={handleSelectItem}
  onCancel={() => setShowSelector(false)}
  config={{
    enabledTypes: ['task', 'activity'], // Only tasks and activities
    taskConfig: { statuses: ['pending', 'in_progress'] },
    activityConfig: { statuses: ['active'] }
  }}
/>
```

## Configuration Options

### TaskSelectorConfig
- `statuses` - Which task statuses to include
- `limit` - Maximum number of tasks to load
- `sortBy` - Sort field ('updated_at', 'created_at', 'title')
- `sortOrder` - Sort order ('asc', 'desc')
- `includeSubtasks` - Whether to include subtasks

### ActivitySelectorConfig
- `statuses` - Which activity statuses to include
- `activityTypes` - Activity types to include
- `limit` - Maximum number of activities to load
- `sortBy` - Sort field
- `sortOrder` - Sort order

### MemorySelectorConfig
- `statuses` - Which memory statuses to include
- `memoryTypes` - Memory types to include
- `importanceLevels` - Importance levels to include
- `limit` - Maximum number of memories to load
- `sortBy` - Sort field
- `sortOrder` - Sort order
- `highlightsOnly` - Whether to show highlights only

## Features

- **Smart Context**: Automatically includes parent tasks when their children are selected
- **Hierarchical Display**: Proper indentation and grouping for subtasks
- **Real-time Search**: Search across title, description, status, and other fields
- **Consistent Styling**: Unified visual design across all selectors
- **Type Safety**: Full TypeScript support with proper interfaces
- **Configurable**: Flexible configuration options for different use cases

## Migration from Legacy Components

See `MIGRATION_GUIDE.md` for detailed migration instructions from existing task selectors.