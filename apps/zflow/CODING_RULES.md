# ZFlow Development Rules

This document provides essential rules and patterns for coding agents to follow when developing the ZFlow application.

## 1. API Architecture & Usage

### API Base Configuration

The application uses a unified API base configuration system:

```typescript
// Location: lib/api/api-base.ts
export const API_BASE = ZMEMORY_API_BASE  // Already includes '/api' prefix
```

**Key Points:**
- `API_BASE` equals `ZMEMORY_API_BASE` and already includes the `/api` path
- All API endpoints should be relative paths without leading `/api/`
- Use the unified `authenticatedFetch` utility for all API calls

### API Call Patterns

#### ✅ CORRECT Pattern:
```typescript
// Good: API_BASE already includes '/api'
await authenticatedFetch(`${API_BASE}/tasks`, options)
await fetch(`${API_BASE}/memories/${id}`, { headers: authHeaders })
```

#### ❌ INCORRECT Pattern:
```typescript
// Bad: Double '/api' in URL
await fetch(`${API_BASE}/api/tasks`, options)  // Results in '/api/api/tasks'
```

### API Module Structure

All API functions are organized in `/lib/api/` folder:

```
lib/api/
├── api-base.ts           # Core utilities, types, authenticatedFetch
├── categories-api.ts     # Category management
├── tasks-api.ts         # Task CRUD operations
├── time-tracking-api.ts # Timer and time entries
├── memories-api.ts      # Memory management
├── narrative-api.ts     # Seasons and episodes
├── energy-api.ts        # Energy tracking
├── ai-api.ts           # AI interactions
├── stats-api.ts        # Statistics
└── index.ts            # Main entry point with exports
```

### Adding New API Functions

When adding new API functionality:

1. **Choose the appropriate existing module** or create a new one following the pattern
2. **Import required utilities** from `api-base.ts`:
   ```typescript
   import { API_BASE, authenticatedFetch } from './api-base'
   ```

3. **Use the standard error handling pattern**:
   ```typescript
   const response = await authenticatedFetch(`${API_BASE}/endpoint`, options)
   if (!response.ok) {
     const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
     throw new Error(errorData.error || `Request failed: ${response.status}`)
   }
   ```

4. **Export from the main index.ts** to maintain backward compatibility

### Hook Patterns for API Calls

When creating hooks that make API calls:

1. **Import API_BASE** from the unified location:
   ```typescript
   import { API_BASE } from '../lib/api'
   import { authManager } from '../lib/auth-manager'
   ```

2. **Use consistent auth headers**:
   ```typescript
   const authHeaders = await authManager.getAuthHeaders()
   const response = await fetch(`${API_BASE}/endpoint`, {
     headers: { ...authHeaders }
   })
   ```

3. **Never use double `/api` paths** - this was a historical issue that caused "Failed to fetch" errors

### API Error Handling

Standard error handling pattern across all API modules:

```typescript
if (!response.ok) {
  const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
  throw new APIError(response.status, errorData.error || errorData.message || `API Error: ${response.status}`)
}
```

### Backward Compatibility

- All API changes must maintain backward compatibility
- The main `/lib/api.ts` file re-exports everything from `/lib/api/index.ts`
- Legacy import paths should continue to work: `import { tasksApi } from '../lib/api'`

### Cross-Origin Configuration

The app supports cross-origin API calls with proper configuration:

```typescript
// From api-base.ts
export const IS_CROSS_ORIGIN = IS_ZMEMORY_CROSS_ORIGIN
export const API_ORIGIN = ZMEMORY_API_ORIGIN
```

Use these constants when configuring fetch options for cross-origin scenarios.

## 2. File Organization Rules

### API Files
- Keep API modules focused on single domains (tasks, memories, etc.)
- Use consistent naming: `{domain}-api.ts`
- Export both individual functions and a domain API object
- Always export types and interfaces used by the API

### Hook Files
- Place in `/hooks/` folder with `use` prefix
- Import API_BASE from unified location
- Handle loading states and error states consistently
- Use SWR for data fetching when appropriate

### Type Definitions
- Define API request/response types in the same file as API functions
- Export types for use by components and hooks
- Use consistent naming patterns: `CreateXRequest`, `UpdateXRequest`, etc.

## 3. Authentication Patterns

All API calls must use authenticated requests:

```typescript
// For API modules
import { authenticatedFetch } from './api-base'
const response = await authenticatedFetch(url, options)

// For hooks and components
import { authManager } from '../lib/auth-manager'
const authHeaders = await authManager.getAuthHeaders()
const response = await fetch(url, { headers: { ...authHeaders } })
```

## 4. Common Mistakes to Avoid

### ❌ Double API Paths
```typescript
// Wrong - creates '/api/api/endpoint'
fetch(`${API_BASE}/api/endpoint`)
```

### ❌ Inconsistent Error Handling
```typescript
// Wrong - inconsistent error format
throw new Error(`Failed: ${response.statusText}`)

// Right - use standard pattern
const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
throw new APIError(response.status, errorData.error || 'Request failed')
```

### ❌ Missing Auth Headers
```typescript
// Wrong - unauthenticated request
fetch(`${API_BASE}/endpoint`)

// Right - authenticated request
const authHeaders = await authManager.getAuthHeaders()
fetch(`${API_BASE}/endpoint`, { headers: authHeaders })
```

## 5. Testing API Changes

When modifying APIs:

1. **Verify TypeScript compilation**: `npm run type-check`
2. **Run linting**: `npm run lint`
3. **Test in development**: Ensure no "Failed to fetch" errors
4. **Check network tab**: Verify correct URL formation (no double `/api`)
5. **Test authentication**: Ensure auth headers are properly included

## 6. Migration Guidelines

When updating existing API code:

1. **Preserve existing function signatures** for backward compatibility
2. **Update import paths** to use the new modular structure
3. **Fix URL construction** to remove double `/api` patterns
4. **Update error handling** to use consistent patterns
5. **Add proper TypeScript types** if missing

---

**Last Updated**: 2025-09-21
**Version**: 1.0

This document should be updated whenever significant changes are made to the API architecture or development patterns.