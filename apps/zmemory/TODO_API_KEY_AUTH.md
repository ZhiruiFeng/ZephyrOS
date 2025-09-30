# TODO: Apply API Key Authentication Fix to Other Routes

## Background

Currently, only the `/api/tasks/*` endpoints support API key authentication (zm_...) in addition to OAuth JWT tokens. This was fixed using the `getClientForAuthType()` helper function.

**The Fix**:
```typescript
// ❌ Old pattern (fails for API keys)
const client = createClientForRequest(request) || supabase

// ✅ New pattern (supports both OAuth and API keys)
const client = await getClientForAuthType(request) || supabase
```

## Why This Matters

The MCP server exposes tools that call these endpoints. If users want to use API keys (zm_...) instead of OAuth tokens to access zmemory via MCP from external clients, these routes need the fix.

**Current Status**: Only OAuth tokens work for non-task endpoints when called via MCP.

## Routes That Need Fixing

### High Priority (Exposed via MCP)

#### Memories API
- [ ] `/api/memories/route.ts` (GET, POST)
- [ ] `/api/memories/[id]/route.ts` (GET, PATCH, DELETE)
- [ ] `/api/memories/search/route.ts` (POST)
- [ ] `/api/memories/stats/route.ts` (GET)
- [ ] `/api/memories/auto-enhance/route.ts` (POST)
- [ ] `/api/memories/analyze/route.ts` (POST)

#### Activities API
- [ ] `/api/activities/route.ts` (GET, POST)
- [ ] `/api/activities/[id]/route.ts` (GET, PATCH, DELETE)
- [ ] `/api/activities/stats/route.ts` (GET)
- [ ] `/api/activities/[id]/time-entries/route.ts` (GET, POST)

#### Timeline API
- [ ] `/api/timeline-items/route.ts` (GET, POST)
- [ ] `/api/timeline-items/[id]/route.ts` (GET, PATCH, DELETE)
- [ ] `/api/timeline-items/highlights/route.ts` (GET)
- [ ] `/api/timeline-items/insights/route.ts` (GET)
- [ ] `/api/timeline-items/search/route.ts` (POST)
- [ ] `/api/timeline-items/[id]/time-entries/route.ts` (GET)

#### AI Tasks API
- [ ] `/api/ai-tasks/route.ts` (GET, POST)
- [ ] `/api/ai-tasks/[id]/route.ts` (GET, PATCH, DELETE)
- [ ] `/api/ai-tasks/stats/route.ts` (GET)
- [ ] `/api/ai-tasks/[id]/accept/route.ts` (POST)
- [ ] `/api/ai-tasks/[id]/complete/route.ts` (POST)
- [ ] `/api/ai-tasks/[id]/fail/route.ts` (POST)

### Medium Priority

#### Time Tracking
- [ ] `/api/time-tracking/route.ts`
- [ ] `/api/time-tracking/[id]/route.ts`
- [ ] `/api/time-tracking/running/route.ts`

#### Stats/Analytics
- [ ] `/api/stats/route.ts`
- [ ] `/api/stats/timeline/route.ts`
- [ ] `/api/stats/productivity/route.ts`

### Low Priority (OAuth only)

These endpoints are primarily used by the web app and may not need API key support:
- OAuth endpoints (`/api/oauth/*`)
- Webhook endpoints
- Admin endpoints

## How to Apply the Fix

### Step 1: Import the helper
```typescript
import { getClientForAuthType } from '@/lib/auth'
```

### Step 2: Replace createClientForRequest
Find this pattern:
```typescript
const client = createClientForRequest(request) || supabase
```

Replace with:
```typescript
const client = await getClientForAuthType(request) || supabase
```

### Step 3: Update function signature (if needed)
If the handler isn't already async, make it async:
```typescript
// Before
export function GET(request: NextRequest) {
  const client = createClientForRequest(request)
}

// After
export async function GET(request: NextRequest) {
  const client = await getClientForAuthType(request)
}
```

### Step 4: Test
1. Test with OAuth token (web app) - should still work
2. Test with API key (zm_...) - should now work
3. Verify RLS policies are respected

## Testing Commands

### Test with OAuth Token
```bash
# Get OAuth token from browser localStorage after logging in
TOKEN="<oauth-jwt-token>"

curl -H "Authorization: Bearer $TOKEN" \
  https://zmemory.vercel.app/api/memories
```

### Test with API Key
```bash
# Generate API key from zflow UI (Profile → ZMemory API Keys)
API_KEY="zm_..."

curl -H "Authorization: Bearer $API_KEY" \
  https://zmemory.vercel.app/api/memories
```

## Notes

- **Not Urgent**: This fix is only needed if you want to support API key authentication for these endpoints
- **Web App Works**: The web app (OAuth only) works fine without this fix
- **MCP Works**: MCP works with OAuth tokens (users logged into zflow)
- **API Keys**: The fix is only needed if external clients want to use API keys (zm_...) instead of OAuth

## Reference

See the implementation in `/api/tasks/route.ts` (lines 287 and 520) for example usage.

For detailed documentation, see: `apps/zmemory-mcp/INTEGRATION_GUIDE.md`

---

**Created**: 2025-09-30
**Priority**: Low (unless API key support is required for these endpoints)
**Estimate**: ~2 hours to fix all high-priority routes
