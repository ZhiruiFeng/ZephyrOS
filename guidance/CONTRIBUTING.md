# Contributing to ZephyrOS

Thank you for your interest in contributing to ZephyrOS! This guide will help you get started with contributing to this personal AI efficiency operating system.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Code Standards](#code-standards)
- [Testing Guidelines](#testing-guidelines)
- [Documentation](#documentation)
- [Submission Process](#submission-process)

## Code of Conduct

This project follows a simple code of conduct:

- **Be respectful** in all interactions
- **Be constructive** in feedback and discussions
- **Be collaborative** and help others learn
- **Be open-minded** to different approaches and ideas

## Getting Started

### Prerequisites

Before contributing, ensure you have:

- **Node.js 18+** installed
- **npm 9+** (comes with Node.js)
- **Git** for version control
- **Code editor** (VS Code recommended)
- **Supabase account** (for database features)

### Repository Structure

```
ZephyrOS/
├── apps/
│   ├── zflow/              # Frontend React app
│   └── zmemory/            # Backend API service
├── packages/
│   └── shared/             # Shared types and utilities
├── guidance/               # Documentation
├── supabase/              # Database schema and migrations
└── scripts/               # Development and deployment scripts
```

## Development Setup

### 1. Fork and Clone

```bash
# Fork the repository on GitHub, then clone your fork
git clone https://github.com/YOUR_USERNAME/ZephyrOS.git
cd ZephyrOS

# Add upstream remote
git remote add upstream https://github.com/ORIGINAL_OWNER/ZephyrOS.git
```

### 2. Install Dependencies

```bash
# Install all dependencies
npm install

# Verify installation
npm run type-check
```

### 3. Environment Setup

```bash
# Copy environment template
cp env.example .env.local

# Edit .env.local with your Supabase credentials
# (See guidance/DEVELOPMENT.md for details)
```

### 4. Start Development

```bash
# Start all applications
npm run dev

# Or start individual apps (workspaces)
npm run dev -w @zephyros/zflow         # Frontend only (:3000)
npm run dev -w @zephyros/zmemory-api   # Backend only  (:3001)
npm run dev -w @zephyros/zmemory-mcp   # MCP server (stdio)
```

### 5. Verify Setup

- Frontend: http://localhost:3000
- Backend Health: http://localhost:3001/api/health

## How to Contribute

### Types of Contributions

We welcome several types of contributions:

1. **🐛 Bug Reports** - Report issues you encounter
2. **✨ Feature Requests** - Suggest new features
3. **🔧 Bug Fixes** - Fix reported issues
4. **⚡ Performance Improvements** - Optimize existing code
5. **📚 Documentation** - Improve guides and API docs
6. **🧪 Tests** - Add or improve test coverage
7. **🎨 UI/UX Improvements** - Enhance user experience

### Contribution Workflow

1. **Check existing issues** - Look for existing bug reports or feature requests
2. **Create an issue** (if needed) - Describe the problem or feature
3. **Discuss approach** - Get feedback before starting work
4. **Create branch** - Use descriptive branch names
5. **Make changes** - Follow code standards and guidelines
6. **Test thoroughly** - Ensure all tests pass
7. **Submit pull request** - Use the PR template
8. **Address feedback** - Respond to review comments
9. **Merge** - Celebrate your contribution! 🎉

## Code Standards

### Git Workflow

#### Branch Naming

Use descriptive branch names with prefixes:

```bash
# Feature development
git checkout -b feature/add-search-functionality
git checkout -b feature/bookmark-management

# Bug fixes
git checkout -b fix/task-completion-bug
git checkout -b fix/api-error-handling

# Documentation updates
git checkout -b docs/api-documentation
git checkout -b docs/deployment-guide

# Performance improvements
git checkout -b perf/optimize-database-queries
git checkout -b perf/reduce-bundle-size
```

#### Commit Messages

Follow conventional commit format:

```bash
# Format: type(scope): description

# Feature additions
feat(zflow): add task search functionality
feat(zmemory): implement bookmark API endpoints
feat(shared): add new memory type interfaces

# Bug fixes
fix(zflow): resolve task completion issue
fix(zmemory): handle database connection errors
fix(api): validate request parameters

# Documentation
docs(api): update endpoint documentation
docs(setup): improve installation guide

# Performance
perf(zflow): optimize task list rendering
perf(zmemory): add database query caching

# Refactoring
refactor(zflow): simplify task component structure
refactor(zmemory): extract validation logic

# Tests
test(zflow): add task component tests
test(zmemory): add API endpoint tests

# Chores
chore(deps): update dependencies
chore(config): update TypeScript configuration
```

### TypeScript Standards

#### Type Safety

```typescript
// ✅ Good - Explicit types
interface TaskContent {
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
}

// ✅ Good - Generic functions
function createMemory<T>(type: string, content: T): Memory<T> {
  return {
    id: generateId(),
    type,
    content,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

// ❌ Avoid - Using 'any'
function processData(data: any): any {
  return data;
}
```

#### Imports and Exports

```typescript
// ✅ Good - Named imports
import { Memory, TaskContent } from '@zephyros/shared';
import { useMemories, useCreateMemory } from '../hooks/useMemories';

// ✅ Good - Explicit exports
export { TaskList } from './TaskList';
export { TaskItem } from './TaskItem';
export type { TaskListProps } from './TaskList';

// ❌ Avoid - Default exports for utilities
export default function validateInput() { /* ... */ }
```

### React/Frontend Standards

#### Component Structure

```tsx
// ✅ Good - Functional component with TypeScript
import React from 'react';
import { Memory, TaskContent } from '@zephyros/shared';

interface TaskItemProps {
  task: Memory;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

export function TaskItem({ task, onToggle, onDelete }: TaskItemProps) {
  const content = task.content as TaskContent;
  
  return (
    <div className="flex items-center gap-4 p-4 border rounded-lg">
      <button
        onClick={() => onToggle(task.id)}
        className="flex-shrink-0"
        aria-label={`Mark task as ${content.status === 'completed' ? 'pending' : 'completed'}`}
      >
        {content.status === 'completed' ? '✅' : '⭕'}
      </button>
      
      <div className="flex-1">
        <h3 className={`font-medium ${content.status === 'completed' ? 'line-through text-gray-500' : ''}`}>
          {content.title}
        </h3>
        {content.description && (
          <p className="text-sm text-gray-600 mt-1">{content.description}</p>
        )}
      </div>
      
      <button
        onClick={() => onDelete(task.id)}
        className="text-red-500 hover:text-red-700"
        aria-label="Delete task"
      >
        🗑️
      </button>
    </div>
  );
}
```

#### Hooks and State Management

```typescript
// ✅ Good - Custom hook with proper error handling
export function useMemories(params?: MemoryParams) {
  const { data, error, isLoading, mutate } = useSWR(
    params ? `memories-${JSON.stringify(params)}` : 'memories',
    () => apiClient.getMemories(params),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      errorRetryCount: 3,
    }
  );

  return {
    memories: data || [],
    error,
    isLoading,
    refetch: mutate,
  };
}
```

### Backend/API Standards

#### API Route Structure

```typescript
// ✅ Good - Proper error handling and validation
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabase } from '../../../lib/supabase';

const CreateMemorySchema = z.object({
  type: z.string().min(1),
  content: z.any(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validatedData = CreateMemorySchema.parse(body);
    
    // Database operation
    const { data, error } = await supabase
      .from('memories')
      .insert({
        ...validatedData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to create memory' },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid data format', 
          details: error.errors 
        },
        { status: 400 }
      );
    }
    
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### CSS/Styling Standards

#### Tailwind CSS Best Practices

```tsx
// ✅ Good - Semantic class grouping
<div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
  <h3 className="text-lg font-semibold text-gray-900">Task Title</h3>
  <span className="px-2 py-1 text-xs font-medium text-blue-600 bg-blue-100 rounded-full">
    High Priority
  </span>
</div>

// ✅ Good - Responsive design
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Grid items */}
</div>

// ❌ Avoid - Extremely long class strings
<div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 ease-in-out md:p-6 lg:p-8 xl:p-10">
```

## Testing Guidelines

### Unit Testing

```typescript
// Example test structure
import { render, screen, fireEvent } from '@testing-library/react';
import { TaskItem } from './TaskItem';

const mockTask = {
  id: '1',
  type: 'task',
  content: {
    title: 'Test task',
    status: 'pending',
    priority: 'medium'
  },
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
};

describe('TaskItem', () => {
  it('renders task title', () => {
    render(<TaskItem task={mockTask} onToggle={() => {}} onDelete={() => {}} />);
    expect(screen.getByText('Test task')).toBeInTheDocument();
  });

  it('calls onToggle when clicked', () => {
    const onToggle = jest.fn();
    render(<TaskItem task={mockTask} onToggle={onToggle} onDelete={() => {}} />);
    
    fireEvent.click(screen.getByRole('button', { name: /mark task as/i }));
    expect(onToggle).toHaveBeenCalledWith('1');
  });
});
```

### API Testing

```typescript
// Example API test
import { GET, POST } from './route';
import { NextRequest } from 'next/server';

describe('/api/memories', () => {
  it('should return memories list', async () => {
    const request = new NextRequest('http://localhost:3001/api/memories');
    const response = await GET(request);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
  });

  it('should create new memory', async () => {
    const request = new NextRequest('http://localhost:3001/api/memories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'task',
        content: { title: 'Test task', status: 'pending' }
      })
    });
    
    const response = await POST(request);
    const data = await response.json();
    
    expect(response.status).toBe(201);
    expect(data.type).toBe('task');
  });
});
```

### Running Tests

```bash
# ZMemory API tests (Jest)
npm test -w @zephyros/zmemory-api
npm run test:coverage -w @zephyros/zmemory-api
npm run test:watch -w @zephyros/zmemory-api

