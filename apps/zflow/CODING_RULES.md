# ZFlow Development Rules

This document provides essential rules and patterns for coding agents to follow when developing the ZFlow application.

## 1. API Architecture & Usage

### API Base Configuration

The application uses a unified API base configuration system:

```typescript
// Location: lib/api/api-base.ts
export const API_BASE = ZMEMORY_API_BASE  // Already includes '/api' prefix
```

**Key Points:**
- `API_BASE` equals `ZMEMORY_API_BASE` and already includes the `/api` path
- All API endpoints should be relative paths without leading `/api/`
- Use the unified `authenticatedFetch` utility for all API calls

### API Call Patterns

#### ✅ CORRECT Pattern:
```typescript
// Good: API_BASE already includes '/api'
await authenticatedFetch(`${API_BASE}/tasks`, options)
await fetch(`${API_BASE}/memories/${id}`, { headers: authHeaders })
```

#### ❌ INCORRECT Pattern:
```typescript
// Bad: Double '/api' in URL
await fetch(`${API_BASE}/api/tasks`, options)  // Results in '/api/api/tasks'
```

### API Module Structure

All API functions are organized in `/lib/api/` folder:

```
lib/api/
├── api-base.ts           # Core utilities, types, authenticatedFetch
├── categories-api.ts     # Category management
├── tasks-api.ts         # Task CRUD operations
├── time-tracking-api.ts # Timer and time entries
├── memories-api.ts      # Memory management
├── narrative-api.ts     # Seasons and episodes
├── energy-api.ts        # Energy tracking
├── ai-api.ts           # AI interactions
├── stats-api.ts        # Statistics
└── index.ts            # Main entry point with exports
```

### Adding New API Functions

When adding new API functionality:

1. **Choose the appropriate existing module** or create a new one following the pattern
2. **Import required utilities** from `api-base.ts`:
   ```typescript
   import { API_BASE, authenticatedFetch } from './api-base'
   ```

3. **Use the standard error handling pattern**:
   ```typescript
   const response = await authenticatedFetch(`${API_BASE}/endpoint`, options)
   if (!response.ok) {
     const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
     throw new Error(errorData.error || `Request failed: ${response.status}`)
   }
   ```

4. **Export from the main index.ts** to maintain backward compatibility

### Hook Patterns for API Calls

When creating hooks that make API calls:

1. **Import API_BASE** from the unified location:
   ```typescript
   import { API_BASE } from '../lib/api'
   import { authManager } from '../lib/auth-manager'
   ```

2. **Use consistent auth headers**:
   ```typescript
   const authHeaders = await authManager.getAuthHeaders()
   const response = await fetch(`${API_BASE}/endpoint`, {
     headers: { ...authHeaders }
   })
   ```

3. **Never use double `/api` paths** - this was a historical issue that caused "Failed to fetch" errors

### API Error Handling

Standard error handling pattern across all API modules:

```typescript
if (!response.ok) {
  const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
  throw new APIError(response.status, errorData.error || errorData.message || `API Error: ${response.status}`)
}
```

### Backward Compatibility

- All API changes must maintain backward compatibility
- The main `/lib/api.ts` file re-exports everything from `/lib/api/index.ts`
- Legacy import paths should continue to work: `import { tasksApi } from '../lib/api'`

### Cross-Origin Configuration

The app supports cross-origin API calls with proper configuration:

```typescript
// From api-base.ts
export const IS_CROSS_ORIGIN = IS_ZMEMORY_CROSS_ORIGIN
export const API_ORIGIN = ZMEMORY_API_ORIGIN
```

Use these constants when configuring fetch options for cross-origin scenarios.

## 2. File Organization Rules

### API Files
- Keep API modules focused on single domains (tasks, memories, etc.)
- Use consistent naming: `{domain}-api.ts`
- Export both individual functions and a domain API object
- Always export types and interfaces used by the API

### Hook Files
- Place in `/hooks/` folder with `use` prefix
- Import API_BASE from unified location
- Handle loading states and error states consistently
- Use SWR for data fetching when appropriate

### Type Definitions
- Define API request/response types in the same file as API functions
- Export types for use by components and hooks
- Use consistent naming patterns: `CreateXRequest`, `UpdateXRequest`, etc.

## 3. Authentication Patterns

