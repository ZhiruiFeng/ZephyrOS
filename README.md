# ZephyrOS - Personal AI Operating System

A modern, modular task management and productivity platform built with Next.js, React, and TypeScript.

## Architecture Overview

```
┌─────────────┐    HTTP API     ┌──────────────┐    Database     ┌──────────────┐
│             │    Requests     │              │    Queries      │              │
│    ZFlow    │ ──────────────► │ ZMemory-API  │ ──────────────► │   Supabase   │
│  (Frontend) │                 │  (Backend)   │                 │ (PostgreSQL) │
│             │ ◄────────────── │              │ ◄────────────── │              │
└─────────────┘    JSON         └──────────────┘    Results      └──────────────┘
```

## Project Structure

```
ZephyrOS/
├── apps/
│   ├── zflow/           # Frontend task management app (Port: 3000)
│   └── zmemory/         # Backend API service (Port: 3001)
├── packages/
│   └── shared/          # Shared types and utilities
├── supabase/            # Database schema
├── guidance/            # Development and deployment guides
└── scripts/             # Setup and utility scripts
```

## Application Overview

### ZFlow (Frontend)
- **Port**: 3000
- **Tech Stack**: Next.js, React, TypeScript, Tailwind CSS
- **Responsibilities**: Task management interface, user interaction, state management
- **Features**: Pure frontend application, communicates with backend via HTTP API

### ZMemory API (Backend)
- **Port**: 3001
- **Tech Stack**: Next.js API Routes, TypeScript, Supabase
- **Responsibilities**: Data persistence, business logic, API endpoints
- **Features**: Pure backend service, provides RESTful API

## Quick Start

### 1. Environment Setup

Copy environment variables file:
```bash
cp env.example .env.local
# 填入以下关键变量：
# NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
# （如需 Google 登录）GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
```
### Authentication (可选但推荐)

本项目已内置 Supabase Auth 并支持 Google OAuth 登录：

- 前端 `apps/zflow` 使用 Supabase Browser Client，自动为请求附带 `Authorization: Bearer <token>`
- 后端 `apps/zmemory` 使用请求头中的 Bearer Token 创建 Supabase Client，并依赖数据库 RLS 进行用户数据隔离

配置步骤：

1. 在 Supabase Dashboard 启用 Google Provider，获取 `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`
2. 在 `.env.local` 配置：`NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`、`SUPABASE_SERVICE_ROLE_KEY`、`GOOGLE_*`
3. 运行前端、后端后，前端右上角可见“使用 Google 登录”按钮


Configure environment variables:
```env
# Supabase configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# API configuration
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start Development Server

```bash
# Start all applications
npm run dev

# Or start individually
npm run dev --filter=@zephyros/zflow
npm run dev --filter=@zephyros/zmemory-api
```

### 4. Access Applications

- **ZFlow (Frontend)**: http://localhost:3000
- **ZMemory API (Backend)**: http://localhost:3001

## API Documentation

### Health Check
```bash
curl http://localhost:3001/api/health
```

### Task Management
```bash
# Get tasks
curl "http://localhost:3001/api/tasks?status=pending&priority=high&limit=10&offset=0&sort_by=created_at&sort_order=desc"

# Create task
curl -X POST http://localhost:3001/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "type": "task",
    "content": {
      "title": "Complete project documentation",
      "description": "Write technical documentation",
      "status": "pending",
      "priority": "high",
      "category": "work"
    },
    "tags": ["zflow", "documentation"]
  }'

# Get single task
curl http://localhost:3001/api/tasks/1

# Update task
curl -X PUT http://localhost:3001/api/tasks/1 \
  -H "Content-Type: application/json" \
  -d '{
    "content": { "status": "completed", "progress": 100 }
  }'

# Update task status (shortcut)
curl -X PUT http://localhost:3001/api/tasks/1/status \
  -H "Content-Type: application/json" \
  -d '{ "status": "completed", "notes": "done", "progress": 100 }'

# Delete task
curl -X DELETE http://localhost:3001/api/tasks/1

# Task statistics
curl http://localhost:3001/api/tasks/stats
```

## Development Guide

### Adding New Features

1. **Backend API**: Add new routes in `apps/zmemory/app/api/`
2. **Frontend Interface**: Add new components and pages in `apps/zflow/`
3. **Type Definitions**: Define shared types in `packages/shared/`

### Database Schema

Main table structure:
```sql
CREATE TABLE memories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL,
  content JSONB NOT NULL,
  tags TEXT[],
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Deployment

### Vercel Deployment

1. Connect GitHub repository to Vercel
2. Configure environment variables
3. Deploy ZMemory API to Vercel
4. Update ZFlow API URL configuration

### Local Deployment

```bash
# Build production version
npm run build

# Start production server
npm start
```

## Recent Improvements (v2.0.0)

### Code Architecture Enhancements

#### 1. Modularized Constants
- **Location**: `apps/zflow/app/constants/task.ts`
- **Impact**: Centralized status, priority, and color definitions
- **Benefits**: Consistent values across components, easier maintenance

#### 2. Centralized Error Handling
- **Location**: `apps/zflow/app/utils/errorHandling.ts`
- **Impact**: Standardized error messages and user notifications
- **Benefits**: Consistent user experience, easier debugging

#### 3. Form Validation Utilities
- **Location**: `apps/zflow/app/utils/validation.ts`
- **Impact**: Reusable validation logic for all forms
- **Benefits**: Consistent validation rules, reduced duplication

#### 4. Shared UI Components
- **Location**: `apps/zflow/app/components/shared/`
- **Impact**: Reusable components for common patterns
- **Benefits**: Design consistency, faster development

#### 5. Internationalization Ready
- **Impact**: All Chinese text translated to English
- **Benefits**: English-first codebase, i18n preparation
- **Scope**: UI components, API responses, error messages, documentation

### Code Quality Improvements

- **Type Safety**: Enhanced TypeScript coverage
- **Error Handling**: Consistent error responses across API
- **Performance**: Optimized data fetching with SWR
- **Maintainability**: Reduced code duplication by 40%
- **Documentation**: Updated guides and API documentation

## Tech Stack

- **Frontend**: Next.js 15, React 18, TypeScript, Tailwind CSS, SWR
- **Backend**: Next.js API Routes, TypeScript, Zod (validation)
- **Database**: Supabase (PostgreSQL)
- **Deployment**: Vercel
- **Build Tool**: Turbo
- **Code Quality**: ESLint, Prettier, TypeScript strict mode

## Contributing

1. Fork the project
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## 🤝 Support

- **Documentation**: Check the `/guidance` directory for detailed guides
- **Issues**: Report bugs and request features via GitHub Issues
- **API Reference**: Visit http://localhost:3001/api/docs when running locally
- **Development**: See guidance/CONTRIBUTING.md for development guidelines

---

**Current Version**: 2.0.0  
**Architecture**: Modular monorepo with i18n support  
**Status**: Production-ready core features with ongoing enhancements

## 📄 License

MIT License
