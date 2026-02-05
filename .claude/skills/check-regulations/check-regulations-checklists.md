# Component Checklists

## ZMemory Backend
- [ ] Route handlers follow: auth -> validate -> logic -> response -> error handling
- [ ] All inputs validated with Zod schemas
- [ ] Proper HTTP status codes
- [ ] Swagger/OpenAPI documentation included
- [ ] RLS policies respected

## Database
- [ ] UUID primary keys
- [ ] RLS enabled on all user-data tables
- [ ] Proper indexes for query patterns
- [ ] Timestamps (created_at, updated_at) on all tables
- [ ] Constraints at database level
- [ ] Migration is backward-compatible

## ZMemory MCP
- [ ] Tools have proper JSON schemas
- [ ] Input validation with Zod
- [ ] OAuth authentication correct
- [ ] Structured logging with Pino
- [ ] Error handling with context

## ZFlow iOS
- [ ] API calls use unified API modules
- [ ] `/api` prefix in endpoint paths
- [ ] User-friendly error messages
- [ ] Loading states implemented
- [ ] TypeScript types for all props

## ZFlow Web
- [ ] Server Components by default
- [ ] Client Components only when needed (`'use client'`)
- [ ] Tailwind CSS for styling
- [ ] Accessibility attributes
- [ ] Next.js Image component for images

## Security (all components)
- [ ] No hardcoded secrets
- [ ] Authentication checked
- [ ] Input sanitized and validated
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (sanitize user content)
