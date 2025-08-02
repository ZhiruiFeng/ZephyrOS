# ZMemory API

ZMemory API 是一个后端服务，为 ZFlow 前端应用提供记忆/任务数据的 RESTful API 接口。

## 架构

```
ZFlow (Frontend) ──HTTP API──► ZMemory API ──Database──► Supabase (PostgreSQL)
```

## 环境变量

确保设置以下环境变量：

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## API 端点

### 健康检查
- `GET /api/health` - 检查 API 服务状态

### 记忆管理
- `GET /api/memories` - 获取记忆列表
- `POST /api/memories` - 创建新记忆
- `GET /api/memories/[id]` - 获取单个记忆
- `PUT /api/memories/[id]` - 更新记忆
- `DELETE /api/memories/[id]` - 删除记忆

## 查询参数

### GET /api/memories
- `type` (可选) - 按类型筛选
- `limit` (可选) - 限制返回数量，默认 50
- `offset` (可选) - 分页偏移量，默认 0

## 请求示例

### 创建任务
```bash
curl -X POST http://localhost:3001/api/memories \
  -H "Content-Type: application/json" \
  -d '{
    "type": "task",
    "content": {
      "title": "完成项目文档",
      "description": "编写项目技术文档",
      "priority": "high"
    },
    "tags": ["zflow", "documentation"]
  }'
```

### 获取任务列表
```bash
curl "http://localhost:3001/api/memories?type=task&limit=10"
```

## 开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 启动生产服务器
npm start
```

## 数据模型

### Memory 表结构
```sql
CREATE TABLE memories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL,
  content JSONB NOT NULL,
  tags TEXT[],
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 错误处理

API 返回标准 HTTP 状态码：
- `200` - 成功
- `201` - 创建成功
- `400` - 请求数据无效
- `404` - 资源未找到
- `500` - 服务器内部错误

错误响应格式：
```json
{
  "error": "错误描述",
  "details": "详细错误信息（可选）"
}
``` 