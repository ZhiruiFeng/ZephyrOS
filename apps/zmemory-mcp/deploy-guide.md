# ZMemory MCP Vercel部署指南

## 🚀 通过Vercel Web界面部署

### 1. 准备工作
确保你的代码已经推送到GitHub：
```bash
git add .
git commit -m "feat: add vercel serverless support for zmemory-mcp"
git push origin main
```

### 2. Vercel Web界面配置

#### 访问Vercel
1. 打开 [vercel.com](https://vercel.com)
2. 登录你的GitHub账号
3. 点击 "Add New..." → "Project"

#### 导入项目
1. 找到 `ZephyrOS` 仓库
2. 点击 "Import"
3. 配置项目设置：
   - **Project Name**: `zmemory-mcp`
   - **Framework Preset**: `Other` 或 `Next.js`
   - **Root Directory**: `apps/zmemory-mcp`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

#### 环境变量设置
在项目设置 > Environment Variables 中添加：

| Variable Name | Value | Environment |
|---------------|-------|-------------|
| `ZMEMORY_API_URL` | `https://your-zmemory-api.vercel.app` | Production |
| `OAUTH_CLIENT_ID` | `zmemory-mcp` | Production |
| `OAUTH_CLIENT_SECRET` | `your_oauth_secret_here` | Production |
| `OAUTH_REDIRECT_URI` | `http://localhost:3000/callback` | Production |
| `OAUTH_SCOPE` | `tasks.write` | Production |
| `ZMEMORY_TIMEOUT` | `10000` | Production |
| `NODE_ENV` | `production` | Production |

### 3. 部署

1. 点击 "Deploy" 按钮
2. 等待构建完成
3. 获取部署URL（格式：`https://zmemory-mcp-xxx.vercel.app`）

### 4. 测试部署

部署完成后，可以通过以下方式测试：

#### 健康检查
```bash
curl https://your-deployment-url.vercel.app/api/mcp
```

应该返回：
```json
{
  "status": "healthy",
  "service": "zmemory-mcp",
  "timestamp": "2024-01-20T10:30:00.000Z",
  "version": "1.0.0"
}
```

#### 测试MCP工具列表
```bash
curl -X POST https://your-deployment-url.vercel.app/api/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/list",
    "id": 1
  }'
```

### 5. 更新ZMemory API URL
记住更新环境变量中的 `ZMEMORY_API_URL` 为你实际的ZMemory API地址。

### 6. 常见问题

#### 构建失败
- 检查 `Root Directory` 是否设置为 `apps/zmemory-mcp`
- 确保 `package.json` 中有 `vercel-build` 脚本

#### API调用失败
- 检查环境变量是否正确设置
- 确保 `ZMEMORY_API_URL` 指向正确的ZMemory API服务

#### CORS错误
- API路由已经配置了CORS，应该不会有问题
- 如果仍有问题，检查请求头是否正确

## 🎉 完成！

部署成功后，你就有了一个远程的MCP服务，可以被多个AI Agent访问！

下一步：创建HTTP客户端适配器来替代stdio通信方式。
