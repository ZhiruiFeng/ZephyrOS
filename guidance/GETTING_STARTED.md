# Getting Started with ZephyrOS

> Complete setup guide for your personal AI efficiency operating system

**Version**: 1.0.0 | **Last Updated**: January 2025

## 🚀 Quick Start

### Prerequisites

- **Node.js 18+** (LTS recommended)
- **npm 10.9+** (comes with Node.js)
- **Git** for version control

### 1. Clone and Install

```bash
# Clone the repository
git clone <your-repo-url>
cd ZephyrOS

# Install dependencies for all workspaces
npm install

# Copy environment configuration
cp env.example .env.local
```

### 2. Choose Your Setup

#### Option A: Development with Mock Data (Fastest)
```bash
# Start development servers
npm run dev

# Access applications:
# Frontend: http://localhost:3000
# Backend:  http://localhost:3001/api/health
```

**What you get:**
- ✅ All features working with mock data
- ✅ No database setup required
- ✅ Perfect for testing and development
- ⚠️ Data doesn't persist between restarts

#### Option B: Full Supabase Integration

1. **Create Supabase Project**:
   - Go to [supabase.com](https://supabase.com)
   - Create new project and wait for initialization

2. **Setup Database**:
   ```sql
   -- Run in Supabase SQL Editor
   CREATE TABLE memories (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     type TEXT NOT NULL,
     content JSONB NOT NULL,
     tags TEXT[],
     metadata JSONB,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- Add indexes for performance
   CREATE INDEX idx_memories_type ON memories(type);
   CREATE INDEX idx_memories_created_at ON memories(created_at DESC);
   CREATE INDEX idx_memories_tags ON memories USING GIN(tags);
   ```

3. **Configure Environment**:
   ```bash
   # Update .env.local with your Supabase credentials
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

4. **Start Development**:
   ```bash
   npm run dev
   ```

## ✅ Verify Setup

### Test the System
```bash
# Check API health
curl http://localhost:3001/api/health

# Should return:
# {
#   "status": "healthy",
#   "timestamp": "...",
#   "service": "zmemory-api",
#   "version": "1.0.0"
# }
```

### Create Your First Task
1. Open http://localhost:3000
2. Click "+" to add a new task
3. Fill in task details and save
4. Verify task appears in the list

## 🎯 What's Working

### Core Applications
- **ZFlow (Frontend)**: Task management interface at http://localhost:3000
- **ZMemory API (Backend)**: RESTful API at http://localhost:3001

### Current Features
- ✅ Task creation, editing, and management
- ✅ Priority levels (Low, Medium, High, Urgent)
- ✅ Status tracking (Pending, In Progress, Completed, On Hold, Cancelled)
- ✅ Real-time updates with SWR caching
- ✅ Internationalization (English/Chinese)
- ✅ Responsive design with Tailwind CSS
- ✅ Error handling and loading states

## 🔧 Development Commands

```bash
# Development
npm run dev                    # Start all apps
npm run dev --filter=zflow     # Frontend only
npm run dev --filter=zmemory   # Backend only

# Quality Assurance
npm run type-check            # TypeScript checking
npm run build                 # Production build test
```

## 🏗️ Project Architecture

```
ZephyrOS/
├── apps/
│   ├── zflow/              # Frontend (Next.js + React)
│   └── zmemory/            # Backend API (Next.js API routes)
├── packages/
│   └── shared/             # Shared types and utilities
├── supabase/               # Database schema
├── guidance/               # Documentation (you are here)
└── scripts/                # Utility scripts
```

### Memory Architecture

Everything in ZephyrOS is stored as a flexible "Memory":

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

## 🚨 Troubleshooting

### Common Issues

1. **Port Conflicts**:
   ```bash
   # Kill processes on ports 3000 and 3001
   lsof -ti:3000 | xargs kill -9
   lsof -ti:3001 | xargs kill -9
   ```

2. **Dependency Issues**:
   ```bash
   # Clean installation
   rm -rf node_modules apps/*/node_modules packages/*/node_modules
   npm install
   ```

3. **TypeScript Errors**:
   ```bash
   # Rebuild shared package
   npm run build --filter=shared
   npm run type-check
   ```

4. **Supabase Connection**:
   - Verify `.env.local` has correct Supabase URL and keys
   - Check Supabase project status in dashboard
   - Test health endpoint returns database connection status

## 📚 Next Steps

Once you have ZephyrOS running:

1. **[DEVELOPMENT.md](./DEVELOPMENT.md)** - Development workflow and best practices
2. **[API.md](./API.md)** - Complete API reference
3. **[FEATURES.md](./FEATURES.md)** - Feature documentation and usage guides
4. **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Production deployment guide

---

**Status**: ✅ Production Ready  
**Support**: Check documentation or recent commit history for updates