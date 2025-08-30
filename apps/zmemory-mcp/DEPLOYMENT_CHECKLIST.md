# ZMemory MCP Vercel部署检查清单

## ✅ 部署前检查

### 1. 文件结构
```
apps/zmemory-mcp/
├── api/mcp.js              ✅ Vercel API函数
├── dist/                   ✅ 编译后的TypeScript
├── src/                    ✅ 源代码
├── package.json           ✅ 依赖配置
├── vercel.json            ✅ Vercel配置
└── tsconfig.json          ✅ TypeScript配置
```

### 2. 关键配置文件

#### package.json ✅
```json
{
  "type": "module",
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "@types/node": "^20.0.0",
    "axios": "^1.6.0",
    "dotenv": "^17.2.1",
    "typescript": "^5.0.0",
    "zod": "^3.22.0"
  },
  "scripts": {
    "build": "tsc",
    "vercel-build": "npm run build"
  }
}
```

#### vercel.json ✅
```json
{
  "version": 2,
  "name": "zmemory-mcp",
  "framework": null,
  "buildCommand": "npm run build",
  "installCommand": "npm install",
  "functions": {
    "api/mcp.js": {
      "maxDuration": 30
    }
  },
  "rewrites": [
    {
      "source": "/health",
      "destination": "/api/mcp"
    }
  ]
}
```

#### api/mcp.js ✅
- ✅ 使用ES模块语法 (`import`/`export`)
- ✅ 导出默认函数 (`export default async function handler`)
- ✅ 正确的CORS配置
- ✅ 完整的MCP协议支持

### 3. 环境变量设置

在Vercel Dashboard中设置以下环境变量：

| Variable | Value | Required |
|----------|-------|----------|
| `ZMEMORY_API_URL` | `https://your-zmemory-api.vercel.app` | ✅ |
| `OAUTH_CLIENT_ID` | `zmemory-mcp` | ✅ |
| `OAUTH_CLIENT_SECRET` | `your_secret_here` | ⚠️ |
| `OAUTH_REDIRECT_URI` | `http://localhost:3000/callback` | ✅ |
| `OAUTH_SCOPE` | `tasks.write` | ✅ |
| `ZMEMORY_TIMEOUT` | `10000` | ✅ |

### 4. 部署步骤

#### 通过Vercel Dashboard (推荐)
1. 访问 [vercel.com/dashboard](https://vercel.com/dashboard)
2. 点击 "Add New..." → "Project"
3. 选择 ZephyrOS 仓库
4. 配置项目设置：
   - **Project Name**: `zmemory-mcp`
   - **Framework Preset**: `Other`
   - **Root Directory**: `apps/zmemory-mcp`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

#### 通过Vercel CLI (可选)
```bash
cd apps/zmemory-mcp
vercel
# 按提示配置
vercel --prod
```

### 5. 部署后测试

#### 健康检查
```bash
curl https://your-deployment-url.vercel.app/api/mcp
```

期待响应：
```json
{
  "status": "healthy",
  "service": "zmemory-mcp",
  "timestamp": "2024-01-20T10:30:00.000Z",
  "version": "1.0.0"
}
```

#### MCP工具列表
```bash
curl -X POST https://your-deployment-url.vercel.app/api/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/list",
    "id": 1
  }'
```

#### MCP初始化
```bash
curl -X POST https://your-deployment-url.vercel.app/api/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "initialize",
    "params": {},
    "id": 1
  }'
```

### 6. 常见问题解决

#### 构建失败
- ✅ 检查 `typescript` 在 dependencies 中
- ✅ 确保 `npm run build` 本地可执行
- ✅ 检查 TypeScript 编译错误

#### 模块导入错误
- ✅ 使用 ES 模块语法 (`import`/`export`)
- ✅ 确保 `package.json` 中 `"type": "module"`
- ✅ 文件扩展名包含 `.js`

#### API 调用失败
- ✅ 检查环境变量设置
- ✅ 验证 ZMEMORY_API_URL 正确
- ✅ 检查 CORS 配置

### 7. 性能优化建议

- ✅ 设置合适的函数超时时间 (30秒)
- ✅ 使用环境变量缓存配置
- ✅ 实现适当的错误处理
- ✅ 添加请求日志记录

## 🎉 部署完成检查

部署成功后确认：
- [ ] 健康检查端点返回200状态
- [ ] MCP工具列表可以正常获取
- [ ] 环境变量正确配置
- [ ] CORS设置允许客户端访问
- [ ] 错误处理正常工作

## 📞 获取帮助

如果遇到问题：
1. 检查 Vercel 部署日志
2. 查看浏览器控制台错误
3. 测试 API 端点响应
4. 验证环境变量设置
