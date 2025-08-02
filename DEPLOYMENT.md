# ZephyrOS 部署指南

## 架构概述

ZephyrOS 采用前后端分离的架构，使用 Vercel 进行部署：

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   ZFlow App     │    │  ZMemory App    │    │   Supabase      │
│   (端口: 3001)  │    │  (端口: 3002)   │    │   (数据库)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Vercel        │
                    │   (部署平台)    │
                    └─────────────────┘
```

## 部署选项

### 方案一：Vercel 全栈部署（推荐）

**优势：**
- 零配置部署
- 自动 HTTPS
- 全球 CDN
- Serverless 函数支持
- 与 Supabase 完美集成

**部署步骤：**

1. **准备 Supabase 项目**
   ```bash
   # 1. 创建 Supabase 项目
   # 2. 运行数据库 schema
   # 3. 获取 API 密钥
   ```

2. **配置环境变量**
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. **Vercel 部署**
   ```bash
   # 安装 Vercel CLI
   npm i -g vercel
   
   # 登录 Vercel
   vercel login
   
   # 部署项目
   vercel --prod
   ```

### 方案二：分离部署

**前端部署：**
- ZFlow: Vercel
- ZMemory: Vercel

**后端部署：**
- API Routes: Vercel Functions
- 数据库: Supabase

## 详细部署步骤

### 1. Supabase 设置

1. 访问 [Supabase](https://supabase.com) 创建新项目
2. 在 SQL Editor 中运行 `supabase/schema.sql`
3. 获取项目 URL 和 anon key

### 2. 本地开发环境

```bash
# 克隆项目
git clone <your-repo>
cd ZephyrOS

# 安装依赖
npm install

# 创建环境变量文件
cp .env.example .env.local

# 编辑环境变量
nano .env.local
```

### 3. Vercel 部署配置

**vercel.json 配置说明：**
```json
{
  "buildCommand": "npm run build",
  "installCommand": "npm install",
  "framework": "nextjs",
  "functions": {
    "apps/zflow/app/api/**/*.ts": {
      "runtime": "nodejs18.x"
    },
    "apps/zmemory/app/api/**/*.ts": {
      "runtime": "nodejs18.x"
    }
  }
}
```

### 4. 域名配置

**推荐域名结构：**
- ZFlow: `zflow.yourdomain.com`
- ZMemory: `zmemory.yourdomain.com`
- API: `api.yourdomain.com`

### 5. 环境变量管理

**Vercel 环境变量：**
```env
# Supabase 配置
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# 应用配置
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

## 监控和维护

### 1. 性能监控
- Vercel Analytics
- Supabase Dashboard
- 自定义监控

### 2. 日志管理
```bash
# 查看 Vercel 函数日志
vercel logs

# 查看 Supabase 日志
# 在 Supabase Dashboard 中查看
```

### 3. 数据库备份
- Supabase 自动备份
- 手动备份脚本

## 扩展部署

### 添加新应用
1. 在 `apps/` 创建新应用
2. 更新 `vercel.json`
3. 配置环境变量
4. 部署到 Vercel

### 微服务架构
```bash
# 未来可扩展为微服务
apps/
├── zflow/          # 任务管理服务
├── zmemory/        # 数据中枢服务
├── zchat/          # AI 聊天服务
└── zanalytics/     # 分析服务
```

## 故障排除

### 常见问题

1. **构建失败**
   ```bash
   # 检查依赖
   npm install
   
   # 清理缓存
   npm run clean
   
   # 重新构建
   npm run build
   ```

2. **环境变量问题**
   ```bash
   # 检查环境变量
   vercel env ls
   
   # 重新设置
   vercel env add
   ```

3. **数据库连接问题**
   - 检查 Supabase URL 和 Key
   - 验证网络连接
   - 检查 RLS 策略

### 性能优化

1. **图片优化**
   ```jsx
   import Image from 'next/image'
   
   <Image
     src="/image.jpg"
     alt="Description"
     width={500}
     height={300}
     priority
   />
   ```

2. **代码分割**
   ```jsx
   import dynamic from 'next/dynamic'
   
   const DynamicComponent = dynamic(() => import('./Component'))
   ```

3. **缓存策略**
   ```jsx
   // API 路由缓存
   export async function GET() {
     return new Response(data, {
       headers: {
         'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=59',
       },
     })
   }
   ```

## 安全考虑

1. **环境变量安全**
   - 不要提交 `.env` 文件
   - 使用 Vercel 环境变量
   - 定期轮换密钥

2. **数据库安全**
   - 启用 RLS
   - 限制 API 访问
   - 监控异常访问

3. **应用安全**
   - 输入验证
   - XSS 防护
   - CSRF 防护

## 成本估算

### Vercel 成本
- Hobby 计划: $0/月
- Pro 计划: $20/月
- Enterprise: 联系销售

### Supabase 成本
- Free 计划: $0/月
- Pro 计划: $25/月
- Enterprise: 联系销售

**推荐配置：**
- 开发阶段: Vercel Hobby + Supabase Free
- 生产阶段: Vercel Pro + Supabase Pro 