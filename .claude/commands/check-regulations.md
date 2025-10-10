# Coding Regulations Checker

You are assisting with development in the ZephyrOS project. Before starting any development work, you MUST:

## 1. Identify the Component

Determine which component(s) you'll be working on:
- **zmemory (backend)**: apps/zmemory - Next.js API backend
- **database**: supabase/schema.sql - PostgreSQL database
- **zmemory-mcp**: apps/zmemory-mcp - MCP server
- **zflow-ios**: apps/zflow-ios - React Native iOS app
- **zflow (web)**: apps/zflow - Next.js web app

## 2. Read the Relevant Regulations

Read the appropriate coding regulation document(s) from `spec/coding-regulations/`:
- **spec/coding-regulations/README.md** - Universal standards (always read this)
- **spec/coding-regulations/zmemory-backend.md** - For backend API work
- **spec/coding-regulations/database.md** - For database schema or migrations
- **spec/coding-regulations/zmemory-mcp.md** - For MCP server development
- **spec/coding-regulations/zflow-ios.md** - For iOS app development
- **spec/coding-regulations/zflow-web.md** - For web app development

## 3. Apply the Regulations

Ensure your implementation follows:
- ✅ **Clean code**: Self-explanatory, meaningful names, no dead code
- ✅ **Modular**: Small focused functions, single responsibility
- ✅ **Reusable**: Extract common patterns, avoid duplication
- ✅ **Consistent**: Follow established patterns in the codebase
- ✅ **Maintainable**: Easy to modify, minimal dependencies
- ✅ **Well-documented**: JSDoc comments, clear explanations

## 4. Component-Specific Checks

### For ZMemory Backend:
- [ ] Route handlers follow the standard pattern (auth → validate → logic → response → error handling)
- [ ] All inputs validated with Zod schemas
- [ ] Proper HTTP status codes used
- [ ] Swagger/OpenAPI documentation included
- [ ] RLS policies respected

### For Database:
- [ ] Tables use UUID primary keys
- [ ] All user-data tables have RLS enabled
- [ ] Proper indexes created for query patterns
- [ ] Timestamps (created_at, updated_at) on all tables
- [ ] Constraints and validations at database level
- [ ] Migration is backward-compatible

### For ZMemory MCP:
- [ ] Tools have proper JSON schemas
- [ ] Input validation with Zod
- [ ] OAuth authentication implemented correctly
- [ ] Structured logging with Pino
- [ ] Error handling with proper context

### For ZFlow iOS:
- [ ] API calls use unified API modules
- [ ] Always include `/api` in endpoint paths
- [ ] Proper error handling with user-friendly messages
- [ ] Loading states implemented
- [ ] TypeScript types for all props

### For ZFlow Web:
- [ ] Server Components used by default
- [ ] Client Components only when needed ('use client')
- [ ] Tailwind CSS for styling
- [ ] Proper accessibility attributes
- [ ] Next.js Image component for images

## 5. Security Checklist

- [ ] No hardcoded secrets or credentials
- [ ] User authentication checked
- [ ] Input sanitization and validation
- [ ] SQL injection prevention (use parameterized queries)
- [ ] XSS prevention (sanitize user content)

## Example Usage

**Correct approach:**
```
User: "Add a new endpoint to create tasks in the backend"

Claude:
1. Reads spec/coding-regulations/README.md
2. Reads spec/coding-regulations/zmemory-backend.md
3. Implements following the route handler pattern:
   - Authentication check
   - Zod schema validation
   - Business logic
   - Proper response/error handling
4. Adds Swagger documentation
5. Verifies all checklist items
```

**Incorrect approach:**
```
User: "Add a new endpoint to create tasks in the backend"

Claude:
*Immediately writes code without reading regulations*
*Missing authentication, validation, or documentation*
```

## Summary

**Always follow this workflow:**
1. 📖 Read regulations for the component
2. 🎯 Understand the requirements and patterns
3. ✍️ Implement following the standards
4. ✅ Verify against the checklist
5. 📝 Document your work

This ensures consistent, secure, maintainable code across the entire ZephyrOS project.