# MCP server tests (Jest)
npm test -w @zephyros/zmemory-mcp

# Frontend (zflow): add tests if/when configured
```

## Documentation

### Code Documentation

```typescript
/**
 * Creates a new memory in the system
 * 
 * @param type - The type of memory (e.g., 'task', 'note', 'bookmark')
 * @param content - The content object specific to the memory type
 * @param tags - Optional array of tags for categorization
 * @param metadata - Optional metadata object
 * @returns Promise resolving to the created memory
 * 
 * @example
 * ```typescript
 * const task = await createMemory('task', {
 *   title: 'Complete documentation',
 *   status: 'pending',
 *   priority: 'high'
 * }, ['docs', 'important']);
 * ```
 */
export async function createMemory(
  type: string,
  content: any,
  tags?: string[],
  metadata?: Record<string, any>
): Promise<Memory> {
  // Implementation
}
```

### README Updates

When adding new features, update relevant documentation:

- Main README.md for major features
- API.md for new endpoints
- DEVELOPMENT.md for new development processes
- Component documentation for UI changes

## Submission Process

### Pull Request Template

When creating a pull request, include:

```markdown
## Description
Brief description of changes made.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## How Has This Been Tested?
Describe the tests that you ran to verify your changes.

## Checklist:
- [ ] My code follows the code style of this project
- [ ] I have performed a self-review of my own code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes

