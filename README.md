# ZephyrOS

这是我的个人AI操作系统的网关，在AI时代构建我的生活操作系统。

## 项目架构

```
ZephyrOS/
├── apps/
│   ├── zflow/          # 任务管理系统 (端口: 3001)
│   └── zmemory/        # 数据中枢 (端口: 3002)
├── packages/
│   ├── backend/         # 统一后端API
│   ├── shared/          # 共享类型和工具
│   └── ui/             # 共享UI组件
└── supabase/           # 数据库配置
```

## 技术栈

- **前端**: Next.js 15 + React 19 + TypeScript
- **样式**: Tailwind CSS
- **数据库**: Supabase
- **部署**: Vercel
- **包管理**: Turborepo (Monorepo)

## 子模块

### ZFlow - 任务管理系统
- 个人任务管理
- 优先级设置
- 状态跟踪
- 标签分类

### ZMemory - 数据中枢
- 个人知识库
- 笔记管理
- 链接收藏
- 文件存储
- 思维记录

## 开发环境设置

### 1. 安装依赖
```bash
npm install
```

### 2. 环境变量配置
创建 `.env.local` 文件：
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. 启动开发服务器
```bash
# 启动所有应用
npm run dev

# 或单独启动
npm run dev --workspace=@zephyros/zflow
npm run dev --workspace=@zephyros/zmemory
```

## 部署

### Vercel 部署

1. **前端部署**:
   - ZFlow: `https://zflow.your-domain.vercel.app`
   - ZMemory: `https://zmemory.your-domain.vercel.app`

2. **后端API**:
   - 使用 Vercel Functions (Serverless)
   - API路由: `/api/*`

3. **数据库**:
   - Supabase (外部服务)

### 部署步骤

1. 连接 GitHub 仓库到 Vercel
2. 配置环境变量
3. 设置构建命令和输出目录
4. 自动部署

## 开发指南

### 添加新应用
1. 在 `apps/` 目录下创建新应用
2. 更新 `package.json` 的 workspaces
3. 配置 Next.js 和 TypeScript

### 共享包开发
1. 在 `packages/` 目录下创建共享包
2. 使用 `workspace:*` 依赖
3. 在应用中使用共享包

## 数据库设计

### Tasks 表
```sql
CREATE TABLE tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending',
  priority TEXT DEFAULT 'medium',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  due_date TIMESTAMP WITH TIME ZONE,
  tags TEXT[]
);
```

### Memories 表
```sql
CREATE TABLE memories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'note',
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB
);
```

## 未来规划

- [ ] 移动端支持
- [ ] AI 集成
- [ ] 数据同步
- [ ] 插件系统
- [ ] 多用户支持
