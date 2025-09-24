# ZMemory API

ZMemory API is a backend service that provides RESTful API endpoints for memory/task data to the ZFlow frontend application.

## Architecture

```
ZFlow (Frontend) ──HTTP API──► ZMemory API ──Database──► Supabase (PostgreSQL)
```

## Environment Variables

Ensure the following environment variables are set:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## API Endpoints

### Health Check
- `GET /api/health` - Check API service status

### Memory Management
- `GET /api/memories` - Get memory list
- `POST /api/memories` - Create new memory
- `GET /api/memories/[id]` - Get single memory
- `PUT /api/memories/[id]` - Update memory
- `DELETE /api/memories/[id]` - Delete memory

## Query Parameters

### GET /api/memories
- `type` (optional) - Filter by type
- `limit` (optional) - Limit number of results, default 50
- `offset` (optional) - Pagination offset, default 0

## Request Examples

### Create Task
```bash
curl -X POST http://localhost:3001/api/memories \
  -H "Content-Type: application/json" \
  -d '{
    "type": "task",
    "content": {
      "title": "Complete project documentation",
      "description": "Write project technical documentation",
      "priority": "high"
    },
    "tags": ["zflow", "documentation"]
  }'
```

### Get Task List
```bash
curl "http://localhost:3001/api/memories?type=task&limit=10"
```

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build production version
npm run build

# Start production server
npm start
```

### Next.js 15 Dynamic Route Parameters

⚠️ **Important**: This project uses Next.js 15, which has breaking changes for dynamic route parameters.

#### The Problem
In Next.js 15, route parameters (`params`) are now **async** and must be awaited before use. Directly accessing `params.id` will cause runtime errors:

```typescript
// ❌ WRONG (will cause error in Next.js 15)
export async function GET(request: NextRequest, { params }: any) {
  const id = params.id // Error: params should be awaited first
}
```

#### The Solution
Always await params before accessing properties:

```typescript
// ✅ CORRECT (Next.js 15 compatible)
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params
  const { id } = params // Safe to use now
}
```

#### When Working with MCP

When using this API through MCP (Model Context Protocol), the async params pattern is especially important because:

1. **MCP relies on HTTP APIs**: All MCP tools ultimately make HTTP requests to these API routes
2. **Error propagation**: Async params errors will surface as tool execution failures in MCP clients (like Claude)
3. **JSON parsing errors**: Improperly handled params can cause response malformation

#### Migration Checklist

When adding new dynamic routes (`[id]`, `[slug]`, etc.):

- [ ] Use proper TypeScript types: `context: { params: Promise<{ id: string }> }`
- [ ] Await params: `const params = await context.params`
- [ ] Extract needed properties: `const { id } = params`
- [ ] Test both direct HTTP calls and MCP tool usage

#### Common Patterns

**Single dynamic parameter:**
```typescript
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params
  const { id } = params
  // Use id safely...
}
```

**Multiple dynamic parameters:**
```typescript
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ categoryId: string; itemId: string }> }
) {
  const params = await context.params
  const { categoryId, itemId } = params
  // Use both parameters safely...
}
```

## Data Model

### Memory Table Structure
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

## Error Handling

API returns standard HTTP status codes:
- `200` - Success
- `201` - Created successfully
- `400` - Invalid request data
- `404` - Resource not found
- `500` - Internal server error

Error response format:
```json
{
  "error": "Error description",
  "details": "Detailed error information (optional)"
}
``` 