# ZephyrOS Development Instructions

## Automatic Regulation Enforcement

When working on any code in this project, you MUST automatically:

1. **Read `spec/coding-regulations/README.md`** for universal standards
2. **Read the component-specific regulation** from `spec/coding-regulations/` (see each app's `CLAUDE.md` for which file applies)
3. **Apply the standards** before writing any code

Database work (`supabase/**/*.sql`) follows `spec/coding-regulations/database.md`.

## Slash Commands

- `/check-regulations` - Review coding standards before starting work
- `/publish-check` - **Run ALL CI checks before pushing to GitHub (REQUIRED)**

## Pre-Publish Requirements

**⚠️ CRITICAL**: Before auto-publishing commits to GitHub, you MUST run:

```bash
/publish-check
```

This command verifies:
1. ✅ All lint checks pass (`npm run lint`)
2. ✅ All type checks pass (`npm run type-check`)
3. ✅ All builds succeed (`npm run build`)
4. ✅ All tests pass (`npm run test`)
5. ✅ No secrets are committed (GitHub Actions check)

**DO NOT push to GitHub until all checks pass.**

If any check fails:
1. Fix the reported errors
2. Re-run `/publish-check`
3. Repeat until all checks pass
4. Only then proceed with `git push`

This ensures the same standards as GitHub Actions are met locally, preventing CI failures.

## Enforcement

These regulations are mandatory. Any code that doesn't follow them should be:
1. Flagged during review
2. Refactored to comply
3. Not merged until compliant

**All GitHub Action checks must pass before merge.**

Quality over speed. Consistent, maintainable code is the priority.
