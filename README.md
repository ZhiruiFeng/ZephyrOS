# ZephyrOS

一个现代化的任务管理和记忆系统，采用前后端分离架构。

## 架构概览

```
┌─────────────┐    HTTP API     ┌──────────────┐    Database     ┌──────────────┐
│             │    Requests     │              │    Queries      │              │
│    ZFlow    │ ──────────────► │ ZMemory-API  │ ──────────────► │   Supabase   │
│  (Frontend) │                 │  (Backend)   │                 │ (PostgreSQL) │
│             │ ◄────────────── │              │ ◄────────────── │              │
└─────────────┘    JSON         └──────────────┘    Results      └──────────────┘
```

## 项目结构

```
ZephyrOS/
├── apps/
│   ├── zflow/           # 前端任务管理应用 (端口: 3000)
│   └── zmemory/         # 后端 API 服务 (端口: 3001)
├── packages/
│   ├── backend/         # 共享后端工具
│   ├── shared/          # 共享类型和工具
│   └── ui/              # 共享 UI 组件
└── supabase/            # 数据库 schema
```

## 应用说明

### ZFlow (前端)
- **端口**: 3000
- **技术栈**: Next.js, React, TypeScript, Tailwind CSS
- **职责**: 任务管理界面，用户交互，状态管理
- **特点**: 纯前端应用，通过 HTTP API 与后端通信

### ZMemory API (后端)
- **端口**: 3001
- **技术栈**: Next.js API Routes, TypeScript, Supabase
- **职责**: 数据持久化，业务逻辑，API 接口
- **特点**: 纯后端服务，提供 RESTful API

## 快速开始

### 1. 环境设置

复制环境变量文件：
```bash
cp env.example .env.local
```

配置环境变量：
```env
# Supabase 配置
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# API 配置
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 2. 安装依赖

```bash
npm install
```

### 3. 启动开发服务器

```bash
# 启动所有应用
npm run dev

# 或分别启动
npm run dev --filter=@zephyros/zflow
npm run dev --filter=@zephyros/zmemory-api
```

### 4. 访问应用

- **ZFlow (前端)**: http://localhost:3000
- **ZMemory API (后端)**: http://localhost:3001

## API 文档

### 健康检查
```bash
curl http://localhost:3001/api/health
```

### 任务管理
```bash
# 获取任务列表
curl http://localhost:3001/api/memories?type=task

# 创建任务
curl -X POST http://localhost:3001/api/memories \
  -H "Content-Type: application/json" \
  -d '{
    "type": "task",
    "content": {
      "title": "完成项目文档",
      "description": "编写技术文档",
      "priority": "high"
    },
    "tags": ["zflow", "documentation"]
  }'
```

## 开发指南

### 添加新功能

1. **后端 API**: 在 `apps/zmemory/app/api/` 中添加新的路由
2. **前端界面**: 在 `apps/zflow/` 中添加新的组件和页面
3. **类型定义**: 在 `packages/shared/` 中定义共享类型

### 数据库 Schema

主要表结构：
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

## 部署

### Vercel 部署

1. 连接 GitHub 仓库到 Vercel
2. 配置环境变量
3. 部署 ZMemory API 到 Vercel
4. 更新 ZFlow 的 API URL 配置

### 本地部署

```bash
# 构建生产版本
npm run build

# 启动生产服务器
npm start
```

## 技术栈

- **前端**: Next.js 15, React 18, TypeScript, Tailwind CSS, SWR
- **后端**: Next.js API Routes, TypeScript, Zod (验证)
- **数据库**: Supabase (PostgreSQL)
- **部署**: Vercel
- **构建工具**: Turbo

## 贡献

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

## 许可证

MIT License
