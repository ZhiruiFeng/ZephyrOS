# Lessons Learned: RLS and Service Role Authentication

**Date:** 2025-10-01
**Issue:** Row-Level Security (RLS) policy violations when creating records via API
**Root Cause:** Incorrect authentication pattern for server-side Next.js API routes

---

## The Problem

After refactoring to support both OAuth and API key authentication, we encountered:

```
Database error: {
  code: '42501',
  message: 'new row violates row-level security policy for table "memories"'
}
```

### What Was Happening

1. Frontend sends OAuth JWT token to backend API
2. Backend validates the JWT and extracts `user_id`
3. Backend creates Supabase client with JWT in headers (anon key)
4. Backend tries to INSERT with explicit `user_id` field
5. **RLS policy fails** because `auth.uid()` is NULL in this context

---

## The Root Cause

**Misunderstanding of Supabase Authentication Contexts:**

| Context | Client Type | `auth.uid()` Value | RLS Behavior |
|---------|-------------|-------------------|--------------|
| **Client-side** (browser/mobile) | Anon key + JWT | ✅ Set from JWT | ✅ RLS enforced |
| **Server-side API route** (Next.js) | Anon key + JWT headers | ❌ NULL | ❌ RLS blocks even valid requests |
| **Server-side API route** (Next.js) | Service role key | ❌ NULL | ✅ RLS bypassed |

**Key Insight:** When you pass a JWT via headers to a server-side Supabase client (even with anon key), it **does NOT** set `auth.uid()` for RLS purposes. The JWT is validated but the context is not properly established.

---

## The Solution

### Recommended Pattern for Server-Side Next.js API Routes

**Always use this pattern:**

1. ✅ **Validate user authentication** (JWT or API key) → extract `user_id`
2. ✅ **Use service role client** (bypasses RLS)
3. ✅ **Explicitly set `user_id`** in all INSERT/UPDATE operations

### Code Pattern

```typescript
// 1. Validate authentication
const userId = await getUserIdFromRequest(request); // Works for both OAuth & API keys
if (!userId) {
  return jsonWithCors(request, { error: 'Unauthorized' }, 401);
}

// 2. Get service role client (always bypasses RLS)
const client = await getClientForAuthType(request);

// 3. Explicitly set user_id in payload
const payload = {
  title: 'Some title',
  description: 'Some description',
  // ... other fields
};

// Add user_id for all requests (since we're using service role)
await addUserIdIfNeeded(payload, userId, request);

// 4. Insert/update with explicit user_id
const { data, error } = await client
  .from('table_name')
  .insert(payload)
  .select('*')
  .single();
```

---

## Why This Pattern Works

