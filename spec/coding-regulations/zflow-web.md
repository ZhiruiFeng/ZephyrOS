# ZFlow Web App Coding Regulations

## Overview

ZFlow is the main web application built with Next.js 15, React 19, and TypeScript. It provides a rich text editor and task management interface with real-time features.

**Technology Stack:**
- Next.js 15 (App Router)
- React 19
- TypeScript 5.x
- TipTap (Rich text editor)
- Tailwind CSS
- Supabase Client
- Framer Motion (Animations)

## Project Structure

### 1. **Directory Organization**

```
apps/zflow/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth route group
│   ├── (dashboard)/       # Dashboard route group
│   ├── api/               # API routes (if any client-side)
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   ├── features/         # Feature-specific components
│   └── layout/           # Layout components
├── lib/                   # Utility libraries
│   ├── supabase/         # Supabase client
│   ├── api/              # API client functions
│   └── utils/            # Helper functions
├── hooks/                 # Custom React hooks
├── types/                 # TypeScript types
├── styles/                # Global styles
└── public/                # Static assets
```

## Component Architecture

### 1. **Server Components (Default)**

```typescript
// ✅ Good: Server component for data fetching
import { createServerClient } from '@/lib/supabase/server';

export default async function TasksPage() {
  const supabase = createServerClient();
  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false });

  return <TaskList tasks={tasks ?? []} />;
}

// No 'use client' directive - stays on server
```

### 2. **Client Components**

```typescript
// ✅ Good: Client component for interactivity
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function TaskForm() {
  const [title, setTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await fetch('/api/tasks', {
        method: 'POST',
        body: JSON.stringify({ title }),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Task title"
      />
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Creating...' : 'Create Task'}
      </Button>
    </form>
  );
}
```

### 3. **Component Composition**

```typescript
// ✅ Good: Small, focused components
export function TaskCard({ task }: { task: Task }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <TaskHeader task={task} />
      <TaskContent task={task} />
      <TaskActions task={task} />
    </div>
  );
}

function TaskHeader({ task }: { task: Task }) {
  return (
    <div className="flex items-center justify-between">
      <h3 className="text-lg font-semibold">{task.title}</h3>
      <TaskPriorityBadge priority={task.priority} />
    </div>
  );
}

// ❌ Bad: Monolithic component
export function TaskCard({ task }: { task: Task }) {
  return (
    <div className="...">
      {/* 200 lines of JSX */}
    </div>
  );
}
```

## Data Fetching

### 1. **Server-Side Data Fetching**

```typescript
// ✅ Good: Fetch in Server Component
import { createServerClient } from '@/lib/supabase/server';

export default async function DashboardPage() {
  const supabase = createServerClient();

  // Parallel fetches
  const [tasksResult, categoriesResult] = await Promise.all([
    supabase.from('tasks').select('*'),
    supabase.from('categories').select('*'),
  ]);

  return (
    <Dashboard
      tasks={tasksResult.data ?? []}
      categories={categoriesResult.data ?? []}
    />
  );
}
```

### 2. **Client-Side Data Fetching with SWR**

```typescript
// ✅ Good: Use SWR for client-side data
'use client';

import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export function TaskList() {
  const { data, error, mutate } = useSWR<Task[]>(
    '/api/tasks',
    fetcher,
    {
      refreshInterval: 30000, // Refresh every 30s
      revalidateOnFocus: true,
    }
  );

  if (error) return <ErrorView error={error} />;
  if (!data) return <LoadingSpinner />;

  return (
    <div>
      {data.map(task => (
        <TaskCard key={task.id} task={task} onUpdate={() => mutate()} />
      ))}
    </div>
  );
}
```

### 3. **Optimistic Updates**

```typescript
// ✅ Good: Optimistic UI updates
'use client';

import useSWR, { mutate } from 'swr';

export function TaskToggle({ task }: { task: Task }) {
  const handleToggle = async () => {
    // Optimistically update UI
    await mutate(
      '/api/tasks',
      async (tasks: Task[]) => {
        return tasks.map(t =>
          t.id === task.id
            ? { ...t, completed: !t.completed }
            : t
        );
      },
      false // Don't revalidate immediately
    );

    // Make API call
    try {
      await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ completed: !task.completed }),
      });
    } catch (error) {
      // Revert on error
      mutate('/api/tasks');
    }
  };

  return <Checkbox checked={task.completed} onChange={handleToggle} />;
}
```

## Styling with Tailwind CSS

### 1. **Utility-First Approach**

```typescript
// ✅ Good: Tailwind utility classes
export function Button({ children, variant = 'primary' }: ButtonProps) {
  const baseClasses = 'px-4 py-2 rounded-lg font-medium transition-colors';

  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  };

  return (
    <button className={`${baseClasses} ${variantClasses[variant]}`}>
      {children}
    </button>
  );
}

// ❌ Bad: Inline styles
<button style={{ padding: '8px 16px', backgroundColor: '#3b82f6' }}>
  Click me
</button>
```

### 2. **Responsive Design**

```typescript
// ✅ Good: Mobile-first responsive design
<div className="
  grid
  grid-cols-1
  md:grid-cols-2
  lg:grid-cols-3
  gap-4
  p-4
  md:p-6
  lg:p-8
">
  {tasks.map(task => (
    <TaskCard key={task.id} task={task} />
  ))}
</div>
```

### 3. **Custom Theme Configuration**

