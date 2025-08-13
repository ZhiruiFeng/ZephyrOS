## ZephyrOS × ChatGPT Actions 集成指南（OAuth2 + Supabase）

### 背景与目标
- 将“创建任务”API 接入 ChatGPT 的 Actions，让 ChatGPT 以真实用户（Supabase 用户）身份创建任务。
- 采用 OAuth 2.0 授权码模式（支持 PKCE）。登录复用 Supabase（含 Google 登录），OAuth 网关托管在后端域 `zmemory.vercel.app`。

### 架构与职责边界
- 授权页与 OAuth 网关：`https://zmemory.vercel.app/oauth/*`
- Supabase 登录回跳（redirect_to）→ 回到授权页 `.../oauth/authorize`
- OAuth 客户端回调（redirect_uri）→ 回到 ChatGPT 专属回调 `https://chatgpt.com/aip/g-.../oauth/callback` 或 `https://chat.openai.com/aip/g-.../oauth/callback`
- ChatGPT 用获取到的 Supabase JWT 调你的 API：`POST /api/tasks`；后端用该 JWT 解析用户并写入 `tasks.user_id`

### 代码结构（已实现）
- 授权页与同意页：`apps/zmemory/app/oauth/authorize/page.tsx`
- 授权码签发：`apps/zmemory/app/oauth/authorize/issue/route.ts`
- 令牌端点：`apps/zmemory/app/oauth/token/route.ts`
- 用户信息（可选调试）：`apps/zmemory/app/oauth/userinfo/route.ts`
- OAuth 内存存储/校验：`apps/zmemory/lib/oauth.ts`
- 后端鉴权（Supabase JWT → user_id）：`apps/zmemory/lib/auth.ts`

## 平台与环境配置

### Supabase（与运行时项目一致）
- Auth → URL Configuration
  - Site URL：可保留前端域 `https://zephyr-os.vercel.app`（兜底）
  - Additional Redirect URLs（生产必需）：
    - `https://zmemory.vercel.app`
    - `https://zmemory.vercel.app/oauth/authorize`
  - 本地（可选）：
    - `http://localhost:3001`
    - `http://localhost:3001/oauth/authorize`

### zmemory（后端域）的环境变量
- 必需：
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- 新增（登记 ChatGPT 为 OAuth 客户端；必须精确包含 GPT 的专属回调，含两个域）：
```env
OAUTH_CLIENTS=[{"client_id":"chatgpt-zephyros","redirect_uris":["https://chatgpt.com/aip/g-<你的GPTID>/oauth/callback","https://chat.openai.com/aip/g-<你的GPTID>/oauth/callback"],"scopes":["tasks.write"]}]
```
- 注意：复制/克隆 GPT 后 g-... 会变；需同步更新并重新部署。

### GPT Actions
- Authentication: OAuth 2（Authorization Code）
- Authorization URL: `https://zmemory.vercel.app/oauth/authorize`
- Token URL: `https://zmemory.vercel.app/oauth/token`
- Scopes: `tasks.write`
- Client ID: `chatgpt-zephyros`（与 `OAUTH_CLIENTS` 一致）
- Client Secret: 留空
- Token exchange method: Default（POST request）
- Redirect URL: 使用 Actions 面板显示的“专属回调”（`.../aip/g-.../oauth/callback`），并加入 `OAUTH_CLIENTS.redirect_uris`

## 授权流程（闭环）
1. ChatGPT 打开授权页  
   `GET https://zmemory.vercel.app/oauth/authorize?...&client_id=chatgpt-zephyros&redirect_uri=https://chatgpt.com/aip/g-.../oauth/callback&state=...&scope=tasks.write`
2. 授权页“使用 Google 登录” → 调 Supabase OAuth，redirectTo 固定为“干净路径”`/oauth/authorize`
3. Google 登录成功 → 回到授权页（可能短暂出现 `#access_token=...`，页面自动解析并清除）
4. 授权页“同意并继续” → `POST /oauth/authorize/issue` 签发授权码 → 302 到 ChatGPT 回调携带 `code`
5. ChatGPT 调 `POST /oauth/token` 换取/刷新令牌
6. ChatGPT 携带 `Authorization: Bearer <Supabase JWT>` 调 `POST /api/tasks`

## 手动调试（可选）
- 换令牌（推荐 x-www-form-urlencoded）：
```bash
curl -X POST https://zmemory.vercel.app/oauth/token \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'grant_type=authorization_code&code=<code>&redirect_uri=https://chatgpt.com/aip/g-<你的GPTID>/oauth/callback&client_id=chatgpt-zephyros'
```
- 创建任务：
```bash
curl -X POST https://zmemory.vercel.app/api/tasks \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{"type":"task","content":{"title":"From OAuth","status":"pending","priority":"high"},"tags":["oauth"]}'
```
- 查询用户信息（调试）：
```bash
curl -H "Authorization: Bearer <access_token>" https://zmemory.vercel.app/oauth/userinfo
```

