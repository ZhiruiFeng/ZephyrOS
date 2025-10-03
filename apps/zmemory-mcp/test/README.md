# ZMemory MCP Server - Testing Guide

This directory contains all testing-related files for the ZMemory MCP Server.

## Directory Structure

```
test/
├── fixtures/          # Test data fixtures
│   ├── tasks.json    # Sample task data
│   ├── memories.json # Sample memory data
│   └── users.json    # Sample user data
├── mocks/            # Mock implementations
│   ├── zmemory-api-mock.ts  # Mock ZMemory API client
│   └── oauth-mock.ts        # Mock OAuth provider
├── setup.ts          # Jest setup and configuration
└── README.md         # This file
```

## Fixtures

### tasks.json
Contains sample task data with various states, priorities, and metadata.

### memories.json
Contains sample memory data with different types, emotions, and places.

### users.json
Contains sample user data for authentication testing.

## Mocks

### MockZMemoryClient
A complete mock implementation of the ZMemory API client for testing.

**Features:**
- Full CRUD operations for tasks and memories
- Search and filtering
- Statistics aggregation
- Authentication state management

**Usage:**
```typescript
import { createMockClient } from '../../../test/mocks/zmemory-api-mock.js';

const mockClient = createMockClient();
const handler = new TaskHandlers(mockClient);

// Use in tests
const result = await handler.handleCreateTask({ title: 'Test Task' });
```

### MockOAuthProvider
A mock OAuth provider for testing authentication flows.

**Features:**
- Authorization code generation
- Token exchange
- Token refresh

**Usage:**
```typescript
import { createMockOAuthProvider } from '../../../test/mocks/oauth-mock.js';

const oauth = createMockOAuthProvider();
const code = oauth.generateAuthCode('user-001');
const tokens = oauth.exchangeCodeForTokens(code);
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage

# Run specific test file
npm test -- task-handlers.test.ts

# Run tests with verbose output
npm test -- --verbose
```

## Writing Tests

### Test Structure

```typescript
import { HandlerClass } from '../../../handlers/handler.js';
import { createMockClient } from '../../../../test/mocks/zmemory-api-mock.js';

describe('HandlerClass', () => {
  let handler: HandlerClass;
  let mockClient: any;

  beforeEach(() => {
    mockClient = createMockClient();
    handler = new HandlerClass(mockClient);
  });

  afterEach(() => {
    mockClient.reset();
  });

  describe('methodName', () => {
    it('should handle success case', async () => {
      // Test implementation
    });

    it('should handle error case', async () => {
      // Test implementation
    });
  });
});
```

### Best Practices

1. **Use descriptive test names**: Clearly describe what is being tested
2. **Test both success and error cases**: Cover happy path and error scenarios
3. **Reset mocks between tests**: Use `afterEach` to reset state
4. **Test edge cases**: Empty results, missing data, invalid input
5. **Avoid test interdependence**: Each test should be independent

### Coverage Requirements

- **Minimum coverage**: 80%
- **Branches**: 80%
- **Functions**: 80%
- **Lines**: 80%
- **Statements**: 80%

## Test Categories

### Unit Tests
Location: `src/__tests__/unit/`

Test individual components in isolation using mocks.

### Integration Tests
Location: `src/__tests__/integration/`

Test interactions between multiple components.

### E2E Tests
Location: `src/__tests__/e2e/`

Test complete user workflows from end to end.

## Debugging Tests

### View test output
```bash
npm test -- --verbose
```

### Run single test
```bash
npm test -- --testNamePattern="should create a task"
```

### Debug in VS Code
Add to `.vscode/launch.json`:
```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand", "--no-cache"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

## Common Issues

### ESM Module Errors
Make sure `NODE_OPTIONS=--experimental-vm-modules` is set:
```bash
NODE_OPTIONS=--experimental-vm-modules jest
```

### TypeScript Errors
Ensure `ts-jest` is configured in `jest.config.js`:
```javascript
transform: {
  '^.+\\.ts$': ['ts-jest', { useESM: true }]
}
```

### Mock Not Resetting
Always call `mockClient.reset()` in `afterEach`:
```typescript
afterEach(() => {
  mockClient.reset();
});
```

## Resources

- [Jest Documentation](https://jestjs.io/)
- [Testing Library](https://testing-library.com/)
- [Main Improvement Plan](../IMPROVEMENT_PLAN.md)
- [Progress Tracker](../IMPROVEMENT_PROGRESS.md)