```javascript
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          900: '#1e3a8a',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'sans-serif'],
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('@tailwindcss/forms'),
  ],
};
```

## Rich Text Editor (TipTap)

### 1. **Editor Setup**

```typescript
// ✅ Good: TipTap editor configuration
'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';

export function RichTextEditor({
  content,
  onChange
}: {
  content: string;
  onChange: (content: string) => void;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Start typing...',
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  return (
    <div className="prose prose-sm max-w-none">
      <EditorContent editor={editor} />
    </div>
  );
}
```

### 2. **Custom Extensions**

```typescript
// ✅ Good: Custom TipTap extensions
import { Mark, mergeAttributes } from '@tiptap/core';

export const Highlight = Mark.create({
  name: 'highlight',

  addOptions() {
    return {
      multicolor: true,
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      color: {
        default: null,
        parseHTML: element => element.getAttribute('data-color'),
        renderHTML: attributes => {
          if (!attributes.color) return {};
          return { 'data-color': attributes.color };
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: 'mark' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['mark', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  },
});
```

## State Management

### 1. **React Context for Global State**

```typescript
// ✅ Good: Typed context with custom hook
'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface AppContextValue {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const toggleSidebar = () => setSidebarOpen(prev => !prev);

  return (
    <AppContext.Provider value={{ sidebarOpen, toggleSidebar }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
```

## Animation with Framer Motion

### 1. **Page Transitions**

```typescript
// ✅ Good: Smooth page transitions
'use client';

import { motion } from 'framer-motion';

export default function Page() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <h1>Page Content</h1>
    </motion.div>
  );
}
```

### 2. **List Animations**

```typescript
// ✅ Good: Staggered list animations
'use client';

import { motion } from 'framer-motion';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export function TaskList({ tasks }: { tasks: Task[] }) {
  return (
    <motion.ul
      variants={container}
      initial="hidden"
      animate="show"
    >
      {tasks.map(task => (
        <motion.li key={task.id} variants={item}>
          <TaskCard task={task} />
        </motion.li>
      ))}
    </motion.ul>
  );
}
```

## Performance Optimization

### 1. **Code Splitting**

```typescript
// ✅ Good: Dynamic imports for heavy components
import dynamic from 'next/dynamic';

const RichTextEditor = dynamic(
  () => import('@/components/RichTextEditor'),
  {
    loading: () => <EditorSkeleton />,
    ssr: false, // Disable SSR for client-only components
  }
);

export function TaskEditor() {
  return (
    <div>
      <RichTextEditor />
    </div>
  );
}
```

### 2. **Image Optimization**

```typescript
// ✅ Good: Next.js Image component
import Image from 'next/image';

export function Avatar({ user }: { user: User }) {
  return (
    <Image
      src={user.avatar}
      alt={`${user.name}'s avatar`}
      width={40}
      height={40}
      className="rounded-full"
      priority={false} // Lazy load by default
    />
  );
}

// ❌ Bad: Regular img tag
<img src={user.avatar} alt="avatar" />
```

### 3. **Memoization**

```typescript
// ✅ Good: React.memo for expensive components
import { memo } from 'react';

export const TaskCard = memo(function TaskCard({ task }: { task: Task }) {
  return (
    <div className="...">
      {/* Complex rendering */}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison
  return prevProps.task.id === nextProps.task.id &&
         prevProps.task.updated_at === nextProps.task.updated_at;
});
```

## Testing

### 1. **Component Tests**

```typescript
// ✅ Good: Test components with React Testing Library
import { render, screen, fireEvent } from '@testing-library/react';
import { TaskCard } from './TaskCard';

describe('TaskCard', () => {
  const mockTask: Task = {
    id: '1',
    title: 'Test Task',
    status: 'pending',
  };

  it('renders task title', () => {
    render(<TaskCard task={mockTask} />);
    expect(screen.getByText('Test Task')).toBeInTheDocument();
  });

  it('calls onUpdate when checkbox is clicked', () => {
    const onUpdate = jest.fn();
    render(<TaskCard task={mockTask} onUpdate={onUpdate} />);

    fireEvent.click(screen.getByRole('checkbox'));
    expect(onUpdate).toHaveBeenCalled();
  });
});
```

## Accessibility

### 1. **Semantic HTML**

```typescript
// ✅ Good: Semantic HTML with ARIA
export function Modal({ title, children, onClose }: ModalProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      <div className="bg-white rounded-lg p-6">
        <h2 id="modal-title" className="text-xl font-bold">
          {title}
        </h2>
        <div>{children}</div>
        <button
          onClick={onClose}
          aria-label="Close modal"
          className="mt-4"
        >
          Close
        </button>
      </div>
    </div>
  );
}
```

### 2. **Keyboard Navigation**

```typescript
// ✅ Good: Keyboard support
export function Dropdown({ items }: { items: MenuItem[] }) {
  const [activeIndex, setActiveIndex] = useState(0);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex(i => Math.min(i + 1, items.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
        items[activeIndex].onClick();
        break;
    }
  };

  return (
    <div role="menu" onKeyDown={handleKeyDown} tabIndex={0}>
      {items.map((item, index) => (
        <div
          key={item.id}
          role="menuitem"
          aria-selected={index === activeIndex}
          tabIndex={-1}
        >
          {item.label}
        </div>
      ))}
    </div>
  );
}
```

---

**Last Updated**: 2025-10-10
**Component**: ZFlow Web App
**Tech Stack**: Next.js 15 + React 19 + TypeScript + Tailwind
