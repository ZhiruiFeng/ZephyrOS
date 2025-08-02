# ZephyrOS 开发指南

## 快速开始

### 1. 环境要求

- Node.js 18+ 
- npm 或 yarn
- Git

### 2. 项目设置

```bash
# 克隆项目
git clone <your-repo>
cd ZephyrOS

# 运行设置脚本
./scripts/setup.sh

# 或手动设置
npm install
cp env.example .env.local
# 编辑 .env.local 文件
```

### 3. 配置环境变量

编辑 `.env.local` 文件：

```env
# Supabase 配置（必需）
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# 应用配置
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

### 4. 启动开发服务器

```bash
# 启动所有应用
npm run dev

# 单独启动应用
npm run dev --workspace=@zephyros/zflow
npm run dev --workspace=@zephyros/zmemory
```

## 项目结构

```
ZephyrOS/
├── apps/                    # 前端应用
│   ├── zflow/              # 任务管理系统
│   └── zmemory/            # 数据中枢
├── packages/                # 共享包
│   ├── backend/            # 后端API
│   ├── shared/             # 共享类型和工具
│   └── ui/                 # 共享UI组件
├── scripts/                 # 脚本文件
├── supabase/               # 数据库配置
└── docs/                   # 文档
```

## 开发工作流

### 1. 添加新功能

```bash
# 1. 创建功能分支
git checkout -b feature/new-feature

# 2. 开发功能
# 在相应的应用或包中开发

# 3. 测试
npm run test
npm run type-check

# 4. 提交代码
git add .
git commit -m "feat: add new feature"

# 5. 推送分支
git push origin feature/new-feature
```

### 2. 添加新应用

1. 在 `apps/` 目录下创建新应用
2. 复制现有应用的配置文件
3. 更新 `package.json` 的 workspaces
4. 添加应用到 `turbo.json`

### 3. 添加共享包

1. 在 `packages/` 目录下创建新包
2. 配置 `package.json` 和 `tsconfig.json`
3. 在应用中使用 `workspace:*` 依赖

## 代码规范

### TypeScript 配置

- 使用严格模式
- 启用所有类型检查
- 使用 ESLint 和 Prettier

### 组件开发

```tsx
// 组件示例
import React from 'react'
import { Task } from '@zephyros/shared'

interface TaskItemProps {
  task: Task
  onToggle: (id: string) => void
}

export const TaskItem: React.FC<TaskItemProps> = ({ task, onToggle }) => {
  return (
    <div className="card">
      {/* 组件内容 */}
    </div>
  )
}
```

### API 开发

```tsx
// API 路由示例
import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@zephyros/backend'

export async function GET() {
  try {
    const { data, error } = await DatabaseService.getTasks()
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

## 数据库操作

### 使用 Supabase

```tsx
import { supabase } from '@zephyros/backend'

// 查询数据
const { data, error } = await supabase
  .from('tasks')
  .select('*')
  .order('created_at', { ascending: false })

// 插入数据
const { data, error } = await supabase
  .from('tasks')
  .insert([{ title: '新任务', status: 'pending' }])
  .select()

// 更新数据
const { data, error } = await supabase
  .from('tasks')
  .update({ status: 'completed' })
  .eq('id', taskId)
  .select()

// 删除数据
const { error } = await supabase
  .from('tasks')
  .delete()
  .eq('id', taskId)
```

### 使用 DatabaseService

```tsx
import { DatabaseService } from '@zephyros/backend'

// 获取所有任务
const { data, error } = await DatabaseService.getTasks()

// 创建任务
const { data, error } = await DatabaseService.createTask({
  title: '新任务',
  status: 'pending',
  priority: 'medium'
})

// 更新任务
const { data, error } = await DatabaseService.updateTask(taskId, {
  status: 'completed'
})
```

## 测试

### 单元测试

```bash
# 运行所有测试
npm run test

# 运行特定包的测试
npm run test --workspace=@zephyros/zflow

# 运行测试并生成覆盖率报告
npm run test:coverage
```

### 类型检查

```bash
# 检查所有包的 TypeScript 类型
npm run type-check

# 检查特定包的类型
npm run type-check --workspace=@zephyros/shared
```

### 代码质量

```bash
# 运行 ESLint
npm run lint

# 运行 Prettier
npm run format

# 自动修复
npm run lint:fix
```

## 调试

### 前端调试

1. 使用浏览器开发者工具
2. 使用 React Developer Tools
3. 使用 Next.js 调试模式

```bash
# 启动调试模式
npm run dev -- --inspect
```

### 后端调试

1. 使用 Vercel 函数日志
2. 使用 Supabase 日志
3. 本地调试 API 路由

### 数据库调试

1. 使用 Supabase Dashboard
2. 使用 SQL Editor
3. 查看实时日志

## 性能优化

### 前端优化

1. **代码分割**
   ```tsx
   import dynamic from 'next/dynamic'
   
   const DynamicComponent = dynamic(() => import('./Component'))
   ```

2. **图片优化**
   ```tsx
   import Image from 'next/image'
   
   <Image
     src="/image.jpg"
     alt="Description"
     width={500}
     height={300}
     priority
   />
   ```

3. **缓存策略**
   ```tsx
   export async function GET() {
     return new Response(data, {
       headers: {
         'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=59',
       },
     })
   }
   ```

### 数据库优化

1. **索引优化**
   ```sql
   CREATE INDEX idx_tasks_user_id ON tasks(user_id);
   CREATE INDEX idx_tasks_status ON tasks(status);
   ```

2. **查询优化**
   ```sql
   -- 使用 LIMIT 限制结果
   SELECT * FROM tasks WHERE user_id = $1 LIMIT 50;
   
   -- 使用索引字段排序
   SELECT * FROM tasks ORDER BY created_at DESC;
   ```

## 部署

### 本地测试

```bash
# 构建所有应用
npm run build

# 启动生产服务器
npm run start --workspace=@zephyros/zflow
npm run start --workspace=@zephyros/zmemory
```

### Vercel 部署

```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录 Vercel
vercel login

# 部署项目
vercel --prod
```

## 常见问题

### 1. 依赖问题

```bash
# 清理依赖
rm -rf node_modules
rm -rf packages/*/node_modules
rm -rf apps/*/node_modules

# 重新安装
npm install
```

### 2. 类型错误

```bash
# 重新构建共享包
npm run build --workspace=@zephyros/shared

# 检查类型
npm run type-check
```

### 3. 端口冲突

```bash
# 检查端口占用
lsof -i :3001
lsof -i :3002

# 杀死进程
kill -9 <PID>
```

### 4. 环境变量问题

```bash
# 检查环境变量
echo $NEXT_PUBLIC_SUPABASE_URL

# 重新加载环境变量
source .env.local
```

## 贡献指南

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

## 资源链接

- [Next.js 文档](https://nextjs.org/docs)
- [React 文档](https://react.dev)
- [TypeScript 文档](https://www.typescriptlang.org/docs)
- [Tailwind CSS 文档](https://tailwindcss.com/docs)
- [Supabase 文档](https://supabase.com/docs)
- [Vercel 文档](https://vercel.com/docs) 