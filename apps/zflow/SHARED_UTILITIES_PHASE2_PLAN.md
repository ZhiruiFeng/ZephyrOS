# ZFlow Shared Utilities Migration - Phase 2 Plan

**Document**: Shared Utilities Migration Phase 2
**Created**: 2025-09-26
**Status**: 📋 **PLANNING**
**Previous Phase**: [Phase 1 Complete](./SHARED_UTILITIES_MIGRATION.md) - Basic hooks, components, utils migrated

---

## 🎯 **Phase 2 Objectives**

Build upon Phase 1's success by migrating the most commonly used utilities across the ZFlow codebase, with focus on:

1. **Memory-related utilities** - Heavily used across all features
2. **Time & date utilities** - Found in 55+ files
3. **Type standardization** - Eliminate duplicate type definitions
4. **UI component consolidation** - Reduce component duplication

**Expected Impact**: 30-40% reduction in utility code duplication, improved type safety, better developer experience

---

## 📊 **Migration Phases Overview**

### **Phase 2A: Memory Infrastructure** ⭐ **IMMEDIATE** (1-2 days)
- Memory hooks, API, and types
- High usage, clear boundaries
- Foundation for memory-related features

### **Phase 2B: Time & Validation Utilities** ⭐ **NEXT SPRINT** (1 day)
- Time utilities (55+ file usage)
- Validation utilities (already partially duplicated)
- Task constants and configurations

### **Phase 2C: UI Components & Types** ⭐ **FOLLOWING SPRINT** (2 days)
- Form components and display utilities
- Type definition consolidation
- Component library expansion

### **Phase 2D: Advanced Utilities** ⭐ **LATER** (1-2 days)
- Specialized hooks and patterns
- Complex state management utilities
- Feature-specific generalizations

---

## 🗂 **Phase 2A: Memory Infrastructure Migration**

### **2A.1: Memory Types & Interfaces** (30 minutes)
**Priority**: ⭐ **CRITICAL** - Required foundation

**Files to Migrate**:
```
types/domain/memory.ts → lib/shared/types/memory.ts
app/types/memory.ts → lib/shared/types/memory.ts (consolidate)
```

**Key Types**:
- `Memory`, `MemoryCreateInput`, `MemoryUpdateInput`
- `MemorySearchParams`, `MemorySearchResult`
- `MemoryAnchor`, `RelationType`, `MemoryFilters`
- `MemoryListState`, `MemoryAnchorData`

**Breaking Changes**: Update all imports from old type locations

### **2A.2: Memory API Client** (45 minutes)
**Priority**: ⭐ **HIGH** - Core API layer

**Files to Migrate**:
```
lib/api/memories-api.ts → lib/shared/api/memories.ts
```

**Included Functions**:
- Complete CRUD operations (`create`, `update`, `delete`, `search`)
- Anchor management (`getAnchors`, `addAnchor`, `deleteAnchor`)
- `useMemoryOperations()` hook wrapper

**Update Pattern**: All memory API calls to use `@/shared/api/memories`

### **2A.3: Core Memory Hooks** (60 minutes)
**Priority**: ⭐ **HIGH** - Used by 4+ features

**Files to Migrate**:
```
hooks/memory/useMemoryAnchors.ts → lib/shared/hooks/useMemoryAnchors.ts
```

**Key Hooks**:
- `useMemories()` - fetch and search memories
- `useTaskMemoryAnchors()` - get anchors for specific tasks
- `useMemoryActions()` - create/link/remove memory anchors
- `useMemorySearch()` - search and filter memories

**Features Using**: Work mode, narrative, task management, focus features

### **2A.4: Memory UI Components** (60 minutes)
**Priority**: ⭐ **HIGH** - Widely used UI elements

**Files to Migrate**:
```
app/components/memory/RelationTypeBadge.tsx → lib/shared/components/RelationTypeBadge.tsx
app/components/memory/MemoryCard.tsx → lib/shared/components/MemoryCard.tsx
app/components/memory/MemoryAnchorButton.tsx → lib/shared/components/MemoryAnchorButton.tsx
```

**Components Include**:
- Relation type configuration and styling
- Memory display card with time formatting
- Standardized anchor button with count badge

---

## 🗂 **Phase 2B: Time & Validation Utilities**

### **2B.1: Time Utilities Consolidation** (45 minutes)
**Priority**: ⭐ **CRITICAL** - Used in 55+ files

