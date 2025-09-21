# ZFlow iOS Development Rules

This document provides essential rules and patterns for coding agents to follow when developing the ZFlow iOS application.

## 1. API Architecture & Usage

### API Base Configuration

The zflow-ios app uses a unified API base configuration system similar to the main zflow app:

```typescript
// Location: src/lib/api/api-base.ts
export const API_BASE = API_BASE_URL.replace(/\/api$/, ''); // Already includes base URL without /api
```

**Key Points:**
- `API_BASE` is the base URL without the `/api` path
- All API endpoints should include `/api` in their path construction
- Use the unified `authenticatedFetch` utility for all API calls
- The React Native app uses Expo Constants for environment configuration

### API Call Patterns

#### ✅ CORRECT Pattern:
```typescript
// Good: Add /api to the endpoint
await authenticatedFetch(`${API_BASE}/api/tasks`, options)
await fetch(`${API_BASE}/api/memories/${id}`, { headers: authHeaders })
```

#### ❌ INCORRECT Pattern:
```typescript
// Bad: Missing /api in URL
await fetch(`${API_BASE}/tasks`, options)  // Results in incomplete URL
```

### API Module Structure

All API functions are organized in `/src/lib/api/` folder:

```
src/lib/api/
├── api-base.ts           # Core utilities, types, authenticatedFetch
├── tasks-api.ts         # Task CRUD operations
├── categories-api.ts    # Category management
├── time-tracking-api.ts # Timer and time entries
├── subtasks-api.ts      # Subtask management
├── narrative-api.ts     # Seasons and episodes
├── memories-api.ts      # Memory management
├── activities-api.ts    # Activity tracking
└── index.ts            # Main entry point with exports
```

### Adding New API Functions

When adding new API functionality:

1. **Choose the appropriate existing module** or create a new one following the pattern
2. **Import required utilities** from `api-base.ts`:
   ```typescript
   import { API_BASE, authenticatedFetch, ApiError } from './api-base'
   ```

3. **Use the standard error handling pattern**:
   ```typescript
   const response = await authenticatedFetch(`${API_BASE}/api/endpoint`, options)
   if (!response.ok) {
     const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
     throw new ApiError(response.status, errorData.error || 'Request failed')
   }
   ```

4. **Export from the main index.ts** to maintain backward compatibility

### React Native Specific Patterns

When creating React Native hooks for API calls:

1. **Import API modules** from the unified location:
   ```typescript
   import { tasksApi, categoriesApi } from '../lib/api'
   import { authManager } from '../lib/api/api-base'
   ```

2. **Use consistent auth headers**:
   ```typescript
   const authHeaders = await authManager.getAuthHeaders()
   const response = await fetch(`${API_BASE}/api/endpoint`, {
     headers: { ...authHeaders }
   })
   ```

3. **Handle React Native specific considerations**:
   - Use proper loading states for UI feedback
   - Handle network errors gracefully
   - Consider offline scenarios

### Authentication with Supabase

The app integrates with Supabase for authentication:

```typescript
// From api-base.ts
const { data } = await supabase.auth.getSession()
const token = data.session?.access_token
```

The auth manager handles token caching and refresh automatically.

### Expo Configuration

Environment variables are accessed through Expo Constants:

```typescript
const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl ||
                     process.env.EXPO_PUBLIC_API_URL ||
                     'http://localhost:3001'
```

## 2. File Organization Rules

### API Files
- Keep API modules focused on single domains (tasks, memories, etc.)
- Use consistent naming: `{domain}-api.ts`
- Export both individual functions and a domain API object
- Always export types and interfaces used by the API

### Hook Files
- Place in `/src/hooks/` folder with `use` prefix
- Import APIs from unified location: `import { tasksApi } from '../lib/api'`
- Handle loading states and error states consistently
- Use React Query or SWR for data fetching when appropriate

### Component Files
- Place in `/src/components/` folder
- Use proper React Native component patterns
- Handle loading and error states in UI
- Follow React Native Paper design patterns

