# ZFlow iOS Development Guide

## 🎯 Quick Start

The ZFlow iOS app is located in `apps/zflow-ios/` and is ready for development.

### 🔄 **Development Workflow & Your Existing Commands**

**Good news! Your existing commands now include iOS:**

```bash
# Your familiar commands (now include iOS app)
npm run dev          # ✅ Starts web + iOS + zmemory API
npm run build        # ✅ Builds web + iOS + zmemory API
npm run type-check   # ✅ Checks web + iOS + zmemory

# iOS simulator
npm run ios          # Launch iOS simulator
```

### **Do I need ZMemory running for iOS development?**

**Yes, for full functionality:**
```bash
# Recommended: Start everything together
npm run dev  # Starts all: web, iOS, zmemory API

# Then launch iOS simulator
npm run ios
```

**When you DON'T need ZMemory:**
- UI-only work (styling, navigation, components)
- Testing login screen layout
- Basic app functionality

**When you DO need ZMemory:**
- Testing Tasks screen (uses `/api/tasks`)
- Testing Memory screen (uses `/api/memories`)
- Authentication flows
- Full app integration

### **Development Options**

**Option 1: Full Development (Recommended)**
```bash
npm run dev  # Everything: web + iOS + API
npm run ios  # Launch simulator
```

**Option 2: iOS-Only Development**
```bash
# Terminal 1: Backend (if needed)
cd apps/zmemory && npm run dev

# Terminal 2: iOS app
npm run ios:dev
```

**Option 3: Just iOS UI Work**
```bash
npm run ios:dev  # No backend needed
```

### From Root Directory (Recommended)
```bash
# Start iOS development
npm run ios:dev     # Start development server
npm run ios         # Launch iOS simulator

# From anywhere in the monorepo
npx turbo run dev --filter=@zephyros/zflow-ios
```

### From iOS App Directory
```bash
cd apps/zflow-ios
npm run start       # Start Expo server
npm run ios         # Launch iOS simulator
```

## 📱 What's Included

**✅ Complete iOS App Setup:**
- React Native with Expo SDK 54
- React Navigation with tab-based navigation
- TypeScript configuration
- Supabase integration ready
- ZMemory API client configured

**✅ App Screens:**
- 🏠 **Home**: Welcome screen with ZFlow branding
- 📋 **Tasks**: Task management (connects to ZMemory API)
- 🧠 **Memory**: Knowledge repository browser
- ⚙️ **Settings**: App configuration
- 🔐 **Login**: Authentication screen (Supabase ready)

**✅ Development Tools:**
- Hot reload/Fast Refresh
- TypeScript type checking
- ESLint configuration
- Turbo monorepo integration

## 🔧 Configuration

### Environment Setup
1. Copy environment template:
   ```bash
   cp apps/zflow-ios/.env.example apps/zflow-ios/.env.local
   ```

2. Configure API endpoints:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=your-supabase-url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   EXPO_PUBLIC_API_URL=http://localhost:3001/api
   ```

### Backend Integration
The iOS app connects to the ZMemory backend:

1. **Start ZMemory API** (in separate terminal):
   ```bash
   cd apps/zmemory
   npm run dev  # Runs on http://localhost:3001
   ```

2. **Start iOS app**:
   ```bash
   npm run ios:dev  # From root
   ```

## 🧩 Monorepo Integration

**✅ Shared Dependencies:**
- Uses `@zephyros/shared` package for common utilities
- Consistent React 19.1.0 across all apps
- Shared TypeScript configurations

**✅ Build System:**
- Turbo for optimized builds and caching
- NPM workspaces for dependency management
- Cross-platform development environment

## 🚀 Next Steps for Feature Development

1. **Authentication**: Implement Supabase auth in `LoginScreen.tsx`
2. **API Integration**: Connect screens to ZMemory endpoints in `src/utils/api.ts`
3. **UI Components**: Build reusable components in `src/components/`
4. **State Management**: Add React hooks in `src/hooks/`
5. **Testing**: Set up testing framework for React Native

## 📚 Key Files

```
apps/zflow-ios/
├── README.md           # Detailed development guide
├── src/
│   ├── navigation/AppNavigator.tsx  # Main navigation setup
│   ├── screens/        # All app screens
│   ├── utils/api.ts    # ZMemory API configuration
│   └── types/index.ts  # TypeScript definitions
├── App.tsx             # App entry point
└── package.json        # Scripts and dependencies
```

## 🐛 Troubleshooting

**Common Commands:**
```bash
# Clear cache and restart
cd apps/zflow-ios
rm -rf .expo node_modules/.cache
npm run start

# Type check
npm run type-check

# Lint code
npm run lint
```

**For detailed troubleshooting**, see `apps/zflow-ios/README.md`.

---

**The iOS app is fully functional and ready for feature development!** 🎉