**Current Duplication**:
```
app/utils/timeUtils.ts (primary)
lib/shared/utils/time-utils.ts (partial duplicate)
```

**Consolidation Strategy**:
1. Merge both into enhanced `lib/shared/utils/time-utils.ts`
2. Add missing functions from `timeUtils.ts`:
   - `toLocal()`, `formatRelative()`, `smartFormatDate()`
   - `isOverdue()`, `isToday()`, `isThisWeek()`
   - `formatDuration()`, `getUserTimezone()`

**Update Pattern**: All files to use `@/shared/utils/time-utils`

### **2B.2: Advanced Time Utilities** (30 minutes)
**Priority**: ⭐ **MEDIUM** - Specialized but reusable

**Files to Migrate**:
```
app/utils/timezoneUtils.ts → lib/shared/utils/timezone-utils.ts
app/utils/crossDayUtils.ts → lib/shared/utils/cross-day-utils.ts
```

**Key Functions**:
- Timezone handling and validation
- Cross-day time entry processing
- Day boundary calculations

### **2B.3: Validation Utilities Enhancement** (30 minutes)
**Priority**: ⭐ **HIGH** - Already partially duplicated

**Current State**:
```
app/utils/validation.ts (complete)
lib/shared/utils/validation-utils.ts (partial)
```

**Enhancement Strategy**:
1. Add missing functions to shared version:
   - `validateTask()`, `validateTaskTitle()`, `validateTaskDescription()`
   - `validateDueDate()`, `validateProgress()`
   - `validateColorHex()`, `validateCategoryName()`

**Update Pattern**: Replace all imports with `@/shared/utils/validation-utils`

### **2B.4: Task Utilities Consolidation** (30 minutes)
**Priority**: ⭐ **HIGH** - Already partially duplicated

**Current State**:
```
app/utils/taskUtils.ts (complete)
lib/shared/utils/task-utils.ts (partial)
```

**Enhancement Strategy**:
1. Add missing functions from app version:
   - `getStatusColor()`, `getPriorityColor()` - Enhanced styling
   - `getTaskDisplayDate()`, `shouldShowOverdue()` - Display logic
   - `processTags()`, `parseTagsString()`, `formatTagsString()` - Tag handling

### **2B.5: Task Constants Migration** (15 minutes)
**Priority**: ⭐ **HIGH** - Prevent inconsistencies

**Files to Migrate**:
```
app/core/constants/task.ts → lib/shared/constants/task.ts
```

**Constants Include**:
- `TASK_STATUS`, `TASK_PRIORITY` enums
- `STATUS_COLORS`, `PRIORITY_COLORS` styling
- `TASK_STATUS_OPTIONS`, `TASK_PRIORITY_OPTIONS` UI options
- `DEFAULT_TASK` configuration

---

## 🗂 **Phase 2C: UI Components & Types**

### **2C.1: Form Type Definitions** (30 minutes)
**Priority**: ⭐ **HIGH** - Type standardization

**Files to Migrate**:
```
types/ui/forms.ts → lib/shared/types/forms.ts
types/ui/hooks.ts → lib/shared/types/hooks.ts
types/shared/common.ts → lib/shared/types/common.ts
```

**Key Types**:
- `TaskForm`, `MemoryForm`, `ActivityForm`
- Standardized hook return types
- `ApiResponse`, `PaginatedResponse`, `LoadingState`

### **2C.2: Reusable Form Components** (60 minutes)
**Priority**: ⭐ **MEDIUM** - UI consistency

**Components to Create/Migrate**:
```
lib/shared/components/FloatingAddButton.tsx
lib/shared/components/DateSelector.tsx
lib/shared/components/PriorityBadge.tsx
lib/shared/components/ProgressIndicator.tsx
```

**Features**: Keyboard shortcuts, internationalization, consistent styling

### **2C.3: Display Utility Components** (45 minutes)
**Priority**: ⭐ **MEDIUM** - Reduce component duplication

**Components to Enhance**:
- Expand existing `StatusBadge` component
- Add priority and category display components
- Create standardized loading and error components

---

## 🗂 **Phase 2D: Advanced Utilities**

### **2D.1: Episode Anchor Patterns** (60 minutes)
**Priority**: ⭐ **LOW** - Specialized but reusable

**Files to Migrate**:
```
hooks/memory/useEpisodeMemoryAnchors.ts → lib/shared/hooks/useGenericAnchors.ts
hooks/memory/useEpisodeAnchors.ts → (merge into useGenericAnchors)
```

