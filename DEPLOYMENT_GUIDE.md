# 🚀 ZephyrOS Vercel 部署指南

## 📋 前置要求

1. **Vercel账户** - 在 [vercel.com](https://vercel.com) 注册账户
2. **GitHub仓库** - 确保代码已推送到GitHub
3. **Supabase项目** - 配置好数据库和认证

## 🔧 环境变量配置

### 必需的环境变量

在Vercel项目设置中添加以下环境变量：

```bash
# Supabase 配置 (必需)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# 应用配置 (必需)
NEXT_PUBLIC_APP_URL=https://your-vercel-domain.vercel.app
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://your-vercel-domain.vercel.app/api

# OpenAI 配置 (可选，用于语音转文字功能)
OPENAI_API_KEY=your_openai_api_key
```

### 可选的环境变量

```bash
# 生产环境安全配置
PRODUCTION_FRONTEND_URL=https://your-vercel-domain.vercel.app
ALLOWED_ORIGINS=https://your-vercel-domain.vercel.app

# 监控配置
SENTRY_DSN=your_sentry_dsn
ANALYTICS_ID=your_analytics_id

# 安全配置
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
ENABLE_REQUEST_LOGGING=true
```

## 📦 部署步骤

### 方法一：通过Vercel Dashboard部署

1. **连接GitHub仓库**
   - 登录 [Vercel Dashboard](https://vercel.com/dashboard)
   - 点击 "New Project"
   - 选择你的GitHub仓库

2. **配置项目设置**
   - **Framework Preset**: Next.js
   - **Root Directory**: `./` (根目录)
   - **Build Command**: `npm run build`
   - **Install Command**: `npm install`
   - **Output Directory**: `apps/zflow/.next`

3. **设置环境变量**
   - 在项目设置中添加上述必需的环境变量
   - 确保所有Supabase相关的变量都已正确配置

4. **部署**
   - 点击 "Deploy" 按钮
   - 等待构建完成

### 方法二：通过Vercel CLI部署

1. **安装Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **登录Vercel**
   ```bash
   vercel login
   ```

3. **部署项目**
   ```bash
   vercel --prod
   ```

4. **配置环境变量**
   ```bash
   vercel env add NEXT_PUBLIC_SUPABASE_URL
   vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
   vercel env add SUPABASE_SERVICE_ROLE_KEY
   vercel env add NEXT_PUBLIC_APP_URL
   vercel env add NODE_ENV
   vercel env add NEXT_PUBLIC_API_URL
   ```

## 🔍 部署后检查

### 1. 检查构建日志
- 确保所有依赖安装成功
- 确保构建过程没有错误
- 检查环境变量是否正确加载

### 2. 测试应用功能
- 访问主页面: `https://your-domain.vercel.app`
- 测试API端点: `https://your-domain.vercel.app/api/health`
- 检查认证功能
- 测试数据库连接

### 3. 检查路由配置
- 前端应用: `https://your-domain.vercel.app`
- API服务: `https://your-domain.vercel.app/api/*`
- 文档页面: `https://your-domain.vercel.app/api/docs`

## 🛠️ 故障排除

### 常见问题

1. **构建失败**
   - 检查环境变量是否正确设置
   - 确保所有依赖都已安装
   - 查看构建日志中的具体错误

2. **API路由不工作**
   - 检查vercel.json中的rewrites配置
   - 确保API函数正确部署
   - 验证CORS配置

3. **数据库连接失败**
   - 检查Supabase环境变量
   - 确保Supabase项目已正确配置
   - 验证网络连接

4. **认证问题**
   - 检查Supabase认证配置
   - 确保回调URL正确设置
   - 验证JWT密钥配置

### 调试命令

```bash
# 本地测试构建
npm run build

# 检查环境变量
vercel env ls

# 查看部署日志
vercel logs

# 重新部署
vercel --prod --force
```

## 🔒 安全配置

### 生产环境安全清单

- [ ] 所有敏感环境变量已设置
- [ ] CORS配置正确（不要使用*）
- [ ] 启用了HTTPS
- [ ] 配置了安全头部
- [ ] 设置了速率限制
- [ ] 启用了请求日志记录

### 监控和日志

- 配置Sentry错误监控
- 设置性能监控
- 启用访问日志
- 配置告警通知

## 📈 性能优化

### 构建优化

- 使用Turbo缓存加速构建
- 优化依赖包大小
- 启用代码分割
- 配置CDN缓存

### 运行时优化

- 启用Next.js缓存
- 优化图片加载
- 配置静态资源缓存
- 启用Gzip压缩

## 🔄 持续部署

### 自动部署配置

1. **GitHub Actions** (可选)
   - 配置自动测试
   - 自动部署到staging环境
   - 手动部署到production

2. **Vercel自动部署**
   - 推送到main分支自动部署
   - 创建PR预览部署
   - 配置部署保护规则

## 📞 支持

如果遇到部署问题：

1. 查看 [Vercel文档](https://vercel.com/docs)
2. 检查项目GitHub Issues
3. 联系项目维护者

---

**注意**: 部署前请确保所有代码已测试通过，并且环境变量已正确配置。
