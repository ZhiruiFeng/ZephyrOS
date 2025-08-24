# ZMemory MCP OAuth 设置指南

## 概述

为了使用 zmemory-mcp 的 OAuth 认证功能，需要在 zmemory 系统中注册 OAuth 客户端。

## 🔧 快速设置

### 自动生成配置

使用内置脚本自动生成 OAuth 配置：

```bash
# 开发环境配置
npm run generate:oauth

# 生产环境配置（推荐）
npm run generate:custom https://your-api-domain.com
```

### 手动配置

如果你需要手动配置，请按照以下步骤操作。

## 1. 在 ZMemory 中注册 OAuth 客户端

### 方法一：通过环境变量配置

在 zmemory 的环境变量中添加 `OAUTH_CLIENTS` 配置：

```bash
# 在 zmemory 的 .env 文件中添加
OAUTH_CLIENTS='[
  {
    "client_id": "zmemory-mcp",
    "client_secret": "your-generated-secret-here",
    "redirect_uris": ["http://localhost:3000/callback", "http://localhost:3001/callback"],
    "scopes": ["tasks.write", "tasks.read"]
  }
]'
```

### 方法二：通过数据库配置

如果你有数据库访问权限，可以直接在数据库中插入 OAuth 客户端配置：

```sql
-- 在 zmemory 的数据库中执行
INSERT INTO oauth_clients (client_id, client_secret, redirect_uris, scopes, created_at)
VALUES (
  'zmemory-mcp',
  'your-generated-secret-here',
  '["http://localhost:3000/callback", "http://localhost:3001/callback"]',
  '["tasks.write", "tasks.read"]',
  NOW()
);
```

## 2. 配置 ZMemory MCP

在 zmemory-mcp 的 `.env` 文件中配置：

```bash
# ZMemory API 配置
ZMEMORY_API_URL=http://localhost:3001

# OAuth 配置
OAUTH_CLIENT_ID=zmemory-mcp
OAUTH_CLIENT_SECRET=your-generated-secret-here
OAUTH_REDIRECT_URI=http://localhost:3000/callback
OAUTH_SCOPE=tasks.write
```

## 3. 使用流程

### 步骤 1: 启动认证流程

在 Claude 中调用：

```
请帮我启动 ZMemory 的 OAuth 认证流程
```

Claude 会调用 `authenticate` 工具，返回认证 URL。

### 步骤 2: 完成认证

1. 访问返回的认证 URL
2. 使用 Google 账号登录
3. 授权访问权限
4. 获取授权码

### 步骤 3: 交换令牌

使用授权码调用 `exchange_code_for_token` 工具：

```json
{
  "code": "your-authorization-code",
  "redirect_uri": "http://localhost:3000/callback"
}
```

### 步骤 4: 使用记忆功能

认证成功后，就可以使用所有记忆管理功能了。

## 4. 令牌管理

### 检查认证状态

```
请检查我的 ZMemory 认证状态
```

### 刷新令牌

当访问令牌过期时，使用刷新令牌：

```json
{
  "refresh_token": "your-refresh-token"
}
```

### 手动设置令牌

如果你已经有访问令牌，可以直接设置：

```json
{
  "access_token": "your-access-token"
}
```

## 5. 安全注意事项

### 🔒 重要安全提醒

1. **客户端密钥**: 确保 `client_secret` 的安全性，不要暴露在公开场合
2. **重定向 URI**: 只允许可信的重定向 URI
3. **令牌存储**: 令牌存储在内存中，重启后会丢失
4. **HTTPS**: 生产环境请使用 HTTPS
5. **配置文件**: 不要将包含敏感信息的配置文件提交到版本控制
6. **权限范围**: 根据实际需要配置权限范围

### 生成安全的 client_secret

```bash
# 方法一：使用 Node.js 生成
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 方法二：使用 OpenSSL 生成
openssl rand -hex 32

# 方法三：使用在线工具
# 访问 https://generate-secret.vercel.app/32
```

## 6. 故障排除

### 常见错误

1. **"unauthorized_client"**: 检查客户端 ID 是否正确
2. **"invalid_redirect_uri"**: 检查重定向 URI 是否在允许列表中
3. **"invalid_grant"**: 授权码可能已过期或被使用
4. **"authentication_required"**: 需要先进行 OAuth 认证

### 调试模式

启用调试模式查看详细日志：

```bash
DEBUG=zmemory:* npm run dev
```

## 7. 生产环境配置

### 安全配置建议

在生产环境中，建议：

1. **使用强密码**: 使用强密码作为客户端密钥
2. **配置 HTTPS**: 配置 HTTPS 重定向 URI
3. **限制权限范围**: 根据实际需要配置权限范围
4. **定期轮换密钥**: 定期轮换 API 密钥和服务密钥
5. **监控认证日志**: 监控认证日志以检测异常活动

### 与现有系统集成

如果你已经有生产环境的 OAuth 配置（如 ChatGPT 集成），可以使用：

```bash
# 生成与现有配置兼容的配置
npm run generate:custom https://your-api-domain.com
```

这会保留现有的客户端配置，并添加新的 zmemory-mcp 客户端。

## 8. 测试配置

### 运行测试

```bash
# 测试 OAuth 功能
npm run test:oauth

# 测试 MCP 功能
npm run test:mcp
```

### 验证配置

配置完成后，在 Claude 中测试：

```
请检查我的 ZMemory 认证状态
```

如果配置正确，应该返回认证状态信息。

## 9. 最佳实践

### 开发环境

1. 使用本地重定向 URI：`http://localhost:3000/callback`
2. 使用简单的权限范围：`tasks.write`
3. 定期清理测试数据

### 生产环境

1. 使用 HTTPS 重定向 URI
2. 配置完整的权限范围：`tasks.write tasks.read`
3. 实施令牌轮换策略
4. 监控认证活动

### 安全审计

定期进行安全审计：

1. 检查客户端密钥是否泄露
2. 验证重定向 URI 的安全性
3. 审查权限范围是否合理
4. 检查认证日志中的异常活动

## 10. 相关资源

- [OAuth 2.0 规范](https://tools.ietf.org/html/rfc6749)
- [MCP 协议文档](https://modelcontextprotocol.io/)
- [ZMemory API 文档](../zmemory/README.md)
- [Claude Desktop 配置指南](../README.md#claude-desktop-集成)