All API calls must use authenticated requests:

```typescript
// For API modules
import { authenticatedFetch } from './api-base'
const response = await authenticatedFetch(url, options)

// For hooks and components
import { authManager } from '../lib/auth-manager'
const authHeaders = await authManager.getAuthHeaders()
const response = await fetch(url, { headers: { ...authHeaders } })
```

## 4. Common Mistakes to Avoid

### ❌ Double API Paths
```typescript
// Wrong - creates '/api/api/endpoint'
fetch(`${API_BASE}/api/endpoint`)
```

### ❌ Inconsistent Error Handling
```typescript
// Wrong - inconsistent error format
throw new Error(`Failed: ${response.statusText}`)

// Right - use standard pattern
const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
throw new APIError(response.status, errorData.error || 'Request failed')
```

### ❌ Missing Auth Headers
```typescript
// Wrong - unauthenticated request
fetch(`${API_BASE}/endpoint`)

// Right - authenticated request
const authHeaders = await authManager.getAuthHeaders()
fetch(`${API_BASE}/endpoint`, { headers: authHeaders })
```

## 5. Testing API Changes

When modifying APIs:

1. **Verify TypeScript compilation**: `npm run type-check`
2. **Run linting**: `npm run lint`
3. **Test in development**: Ensure no "Failed to fetch" errors
4. **Check network tab**: Verify correct URL formation (no double `/api`)
5. **Test authentication**: Ensure auth headers are properly included

## 6. Migration Guidelines

When updating existing API code:

1. **Preserve existing function signatures** for backward compatibility
2. **Update import paths** to use the new modular structure
3. **Fix URL construction** to remove double `/api` patterns
4. **Update error handling** to use consistent patterns
5. **Add proper TypeScript types** if missing

## 7. Import Path Management

ZFlow uses TypeScript path mapping to eliminate messy relative imports and improve code readability.

### **Path Aliases Configuration**

All path aliases are configured in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      // Feature modules
      "@/strategy": ["./features/strategy"],
      "@/timeline": ["./features/timeline"],
      "@/features/*": ["./features/*"],

      // Shared library
      "@/shared/*": ["./lib/shared/*"],
      "@/shared": ["./lib/shared"],

      // Core directories
      "@/lib/*": ["./lib/*"],
      "@/hooks/*": ["./hooks/*"],
      "@/components/*": ["./components/*"],
      "@/types/*": ["./types/*"],
      "@/contexts/*": ["./contexts/*"],

      // App directories
      "@/app/*": ["./app/*"]
    }
  }
}
```

### **Import Patterns**

#### ✅ **PREFERRED: Clean Path Aliases**
```typescript
// Shared utilities (PREFERRED for cross-feature utilities)
import { useTaskOperations, useCategories } from '@/shared'
import { getStatusColor, smartFormatDate } from '@/shared/utils'
import { StatusBadge, TaskCard } from '@/shared/components'

// Features
import { useStrategyDashboard, StrategyTask } from '@/strategy'
import { useTimeline } from '@/timeline'

// Core modules
import { tasksApi } from '@/lib/api/tasks-api'
import { useAuth } from '@/contexts/AuthContext'
import type { Task, TaskStatus } from '@/types/domain/task'