### Screen Files
- Place in `/src/screens/` folder
- Use React Navigation patterns
- Implement proper navigation handling
- Handle deep linking when needed

## 3. React Native Specific Rules

### Component Patterns
```typescript
// Use React Native Paper components
import { Surface, useTheme } from 'react-native-paper'

// Handle loading states properly
if (loading) {
  return <ActivityIndicator animating={true} />
}
```

### Navigation
```typescript
// Use typed navigation
import type { NativeStackScreenProps } from '@react-navigation/native-stack'

type Props = NativeStackScreenProps<RootStackParamList, 'TaskDetails'>
```

### Platform-Specific Code
```typescript
import { Platform } from 'react-native'

const styles = StyleSheet.create({
  container: {
    paddingTop: Platform.OS === 'ios' ? 20 : 0,
  },
})
```

## 4. Backward Compatibility

### Legacy API Support
- The old `zmemoryApi` file now re-exports from the new modular structure
- `TaskService` and `CategoryService` classes delegate to new API modules
- All existing import paths continue to work:
  ```typescript
  import { zmemoryApi } from '../lib/zmemoryApi'  // Still works
  import { TaskService } from '../services/taskService'  // Still works
  ```

### Migration Path
- New code should use the modular API structure
- Existing code can continue using legacy imports
- Gradually migrate to new patterns during refactoring

## 5. Common Mistakes to Avoid

### ❌ Missing /api Path
```typescript
// Wrong - missing /api in URL
fetch(`${API_BASE}/tasks`)

// Right - include /api in path
fetch(`${API_BASE}/api/tasks`)
```

### ❌ Inconsistent Error Handling
```typescript
// Wrong - inconsistent error format
throw new Error(`Failed: ${response.statusText}`)

// Right - use ApiError class
const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
throw new ApiError(response.status, errorData.error || 'Request failed')
```

### ❌ Missing Loading States
```typescript
// Wrong - no loading feedback
const handleSubmit = async () => {
  await api.createTask(data)
}

// Right - provide loading feedback
const [loading, setLoading] = useState(false)
const handleSubmit = async () => {
  setLoading(true)
  try {
    await api.createTask(data)
  } finally {
    setLoading(false)
  }
}
```

### ❌ Not Handling Network Errors
```typescript
// Wrong - unhandled network errors
await api.getTasks()

// Right - handle network issues
try {
  await api.getTasks()
} catch (error) {
  if (error.message.includes('Network')) {
    Alert.alert('Network Error', 'Please check your connection')
  } else {
    Alert.alert('Error', error.message)
  }
}
```

## 6. Testing API Changes

When modifying APIs in React Native:

1. **Test on both platforms**: iOS and Android
2. **Test network conditions**: Online, offline, slow network
3. **Test authentication**: Login, logout, token expiry
4. **Test error scenarios**: Network errors, API errors, validation errors
5. **Use React Native debugger**: Network tab to verify correct URL formation
6. **Test with real device**: Not just simulator

## 7. Performance Considerations

### API Optimization
- Use proper caching strategies (React Query/SWR)
- Implement request deduplication
- Use pagination for large datasets
- Implement proper loading states

### React Native Performance
- Use `FlatList` for large lists instead of `ScrollView`
- Implement proper image optimization
- Use `useMemo` and `useCallback` appropriately
- Avoid unnecessary re-renders

## 8. Security Considerations

### Token Management
- Tokens are automatically cached and refreshed
- Never log tokens in production
- Clear auth cache on logout
- Handle token expiry gracefully

### Data Validation
- Validate API responses
- Sanitize user inputs
- Use TypeScript for type safety
- Implement proper error boundaries

## 9. Deployment & Environment

### Environment Configuration
- Use Expo environment variables
- Configure different API endpoints for dev/staging/production
- Use EAS Build for production builds
- Test on both debug and release builds

### App Store Considerations
- Follow Apple/Google guidelines
- Implement proper privacy policies
- Handle app permissions correctly
- Test app review scenarios

---

**Last Updated**: 2025-09-21
**Version**: 1.0

This document should be updated whenever significant changes are made to the API architecture or React Native development patterns.