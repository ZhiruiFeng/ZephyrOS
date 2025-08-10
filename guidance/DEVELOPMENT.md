# ZephyrOS Development Guide

A comprehensive guide for developing ZephyrOS, your personal AI agent efficiency operating system.

## Quick Start

### Prerequisites

- **Node.js 18+** (LTS recommended)
- **npm 9+** (comes with Node.js)
- **Git** for version control
- **Supabase Account** (free tier available)

### Initial Setup

```bash
# Clone the repository
git clone <your-repo-url>
cd ZephyrOS

# Install dependencies for all workspaces
npm install

# Copy environment configuration
cp env.example .env.local

# Edit environment variables (see Environment Setup below)
```

### Environment Setup

Edit `.env.local` with your Supabase credentials:

```env
# Supabase Configuration (Required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Development Servers

```bash
# Start all applications (recommended)
npm run dev

# Or start individually
npm run dev --filter=zflow        # Frontend on :3000
npm run dev --filter=zmemory      # Backend API on :3001
```

**Access Points:**
- **ZFlow (Frontend)**: http://localhost:3000
- **ZMemory API (Backend)**: http://localhost:3001/api/health

## Project Architecture

### Current Structure

```
ZephyrOS/
├── apps/
│   ├── zflow/              # Frontend task management
│   │   ├── app/            # Next.js App Router
│   │   ├── hooks/          # React hooks
│   │   └── lib/            # Client utilities
│   └── zmemory/            # Backend API service
│       ├── app/api/        # API routes
│       ├── lib/            # Server utilities
│       └── types/          # Type definitions
├── packages/
│   └── shared/             # Shared types and utilities
├── supabase/               # Database schema
├── guidance/               # Documentation
└── scripts/                # Utility scripts
```

### Data Architecture

**Core Concept**: Everything is a `Memory` with flexible content types.

```typescript
interface Memory {
  id: string;
  type: string;           // 'task', 'note', 'bookmark', etc.
  content: any;           // Flexible JSON content
  tags?: string[];        // Categorization
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}
```

**Task Example**:
```typescript
{
  id: "uuid",
  type: "task",
  content: {
    title: "Complete project",
    description: "Finish the ZephyrOS development",
    status: "pending",
    priority: "high",
    due_date: "2024-08-10"
  },
  tags: ["zflow", "development"]
}
```

## Development Workflow

### 1. Feature Development

```bash
# Create feature branch
git checkout -b feature/new-feature

# Make your changes
# ... development work ...

# Run quality checks
npm run type-check        # TypeScript validation
npm run lint             # Code quality (when configured)
npm run build            # Build verification

# Commit changes
git add .
git commit -m "feat: add new feature description"

# Push and create PR
git push origin feature/new-feature
```

### 2. Adding New Memory Types

1. **Define the content interface** in `packages/shared/src/index.ts`:
```typescript
export interface BookmarkContent {
  title: string;
  url: string;
  description?: string;
  favicon?: string;
}
```

2. **Create API validation** in ZMemory backend:
```typescript
const BookmarkContentSchema = z.object({
  title: z.string(),
  url: z.string().url(),
  description: z.string().optional(),
  favicon: z.string().optional(),
});
```

3. **Add frontend components** in ZFlow:
```typescript
const BookmarkItem = ({ memory }: { memory: Memory }) => {
  const content = memory.content as BookmarkContent;
  // Component implementation
};
```

### 3. API Development

#### Creating New Endpoints

Example: Add a search endpoint

```typescript
// apps/zmemory/app/api/memories/search/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../lib/supabase';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  
  if (!query) {
    return NextResponse.json(
      { error: 'Query parameter required' }, 
      { status: 400 }
    );
  }

  try {
    const { data, error } = await supabase
      .from('memories')
      .select('*')
      .textSearch('content', query)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: 'Search failed' }, 
      { status: 500 }
    );
  }
}
```

#### API Client Updates

```typescript
// apps/zflow/lib/api.ts
class ApiClient {
  // ... existing methods ...

  async searchMemories(query: string): Promise<Memory[]> {
    return this.request<Memory[]>(`/api/memories/search?q=${encodeURIComponent(query)}`);
  }
}
```

### 4. Frontend Development

#### Component Structure

```typescript
// apps/zflow/components/TaskList.tsx
'use client';

