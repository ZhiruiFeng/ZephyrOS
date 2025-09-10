# Profile Modules

This directory contains all the profile modules that can be displayed on the user's profile dashboard.

## Available Modules

### MemoriesModule
- **Purpose**: Personal memory capture and timeline management
- **Location**: Migrated from standalone `/memories` page to profile module
- **Features**:
  - Timeline view of memories
  - Search functionality 
  - Collections overview with highlights and popular tags
  - Quick memory capture
  - Configurable display options

### EnergySpectrumModule
- **Purpose**: Track energy levels throughout the day
- **Features**: Visual energy spectrum with timezone support

### StatsModule  
- **Purpose**: Productivity statistics and metrics
- **Features**: Task completion rates, time tracking, goals

### ActivitySummaryModule
- **Purpose**: Recent activities and task completion summary
- **Features**: Recent tasks overview, completion tracking

### AgentDirectory
- **Purpose**: External AI agents catalog and management
- **Features**: Agent directory with orbit view option

## Module Integration

Modules are registered in `hooks/useProfileModules.ts` and rendered in `ProfileDashboard.tsx`. Each module follows the `ProfileModuleProps` interface defined in `types.ts`.

### Adding a New Module

1. Create the module component in this directory
2. Add module configuration to `AVAILABLE_MODULES` in `useProfileModules.ts`
3. Add module case to `renderModule` function in `ProfileDashboard.tsx`
4. Optionally add to `DEFAULT_ENABLED_MODULES` if it should be enabled by default

## Migration Notes

The MemoriesModule was successfully migrated from a standalone page (`/memories/page.tsx`) to a profile module on [current date]. The module retains all core functionality while being optimized for the profile dashboard layout.
