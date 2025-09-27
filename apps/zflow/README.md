# 🚀 ZFlow - Modern Task Management System

> A powerful, modular task management application built with Next.js, featuring a clean component architecture and comprehensive functionality.

[![Next.js](https://img.shields.io/badge/Next.js-15.4.6-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC)](https://tailwindcss.com/)

## ✨ Features

- **🎯 Task Management**: Create, edit, and organize tasks with priorities and categories
- **📊 Activity Tracking**: Monitor life activities with time tracking and energy review
- **🔄 Real-time Updates**: Live synchronization across all views
- **📱 Responsive Design**: Seamless experience on desktop and mobile
- **🌐 Multi-language**: Built-in internationalization support
- **⚡ Performance**: Optimized with modern React patterns and custom hooks
- **🎨 Modern UI**: Clean, accessible interface with Tailwind CSS

## 🏗️ Architecture Overview

ZFlow features a **Feature-First Architecture** with organized shared components designed for scalability and maintainability:

```
📁 apps/zflow/
├── 📁 app/                     # Next.js App Router
│   ├── 📁 (routes)/           # Page components
│   └── layout.tsx             # Root layout
│
├── 📁 features/               # 🎯 FEATURE-FIRST ARCHITECTURE
│   ├── 📁 tasks/             # Task management
│   ├── 📁 memory/            # Memory & relationships
│   ├── 📁 narrative/         # Narrative system
│   ├── 📁 profile/           # User profile & modules
│   ├── 📁 focus/             # Focus work modes
│   ├── 📁 activities/        # Activity tracking
│   ├── 📁 kanban/            # Kanban board
│   ├── 📁 strategy/          # Strategic planning
│   ├── 📁 speech/            # Speech & AI integration
│   ├── 📁 agents/            # AI agents
│   └── 📁 timeline/          # Timeline view
│
├── 📁 shared/                 # 🔄 CROSS-FEATURE UTILITIES
│   ├── 📁 components/        # Shared UI components (categorized)
│   │   ├── 📁 ui/           # Basic UI components
│   │   ├── 📁 layout/       # Layout components
│   │   ├── 📁 forms/        # Form components
│   │   ├── 📁 data-display/ # Data visualization
│   │   ├── 📁 feedback/     # User feedback
│   │   ├── 📁 portals/      # Global portals
│   │   ├── 📁 auth/         # Authentication
│   │   ├── 📁 editors/      # Rich text editors
│   │   ├── 📁 modals/       # Modal dialogs
│   │   ├── 📁 navigation/   # Navigation
│   │   ├── 📁 selectors/    # Selectors
│   │   └── index.ts         # Main barrel export
│   ├── 📁 utils/            # Shared utility functions
│   │   ├── task-utils.ts    # Task utilities
│   │   ├── time-utils.ts    # Time/date utilities
│   │   ├── validation-utils.ts # Form validation
│   │   ├── crossDayUtils.ts # Cross-day time entries
│   │   ├── errorHandling.ts # Error handling
│   │   ├── timezoneUtils.ts # Timezone utilities
│   │   ├── activity-utils.ts # Activity utilities
│   │   ├── redis.ts         # Redis utilities (server-only)
│   │   └── index.ts         # Main barrel export
│   └── index.ts             # Public API
│
├── 📁 hooks/                 # 🌐 CROSS-CUTTING HOOKS
├── 📁 lib/                  # Core libraries
├── 📁 types/                # Global type definitions
└── 📁 contexts/             # React contexts
```

## 📦 Component Architecture

### 🎯 Feature-First Organization

Each feature is self-contained with its own components, hooks, and types:

```
features/tasks/
├── components/          # Task-specific UI components
├── hooks/              # Task data and operations
├── api/                # Task API layer
├── types/              # Task type definitions
└── index.ts            # Public API
```

### 🔧 Shared Component Categories

#### **UI Components (`/ui`)**
- `StatusBadge` - Task status and priority badges
- `TaskCard` - Generic task display component
- `TimerDisplay` - Timer UI component

#### **Layout Components (`/layout`)**
- `DynamicHead` - Dynamic page head component
- `FloatingAddButton` - Floating action button

#### **Form Components (`/forms`)**
- `DateSelector` - Date selection component
- `FilterControls` - Search and filtering controls

#### **Data Display (`/data-display`)**
- `StatisticsCards` - Dashboard statistics
- `TimelineStats` - Timeline statistics component

#### **Feedback (`/feedback`)**
- `CelebrationAnimation` - User feedback animations

#### **Portals (`/portals`)**
- `AddTaskPortal` - Global task creation portal

#### **Authentication (`/auth`)**
- `LoginPage` - OAuth authentication interface
- `AuthButton` - Sign in/out functionality

#### **Editors (`/editors`)**
- `NotionEditor` - Rich text editor
- `TimeCell` - Time input component

#### **Modals (`/modals`)**
- `FullscreenModal` - Full-screen modal dialogs

#### **Navigation (`/navigation`)**
- `NavBar` - Main navigation bar
- `CategorySidebar` - Category filtering
- `MobileBottomNav` - Mobile navigation
- `Footer` - Page footer

#### **Selectors (`/selectors`)**
- `CategorySelector` - Category picker
- `LanguageSelector` - Language switcher

### 📋 Import Patterns

**✅ Recommended: Main Barrel Export**
```typescript
// Import from shared components
import { TaskCard, StatusBadge, DateSelector } from '@/shared/components'

// Import from shared utilities
import { formatDate, toLocal, getStatusColor } from '@/shared/utils'

// Import from features
import { useTasks } from '@/features/tasks'
import { useMemories } from '@/features/memory'
```

**✅ Alternative: Category-Specific Imports**
```typescript
// Import from specific categories
import { TaskCard } from '@/shared/components/ui'
import { DateSelector } from '@/shared/components/forms'
import { StatisticsCards } from '@/shared/components/data-display'
```

**❌ Avoid: Direct File Imports**
```typescript
// Don't import directly from files (breaks encapsulation)
import TaskCard from '@/shared/components/ui/TaskCard'
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account (for backend)

### Installation

1. **Clone & Install**
   ```bash
   git clone <repository-url>
   cd ZephyrOS/apps/zflow
   npm install
   ```

2. **Environment Setup**
   ```bash
   cp .env.example .env.local
   # Configure your Supabase credentials
   ```

3. **Development Server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000)

4. **Build for Production**
   ```bash
   npm run build
   npm start
   ```

## 🎯 Core Functionality

### Task Management
- ✅ Create, edit, delete tasks
- 🏷️ Categorize with color-coded labels
- ⭐ Priority levels (Low, Medium, High, Urgent)
- 📅 Due date tracking with overdue alerts
- 🔄 Status management (Pending, In Progress, Completed, On Hold)
- 📝 Rich descriptions and notes
- 🏗️ Subtask relationships

### Activity Tracking
- 🏃‍♂️ Life activity monitoring (Exercise, Reading, Social, etc.)
- ⏱️ Integrated timer functionality
- 💪 Energy level tracking and review
- 📊 Time analytics and insights

### Views & Organization
- **Current**: Active tasks + recent completions (24h)
- **Future**: Backlog and on-hold items
- **Archive**: Historical tasks with date grouping
- **Activities**: Life activity tracking

### Smart Features
- 🔍 Real-time search across all content
- 🎯 Priority-based filtering
- 📊 Task statistics and progress tracking
- 📱 Mobile-optimized interface
- 🌐 Multi-language support (i18n ready)
- ⏰ Timer integration with task switching

## 🛠️ Development Guidelines

### Adding New Components

1. **Choose the Right Location**
   ```bash
   # Feature-specific components
   features/tasks/components/NewTaskComponent.tsx
   
   # Shared UI components
   shared/components/ui/NewUIComponent.tsx
   
   # Shared form components
   shared/components/forms/NewFormComponent.tsx
   ```

2. **Update Index Files**
   ```typescript
   // shared/components/ui/index.ts
   export { NewUIComponent } from './NewUIComponent'
   
   // shared/components/index.ts (main barrel export)
   export * from './ui'
   ```

3. **Follow Naming Conventions**
   - PascalCase for component files
   - Descriptive, purpose-driven names
   - Include TypeScript interfaces
   - Use barrel exports for clean imports

### 🚀 Recent Architecture Improvements

**December 2024 Refactoring:**

- ✅ **Component Consolidation**: Moved scattered components to feature-based organization
- ✅ **Utility Consolidation**: Merged duplicate utilities and eliminated code duplication
- ✅ **Categorized Components**: Organized shared components into logical categories
- ✅ **Build Optimization**: Improved build performance with proper client/server separation
- ✅ **Better Discoverability**: Components are now easier to find and use

**Key Benefits:**
- 🎯 **Feature Isolation**: Each feature is self-contained with clear boundaries
- 🔧 **Easier Maintenance**: Single source of truth for utilities and components
- 📦 **Better Organization**: Components grouped by purpose and usage
- 🛡️ **Type Safety**: Maintained 100% TypeScript compatibility
- ⚡ **Performance**: Cleaner build process with proper module separation

### Custom Hooks Pattern

```typescript
// hooks/useCustomHook.ts
export function useCustomHook(params: HookParams) {
  // Hook logic
  return {
    data,
    actions,
    state
  }
}

// Usage in components
import { useCustomHook } from '../../hooks/useCustomHook'
```

### Component Structure Template

```typescript
'use client'

import React from 'react'
import { ComponentProps } from './types' // if needed

interface YourComponentProps {
  // Props definition
}

export default function YourComponent({ 
  prop1, 
  prop2 
}: YourComponentProps) {
  // Component logic
  
  return (
    <div className="component-styles">
      {/* JSX */}
    </div>
  )
}
```

## 📊 Database Schema

### Core Tables
- **Categories**: Task organization with colors and icons
- **Tasks**: Comprehensive task data with status tracking
- **Task Relations**: Hierarchical and networked relationships
- **Activities**: Life activity tracking
- **Time Entries**: Time tracking data
- **Energy Data**: Energy level monitoring

### Key Relationships
- Tasks belong to Categories (many-to-one)
- Tasks can have Subtasks (hierarchical)
- Tasks can be Related (networked)
- Activities track time and energy

## 🎨 Styling & Theming

- **Framework**: Tailwind CSS with custom configurations
- **Design System**: Consistent color palette and spacing
- **Responsive**: Mobile-first approach
- **Accessibility**: WCAG compliant components
- **Dark Mode**: Ready for theme switching

## 📈 Performance Features

- **React 18**: Concurrent rendering and Suspense
- **Custom Hooks**: Efficient state management
- **Optimized Imports**: Tree-shakeable component exports
- **Lazy Loading**: Code splitting for better performance
- **SWR**: Smart data fetching and caching

## 🔧 Scripts

```bash
npm run dev          # Development server
npm run build        # Production build
npm run start        # Production server
npm run lint         # Code linting
npm run type-check   # TypeScript checking
```

## 🤝 Contributing

1. **Follow Feature-First Architecture**: Place components in appropriate feature folders
2. **Use Shared Components**: Leverage categorized shared components when possible
3. **Maintain Type Safety**: Use TypeScript throughout with strict compilation
4. **Update Barrel Exports**: Ensure clean imports through index.ts files
5. **Respect Boundaries**: Features should only import from shared/, not other features
6. **Test Thoroughly**: Verify both mobile and desktop experiences
7. **Document Changes**: Update README for significant architectural changes

### Architecture Guidelines

- **Feature Components**: Should only be used within their feature
- **Shared Components**: Reusable across multiple features, no feature-specific logic
- **Import Patterns**: Use absolute paths with `@/` aliases
- **Build Safety**: Never import server-only utilities in client code

## 📝 License

[MIT License](LICENSE) - feel free to use this project for your own purposes.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI powered by [Tailwind CSS](https://tailwindcss.com/)
- Icons from [Lucide React](https://lucide.dev/)
- Database hosted on [Supabase](https://supabase.com/)

---

**ZFlow** - Empowering productivity through thoughtful design and modern architecture.