// Components
import { Button, Card } from '@/components/ui'
```

#### ✅ **ACCEPTABLE: Relative Paths Within Same Feature**
```typescript
// Within features/strategy/ directory
import { useStrategyTasks } from './hooks/useStrategyTasks'
import type { StrategyTask } from './types/strategy'
import { StrategyCard } from './components/StrategyCard'
```

#### ❌ **AVOID: Messy Relative Paths**
```typescript
// Bad - hard to read and maintain
import { useAuth } from '../../contexts/AuthContext'
import { tasksApi } from '../../../lib/api/tasks-api'
import type { Task } from '../../../types/domain/task'
```

### **Benefits of Path Aliases**

🎯 **Readability**: Clear, intuitive import statements
🔧 **Maintainability**: Moving files doesn't break imports
🚀 **Developer Experience**: IDE autocomplete works better
📦 **Consistency**: Same import pattern across all files
♻️ **Refactoring**: Easier to restructure code

### **Path Alias Guidelines**

1. **Use `@/` prefix** for all path aliases to distinguish from npm packages
2. **Feature shortcuts** for commonly used features (`@/strategy`, `@/timeline`)
3. **Directory mappings** for core folders (`@/lib/*`, `@/hooks/*`)
4. **Relative imports within features** are acceptable and often clearer
5. **Update tsconfig.json** when adding new major directories

## 8. Shared Utilities Library

ZFlow implements a **Shared Utilities Library** pattern to eliminate code duplication and ensure consistent implementations across features.

### **Shared Library Structure**

```
lib/shared/                  # 🎯 Cross-feature shared utilities
├── hooks/                   # Shared React hooks
│   ├── useTaskOperations.ts    # Generic task operations
│   ├── useTaskActions.ts       # Task CRUD operations
│   ├── useActivitiesShared.ts  # Activity management
│   ├── useTimerShared.ts       # Timer functionality
│   ├── useAutoSave.ts          # Auto-save logic
│   ├── useCategories.ts        # Category management
│   ├── useCelebration.ts       # UI animations
│   ├── useModalState.ts        # Modal state management
│   └── index.ts                # Barrel exports
├── utils/                   # Utility functions
│   ├── task-utils.ts           # Task helpers (getStatusColor, etc.)
│   ├── time-utils.ts           # Time formatting & calculations
│   ├── activity-utils.ts       # Activity helpers
│   ├── validation-utils.ts     # Form validation
│   └── index.ts                # Barrel exports
├── components/              # Shared UI components
│   ├── StatusBadge.tsx         # Status indicators
│   ├── TaskCard.tsx            # Basic task display
│   ├── TimerDisplay.tsx        # Timer UI component
│   └── index.ts                # Barrel exports
├── types/                   # Shared type definitions
│   ├── shared-hooks.ts         # Hook return types
│   ├── shared-tasks.ts         # Task-related types
│   ├── shared-activities.ts    # Activity types
│   └── index.ts                # Barrel exports
└── index.ts                 # Main entry point
```

### **Import Patterns for Shared Utilities**

#### ✅ **PREFERRED: Shared Library Imports**
```typescript
// Use shared utilities for cross-feature functionality
import { useTaskOperations, useCategories } from '@/shared'
import { getStatusColor, smartFormatDate } from '@/shared/utils'
import { StatusBadge, TimerDisplay } from '@/shared/components'
import type { TaskOperationsReturn } from '@/shared/types'
```

#### ✅ **ACCEPTABLE: Feature-Specific Extensions**
```typescript
// Feature-specific extensions of shared utilities
import { useFocusTaskOperations } from '@/focus'

// Using shared utilities within feature extensions
import { useTaskOperations } from '@/shared'

export function useFocusTaskOperations(props) {
  const baseOperations = useTaskOperations()

  // Add focus-specific functionality
  return {
    ...baseOperations,
    focusSpecificMethod: () => { /* ... */ }
  }
}
```

#### ❌ **AVOID: Old Hook Directory Imports**
```typescript
// Old pattern - these directories have been cleaned up
import { useTaskActions } from '@/hooks/tasks/useTaskActions'     // ❌ Removed
import { useCategories } from '@/hooks/ui/useCategories'          // ❌ Removed
import { useTimer } from '@/hooks/activities/useTimer'            // ❌ Removed
```

### **When to Use Shared vs Feature-Specific**

#### **Use Shared Library (`@/shared`) For:**
✅ **Cross-Feature Utilities**: Used by 2+ features
✅ **Core Business Logic**: Task operations, activity management
✅ **UI Patterns**: Status badges, common components
✅ **Data Formatting**: Date/time formatting, validation
✅ **State Management**: Categories, modal state

#### **Use Feature-Specific For:**
✅ **Feature Workflows**: Complex, feature-specific logic flows
✅ **Domain-Specific Types**: Feature-only interfaces
✅ **Business Rules**: Feature-specific validation or calculations
✅ **Integration Logic**: Feature-specific API orchestration

### **Migration Guidelines**

When creating new utilities:

1. **Start with Feature-Specific**: Build utilities within the feature first
2. **Identify Shared Patterns**: When 2+ features need similar functionality
3. **Extract to Shared**: Move common patterns to `@/shared`
4. **Create Extensions**: Keep feature-specific logic as extensions of shared utilities

### **Shared Library Benefits**

🎯 **Zero Duplication**: Single source of truth for common functionality
⚡ **Consistent Behavior**: All features use identical implementations
🔧 **Easier Maintenance**: Changes in one place affect all features
🧪 **Better Testing**: Shared utilities can be tested independently
♻️ **Maximum Reusability**: New features can immediately use existing utilities
🏗️ **Cleaner Architecture**: Clear separation between shared and feature-specific

---

## 9. Feature-First Architecture

ZFlow follows a **Feature-First Architecture** pattern that promotes modular, reusable, and maintainable code organization.

### Architecture Overview

```
/features/{feature-name}/     # 🎯 Self-contained feature modules
├── hooks/                   # Feature-specific business logic hooks
├── components/              # Feature UI components
├── api/                     # Feature API layer
├── types/                   # Domain types and interfaces
├── utils/                   # Feature utilities
├── mocks/                   # Test data and mock generators
├── {Feature}Page.tsx        # Main page component (if applicable)
└── index.ts                 # Public API (barrel export)

