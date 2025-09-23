# 02 — Setup (EN/中文)

Environment variables
- ZMEMORY_API_URL: http://localhost:3001 (default from repo)
- ZMEMORY_API_KEY: API key (optional alternative to OAuth)
- OAUTH_CLIENT_ID, OAUTH_CLIENT_SECRET, OAUTH_REDIRECT_URI, OAUTH_SCOPE
- ZMEMORY_TIMEOUT: 10000
- ZMEMORY_MCP_LOCALE: auto | en | zh (default: auto)

Quick start
1) Install and build
   ```bash
   npm install
   npm run build
   ```
2) Development
   ```bash
   npm run dev -w @zephyros/zmemory-mcp
   ```
3) Claude Code (example)
   ```json
   {
     "mcp": {
       "servers": {
         "zmemory": {
           "command": "tsx",
           "args": ["/Users/zhiruifeng/Workspace/dev/ZephyrOS/apps/zmemory-mcp/src/index.ts"],
           "env": {
             "ZMEMORY_API_URL": "http://localhost:3001",
             "ZMEMORY_MCP_LOCALE": "auto",
             "OAUTH_CLIENT_ID": "zmemory-mcp",
             "OAUTH_CLIENT_SECRET": "{{OAUTH_CLIENT_SECRET}}",
             "OAUTH_REDIRECT_URI": "http://localhost:3001/oauth/callback",
             "OAUTH_SCOPE": "tasks.write,tasks.read"
           }
         }
       }
     }
   }
   ```

API key authentication (optional)
- Set ZMEMORY_API_KEY in env
- Remove OAuth variables if not needed

Locale control
- Default auto-detect per call
- Override globally via ZMEMORY_MCP_LOCALE
- Override at runtime via set_locale tool

安全提示（中文）
- 不要在仓库提交任何密钥；以环境变量形式注入
- 文档中使用 {{OAUTH_CLIENT_SECRET}} 这类占位符
- 生产环境使用 HTTPS
