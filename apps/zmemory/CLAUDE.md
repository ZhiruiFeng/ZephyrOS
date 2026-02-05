# ZMemory Backend

Next.js 15 API backend serving the ZephyrOS memory and task management system.

## Tech Stack
- Next.js 15 (App Router, API routes only)
- Supabase (auth + PostgreSQL with RLS)
- Zod for input validation
- Swagger/OpenAPI for documentation
- Jest + Supertest for testing

## Route Handler Pattern
Every API route must follow this sequence:
1. **Auth check** — verify session via `supabase.auth.getSession()`
2. **Input validation** — parse request body with Zod schema
3. **Business logic** — Supabase queries
4. **Response** — proper HTTP status codes
5. **Error handling** — catch block with appropriate error responses

## Key Directories
- `app/api/` — API route handlers (30+ resource endpoints)
- `lib/` — shared utilities, Supabase client, middleware
- `scripts/` — dev tooling (env check, swagger UI copy)
- `tests/` — Jest unit tests + Postman collections

## Testing
```bash
npm test              # Jest unit tests
npm run test:api      # Postman/Newman integration tests
```

## Coding Regulations
See `spec/coding-regulations/zmemory-backend.md` for full standards.
