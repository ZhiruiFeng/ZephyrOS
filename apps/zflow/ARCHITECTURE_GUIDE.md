# ZFlow Architecture Guide

**Version**: 2.1  
**Last Updated**: September 2025  
**Status**: Production Ready 🚀  

---

## 🎯 **Architecture Overview**

ZFlow is built using a **Feature-First Architecture** pattern that promotes maintainability, scalability, and clear separation of concerns. This guide serves as the definitive reference for development patterns and project structure.

### **Core Principles**
- ✅ **Feature Isolation**: Each feature is self-contained with its own components, hooks, and types
- ✅ **Shared Components**: Cross-feature UI components live in `/shared`
- ✅ **Type Safety**: 100% TypeScript with strict compilation
- ✅ **Import Consistency**: All imports use absolute paths with `@/` aliases
- ✅ **Performance**: Lazy loading and code splitting throughout

---

## 🏗️ **Project Structure**

```
apps/zflow/
├── app/                          # Next.js App Router
│   ├── (routes)/                 # Page components
│   └── layout.tsx               # Root layout
│
├── features/                     # 🎯 FEATURE-FIRST ARCHITECTURE
│   ├── tasks/                   # Task management
│   │   ├── components/          # Task UI components
│   │   ├── hooks/              # Task data hooks
│   │   ├── api/                # Task API layer
│   │   ├── types/              # Task type definitions
│   │   └── index.ts            # Public API
│   │
│   ├── memory/                  # Memory & relationship management
│   │   ├── components/          # Memory UI (MemoryCard, MemoryAnchorCard)
│   │   ├── hooks/              # Memory hooks & narrative themes
│   │   └── index.ts            # Public API
│   │
│   ├── narrative/               # Narrative system (seasons, episodes)
│   │   ├── components/          # Season/Episode UI
│   │   ├── hooks/              # Narrative hooks
│   │   └── index.ts            # Public API
│   │
│   ├── profile/                 # User profile & modules
│   │   ├── components/          # Profile dashboard & modules
│   │   │   └── modules/        # Profile module components
│   │   ├── hooks/              # Profile data hooks
│   │   └── index.ts            # Public API
│   │
│   ├── focus/                   # Focus work modes
│   │   ├── components/          # Work mode UI
│   │   ├── hooks/              # Focus-specific hooks
│   │   └── index.ts            # Public API
│   │
│   ├── activities/              # Activity tracking
│   │   ├── components/          # Activity UI
│   │   ├── hooks/              # Activity hooks
│   │   └── index.ts            # Public API
│   │
│   ├── kanban/                  # Kanban board
│   │   ├── components/          # Kanban UI
│   │   ├── hooks/              # Kanban hooks
│   │   └── index.ts            # Public API
│   │
│   ├── strategy/                # Strategic planning
│   │   ├── components/          # Strategy UI
│   │   ├── hooks/              # Strategy hooks
│   │   └── index.ts            # Public API
│   │
│   ├── speech/                  # Speech & AI integration
│   │   ├── components/          # Speech UI
│   │   ├── hooks/              # Speech hooks
│   │   └── index.ts            # Public API
│   │
│   ├── agents/                  # AI agents
│   │   ├── components/          # Agent UI
│   │   ├── hooks/              # Agent hooks
│   │   └── index.ts            # Public API
│   │
│   └── timeline/                # Timeline view
│       ├── components/          # Timeline UI
│       ├── hooks/              # Timeline hooks
│       └── index.ts            # Public API
│
├── shared/                      # 🔄 CROSS-FEATURE UTILITIES
│   ├── components/              # Shared UI components (categorized)
│   │   ├── ui/                 # Basic UI components
│   │   │   ├── StatusBadge.tsx # Task status display
│   │   │   ├── TaskCard.tsx    # Generic task card
│   │   │   ├── TimerDisplay.tsx # Timer component
│   │   │   └── index.ts        # UI exports
│   │   ├── layout/             # Layout components
│   │   │   ├── DynamicHead.tsx # Dynamic page head
│   │   │   ├── FloatingAddButton.tsx # Floating action button
│   │   │   └── index.ts        # Layout exports
│   │   ├── forms/              # Form components
│   │   │   ├── DateSelector.tsx # Date selection
│   │   │   ├── FilterControls.tsx # Filter controls
│   │   │   └── index.ts        # Form exports
│   │   ├── data-display/       # Data visualization
│   │   │   ├── StatisticsCards.tsx # Statistics cards
│   │   │   ├── TimelineStats.tsx # Timeline stats
│   │   │   └── index.ts        # Data display exports
│   │   ├── feedback/           # User feedback
│   │   │   ├── CelebrationAnimation.tsx # Animations
│   │   │   └── index.ts        # Feedback exports
│   │   ├── portals/            # Global portals
│   │   │   ├── AddTaskPortal.tsx # Task creation portal
│   │   │   └── index.ts        # Portal exports
│   │   ├── auth/               # Authentication components
│   │   ├── editors/            # Editor components
│   │   ├── modals/             # Modal components
│   │   ├── navigation/         # Navigation components
│   │   ├── selectors/          # Selector components
│   │   └── index.ts            # Main barrel export
│   ├── utils/                  # Shared utility functions
│   │   ├── task-utils.ts       # Task utilities
│   │   ├── time-utils.ts       # Time/date utilities
│   │   ├── validation-utils.ts # Form validation
│   │   ├── crossDayUtils.ts    # Cross-day time entries
│   │   ├── errorHandling.ts    # Error handling
│   │   ├── timezoneUtils.ts    # Timezone utilities
│   │   ├── activity-utils.ts   # Activity utilities
│   │   ├── redis.ts            # Redis utilities (server-only)
│   │   └── index.ts            # Main barrel export (excludes redis.ts)
│   └── index.ts                # Public API
│
├── hooks/                       # 🌐 CROSS-CUTTING HOOKS
│   ├── useTaskOperations.ts     # Generic task operations
│   ├── useTaskActions.ts        # Task action handlers
│   ├── useCategories.ts         # Category management
│   ├── useTimer.ts             # Timer functionality
│   └── index.ts                # Public API
│
├── lib/                         # Core libraries
│   ├── api/                    # API client
│   ├── auth-manager.ts         # Authentication
│   └── swr-config.ts          # Data fetching config
│
├── types/                       # Global type definitions
│   ├── domain/                 # Domain models
│   └── ui/                     # UI-specific types
│
└── contexts/                    # React contexts
    ├── AuthContext.tsx         # Authentication state
    └── LanguageContext.tsx     # Internationalization
```

