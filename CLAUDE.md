# Claude Development Workflow for ZephyrOS

This document outlines the development workflow and best practices when using Claude Code (or other AI assistants) to work on ZephyrOS.

## Table of Contents

- [Publishing Requirements](#publishing-requirements)
- [Development Workflow](#development-workflow)
- [Slash Commands](#slash-commands)
- [Coding Regulations](#coding-regulations)
- [Git Workflow](#git-workflow)
- [Testing & Validation](#testing--validation)

## Publishing Requirements

### ⚠️ CRITICAL: Pre-Publish Checks

**Before pushing any commits to GitHub**, you MUST ensure all CI checks pass locally. This prevents failed CI runs and maintains code quality.

### Required Checks

1. **Secret Scanning** - No exposed credentials or API keys
2. **Type Checking** - All TypeScript code compiles without errors
3. **Linting** - Code passes ESLint validation
4. **Build** - All applications build successfully

### How to Run Checks

#### Option 1: Use the `/publish_check` Command (Recommended)

```bash
/publish_check
```

This slash command will automatically:
- Run secret scanning with Gitleaks
- Execute type checking across all workspaces
- Run linting on all code
- Attempt to build all applications
- Report any failures with actionable error messages

#### Option 2: Run Checks Manually

```bash
# Secret scanning
npm install -g gitleaks
gitleaks detect --source . --verbose

# Type checking
npm run type-check

# Linting
npm run lint

# Build
npm run build
```

### What to Do if Checks Fail

1. **Review the error messages** carefully
2. **Fix the issues** in your code
3. **Re-run the checks** until they all pass
4. **Only then** commit and push your changes

### GitHub Actions Integration

All checks are also enforced in CI through GitHub Actions:

- `.github/workflows/secret-scan.yml` - Secret scanning
- `.github/workflows/ci-checks.yml` - Type checking, linting, and build

## Development Workflow

### 1. Start Development

```bash
# Clone the repository
git clone <repository-url>
cd ZephyrOS

# Install dependencies
npm install

# Start development servers
npm run dev
```

### 2. Make Changes

Follow the coding regulations in `spec/coding-regulations/`:

- Read `spec/coding-regulations/README.md` for universal standards
- Read component-specific regulations before coding:
  - `zmemory-backend.md` - Backend API
  - `database.md` - Database schema
  - `zmemory-mcp.md` - MCP server
  - `zflow-ios.md` - iOS app
  - `zflow-web.md` - Web app

### 3. Validate Changes

Before committing:

```bash
# Run publish checks
/publish_check

# Or run individual checks
npm run type-check
npm run lint
npm run build
```

### 4. Commit Changes

```bash
# Stage your changes
git add .

# Commit with descriptive message
git commit -m "feat: add voice recognition to mindflow"

# Run publish checks one more time
/publish_check
```

### 5. Push to GitHub

```bash
# Push to your branch
git push -u origin claude/<branch-name>
```

**Note**: Only push after `/publish_check` confirms all checks pass.

## Slash Commands

### `/check-regulations`

Reviews coding standards before starting work.

**Usage**:
```bash
/check-regulations
```

**What it does**:
- Identifies which component you're working on
- Shows relevant coding regulation checklist
- Helps ensure code quality and consistency

### `/publish_check`

Runs all pre-publish validation checks.

**Usage**:
```bash
/publish_check
```

**What it does**:
- Scans for secrets with Gitleaks
- Runs TypeScript type checking
- Executes ESLint validation
- Attempts production build
- Reports pass/fail status for each check
- Provides actionable error messages for failures

**When to use**:
- Before every commit
- Before pushing to GitHub
- After making significant changes
- When CI is failing

## Coding Regulations

ZephyrOS follows strict coding regulations to ensure quality, consistency, and maintainability.

### Universal Standards (All Components)

✅ **Clean Code**
- Self-explanatory variable and function names
- No dead code or commented-out code
- Consistent formatting

✅ **Modular**
- Small, focused functions (< 50 lines)
- Single Responsibility Principle
- Clear separation of concerns

✅ **Reusable**
- Extract common patterns
- No code duplication (DRY principle)
- Shared utilities and components

✅ **Type Safe**
- Explicit TypeScript types
- No `any` types (use `unknown` if necessary)
- Proper type imports and exports

✅ **Error Handling**
- Try-catch blocks for async operations
- Proper error messages
- User-friendly error responses

✅ **Documentation**
- JSDoc comments for public functions
- Complex logic explained
- README files for major features

### Component-Specific Standards

#### Backend API (ZMemory)
- Follow the standard route handler pattern:
  1. Authentication check
  2. Input validation with Zod
  3. Business logic
  4. Response formatting
  5. Error handling
- Include Swagger/OpenAPI documentation
- Use proper HTTP status codes
- Respect RLS policies

#### Database
- UUID primary keys
- RLS enabled on all user-data tables
- Timestamps on all tables
- Proper indexes
- Migration backward-compatibility

#### Frontend (ZFlow Web)
- Server Components by default
- Client Components only when needed
- Tailwind CSS for styling
- Next.js Image component
- Accessibility attributes

#### iOS (ZFlow iOS)
- Unified API modules
- `/api` prefix in endpoints
- Proper error handling
- Loading states
- TypeScript types for props

## Git Workflow

### Branch Naming

```bash
claude/<feature-description>-<session-id>
```

Example: `claude/voice-recognition-01F8W3h9PJZ9QSYP3BXVAJeE`

### Commit Messages

Follow conventional commit format:

```
<type>: <description>

[optional body]

[optional footer]
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance tasks

**Examples**:
```bash
git commit -m "feat: add mindflow STT integration"
git commit -m "fix: resolve conversation history loading issue"
git commit -m "docs: update README with voice features"
```

### Push Requirements

**ALWAYS** run `/publish_check` before pushing:

```bash
# 1. Make changes
# 2. Run checks
/publish_check

# 3. If checks pass, commit and push
git add .
git commit -m "feat: your feature"
git push -u origin claude/<branch-name>

# 4. If checks fail, fix issues and repeat
```

### Pull Request Guidelines

1. **Title**: Clear, descriptive summary
2. **Description**:
   - What changed and why
   - Test plan
   - Screenshots (if UI changes)
3. **Checklist**:
   - [ ] All checks pass locally
   - [ ] Code follows regulations
   - [ ] Documentation updated
   - [ ] No secrets committed

## Testing & Validation

### Local Testing

```bash
# Run all development servers
npm run dev

# Test specific app
npm run dev -w @zephyros/zflow
npm run dev -w @zephyros/zmemory-api
```

### Type Checking

```bash
# All workspaces
npm run type-check

# Specific workspace
npm run type-check -w @zephyros/zflow
```

### Linting

```bash
# All workspaces
npm run lint

# Auto-fix issues
npm run lint -- --fix
```

### Building

```bash
# Production build
npm run build

# Specific app
npm run build -w @zephyros/zflow
```

## Best Practices

### 1. Security

- **Never commit secrets** - Use `.env.local` for local development
- **Review changes** before committing
- **Enable Gitleaks** scanning in your workflow
- **Rotate exposed secrets** immediately if detected

### 2. Code Quality

- **Follow regulations** - Check `spec/coding-regulations/`
- **Write tests** for critical functionality
- **Document complex logic** with comments
- **Keep functions small** and focused

### 3. Performance

- **Optimize data fetching** - Use SWR for caching
- **Lazy load components** when appropriate
- **Minimize bundle size** - Check with `npm run build`
- **Use Server Components** by default in Next.js

### 4. Collaboration

- **Clear commit messages** - Use conventional commits
- **Update documentation** when changing functionality
- **Review before pushing** - Use `/publish_check`
- **Communicate changes** in pull request descriptions

## Troubleshooting

### Checks Failing

**Problem**: `/publish_check` reports failures

**Solutions**:
1. Read the error messages carefully
2. Fix the specific issues (type errors, lint errors, etc.)
3. Run individual checks to isolate the problem:
   ```bash
   npm run type-check  # For type errors
   npm run lint        # For linting issues
   npm run build       # For build failures
   ```
4. Re-run `/publish_check` after fixes

### Secret Detected

**Problem**: Gitleaks detects a potential secret

**Solutions**:
1. Remove the secret from the code
2. Use environment variables instead
3. Add to `.env.local` (which is gitignored)
4. If already committed, rotate the secret and amend the commit

### Type Errors

**Problem**: TypeScript compilation fails

**Solutions**:
1. Check the error messages for file and line numbers
2. Add proper type annotations
3. Import missing types
4. Fix any `any` types with proper types

### Build Failures

**Problem**: Production build fails

**Solutions**:
1. Check for runtime errors in the build output
2. Ensure all dependencies are installed
3. Verify environment variables are properly configured
4. Test locally with `npm run build`

## Additional Resources

- **Coding Regulations**: `spec/coding-regulations/`
- **API Documentation**: http://localhost:3001/api/docs
- **MCP Integration**: `guidance/ZMEMORY_MCP_INTEGRATION.md`
- **GitHub Issues**: Report bugs and request features

---

**Remember**: Quality over speed. Always run `/publish_check` before pushing to GitHub.
