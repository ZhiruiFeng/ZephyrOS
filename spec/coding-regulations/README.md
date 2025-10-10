# ZephyrOS Coding Regulations

## Overview

This directory contains comprehensive coding standards and regulations for all components of the ZephyrOS project. These regulations ensure clean, modular, reusable, consistent, well-maintained, and well-documented code across the entire codebase.

## Core Principles

All code in ZephyrOS should adhere to these fundamental principles:

### 1. **Cleanliness**
- Code should be self-explanatory and easy to read
- Follow the "boy scout rule": leave code better than you found it
- Remove dead code, unused imports, and unnecessary comments
- Use meaningful variable and function names that convey intent

### 2. **Modularization**
- Break down complex functionality into smaller, focused modules
- Each module should have a single, well-defined responsibility
- Keep functions small and focused (ideally under 50 lines)
- Group related functionality together

### 3. **Reusability**
- Design components and utilities to be reused across the application
- Extract common patterns into shared utilities
- Avoid duplication through abstraction
- Create composable building blocks

### 4. **Consistency**
- Follow established patterns within each codebase
- Use consistent naming conventions across the project
- Maintain uniform code structure and organization
- Apply the same error handling patterns

### 5. **Maintainability**
- Write code that is easy to modify and extend
- Keep dependencies minimal and well-justified
- Use TypeScript for type safety across all components
- Implement proper error handling and logging

### 6. **Documentation**
- Document all public APIs, functions, and components
- Include JSDoc comments for complex logic
- Maintain up-to-date README files for each component
- Document architectural decisions and patterns

## Component-Specific Regulations

Each component has its own detailed coding regulation document:

### Backend & APIs
- **[ZMemory Backend](./zmemory-backend.md)** - Next.js API backend with Supabase integration
- **[ZMemory MCP](./zmemory-mcp.md)** - Model Context Protocol server for AI agents

### Frontend Applications
- **[ZFlow Web App](./zflow-web.md)** - Next.js web application with React
- **[ZFlow iOS App](./zflow-ios.md)** - React Native/Expo mobile application

### Data Layer
- **[Database Standards](./database.md)** - Supabase/PostgreSQL schema and query patterns

## Universal TypeScript Standards

All TypeScript code in ZephyrOS must follow these standards:

### Type Safety
```typescript
// ✅ Good: Explicit types
interface User {
  id: string
  email: string
  createdAt: Date
}

async function getUser(id: string): Promise<User> {
  // Implementation
}

// ❌ Bad: Implicit any
function getUser(id) {
  // Implementation
}
```

### Null Safety
```typescript
// ✅ Good: Handle null/undefined explicitly
function getUserName(user: User | null): string {
  return user?.name ?? 'Anonymous'
}

// ❌ Bad: Assume values exist
function getUserName(user: User): string {
  return user.name
}
```

### Error Handling
```typescript
// ✅ Good: Typed errors with proper handling
class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

try {
  await riskyOperation()
} catch (error) {
  if (error instanceof ApiError) {
    handleApiError(error)
  } else {
    handleUnknownError(error)
  }
}

// ❌ Bad: Generic error catching
try {
  await riskyOperation()
} catch (e) {
  console.log(e)
}
```

## Security Standards

All components must follow these security practices:

### 1. **Authentication & Authorization**
- Always validate user authentication before processing requests
- Use Supabase Row Level Security (RLS) for data access control
- Never trust client-side data without server-side validation
- Implement proper session management

### 2. **Input Validation**
- Validate all user inputs using Zod schemas
- Sanitize data before database operations
- Use parameterized queries to prevent SQL injection
- Validate file uploads and limit file sizes

### 3. **Secrets Management**
- Never commit secrets to version control
- Use environment variables for all sensitive data
- Rotate API keys and tokens regularly
- Use different credentials for each environment

### 4. **API Security**
- Implement rate limiting on all endpoints
- Use HTTPS for all communications
- Validate API request origins
- Implement proper CORS policies