import React from 'react';
import { useTasks } from '../hooks/useMemories';
import { TaskItem } from './TaskItem';

export function TaskList() {
  const { memories: tasks, isLoading, error } = useTasks();

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <div className="space-y-4">
      {tasks.map(task => (
        <TaskItem key={task.id} task={task} />
      ))}
    </div>
  );
}
```

#### Custom Hooks

```typescript
// apps/zflow/hooks/useSearch.ts
import { useState, useCallback } from 'react';
import { apiClient } from '../lib/api';
import type { Memory } from '@zephyros/shared';

export function useSearch() {
  const [results, setResults] = useState<Memory[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const search = useCallback(async (query: string) => {
    setIsLoading(true);
    try {
      const data = await apiClient.searchMemories(query);
      setResults(data);
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { results, isLoading, search };
}
```

## Database Operations

### Direct Supabase Usage

```typescript
import { supabase } from '../lib/supabase';

// Create memory
const { data, error } = await supabase
  .from('memories')
  .insert({
    type: 'task',
    content: { title: 'New task', status: 'pending' },
    tags: ['work']
  })
  .select()
  .single();

// Query with filters
const { data, error } = await supabase
  .from('memories')
  .select('*')
  .eq('type', 'task')
  .contains('tags', ['urgent'])
  .order('created_at', { ascending: false })
  .limit(10);

// Full-text search (requires RLS policies)
const { data, error } = await supabase
  .from('memories')
  .select('*')
  .textSearch('content', 'search terms');
```

### Recommended Patterns

1. **Always use transactions for related operations**
2. **Implement proper error handling**
3. **Use RLS (Row Level Security) for user data**
4. **Add database indexes for common queries**

## Testing Strategy

### Unit Testing Setup

```bash
# Install testing dependencies
npm install --save-dev jest @testing-library/react @testing-library/jest-dom

# Run tests
npm test                 # All packages
npm test --filter=zflow  # Specific package
```

### Example Test

```typescript
// apps/zflow/__tests__/TaskItem.test.tsx
import { render, screen } from '@testing-library/react';
import { TaskItem } from '../components/TaskItem';

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

test('renders task title', () => {
  render(<TaskItem task={mockTask} />);
  expect(screen.getByText('Test task')).toBeInTheDocument();
});
```

## Code Quality

### TypeScript Configuration

```json
// tsconfig.json (in each app/package)
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "es6"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"],
      "@zephyros/shared": ["../../packages/shared/src"]
    }
  }
}
```

### ESLint Configuration (Recommended)

```json
// .eslintrc.json
{
  "extends": [
    "next/core-web-vitals",
    "@typescript-eslint/recommended"
  ],
  "rules": {
    "prefer-const": "error",
    "no-unused-vars": "off",
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/no-explicit-any": "warn"
  }
}
```

## Performance Optimization

### Frontend Optimizations

1. **Code Splitting**:
```typescript
import dynamic from 'next/dynamic';

const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <LoadingSpinner />
});
```

2. **API Response Caching**:
```typescript
// apps/zflow/lib/api.ts
class ApiClient {
  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    // Add cache headers for GET requests
    if (!options.method || options.method === 'GET') {
      options.headers = {
        ...options.headers,
        'Cache-Control': 'max-age=60'
      };
    }
    
    const response = await fetch(url, options);
    return response.json();
  }
}
```

3. **SWR Configuration**:
```typescript
// apps/zflow/hooks/useMemories.ts
export function useMemories(params?: MemoryParams) {
  return useSWR(
    `memories-${JSON.stringify(params)}`,
    () => apiClient.getMemories(params),
    {
      revalidateOnFocus: false,
      revalidateIfStale: false,
      revalidateOnReconnect: true,
      dedupingInterval: 5000, // 5 seconds
    }
  );
}
```

### Backend Optimizations

1. **Database Indexes**:
```sql
-- Add to supabase/schema.sql
CREATE INDEX idx_memories_type ON memories(type);
CREATE INDEX idx_memories_created_at ON memories(created_at DESC);
CREATE INDEX idx_memories_tags ON memories USING GIN(tags);
```

2. **API Response Optimization**:
```typescript
// apps/zmemory/app/api/memories/route.ts
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
  
  // Use pagination and limits
  const { data, error } = await supabase
    .from('memories')
    .select('id, type, content, tags, created_at') // Only select needed fields
    .order('created_at', { ascending: false })
    .limit(limit);

  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'public, max-age=60, s-maxage=60'
    }
  });
}
```

## Debugging

### Frontend Debugging

1. **Browser DevTools**:
   - Use React Developer Tools extension
   - Network tab for API call monitoring
   - Console for error tracking

2. **Next.js Debugging**:
```bash
# Enable debug mode
npm run dev -- --inspect