1. **Security:** User authentication is validated **before** database operations
2. **Consistency:** Works for both OAuth (JWT) and API keys
3. **Simplicity:** No need to manage different client types per auth method
4. **Performance:** Service role client avoids RLS overhead (we've already validated the user)
5. **Reliability:** No RLS policy conflicts since we bypass RLS and handle authorization in code

---

## Changes Made

### 1. Updated Auth Helper (`lib/auth.ts`)

```typescript
// OLD: Different clients for OAuth vs API key
export async function getClientForAuthType(request: NextRequest) {
  if (authContext?.authType === 'api_key') {
    return createServiceRoleClient(); // Bypasses RLS
  }
  return createClientForRequest(request); // Uses JWT, expects RLS
}

// NEW: Always use service role client
export async function getClientForAuthType(request: NextRequest) {
  // Always use service role for server-side operations
  // We've already validated the user via getUserIdFromRequest()
  return createServiceRoleClient();
}

// Helper to always add user_id
export async function addUserIdIfNeeded(
  payload: Record<string, any>,
  userId: string,
  request: NextRequest
): Promise<void> {
  // Always set user_id since we're using service role client
  payload.user_id = userId;
}
```

### 2. Updated API Routes

**Before:**
```typescript
const payload = {
  title: 'Memory title',
  note: 'Memory content',
  user_id: userId, // ❌ Always set, conflicts with OAuth + RLS
};
```

**After:**
```typescript
const payload = {
  title: 'Memory title',
  note: 'Memory content',
  // user_id conditionally added based on client type
};
await addUserIdIfNeeded(payload, userId, request); // ✅ Always adds for service role
```

### 3. Fixed Database Functions

For database functions that use `auth.uid()`:

```sql
-- OLD: Only works with client-side JWT context
CREATE FUNCTION add_daily_strategy_item(...) AS $$
BEGIN
  INSERT INTO table (user_id, ...)
  VALUES (auth.uid(), ...); -- ❌ NULL when called from service role
END;
$$;

-- NEW: Accept optional user_id parameter
CREATE FUNCTION add_daily_strategy_item(
  ...,
  p_user_id UUID DEFAULT NULL
) AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Use provided user_id or fall back to auth.uid()
  v_user_id := COALESCE(p_user_id, auth.uid());

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'user_id is required';
  END IF;

  INSERT INTO table (user_id, ...)
  VALUES (v_user_id, ...); -- ✅ Works with both client contexts
END;
$$;
```

---

## Files Changed

1. **`apps/zmemory/lib/auth.ts`**
   - Simplified `getClientForAuthType()` - always returns service role client
   - Added `addUserIdIfNeeded()` helper - always sets `user_id`

2. **`apps/zmemory/app/api/memories/route.ts`**
   - Updated to use `addUserIdIfNeeded()` helper

3. **`apps/zmemory/app/api/daily-strategy/route.ts`**
   - Pass `p_user_id` to database function

4. **`supabase/core_strategy.sql`**
   - Updated `add_daily_strategy_item()` to accept `p_user_id` parameter

5. **`supabase/migrations/20251001_fix_daily_strategy_user_id.sql`**
   - Migration to update the function in database

---

## What Still Needs Fixing

### Direct INSERT/UPDATE operations in these routes:

1. **`/api/tasks`** - Tasks creation
2. **`/api/timeline-items`** - Timeline items
3. **`/api/subtasks`** - Subtasks
4. **`/api/assets`** - Asset uploads
5. **`/api/core-principles`** - Core principles
6. **`/api/ai-agents`** - AI agent creation
7. **`/api/strategy/memories`** - Strategy memories
8. **`/api/strategy/tasks`** - Strategy tasks
9. **`/api/strategy/initiatives`** - Initiatives
10. **`/api/narrative/episodes`** - Episodes
11. **`/api/narrative/seasons`** - Seasons
12. **`/api/relations/people`** - People
13. **`/api/relations/profiles`** - Profiles
14. **`/api/relations/touchpoints`** - Touchpoints

### Database Functions that need updating:

Check for any other functions using `auth.uid()`:
```bash
grep -r "auth.uid()" supabase/*.sql
```

---

## Testing Checklist

- [x] ✅ OAuth authentication works for creating memories
- [x] ✅ OAuth authentication works for creating daily strategy items
- [ ] ⏳ API key authentication tested
- [ ] ⏳ All other CREATE operations tested with OAuth
- [ ] ⏳ All other CREATE operations tested with API keys

---

## Key Takeaways

### ❌ Don't Do This (Server-Side)
```typescript
// Using anon key client with JWT headers on server-side
const client = createClient(url, anonKey, {
  global: { headers: { Authorization: `Bearer ${jwt}` } }
});

// RLS expects auth.uid() but it's NULL!
await client.from('table').insert({ title: 'foo' }); // ❌ Fails
```

### ✅ Do This Instead (Server-Side)
```typescript
// 1. Validate user first
const userId = await getUserIdFromRequest(request);

// 2. Use service role client
const client = createClient(url, serviceRoleKey);

// 3. Explicitly set user_id
await client.from('table').insert({
  title: 'foo',
  user_id: userId // ✅ Explicit authorization
});
```

### When to Use Each Approach

| Context | Auth Method | Client Type | Pattern |
|---------|------------|-------------|---------|
| **Client-side** (browser/mobile) | JWT (session) | Anon key | Let RLS handle `user_id` via `auth.uid()` |
| **Server-side** (Next.js API) | JWT or API key | Service role | Validate user, bypass RLS, set `user_id` explicitly |
| **Database functions** (used by server) | N/A | N/A | Accept `p_user_id` param with `DEFAULT NULL` fallback |

---

## References

- [Supabase Server-Side Auth Guide](https://supabase.com/docs/guides/auth/server-side-rendering)
- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [Next.js API Routes with Supabase](https://supabase.com/docs/guides/auth/server-side/nextjs)

---

## Related Issues

- Initial refactor: Added API key authentication support
- This fix: Made server-side routes work with both OAuth and API keys
- Future: Consider migrating all RPC functions to accept `p_user_id` parameter