/app/{route}/                # 🚀 Minimal Next.js routes
└── page.tsx                 # Thin route controller
```

### Design Principles

#### 1. **Feature Modules are Self-Contained**
- Each feature in `/features/` should be completely independent
- Features should not import from other features directly
- All business logic, types, and utilities live within the feature
- Features can be moved, tested, or extracted without breaking other parts

#### 2. **Clean Public APIs**
Every feature must export a clean public API via `index.ts`:

```typescript
// features/strategy/index.ts
// =====================================================
// Strategy Feature - Public API
// =====================================================

// Hooks (business logic)
export { useStrategyDashboard } from './hooks/useStrategyDashboard'
export { useStrategyTasks } from './hooks/useStrategyTasks'

// API Layer
export { strategyApi } from './api/strategy-api'

// Types (domain models)
export type {
  StrategySeason,
  Initiative,
  StrategyTask
} from './types/strategy'

// Components (if reusable)
export { default as StrategyPage } from './StrategyPage'
```

#### 3. **Routes are Thin Controllers**
Next.js app router pages should be minimal and delegate to features:

```typescript
// app/strategy/page.tsx
'use client'

import { StrategyPage } from '../../features/strategy'

export default StrategyPage
```

#### 4. **Import from Features, Not Internals**
✅ **CORRECT** (using path aliases):
```typescript
import { useStrategyDashboard, StrategyTask } from '@/strategy'
import { useTimeline } from '@/hooks/timeline/useTimeline'
import { API_BASE } from '@/lib/api/api-base'
```

✅ **ACCEPTABLE** (relative paths within feature):
```typescript
// Within features/strategy/ files
import { useStrategyDashboard } from './hooks/useStrategyDashboard'
import { StrategyTask } from './types/strategy'
```

❌ **INCORRECT** (messy relative paths):
```typescript
import { useStrategyDashboard } from '../../features/strategy/hooks/useStrategyDashboard'
import { StrategyTask } from '../../../types/domain/strategy'
```

### Creating New Features

When creating a new feature, follow this step-by-step process:

#### Step 1: Create Feature Structure
```bash
mkdir -p features/my-feature/{hooks,components,api,types,utils,mocks}
```

#### Step 2: Start with Types and API
```typescript
// features/my-feature/types/my-feature.ts
export interface MyFeatureData {
  id: string
  title: string
  status: 'active' | 'inactive'
}

// features/my-feature/api/my-feature-api.ts
import { API_BASE, authenticatedFetch } from '../../../lib/api/api-base'

export async function getMyFeatureData(): Promise<MyFeatureData[]> {
  const response = await authenticatedFetch(`${API_BASE}/my-feature`)
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(errorData.error || `Failed to fetch: ${response.status}`)
  }
  return response.json()
}

export const myFeatureApi = {
  getMyFeatureData,
  // ... other API methods
}
```

#### Step 3: Create Business Logic Hooks
```typescript
// features/my-feature/hooks/useMyFeature.ts
import { useState, useEffect } from 'react'
import { myFeatureApi } from '../api/my-feature-api'
import type { MyFeatureData } from '../types/my-feature'

export function useMyFeature() {
  const [data, setData] = useState<MyFeatureData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ... hook implementation

  return { data, loading, error }
}
```

#### Step 4: Build UI Components
```typescript
// features/my-feature/components/MyFeatureCard.tsx
import type { MyFeatureData } from '../types/my-feature'