# View in Chrome DevTools
# Go to chrome://inspect
```

### Backend Debugging

1. **API Logging**:
```typescript
// apps/zmemory/app/api/memories/route.ts
export async function POST(request: NextRequest) {
  console.log(`[${new Date().toISOString()}] POST /api/memories`);
  
  try {
    const body = await request.json();
    console.log('Request body:', JSON.stringify(body, null, 2));
    
    // ... processing ...
    
    console.log('Response data:', JSON.stringify(data, null, 2));
    return NextResponse.json(data);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

2. **Supabase Debugging**:
   - Use Supabase Dashboard logs
   - Enable RLS policy logging
   - Monitor real-time queries

## Deployment Preparation

### Build Verification

```bash
# Verify all builds work
npm run build

# Check TypeScript compilation
npm run type-check

# Test production build locally
npm run start --filter=zflow
npm run start --filter=zmemory
```

### Environment Variables for Production

```env
# Production .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-production-service-key
NEXT_PUBLIC_API_URL=https://your-api-domain.vercel.app
```

## Troubleshooting

### Common Issues

1. **Port Conflicts**:
```bash
# Find and kill processes using ports
lsof -ti:3000 | xargs kill -9
lsof -ti:3001 | xargs kill -9
```

2. **Dependency Issues**:
```bash
# Clean install
rm -rf node_modules apps/*/node_modules packages/*/node_modules
npm install
```

3. **TypeScript Errors**:
```bash
# Rebuild shared package
npm run build --filter=shared
npm run type-check
```

4. **Supabase Connection Issues**:
   - Verify environment variables
   - Check Supabase project status
   - Validate API keys and URLs

### Performance Issues

1. **Slow API Responses**:
   - Check database query performance
   - Add appropriate indexes
   - Implement response caching

2. **Frontend Bundle Size**:
```bash
# Analyze bundle size
npm install --save-dev @next/bundle-analyzer

# Add to next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer({
  // ... your config
});

# Run analysis
ANALYZE=true npm run build
```

## Contributing Guidelines

### Code Standards

1. **TypeScript**: Use strict mode, avoid `any` types
2. **Components**: Use functional components with hooks
3. **Styling**: Use Tailwind CSS utility classes
4. **Naming**: Use descriptive, consistent naming conventions
5. **Comments**: Add JSDoc comments for complex functions

### Git Workflow

```bash
# Feature development
git checkout -b feature/feature-name
git commit -m "feat: description"

# Bug fixes
git checkout -b fix/bug-description
git commit -m "fix: description"

# Documentation
git checkout -b docs/update-description
git commit -m "docs: description"
```

### Pull Request Process

1. Ensure all tests pass
2. Update documentation if needed
3. Add meaningful commit messages
4. Request review from maintainers

## Resources

- **Next.js**: https://nextjs.org/docs
- **React**: https://react.dev/learn
- **TypeScript**: https://www.typescriptlang.org/docs
- **Tailwind CSS**: https://tailwindcss.com/docs
- **Supabase**: https://supabase.com/docs
- **SWR**: https://swr.vercel.app/docs
- **Vercel**: https://vercel.com/docs

---

**Last Updated**: January 2025  
**Version**: 1.0.0

## Recent Development Updates

### Latest Improvements (January 2025)
- **Enhanced API Performance**: Optimized response times and caching strategies
- **Strengthened Security**: Improved input validation and rate limiting
- **Complete Internationalization**: Full i18n support with real-time language switching
- **Testing Infrastructure**: Comprehensive Jest and Newman test suites
- **Documentation**: Auto-generated OpenAPI specs and improved dev guides

### New Development Tools
- **API Testing**: Automated testing with Newman and Postman collections
- **Performance Monitoring**: Built-in performance tracking and optimization
- **Security Scanning**: Enhanced validation and security measures
- **i18n Tools**: Translation management and locale switching utilities