# ZFlow iOS

Expo 54 / React Native app for iOS.

## Tech Stack
- Expo SDK 54 with dev client
- React Native 0.81
- React Navigation (stack + bottom tabs)
- React Native Paper (Material Design components)
- Supabase for auth + data
- Expo Auth Session for OAuth

## Conventions
- **Unified API modules** — all API calls go through shared API helpers
- **Always include `/api`** in endpoint paths
- **Loading states** — every async operation shows a loading indicator
- **TypeScript types** — explicit types for all component props
- **Error handling** — user-friendly error messages, never raw errors

## Key Directories
- `app/` or `src/` — screens and navigation
- `components/` — shared React Native components
- `api/` — API client modules

## Development
```bash
npm run ios           # Build and run on iOS
npm run start         # Expo dev server
```

## Coding Regulations
See `spec/coding-regulations/zflow-ios.md` for full standards.