interface MyFeatureCardProps {
  data: MyFeatureData
}

export function MyFeatureCard({ data }: MyFeatureCardProps) {
  return (
    <div>
      <h3>{data.title}</h3>
      {/* Component implementation */}
    </div>
  )
}
```

#### Step 5: Create Public API
```typescript
// features/my-feature/index.ts
// Public API - only export what other parts of the app need

// Hooks
export { useMyFeature } from './hooks/useMyFeature'

// API
export { myFeatureApi } from './api/my-feature-api'

// Types
export type { MyFeatureData } from './types/my-feature'

// Components (if reusable outside the feature)
export { MyFeatureCard } from './components/MyFeatureCard'
```

#### Step 6: Create Route (if needed)
```typescript
// app/my-feature/page.tsx
'use client'

import { MyFeaturePage } from '../../features/my-feature'

export default MyFeaturePage
```

### Migration Guidelines

When migrating existing code to Feature-First Architecture:

#### Phase 1: Extract Business Logic
- Move hooks from `/hooks/` or `/lib/hooks/` to `/features/{feature}/hooks/`
- Move API functions to `/features/{feature}/api/`
- Move types to `/features/{feature}/types/`

#### Phase 2: Extract Components
- Move feature-specific components to `/features/{feature}/components/`
- Keep shared/generic components in existing locations

#### Phase 3: Create Public API
- Create `/features/{feature}/index.ts` with clean exports
- Update imports across the codebase to use feature imports

#### Phase 4: Route Modernization
- Convert app routes to use feature modules
- Remove duplicated components from app directories

### Feature Module Guidelines

#### What Goes in a Feature Module:
✅ **Include**:
- Domain-specific business logic (hooks)
- Feature-specific API calls
- Domain types and interfaces
- Feature-specific UI components
- Feature utilities and helpers
- Test mocks and generators
- Main page components (if the feature has its own route)

❌ **Don't Include**:
- Generic/shared utilities (keep in `/lib/`)
- Cross-cutting concerns (auth, routing, etc.)
- Global state management
- Third-party integrations (unless feature-specific)

#### File Naming Conventions:
- **API files**: `{domain}-api.ts` (e.g., `strategy-api.ts`)
- **Hook files**: `use{FeatureName}.ts` (e.g., `useStrategy.ts`)
- **Type files**: `{domain}.ts` (e.g., `strategy.ts`)
- **Component files**: `{ComponentName}.tsx` (PascalCase)
- **Page components**: `{Feature}Page.tsx` (e.g., `StrategyPage.tsx`)

### Testing Strategy

Features should be testable in isolation:

```typescript
// features/my-feature/__tests__/useMyFeature.test.ts
import { renderHook } from '@testing-library/react'
import { useMyFeature } from '../hooks/useMyFeature'

// Test the hook in isolation
describe('useMyFeature', () => {
  it('should fetch data successfully', () => {
    // Test implementation
  })
})
```

### Benefits of Feature-First Architecture

🎯 **Zero Duplication**: Single source of truth for each feature
⚡ **Optimal Bundle Sizes**: Features can be code-split easily
🔧 **Better Maintainability**: Changes are localized to features
🧪 **Easier Testing**: Features can be tested independently
♻️ **Maximum Reusability**: Features can be shared across routes
🏗️ **Cleaner Architecture**: Clear separation of concerns
📦 **Future-Proof**: Features can be extracted to packages if needed

### Common Patterns

#### Cross-Feature Communication:
Use shared state management or event systems rather than direct feature imports:

```typescript
// Good: Via shared context or state management
const { user } = useAuth()  // Shared auth context
const { data } = useGlobalState()  // Shared state

// Avoid: Direct feature imports
import { useOtherFeature } from '../other-feature'  // ❌
```

#### Shared Components:
Keep truly generic components outside features:

```typescript
// Generic UI components (keep in existing locations)
import { Button, Card } from '../components/ui'

// Feature-specific components (keep in feature)
import { StrategyCard } from '../features/strategy'
```

---

**Last Updated**: 2025-09-25
**Version**: 2.0

This document should be updated whenever significant changes are made to the API architecture or development patterns.