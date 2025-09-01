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

ZFlow features a **modular component architecture** designed for scalability and maintainability:

```
📁 apps/zflow/
├── 📁 app/                     # Next.js app directory
│   ├── 📁 components/          # ✨ Organized component library
│   │   ├── 📁 auth/           # Authentication components
│   │   ├── 📁 ui/             # Reusable UI components
│   │   ├── 📁 modals/         # Modal dialogs
│   │   ├── 📁 editors/        # Form & editor components
│   │   ├── 📁 navigation/     # Navigation components
│   │   ├── 📁 selectors/      # Selection/picker components
│   │   ├── 📁 utils/          # Utility components
│   │   ├── 📁 views/          # Main view components
│   │   └── index.ts           # Clean export structure
│   ├── 📁 hooks/              # Custom React hooks
│   ├── 📁 contexts/           # React contexts
│   ├── 📁 lib/                # API & utility libraries
│   └── 📁 utils/              # Helper functions
├── 📁 contexts/               # Shared contexts
├── 📁 hooks/                  # Shared hooks
└── 📁 lib/                    # Core libraries
```

## 📦 Component Architecture

### 🔧 Component Categories

#### **Authentication (`/auth`)**
- `LoginPage` - OAuth authentication interface
- `AuthButton` - Sign in/out functionality

#### **User Interface (`/ui`)**
- `TaskCard` - Reusable task display component
- `ActivityCard` - Activity tracking display
- `StatisticsCards` - Dashboard statistics
- `FilterControls` - Search and filtering
- `FloatingAddButton` - Quick task creation
- `TaskIcons` - Task status and priority icons
- `EnergySpectrum` - Energy tracking visualization

#### **Modal Dialogs (`/modals`)**
- `AddTaskModal` - Task creation dialog
- `TaskTimeModal` - Task time tracking
- `ActivityTimeModal` - Activity time tracking
- `DailyTimeModal` - Daily overview
- `EnergyReviewModal` - Energy assessment

#### **Form Editors (`/editors`)**
- `TaskEditor` - Comprehensive task editing
- `ActivityEditor` - Activity management
- `SubtaskSection` - Nested task management

#### **Navigation (`/navigation`)**
- `NavBar` - Main navigation bar
- `CategorySidebar` - Category filtering
- `MobileBottomNav` - Mobile navigation
- `MobileCategorySheet` - Mobile category selector

#### **Selectors (`/selectors`)**
- `CategorySelector` - Category picker
- `LanguageSelector` - Language switcher

#### **Views (`/views`)**
- `CurrentView` - Active and recent tasks
- `FutureView` - Backlog and on-hold tasks
- `ArchiveView` - Completed and cancelled tasks
- `ActivitiesView` - Life activity tracking

### 📋 Clean Import Pattern

**Old Pattern:**
```typescript
import TaskCard from './components/TaskCard'
import LoginPage from './components/LoginPage'
import AddTaskModal from './components/AddTaskModal'
```

**New Modular Pattern:**
```typescript
// Import from organized categories
import { TaskCard, StatisticsCards, FilterControls } from './components/ui'
import { LoginPage } from './components/auth'
import { AddTaskModal, TaskTimeModal } from './components/modals'
import { CurrentView, FutureView } from './components/views'

// Or import everything from a category
import * as UIComponents from './components/ui'
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

1. **Choose the Right Category**
   ```bash
   # UI components
   components/ui/NewComponent.tsx
   
   # Modal dialogs  
   components/modals/NewModal.tsx
   
   # Form editors
   components/editors/NewEditor.tsx
   ```

2. **Update Index Files**
   ```typescript
   // components/ui/index.ts
   export { default as NewComponent } from './NewComponent'
   ```

3. **Follow Naming Conventions**
   - PascalCase for component files
   - Descriptive, purpose-driven names
   - Include TypeScript interfaces

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

1. **Follow the Component Architecture**: Place components in appropriate folders
2. **Maintain Type Safety**: Use TypeScript throughout
3. **Update Index Files**: Ensure clean imports
4. **Test Thoroughly**: Verify both mobile and desktop experiences
5. **Document Changes**: Update README for significant architectural changes

## 📝 License

[MIT License](LICENSE) - feel free to use this project for your own purposes.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI powered by [Tailwind CSS](https://tailwindcss.com/)
- Icons from [Lucide React](https://lucide.dev/)
- Database hosted on [Supabase](https://supabase.com/)

---

**ZFlow** - Empowering productivity through thoughtful design and modern architecture.