**Generalization Strategy**:
- Create generic anchor pattern for any entity type
- Support task anchors, episode anchors, future entity types
- Maintain backward compatibility

### **2D.2: Memory Data Transformers** (45 minutes)
**Priority**: ⭐ **LOW** - Advanced analysis patterns

**Source**: `features/strategy/utils/strategy.ts`
**Target**: `lib/shared/utils/memory-analysis.ts`

**Functions to Extract**:
- `adaptMemoryToStrategy()` → `transformMemoryForFeature()`
- `extractStrategyType()` → `analyzeMemoryType()`
- `extractImpactLevel()` → `calculateMemoryImportance()`
- `determineIfActionable()` → `checkMemoryActionable()`

### **2D.3: Error Handling Utilities** (30 minutes)
**Priority**: ⭐ **LOW** - Low current usage

**Files to Consider**:
```
app/utils/errorHandling.ts → lib/shared/utils/error-handling.ts
```

**Include**: Centralized error handling, user notifications, confirmation dialogs

---

## 📋 **Implementation Strategy**

### **Development Workflow**
1. **Analysis Phase** (30 min) - Understand current usage patterns
2. **Migration Phase** (time varies) - Move files to shared library
3. **Update Phase** (30-60 min) - Update all import statements
4. **Testing Phase** (15-30 min) - Verify no regressions
5. **Cleanup Phase** (15 min) - Remove duplicate files

### **Quality Gates**
Each sub-phase must pass:
- ✅ TypeScript compilation (`npx tsc --noEmit`)
- ✅ ESLint validation (`npm run lint`)
- ✅ Build success (`npm run build`)
- ✅ No UI functionality regression
- ✅ All imports resolve correctly

### **Breaking Changes Strategy**
- Use path aliases to minimize import changes
- Maintain backward compatibility where possible
- Update documentation with new import patterns
- Provide clear migration guide for each phase

---

## 📈 **Expected Outcomes**

### **Code Quality Improvements**
- **30-40% reduction** in utility code duplication
- **Standardized memory operations** across all features
- **Consistent time formatting** throughout application
- **Type safety improvements** with consolidated definitions

### **Developer Experience**
- **Simplified imports** for commonly used utilities
- **Better IDE autocomplete** with centralized definitions
- **Reduced learning curve** for new developers
- **Clearer separation** of concerns

### **Maintenance Benefits**
- **Single source of truth** for utility functions
- **Easier testing** and validation of shared logic
- **Consistent behavior** across features
- **Simplified refactoring** of common patterns

---

## 🚧 **Risk Mitigation**

### **Technical Risks**
- **Import path updates** - Use search/replace with verification
- **Type definition conflicts** - Careful merge of duplicate types
- **Component API changes** - Maintain existing prop interfaces

### **Mitigation Strategies**
- **Incremental migration** - One sub-phase at a time
- **Comprehensive testing** - Verify each feature after changes
- **Rollback plan** - Git branches for easy reversion
- **Documentation** - Clear migration guides and examples

---

## 🎯 **Success Criteria**

### **Phase 2A Success**
- ✅ All memory-related utilities consolidated in `@/shared`
- ✅ Memory operations work consistently across features
- ✅ Zero duplicate memory code remaining

### **Phase 2B Success**
- ✅ Time utilities used consistently across 55+ files
- ✅ Task and validation utilities fully consolidated
- ✅ All task constants centralized

### **Phase 2C Success**
- ✅ Form components available for reuse
- ✅ Type definitions standardized and shared
- ✅ UI component library expanded

### **Phase 2D Success**
- ✅ Advanced patterns generalized for reuse
- ✅ Memory analysis utilities extracted
- ✅ Error handling consolidated

---

## 📚 **Resources & References**

### **Documentation Updates Needed**
- Update `CODING_RULES.md` with new import patterns
- Create shared library usage guide
- Document memory operation best practices
- Add component library examples

### **Related Files**
- [Phase 1 Migration](./SHARED_UTILITIES_MIGRATION.md) - Completed basic migration
- [Architecture Roadmap](./ARCHITECTURE_ROADMAP.md) - Overall architecture plan
- [Coding Rules](./CODING_RULES.md) - Development guidelines

---

**Last Updated**: 2025-09-26 18:30
**Next Review**: After Phase 2A completion
**Owner**: Development Team