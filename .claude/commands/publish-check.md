# Pre-Publish Validation Checks

You are helping validate code before it's published to GitHub. Run all required CI checks locally to ensure they pass before allowing a push.

## Objective

Verify that all continuous integration checks will pass on GitHub Actions by running them locally first. This prevents failed CI runs and maintains code quality.

## Required Checks

Run the following checks **in order** and report the results:

### 1. Secret Scanning (Gitleaks)

Check for exposed credentials, API keys, and secrets.

```bash
# Check if gitleaks is installed
which gitleaks || echo "Gitleaks not installed"

# If installed, run scan
gitleaks detect --source . --verbose --no-git 2>&1
```

**Expected**: No secrets detected

**If fails**:
- Review the detected secrets
- Remove them from the code
- Use environment variables instead
- Add to `.env.local` (gitignored)

### 2. Type Checking

Verify TypeScript compilation across all workspaces.

```bash
npm run type-check 2>&1
```

**Expected**: No type errors

**If fails**:
- Review type error messages
- Fix type annotations
- Import missing types
- Replace `any` with proper types

### 3. Linting

Validate code quality with ESLint.

```bash
npm run lint 2>&1
```

**Expected**: No linting errors

**If fails**:
- Review linting messages
- Fix code style issues
- Try `npm run lint -- --fix` for auto-fixable issues
- Address remaining issues manually

### 4. Build

Attempt production build of all applications.

```bash
npm run build 2>&1
```

**Expected**: All builds succeed

**If fails**:
- Review build error messages
- Check for runtime errors
- Verify all dependencies are installed
- Fix code issues causing build failures

## Reporting

After running all checks, provide a summary in this format:

```
📋 Pre-Publish Check Results
============================

✅ Secret Scanning: PASSED
✅ Type Checking: PASSED
✅ Linting: PASSED
✅ Build: PASSED

🎉 All checks passed! Safe to commit and push to GitHub.
```

Or if any fail:

```
📋 Pre-Publish Check Results
============================

✅ Secret Scanning: PASSED
❌ Type Checking: FAILED
   - apps/zflow/components/Task.tsx:42:15 - Type 'string' is not assignable to type 'number'
   - apps/zmemory/app/api/tasks/route.ts:18:7 - Property 'id' is missing in type

⚠️ Linting: PASSED
⚠️ Build: SKIPPED (due to type errors)

❌ CANNOT PUSH - Fix the errors above first.

💡 Next steps:
1. Fix the type errors in the files listed above
2. Run /publish_check again
3. Only push when all checks pass
```

## Important Notes

1. **Always run ALL checks** - Don't stop at the first failure
2. **Provide specific error messages** - Include file names, line numbers, and error descriptions
3. **Give actionable advice** - Tell the developer exactly what to fix
4. **Be clear about status** - Use ✅ for pass, ❌ for fail, ⚠️ for skipped
5. **Final recommendation** - Clearly state if it's safe to push or not

## If Gitleaks is Not Installed

If `gitleaks` is not available:

```
⚠️ Secret Scanning: SKIPPED
   Gitleaks is not installed. Install with:
   - macOS: brew install gitleaks
   - Linux: https://github.com/gitleaks/gitleaks#installing
   - Windows: https://github.com/gitleaks/gitleaks#installing

   Note: Secret scanning will still run in GitHub Actions.
```

Then continue with the other checks.

## Performance Notes

- These checks may take 1-3 minutes to complete
- Run checks in the background if possible
- Cache results when appropriate
- Provide progress updates for long-running checks

## Success Criteria

All checks must pass (✅) before the code is safe to push to GitHub.