### 5. **Data Protection**
- Encrypt sensitive data at rest
- Use secure password hashing (handled by Supabase)
- Implement proper data retention policies
- Log security-relevant events

## Code Review Standards

All code changes must meet these criteria before merging:

### Required Checks
- ✅ All tests pass
- ✅ TypeScript type checking passes
- ✅ ESLint rules pass
- ✅ Code is properly documented
- ✅ Security considerations addressed
- ✅ Component-specific regulations followed

### Review Focus Areas
1. **Logic Correctness**: Does the code do what it's supposed to do?
2. **Edge Cases**: Are edge cases and error conditions handled?
3. **Performance**: Are there any performance concerns?
4. **Security**: Are there any security vulnerabilities?
5. **Tests**: Are there adequate tests for the changes?
6. **Documentation**: Is the code and its intent clear?

## Testing Requirements

### Unit Tests
- Write unit tests for all business logic
- Aim for at least 80% code coverage
- Test edge cases and error conditions
- Use descriptive test names

### Integration Tests
- Test API endpoints with realistic scenarios
- Test database operations with test data
- Verify authentication and authorization
- Test error responses

### End-to-End Tests
- Test critical user workflows
- Verify cross-component integration
- Test on multiple platforms (web, iOS)
- Include accessibility testing

## Git Commit Standards

### Commit Message Format
```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Test changes
- `chore`: Build process or auxiliary tool changes

### Example
```
feat(zmemory): add task priority filtering endpoint

Implement GET /api/tasks endpoint with priority query parameter.
Includes validation, tests, and documentation.

Closes #123
```

## Performance Guidelines

### General Performance
- Minimize bundle sizes
- Implement code splitting where appropriate
- Optimize images and assets
- Use caching strategies effectively

### Database Performance
- Index frequently queried columns
- Avoid N+1 queries
- Use pagination for large datasets
- Optimize complex queries

### Frontend Performance
- Implement lazy loading for routes and components
- Use React.memo() for expensive components
- Debounce user input handlers
- Optimize re-renders

## Accessibility Standards

### WCAG 2.1 Level AA Compliance
- Provide text alternatives for non-text content
- Ensure keyboard navigation works throughout
- Maintain sufficient color contrast ratios
- Support screen readers
- Provide clear focus indicators

### Semantic HTML
- Use proper HTML5 semantic elements
- Implement ARIA labels where needed
- Structure content hierarchically
- Ensure form inputs have labels

## Migration and Deprecation

### Introducing Breaking Changes
1. Document the breaking change thoroughly
2. Provide migration guide with examples
3. Deprecate old APIs with warnings first
4. Allow reasonable transition period
5. Update all internal usage before deprecation

### Deprecation Process
```typescript
/**
 * @deprecated Use newFunction() instead. Will be removed in v2.0.0
 */
function oldFunction() {
  console.warn('oldFunction is deprecated, use newFunction instead')
  // Implementation
}
```

## Continuous Improvement

These regulations are living documents and should be updated as the project evolves:

- Propose changes through pull requests
- Discuss major changes in team meetings
- Update based on lessons learned
- Review regulations quarterly
- Keep examples current with codebase

## Getting Started

For new developers or AI agents working on ZephyrOS:

1. **Read this document thoroughly**
2. **Review the component-specific regulation** for your work area
3. **Study existing code** to understand patterns
4. **Ask questions** when patterns are unclear
5. **Follow the regulations** consistently

## Enforcement

These regulations are enforced through:

- **Automated linting** (ESLint, TypeScript)
- **Code review** process
- **CI/CD pipeline** checks
- **AI agent validation** (Claude Code)
- **Team collaboration** and feedback

---

**Last Updated**: 2025-10-10
**Version**: 1.0.0
**Maintained by**: ZephyrOS Development Team

For questions or suggestions, please create an issue or pull request.