---

## 🎨 **Component Architecture**

### **Component Categories**

1. **Feature Components** (`features/*/components/`)
   - Feature-specific UI components
   - Should only be used within their feature
   - Can import from `shared/` but not other features

2. **Shared Components** (`shared/components/`)
   - Reusable across multiple features
   - Generic, configurable components
   - No feature-specific logic
   - **Organized by category** for better discoverability

3. **Legacy Components** (`app/components/`)
   - **DEPRECATED**: Being phased out
   - Do not add new components here
   - Migrate existing components to appropriate features

### **Shared Component Categories**

| Category | Purpose | Key Components |
|----------|---------|----------------|
| **UI** | Basic UI elements | `StatusBadge`, `TaskCard`, `TimerDisplay` |
| **Layout** | Layout and positioning | `DynamicHead`, `FloatingAddButton` |
| **Forms** | Input and form controls | `DateSelector`, `FilterControls` |
| **Data Display** | Statistics and visualization | `StatisticsCards`, `TimelineStats` |
| **Feedback** | User feedback and animations | `CelebrationAnimation` |
| **Portals** | Global portals and overlays | `AddTaskPortal` |
| **Auth** | Authentication components | `AuthButton`, `LoginPage` |
| **Editors** | Rich text editors | `NotionEditor`, `TimeCell` |
| **Modals** | Modal dialogs | `FullscreenModal` |
| **Navigation** | Navigation components | `NavBar`, `Footer`, `MobileBottomNav` |
| **Selectors** | Selection components | `CategorySelector`, `LanguageSelector` |

### **Component Import Patterns**

```typescript
// ✅ Recommended: Use main barrel export
import { TaskCard, StatusBadge, DateSelector } from '@/shared/components'

// ✅ Alternative: Import from specific categories
import { TaskCard } from '@/shared/components/ui'
import { DateSelector } from '@/shared/components/forms'

// ❌ Avoid: Direct file imports (breaks encapsulation)
import TaskCard from '@/shared/components/ui/TaskCard'
```

---

## 🛠️ **Shared Utilities Architecture**