## 我们踩过的坑与修复
- 登录后回到前端域（非授权页）：Supabase 未允许 zmemory 授权页域/路径，或 redirectTo 太复杂  
  → 白名单加入 `https://zmemory.vercel.app` 与 `/oauth/authorize`；授权页固定 `redirectTo` 为干净路径，授权参数存 `localStorage` 并恢复。
- 回调 URL 与 GPT ID 不一致：以 Actions 面板的回调为准，加入两个域的专属回调（chatgpt.com/chat.openai.com），重新部署后 Disconnect→Connect。
- invalid_grant：授权码一次性、10 分钟有效；或参数不一致；或重启导致内存 code 丢失  
  → 重新授权，立刻换码，用表单编码，参数一字不差，发码/换码之间不要重启。
- 卡在 `#/access_token=...`：这是 Supabase 回跳 hash，页面已自动解析并清理；看到“已登录”后请点“同意并继续”，不要重复登录。
- CSP 报警：多为浏览器扩展注入脚本所致，不影响 OAuth；无痕窗口或禁用扩展验证。
- token exchange method：用 Default（POST request），当前未用 Basic + client_secret。
- Builder 报 `/backend-api/gizmos/undefined`：编辑页没加载到具体 GPT（无 g-...），从 My GPTs 重新进入、保存，再断开重连认证。

## 最佳实践
- 在 `OAUTH_CLIENTS.redirect_uris` 精确白名单 GPT 专属回调（含两个域：chatgpt.com、chat.openai.com）。
- 授权页登录 redirectTo 用“干净路径”；授权参数存储/恢复，稳定回跳。
- Supabase 只白名单授权页域；不要把 ChatGPT 回调放进 Supabase。
- 生产将内存授权码存储替换为 Redis/DB（TTL 管控）。

## FAQ
- 需要自建用户表吗？  
  不需要。直接使用 Supabase 用户；`tasks.user_id` 写入 `auth.users.id`。
- 能否跳过本地直接部署？  
  可以。先用占位回调部署 → 在 Actions 面板拿到专属回调 → 更新 `OAUTH_CLIENTS` → 重新部署 → 完成授权。
- Token 刷新支持吗？  
  支持。`/oauth/token` 已实现 `grant_type=refresh_token`，底层用 `supabase.auth.refreshSession`。

---

## GPT Instruction（输入模式与交互指导）

你是 ZephyrOS 的任务创建助手。你的目标是基于用户意图，调用 “Create Task” Action 创建任务。

- 输入理解与字段映射
  - 必填：title
  - 建议：description、priority（low|medium|high|urgent）、status（pending|in_progress|completed|cancelled|on_hold）
  - 可选：category 或 category_id、due_date（ISO 8601）、estimated_duration（分钟）、progress（0-100）、assignee、notes、tags（字符串数组）
  - 如果用户未指定 status/priority，使用默认：status=pending、priority=medium

- 澄清策略
  - 当 title 不明确时，先简要确认标题（不超过一句）；
  - 对时间表达（如“本周五”）转成 ISO 时间；
  - 对 priority、status 用项目枚举值；必要时向用户确认再落单。

- 动作调用
  - 调用 `createTask` 时，payload 结构如下：
    - type 固定为 `task`
    - content 填上述字段（省略未提供项）
    - tags 为数组（如未提供则空数组）
  - 任务创建成功后，简短反馈标题与关键字段（如截止时间/优先级），避免冗长。

- 错误处理
  - 400：提示缺失或格式错误字段；尽量提示用户应补充的最小字段（通常就是 title）
  - 401：提示需要先完成授权
  - 429/5xx：提示稍后重试；避免连发请求

- 示例话术
  - “创建任务：修复登录白屏；优先级 high；本周五到期；标签 bug, ui；指派给 alice”
  - “在分类 work 下创建任务：补充移动端 E2E 测试；预计 240 分钟；progress 0；status pending”

- 风格与安全
  - 简洁、务实；优先完成 Action 调用
  - 不编造不存在的字段；不泄露 token 或内部系统信息

- 国际化
  - 用户中文输入优先中文回应；保留用户原始名词（如标签/人名）

建议的 createTask 请求体模板：
```json
{
  "type": "task",
  "content": {
    "title": "<string>",
    "description": "<string>",
    "status": "pending",
    "priority": "medium",
    "category": "work",
    "due_date": "2025-09-01T17:00:00Z",
    "estimated_duration": 120,
    "progress": 0,
    "assignee": "alice",
    "notes": "<string>"
  },
  "tags": ["tag1","tag2"]
}
```

以上内容可直接作为团队分享文档与 GPT 的内置说明，保证后续同类集成和使用的一致性与可维护性。