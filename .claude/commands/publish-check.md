# Publish Check Command

**IMPORTANT**: Before auto-publishing commits to GitHub, verify all GitHub Actions checks pass.

You MUST run this check before pushing to ensure code quality and prevent CI failures.

## Tasks to Execute

Run all the following checks in sequence:

### 1. Linting Check
```bash
npm run lint
```

### 2. Type Check
```bash
npm run type-check
```

### 3. Build Check
```bash
npm run build
```

### 4. Test Check (ZMemory API)
```bash
npm run test -w @zephyros/zmemory-api
```

### 5. Secret Scan Verification
Ensure no secrets are committed (GitHub Action runs this automatically).

## Requirements

✅ All lint errors must be fixed
✅ All TypeScript type errors must be resolved
✅ Build must complete successfully for all apps
✅ All tests must pass
✅ No secrets or API keys in committed files

## If Checks Fail

1. **Fix all errors** reported by the checks
2. **Re-run the checks** until all pass
3. **Only then** proceed with git push

## Usage

Run this command before pushing:
```
/publish-check
```

## Integration with Git Workflow

This check enforces the same standards as GitHub Actions, preventing:
- ❌ Broken builds from being pushed
- ❌ Type errors in production
- ❌ Failing tests in main branches
- ❌ Linting violations
- ❌ Secret leaks

**Remember**: Quality over speed. Taking time to ensure all checks pass saves debugging time later.