The `shared/utils/` directory provides client-safe utility functions organized by domain:

### **Utility Categories**

| Utility | Purpose | Client-Safe |
|---------|---------|-------------|
| `task-utils.ts` | Task-related utilities (status colors, formatting) | ✅ |
| `time-utils.ts` | Time and date utilities (formatting, timezone conversion) | ✅ |
| `validation-utils.ts` | Form validation utilities | ✅ |
| `crossDayUtils.ts` | Cross-day time entry processing | ✅ |
| `errorHandling.ts` | Error handling and user feedback | ✅ |
| `timezoneUtils.ts` | Advanced timezone handling | ✅ |
| `activity-utils.ts` | Activity-related utilities | ✅ |
| `redis.ts` | Redis client utilities | ❌ (Server-only) |

### **Import Patterns**

```typescript
// ✅ Client-side: Use main barrel export (excludes redis.ts)
import { formatDate, toLocal, getStatusColor } from '@/shared/utils'

// ✅ Server-side: Direct import for Redis utilities
import { getRedisClient } from '@/shared/utils/redis'

// ❌ Never: Import redis.ts in client code
import { getRedisClient } from '@/shared/utils' // This won't work
```

### **Build Safety**

- `redis.ts` is excluded from the main `index.ts` export
- This prevents Node.js modules (`dns`, `net`, `tls`) from being bundled in client code
- Build process automatically excludes server-only utilities from client bundles

---

## 🚀 **Recent Architecture Improvements**

### **December 2024 Refactoring**

**Component Consolidation:**
- ✅ Moved `app/speech/components/` → `features/speech/components/`
- ✅ Organized shared components into logical categories
- ✅ Eliminated scattered component files

**Utility Consolidation:**
- ✅ Merged duplicate utilities from `app/utils/` into `shared/utils/`
- ✅ Eliminated code duplication between utility directories
- ✅ Improved build performance by preventing Node.js modules in client bundles

**Benefits:**
- 🎯 **Better Organization**: Components grouped by purpose and usage
- 🚀 **Improved Performance**: Cleaner build process with proper module separation
- 🔧 **Easier Maintenance**: Single source of truth for utilities
- 📦 **Better Discoverability**: Categorized components are easier to find
- 🛡️ **Type Safety**: Maintained 100% TypeScript compatibility

**Migration Notes:**
- All existing imports continue to work through barrel exports
- No breaking changes to public APIs
- Build process now properly handles client/server module separation

---

## 🔗 **Hooks Architecture**

### **Hook Categories**

1. **Feature Hooks** (`features/*/hooks/`)
   - Feature-specific data and logic
   - Example: `useTasks`, `useMemories`, `useNarrative`

2. **Cross-Cutting Hooks** (`hooks/`)
   - Shared across multiple features
   - Example: `useTimer`, `useCategories`, `useTaskOperations`

### **Key Hooks by Feature**

| Feature | Key Hooks | Purpose |
|---------|-----------|---------|
| **tasks** | `useTasks`, `useCreateTask`, `useUpdateTask` | Task CRUD operations |
| **memory** | `useMemories`, `useMemoryAnchors`, `useNarrativeTheme` | Memory management |
| **narrative** | `useSeasons`, `useEpisodes` | Narrative system |
| **profile** | `useProfileModules` | Profile configuration |
| **activities** | `useActivities`, `useActivityActions` | Activity tracking |

---

## 📦 **Import Patterns**

### **✅ Correct Import Patterns**

```typescript
// Feature-to-feature imports (via public API)
import { useTasks } from '@/features/tasks'
import { useMemories } from '@/features/memory'

// Shared component imports (categorized)
import { StatusBadge, TaskCard, DateSelector } from '@/shared/components'
// Or import from specific categories:
import { TaskCard } from '@/shared/components/ui'
import { DateSelector } from '@/shared/components/forms'

// Shared utility imports (client-safe)
import { formatDate, toLocal, getStatusColor } from '@/shared/utils'

// Cross-cutting hooks
import { useTimer, useCategories } from '@/hooks'

// Internal feature imports (within the same feature)
import { TaskForm } from './components/TaskForm'
import { useTaskFiltering } from './hooks/useTaskFiltering'
```

### **❌ Deprecated Patterns**

