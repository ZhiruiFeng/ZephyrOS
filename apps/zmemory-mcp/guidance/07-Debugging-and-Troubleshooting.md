# 07 — Debugging and Troubleshooting

## 🛠️ New Debugging Tool

### `get_system_status`
**Purpose**: Comprehensive system diagnostics and troubleshooting information

**When to use**:
- When any MCP operation fails unexpectedly
- Before starting complex workflows to verify system health
- When debugging authentication issues
- For monitoring API connectivity and performance

**Parameters**:
```json
{
  "include_recent_errors": true,     // Include error information (default: true)
  "check_connectivity": true         // Test API connectivity (default: true)
}
```

**Response includes**:
- Authentication status and token expiration
- API connectivity test results and response times
- Current configuration values
- Troubleshooting suggestions based on detected issues
- Full JSON status report for detailed analysis

## 🔍 Common Issues and Solutions

### Authentication Problems

#### Issue: "Authentication required" errors
**Symptoms**: All operations fail with authentication errors
**Debug steps**:
```
1. get_system_status()
   → Check authentication section
2. If not authenticated: authenticate → exchange_code_for_token
3. If token expired: refresh_token
```

#### Issue: Token expires frequently
**Symptoms**: Operations work, then suddenly fail
**Debug approach**:
```
get_system_status() → Check "expires_in_minutes"
If < 5 minutes: Use refresh_token before operations
```

### API Connectivity Issues

#### Issue: "Connection refused" or timeout errors
**Symptoms**: get_system_status shows API connectivity error
**Debug steps**:
1. Verify ZMEMORY_API_URL environment variable
2. Check if ZMemory API server is running
3. Test direct API access: `curl $ZMEMORY_API_URL/api/health`

#### Issue: Slow API responses
**Symptoms**: Operations work but take a long time
**Debug approach**:
```
get_system_status({ check_connectivity: true })
→ Check response_time_ms in report
→ If > 5000ms, investigate network or server performance
```

### Tool-Specific Issues

#### Issue: Timer operations fail
**Common causes**: Another timer already running
**Debug workflow**:
```
1. start_task_timer fails
   ↓
2. get_running_timer
   → Shows current active timer
   ↓
3. stop_task_timer (for current timer)
   ↓
4. start_task_timer (for new task)
```

#### Issue: Search returns no results
**Debug approach**:
```
1. search_tasks/search_memories returns []
   ↓
2. Broaden search criteria (remove filters)
   ↓
3. Use get_*_stats to verify data exists
   ↓
4. If no data: Verify authentication and create test items
```

#### Issue: Category not found in task creation
**Symptoms**: create_task succeeds but category is null
**Solution**:
```
1. get_categories() → List available categories
2. Create category if needed: create_category()
3. Use exact category name in create_task()
```

## 📊 Monitoring and Health Checks

### Regular Health Monitoring
**For long-running agent processes**:
```javascript
// Every 15 minutes
if (Date.now() - lastHealthCheck > 900000) {
  const status = await get_system_status({ check_connectivity: true });
  if (!status.authentication.is_authenticated ||
      status.authentication.expires_in_minutes < 5) {
    await refresh_token();
  }
}
```

### Performance Monitoring
**Track API response times**:
```javascript
const status = await get_system_status({ check_connectivity: true });
if (status.api_connectivity.response_time_ms > 5000) {
  console.warn('API response time high:', status.api_connectivity.response_time_ms);
  // Consider implementing retry logic or alerting
}
```

## 🚨 Error Patterns and Recovery

### Pattern 1: Authentication Cascade Failure
**Symptoms**: Multiple operations fail in sequence
**Recovery**:
```
1. get_system_status()
2. If auth expired: refresh_token()
3. If refresh fails: clear_auth() → authenticate() → exchange_code_for_token()
4. Retry failed operations
```

### Pattern 2: API Server Unavailable
**Symptoms**: All operations fail with connection errors
**Recovery strategy**:
```
1. get_system_status() confirms API down
2. Implement exponential backoff retry
3. Cache important data locally during outage
4. Resume operations when connectivity restored
```

### Pattern 3: Data Consistency Issues
**Symptoms**: get_task returns different data than search_tasks
**Debug approach**:
```
1. get_system_status() - check API response times
2. Compare timestamps in responses
3. Use get_task_updates_for_today() to verify recent changes
4. If inconsistent: wait and retry (eventual consistency)
```

## 🧪 Testing and Validation

### Integration Testing Workflow
```
1. get_system_status()
   → Verify all systems healthy

2. Test authentication flow:
   - clear_auth()
   - authenticate()
   - exchange_code_for_token()
   - get_auth_status()

3. Test core operations:
   - create_task()
   - search_tasks()
   - start_task_timer()
   - stop_task_timer()

4. Test error handling:
   - Invalid task ID
   - Expired tokens
   - Network timeouts
```

### Load Testing Considerations
**Monitor these metrics during high usage**:
- API response times (via get_system_status)
- Authentication token refresh frequency
- Error rates for different operations
- Memory usage in long-running agents

## 📝 Enhanced Error Messages

The new debugging features provide contextual error messages:

### Before (generic error):
```
Error: Request failed with status code 401
```

### After (enhanced context):
```
❌ Authentication Error
- Token expired 15 minutes ago
- Use refresh_token() to get new access token
- Or re-authenticate with authenticate() tool
- Current config: Client ID = zmemory-mcp
```

## 🔧 Development and Testing Tools

### Quick System Check
```bash
# For developers testing the MCP server
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"get_system_status","arguments":{}},"id":1}'
```

### Environment Variable Validation
**The get_system_status tool validates**:
- ZMEMORY_API_URL (API endpoint)
- OAUTH_CLIENT_ID (OAuth configuration)
- OAUTH_CLIENT_SECRET (if using OAuth)
- ZMEMORY_TIMEOUT (request timeouts)
- ZMEMORY_MCP_LOCALE (language preference)

### Agent Development Best Practices
1. **Always check system status first** in agent initialization
2. **Implement retry logic** with exponential backoff
3. **Cache authentication tokens** and monitor expiration
4. **Log get_system_status output** for debugging
5. **Handle partial failures gracefully** (some operations succeed, others fail)

## 🎯 Quick Troubleshooting Checklist

**When things go wrong, try this sequence**:

1. ✅ `get_system_status()` - Get overall health
2. ✅ Check authentication status and token expiration
3. ✅ Verify API connectivity and response times
4. ✅ Review configuration values
5. ✅ Apply suggested troubleshooting steps
6. ✅ Retry failed operations
7. ✅ If still failing, check ZMemory API logs

This systematic approach will resolve 90% of common MCP integration issues.