# 🔧 Vercel 部署故障排除指南

## 🚨 常见构建错误及解决方案

### 1. 构建失败：Next.js build worker exited with code: 1

**错误信息：**
```
Next.js build worker exited with code: 1 and signal: null
npm error Lifecycle script `build` failed with error:
npm error code 1
npm error path /vercel/path0/apps/zflow
```

**可能原因：**
- 缺少必需的环境变量
- 依赖包引用错误
- TypeScript类型错误
- 内存不足

**解决方案：**

#### 检查环境变量
确保在Vercel项目设置中添加了所有必需的环境变量：

```bash
# 必需的环境变量
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
NEXT_PUBLIC_APP_URL=https://your-vercel-domain.vercel.app
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://your-vercel-domain.vercel.app/api

# 可选的环境变量
OPENAI_API_KEY=your_openai_api_key
```

#### 检查依赖包
确保package.json中没有引用不存在的包：

```json
{
  "dependencies": {
    "@zephyros/shared": "*",
    // 移除 "@zephyros/backend": "*" 如果该包不存在
  }
}
```

#### 检查TypeScript配置
确保所有API路由的params类型正确：

```typescript
// 正确的类型定义 (Next.js 15)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  // ...
}
```

### 2. 环境变量未定义错误

**错误信息：**
```
ReferenceError: process is not defined
```

**解决方案：**
- 确保环境变量以`NEXT_PUBLIC_`开头（客户端使用）
- 检查环境变量是否正确设置在Vercel中
- 重启部署

### 3. 依赖安装失败

**错误信息：**
```
npm ERR! code ENOENT
npm ERR! syscall open
npm ERR! path /vercel/path0/package-lock.json
```

**解决方案：**
- 确保package-lock.json已提交到Git
- 检查package.json语法是否正确
- 清理node_modules并重新安装

### 4. 内存不足错误

**错误信息：**
```
JavaScript heap out of memory
```

**解决方案：**
- 增加Vercel构建内存限制
- 优化构建配置
- 减少不必要的依赖

## 🔍 调试步骤

### 1. 本地测试构建
```bash
# 清理缓存
rm -rf .next
rm -rf node_modules
npm install

# 测试构建
npm run build
```

### 2. 检查Vercel构建日志
1. 登录Vercel Dashboard
2. 进入项目设置
3. 查看"Deployments"标签
4. 点击失败的部署查看详细日志

### 3. 验证环境变量
```bash
# 使用Vercel CLI检查环境变量
vercel env ls
```

### 4. 测试特定应用构建
```bash
# 测试zflow应用
cd apps/zflow
npm run build

# 测试zmemory应用
cd apps/zmemory
npm run build
```

## 🛠️ 常见修复

### 修复1：移除不存在的依赖包
```bash
# 编辑package.json，移除不存在的包引用
# 例如：移除 "@zephyros/backend": "*"
```

### 修复2：更新Next.js配置
```javascript
// next.config.js
const nextConfig = {
  transpilePackages: ['@zephyros/shared'], // 只包含存在的包
  // ...
}
```

### 修复3：修复API路由类型
```typescript
// 修复params类型定义
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  // ...
}
```

## 📞 获取帮助

### 1. 查看Vercel文档
- [Vercel部署指南](https://vercel.com/docs/deployments)
- [Next.js部署](https://vercel.com/docs/functions/serverless-functions/runtimes/node-js)

### 2. 检查项目日志
- Vercel构建日志
- 应用运行时日志
- 错误监控工具

### 3. 联系支持
- Vercel支持：support@vercel.com
- 项目维护者

## 🔄 重新部署

### 强制重新部署
```bash
# 使用Vercel CLI
vercel --prod --force

# 或在Dashboard中点击"Redeploy"
```

### 清理缓存部署
```bash
# 清理所有缓存
vercel --prod --force --clear-cache
```

---

**注意**: 如果问题仍然存在，请提供完整的错误日志以便进一步诊断。