```typescript
// DON'T: Relative imports
import TaskForm from '../../../components/TaskForm'

// DON'T: Direct feature internals
import { TaskForm } from '@/features/tasks/components/TaskForm'

// DON'T: Legacy app/components
import { OldComponent } from '@/app/components/OldComponent'

// DON'T: Direct component file imports (breaks encapsulation)
import TaskCard from '@/shared/components/ui/TaskCard'

// DON'T: Import server-only utilities in client code
import { getRedisClient } from '@/shared/utils' // This won't work
```

---

## 🚀 **Performance Optimizations**

### **Lazy Loading**
- All heavy components are lazy-loaded using `React.lazy()`
- Route-level code splitting implemented
- Feature-level code splitting for large features

### **Bundle Optimization**
- **44% bundle size reduction** achieved through:
  - Tree shaking optimization
  - Proper component exports
  - Lazy loading implementation
  - Shared component consolidation

### **Memory Management**
- Memoization for expensive computations
- Proper cleanup in useEffect hooks
- Optimized re-renders through React.memo

---

## 🛠️ **Development Guidelines**

### **Adding New Features**

1. **Create Feature Directory**
   ```
   features/new-feature/
   ├── components/
   ├── hooks/
   ├── api/
   ├── types/
   └── index.ts
   ```

2. **Implement Public API** (`index.ts`)
   ```typescript
   // Export only what other features need
   export { NewFeatureComponent } from './components/NewFeatureComponent'
   export { useNewFeature } from './hooks/useNewFeature'
   export type { NewFeatureData } from './types'
   ```

3. **Add Route** (if needed)
   ```typescript
   // app/new-feature/page.tsx
   import { NewFeaturePage } from '@/features/new-feature'
   export default NewFeaturePage
   ```

### **Modifying Existing Features**

1. **Understand Feature Boundaries**
   - Each feature should be self-contained
   - Cross-feature dependencies go through public APIs

2. **Follow Import Patterns**
   - Use absolute imports with `@/` aliases
   - Import from feature public APIs, not internals

3. **Maintain Type Safety**
   - All new code must be TypeScript
   - Strict type checking enabled

### **Testing Strategy**

1. **Unit Tests**: Test individual components and hooks
2. **Integration Tests**: Test feature interactions
3. **E2E Tests**: Test complete user workflows

---

## 📊 **Migration Status**

### **✅ Completed Phases**
- **Phase 1**: Critical Architecture Cleanup (100%)
- **Phase 2**: Infrastructure Consolidation (100%)
- **Phase 3**: Performance Enhancement (100%)
- **Phase 8**: Migration Completion (100%)
- **Phase 9**: Advanced Architecture Optimization (100%)

### **🎯 Architecture Goals Achieved**
- ✅ **100% Feature Isolation**: All components properly organized
- ✅ **Zero Legacy Dependencies**: Complete migration to Feature-First
- ✅ **Consistent Import Patterns**: All absolute imports with `@/` aliases
- ✅ **44% Bundle Size Reduction**: Through optimization and lazy loading
- ✅ **100% TypeScript Compliance**: Strict type checking enabled
- ✅ **Production Ready**: Zero compilation errors, stable builds

---

## 🔧 **Build & Development**

### **Key Commands**
```bash
# Development
npm run dev

# Build (production)
npm run build

# Type checking
npm run type-check

# Linting
npm run lint
```

### **Build Optimization**
- **SSR Support**: All pages build successfully
- **Code Splitting**: Automatic route and component level splitting
- **Tree Shaking**: Unused code eliminated
- **Bundle Analysis**: Regular bundle size monitoring

---

## 📚 **Additional Resources**

### **Related Documentation**
- `CODING_RULES.md` - Development standards and practices
- `README.md` - Project setup and configuration
- Feature-specific documentation in each feature directory

### **Architecture Decisions**
- **Feature-First**: Chosen for scalability and maintainability
- **TypeScript**: Strict mode for type safety
- **Next.js**: App Router for modern React patterns
- **SWR**: Data fetching and caching
- **Tailwind**: Utility-first CSS framework

### **Future Considerations**
- **Micro-frontends**: Potential evolution for larger teams
- **Module Federation**: For independent feature deployment
- **Advanced Caching**: Further performance optimizations

---

**This architecture guide serves as the single source of truth for ZFlow's structure and development patterns. All new development should follow these established patterns to maintain consistency and quality.**
