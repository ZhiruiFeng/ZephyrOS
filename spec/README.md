# ZephyrOS Specifications

This directory contains all specifications, standards, and regulations for the ZephyrOS project.

## Directory Structure

```
spec/
├── README.md                          # This file
└── coding-regulations/                # Coding standards for each component
    ├── README.md                      # Master coding standards
    ├── zmemory-backend.md            # Backend API regulations
    ├── database.md                    # Database standards
    ├── zmemory-mcp.md                # MCP server regulations
    ├── zflow-ios.md                  # iOS app regulations
    └── zflow-web.md                  # Web app regulations
```

## Purpose

These specifications ensure:
- ✅ **Consistency** across the codebase
- ✅ **Quality** in all implementations
- ✅ **Security** best practices
- ✅ **Maintainability** for long-term development
- ✅ **Onboarding** for new developers and AI agents

## For Developers

### Before Starting Any Work

1. **Read the master standards**: `coding-regulations/README.md`
2. **Read component-specific regulations** for the area you're working on
3. **Follow the patterns exactly** as documented
4. **Verify compliance** before submitting code

### Quick Navigation

| Component | Path | Regulation |
|-----------|------|------------|
| Backend API | `apps/zmemory/` | [zmemory-backend.md](./coding-regulations/zmemory-backend.md) |
| Database | `supabase/` | [database.md](./coding-regulations/database.md) |
| MCP Server | `apps/zmemory-mcp/` | [zmemory-mcp.md](./coding-regulations/zmemory-mcp.md) |
| iOS App | `apps/zflow-ios/` | [zflow-ios.md](./coding-regulations/zflow-ios.md) |
| Web App | `apps/zflow/` | [zflow-web.md](./coding-regulations/zflow-web.md) |

## For Claude Code (AI Agents)

### Automatic Enforcement

Claude Code is configured to automatically:
1. **Detect component** from file path
2. **Load regulations** from `spec/coding-regulations/`
3. **Apply standards** to all code

### Configuration Files

- `.claude/instructions.md` - Automatic regulation loading
- `.claude/commands/check-regulations.md` - Manual compliance check

### Usage

When Claude Code is working on ZephyrOS:
- It will automatically reference these regulations
- Use `/check-regulations` to manually review standards
- All code will follow these specifications

## Core Principles

All code in ZephyrOS must be:

### 1. Clean
- Self-explanatory code
- Meaningful variable and function names
- No dead code or unnecessary comments

### 2. Modular
- Small, focused functions
- Single responsibility principle
- Clear separation of concerns

### 3. Reusable
- Extract common patterns
- Avoid code duplication
- Build composable components

### 4. Consistent
- Follow established patterns
- Use uniform naming conventions
- Maintain code structure

### 5. Maintainable
- Easy to modify and extend
- Minimal dependencies
- Proper error handling

### 6. Well-Documented
- JSDoc comments for public APIs
- Explain complex logic
- Keep documentation current

## Security Standards

### Required for All Components

- ✅ Authentication and authorization
- ✅ Input validation and sanitization
- ✅ Secrets management (never commit)
- ✅ SQL injection prevention
- ✅ XSS prevention
- ✅ Rate limiting on APIs
- ✅ HTTPS for all communications

### Enforcement

- Pre-commit hooks check for secrets
- Code review verifies security practices
- CI/CD pipeline runs security scans

## Code Review Process

### Checklist

Before approving any PR:

1. **Regulation Compliance**
   - [ ] Follows component-specific standards
   - [ ] Matches established patterns
   - [ ] Security requirements met

2. **Code Quality**
   - [ ] Clean and readable
   - [ ] Properly documented
   - [ ] No code duplication

3. **Testing**
   - [ ] Unit tests included
   - [ ] Integration tests pass
   - [ ] Edge cases covered

4. **Performance**
   - [ ] No obvious bottlenecks
   - [ ] Efficient algorithms used
   - [ ] Database queries optimized

## Updating Regulations

### Process

1. **Propose changes** via pull request
2. **Discuss with team** in PR comments
3. **Update all affected regulations** consistently
4. **Update examples** in the regulation docs
5. **Notify team** of changes

### When to Update

- New patterns emerge
- Security requirements change
- Technology stack updates
- Best practices evolve
- Lessons learned from incidents

## Examples and Patterns

Each regulation document includes:
- ✅ **Good examples** with explanations
- ❌ **Bad examples** showing what to avoid
- 📝 **Code snippets** demonstrating patterns
- 🔍 **Common pitfalls** and how to avoid them

## Testing Regulations

### Coverage Requirements

- **Backend**: 80% code coverage minimum
- **Frontend**: 70% code coverage minimum
- **Database**: Migration tests required
- **MCP Server**: Integration tests required

### Test Standards

- Descriptive test names
- One assertion per test (when possible)
- Test edge cases and errors
- Mock external dependencies

## Performance Standards

### Response Times

- **API endpoints**: < 200ms (p95)
- **Database queries**: < 100ms (p95)
- **Page load**: < 2s (FCP)
- **Time to Interactive**: < 3s

### Optimization

- Implement caching where appropriate
- Use database indexes effectively
- Optimize bundle sizes
- Lazy load non-critical resources

## Accessibility Standards

### WCAG 2.1 Level AA

- Keyboard navigation support
- Screen reader compatibility
- Sufficient color contrast
- Semantic HTML structure
- ARIA labels where needed

## Versioning

These regulations follow semantic versioning:
- **Major**: Breaking changes to standards
- **Minor**: New guidelines added
- **Patch**: Clarifications and fixes

Current version: **1.0.0**
Last updated: **2025-10-10**

## Questions and Feedback

### For Human Developers

- Create an issue in the repo
- Discuss in team meetings
- Propose changes via PR

### For AI Agents (Claude Code)

- Reference regulations automatically
- Follow patterns exactly
- Ask for clarification when unclear

## Continuous Improvement

These regulations are living documents:
- Review quarterly
- Update based on experience
- Incorporate new best practices
- Learn from mistakes
- Adapt to changing needs

## Success Metrics

We measure regulation effectiveness by:
- Code review time (should decrease)
- Bug rates (should decrease)
- Developer velocity (should increase)
- Code consistency (should increase)
- Security incidents (should be zero)

---

**Remember**: Quality over speed. Taking time to follow these regulations now saves exponentially more time in maintenance, debugging, and refactoring later.

**For questions or suggestions**: Create an issue or PR in the repository.