## Screenshots (if applicable):
Include screenshots for UI changes.
```

### Review Process

1. **Automated Checks** - CI/CD runs type checking and tests
2. **Code Review** - Maintainers review code for quality and standards
3. **Testing** - Verify functionality in development environment
4. **Documentation Review** - Ensure documentation is updated
5. **Approval** - Maintainer approval required for merge

### After Merge

- Your contribution will be included in the next release
- Update your local repository:

```bash
git checkout main
git pull upstream main
git push origin main
```

## Getting Help

### Questions and Discussions

- **Issues**: For bug reports and feature requests
- **Discussions**: For questions and general discussion
- **Documentation**: Check the `guidance/` directory first

### Development Environment Issues

Common solutions:

```bash
# Dependency issues
rm -rf node_modules apps/*/node_modules packages/*/node_modules
npm install

# TypeScript issues
npm run build -w @zephyros/shared
npm run type-check

# Port conflicts
lsof -ti:3000 | xargs kill -9
lsof -ti:3001 | xargs kill -9
```

### Code Style Tools

Recommended VS Code extensions:

- **ES7+ React/Redux/React-Native snippets**
- **TypeScript Importer**
- **Tailwind CSS IntelliSense**
- **Prettier - Code formatter**
- **ESLint**

## Recognition

Contributors will be:

- Listed in the project's contributors section
- Mentioned in release notes for significant contributions
- Credited in documentation for major features

Thank you for contributing to ZephyrOS! Your help makes this project better for everyone. 🚀

---

**Last Updated**: August 2024  
**Version**: 1.0.0
