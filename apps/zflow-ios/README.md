# ZFlow iOS App

A React Native app built with Expo for the ZFlow workflow management system, integrated with the ZMemory backend.

## 🚀 Quick Start

### Prerequisites
- Node.js 20.x (as specified in package.json)
- iOS Simulator (Xcode) or physical iOS device
- Expo CLI (automatically handled via npx)

### Development Setup

1. **Navigate to iOS app directory:**
   ```bash
   cd apps/zflow-ios
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start development server:**
   ```bash
   npm run start
   # Or from root: npm run ios:dev
   ```

4. **Launch on device/simulator:**
   ```bash
   npm run ios      # iOS Simulator
   npm run android  # Android Simulator
   npm run web      # Web browser
   ```

## 📱 Development Commands

### From iOS App Directory (`apps/zflow-ios/`)
```bash
# Development
npm run start         # Start Expo development server
npm run ios          # Launch iOS simulator
npm run android      # Launch Android simulator
npm run web          # Launch web version

# Building
npm run build        # Export production build
npm run build:ios    # Build for iOS
npm run build:android # Build for Android

# Code Quality
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript compiler
```

### From Root Directory
```bash
# Quick access scripts
npm run ios:dev      # Start iOS development server
npm run ios          # Launch iOS simulator

# Monorepo commands
npx turbo run dev --filter=@zephyros/zflow-ios
npx turbo run type-check --filter=@zephyros/zflow-ios
```

## 🏗️ Project Structure

```
apps/zflow-ios/
├── src/
│   ├── components/      # Reusable UI components
│   ├── screens/         # App screens
│   │   ├── HomeScreen.tsx
│   │   ├── TasksScreen.tsx
│   │   ├── MemoryScreen.tsx
│   │   ├── SettingsScreen.tsx
│   │   └── LoginScreen.tsx
│   ├── navigation/      # Navigation setup
│   │   └── AppNavigator.tsx
│   ├── hooks/          # Custom React hooks
│   ├── utils/          # Utilities and API clients
│   │   └── api.ts      # ZMemory API configuration
│   └── types/          # TypeScript definitions
│       └── index.ts    # Shared types
├── App.tsx             # Main app entry point
├── package.json        # Dependencies and scripts
├── tsconfig.json       # TypeScript configuration
└── .env.example        # Environment variables template
```

## 🔧 Configuration

### Environment Variables

1. Copy environment template:
   ```bash
   cp .env.example .env.local
   ```

2. Configure your variables:
   ```bash
   # Supabase Configuration
   EXPO_PUBLIC_SUPABASE_URL=your-supabase-url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

   # ZMemory API Configuration
   EXPO_PUBLIC_API_URL=http://localhost:3001/api

   # Development Configuration
   EXPO_PUBLIC_APP_ENV=development
   ```

### API Integration

The app connects to the ZMemory backend API. Key endpoints configured in `src/utils/api.ts`:

- **Tasks**: `/api/tasks` - Task management
- **Memory**: `/api/memories` - Knowledge/notes storage
- **Conversations**: `/api/conversations` - Chat history

## 📱 Testing on Devices

### iOS Simulator
```bash
npm run ios
```

### Physical iOS Device
1. Install [Expo Go](https://apps.apple.com/app/expo-go/id982107779) from App Store
2. Start development server: `npm run start`
3. Scan QR code with Expo Go app

### Android
```bash
npm run android
```

### Web Testing
```bash
npm run web
```

## 🏃‍♂️ Development Workflow

### 1. **Feature Development**
```bash
# Start development server
npm run start

# Make changes to source files
# Hot reload will update automatically

# Test on multiple platforms
npm run ios      # Test iOS
npm run android  # Test Android
npm run web      # Test web
```

### 2. **Code Quality Checks**
```bash
# Before committing
npm run type-check  # Check TypeScript
npm run lint       # Check code style

# Fix linting issues
npm run lint -- --fix
```

### 3. **Building & Testing**
```bash
# Development build
npm run build

# Production builds
npm run build:ios
npm run build:android
```

## 🔗 Backend Integration

### ZMemory API Connection
The app integrates with the ZMemory backend running on port 3001:

1. **Start ZMemory backend:**
   ```bash
   # From root directory
   cd apps/zmemory
   npm run dev
   ```

2. **Start iOS app:**
   ```bash
   cd apps/zflow-ios
   npm run start
   ```

3. **Test API connectivity** in the app screens (Tasks, Memory, etc.)

### Authentication Flow
- **Login Screen**: Supabase authentication
- **Main App**: Tab navigation (Home, Tasks, Memory, Settings)
- **API Calls**: Authenticated requests to ZMemory backend

## 🛠️ Troubleshooting

### Common Issues

**Metro bundler not starting:**
```bash
# Clear cache and restart
rm -rf .expo node_modules/.cache
npm run start
```

**React Native dependency issues:**
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

**iOS Simulator not launching:**
```bash
# Reset simulator
npx react-native run-ios --reset-cache
```

**Environment variables not loading:**
- Ensure `.env.local` exists with correct `EXPO_PUBLIC_` prefix
- Restart development server after changing environment variables

### Performance Tips

1. **Use development builds** for faster iteration
2. **Enable Fast Refresh** in Expo DevTools
3. **Use iOS Simulator** for faster testing than physical device
4. **Test on multiple devices** for compatibility

## 📚 Key Technologies

- **React Native**: Cross-platform mobile development
- **Expo SDK 54**: Development platform and tools
- **React Navigation 6**: Navigation library
- **TypeScript**: Type safety
- **Supabase**: Authentication and database
- **ZMemory API**: Backend integration

## 🔄 Integration with Monorepo

The iOS app is part of the ZephyrOS monorepo:

- **Shared packages**: Uses `@zephyros/shared` for common utilities
- **Consistent React version**: 19.1.0 across all apps
- **Turbo build system**: Optimized builds and caching
- **Workspace management**: NPM workspaces for dependency management

This ensures consistency and code sharing across web, mobile, and backend components.