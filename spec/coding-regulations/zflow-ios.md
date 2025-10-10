# ZFlow iOS App Coding Regulations

## Overview

ZFlow iOS is a React Native/Expo mobile application for task management and productivity. This document defines coding standards for iOS app development.

**Technology Stack:**
- React Native 0.74+
- Expo SDK 54+
- TypeScript 5.x
- React Navigation v6
- React Native Paper (Material Design)
- Supabase Client

**Note**: This regulation extends and consolidates the existing `apps/zflow-ios/CODING_RULES.md`. Refer to that document for API-specific patterns.

## Project Structure

### 1. **Directory Organization**

```
apps/zflow-ios/
├── src/
│   ├── components/       # Reusable UI components
│   ├── screens/          # Screen components
│   ├── navigation/       # Navigation configuration
│   ├── lib/
│   │   ├── api/         # API client modules (see CODING_RULES.md)
│   │   ├── supabase/    # Supabase client
│   │   └── utils/       # Utility functions
│   ├── hooks/           # Custom React hooks
│   ├── contexts/        # React contexts
│   ├── types/           # TypeScript type definitions
│   └── constants/       # App constants
├── assets/              # Images, fonts, etc.
├── app.json            # Expo configuration
└── package.json
```

### 2. **File Naming Conventions**

```typescript
// ✅ Good: Consistent naming
src/components/TaskCard.tsx
src/screens/TaskListScreen.tsx
src/hooks/useTasks.ts
src/lib/api/tasks-api.ts
src/types/task.ts

// ❌ Bad: Inconsistent naming
src/components/taskcard.tsx
src/screens/task_list.tsx
src/hooks/Tasks.ts
```

## Component Patterns

### 1. **Functional Components with TypeScript**

```typescript
// ✅ Good: Typed functional component
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Card } from 'react-native-paper';

interface TaskCardProps {
  task: Task;
  onPress: (taskId: string) => void;
  onLongPress?: (taskId: string) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onPress,
  onLongPress
}) => {
  const handlePress = () => onPress(task.id);
  const handleLongPress = onLongPress
    ? () => onLongPress(task.id)
    : undefined;

  return (
    <Card
      style={styles.card}
      onPress={handlePress}
      onLongPress={handleLongPress}
    >
      <Card.Content>
        <Text variant="titleMedium">{task.title}</Text>
        {task.description && (
          <Text variant="bodyMedium" numberOfLines={2}>
            {task.description}
          </Text>
        )}
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginVertical: 8,
    marginHorizontal: 16,
  },
});
```

### 2. **Custom Hooks**

```typescript
// ✅ Good: Custom hook with proper error handling
import { useState, useEffect } from 'react';
import { tasksApi } from '../lib/api';
import type { Task } from '../types/task';

interface UseTasksResult {
  tasks: Task[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export function useTasks(): UseTasksResult {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await tasksApi.getTasks();
      setTasks(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  return {
    tasks,
    loading,
    error,
    refresh: fetchTasks,
  };
}

// Usage in component
function TaskListScreen() {
  const { tasks, loading, error, refresh } = useTasks();

  if (loading) return <ActivityIndicator />;
  if (error) return <ErrorView error={error} onRetry={refresh} />;

  return <TaskList tasks={tasks} onRefresh={refresh} />;
}
```

## API Integration

### 1. **API Client Pattern**

**Follow the patterns in `apps/zflow-ios/CODING_RULES.md`:**

```typescript
// ✅ Good: Use unified API modules
import { tasksApi, categoriesApi } from '../lib/api';
import { API_BASE } from '../lib/api/api-base';

// Always include /api in endpoint paths
const response = await fetch(`${API_BASE}/api/tasks`, {
  headers: await authManager.getAuthHeaders(),
});

// ❌ Bad: Missing /api path
const response = await fetch(`${API_BASE}/tasks`); // Wrong!
```

### 2. **Error Handling**

```typescript
// ✅ Good: Comprehensive error handling
import { Alert } from 'react-native';
import { ApiError } from '../lib/api/api-base';

async function createTask(data: CreateTaskInput) {
  try {
    const task = await tasksApi.createTask(data);
    return task;
  } catch (error) {
    if (error instanceof ApiError) {
      // Handle specific API errors
      if (error.status === 401) {
        Alert.alert('Session Expired', 'Please log in again.');
        // Navigate to login
      } else if (error.status === 422) {
        Alert.alert('Validation Error', error.message);
      } else {
        Alert.alert('Error', error.message);
      }
    } else if (error instanceof Error && error.message.includes('Network')) {
      Alert.alert(
        'Network Error',
        'Please check your internet connection.'
      );
    } else {
      Alert.alert('Error', 'An unexpected error occurred.');
    }
    throw error;
  }
}
```

## Navigation

### 1. **Type-Safe Navigation**

```typescript
// ✅ Good: Define navigation types
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Home: undefined;
  TaskList: { categoryId?: string };
  TaskDetails: { taskId: string };
  CreateTask: { parentId?: string };
};

export type HomeScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'Home'
>;

export type TaskDetailsScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'TaskDetails'
>;

// Use in components
function TaskDetailsScreen({ route, navigation }: TaskDetailsScreenProps) {
  const { taskId } = route.params; // TypeScript knows this exists

  const navigateToEdit = () => {
    navigation.navigate('CreateTask', { parentId: taskId });
  };

  // ...
}
```

### 2. **Navigation Configuration**

```typescript
// ✅ Good: Clean navigation setup
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Stack = createNativeStackNavigator<RootStackParamList>();

function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: '#6200ee',
          },
          headerTintColor: '#fff',
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: 'ZFlow' }}
        />
        <Stack.Screen
          name="TaskDetails"
          component={TaskDetailsScreen}
          options={{ title: 'Task Details' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

## State Management

### 1. **React Context for Global State**

```typescript
// ✅ Good: Typed context
import React, { createContext, useContext, useState } from 'react';

interface AuthContextValue {
  user: User | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    setUser(data.user);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

## Styling

### 1. **StyleSheet API**

```typescript
// ✅ Good: StyleSheet with theme
import { StyleSheet } from 'react-native';
import { useTheme } from 'react-native-paper';

function TaskCard() {
  const theme = useTheme();
  const styles = makeStyles(theme);

  return <View style={styles.container}>...</View>;
}

const makeStyles = (theme: MD3Theme) => StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
  },
});

// ❌ Bad: Inline styles
<View style={{ padding: 16, backgroundColor: '#fff' }} />
```

### 2. **Platform-Specific Styles**

```typescript
// ✅ Good: Platform-specific styling
import { Platform, StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: {
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
});
```

## Performance Optimization

### 1. **List Rendering**

```typescript
// ✅ Good: FlatList with optimization
import { FlatList } from 'react-native';

function TaskList({ tasks }: { tasks: Task[] }) {
  const renderItem = useCallback(({ item }: { item: Task }) => (
    <TaskCard task={item} onPress={handleTaskPress} />
  ), [handleTaskPress]);

  const keyExtractor = useCallback((item: Task) => item.id, []);

  return (
    <FlatList
      data={tasks}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      updateCellsBatchingPeriod={50}
      initialNumToRender={10}
      windowSize={5}
    />
  );
}

// ❌ Bad: ScrollView with map
<ScrollView>
  {tasks.map(task => (
    <TaskCard key={task.id} task={task} />
  ))}
</ScrollView>
```

### 2. **Memoization**

```typescript
// ✅ Good: Proper memoization
import { useMemo, useCallback } from 'react';

function TaskStats({ tasks }: { tasks: Task[] }) {
  // Expensive calculation
  const stats = useMemo(() => {
    return {
      total: tasks.length,
      completed: tasks.filter(t => t.status === 'completed').length,
      pending: tasks.filter(t => t.status === 'pending').length,
    };
  }, [tasks]);

  // Callback that doesn't change
  const handleRefresh = useCallback(async () => {
    await fetchTasks();
  }, []);

  return <StatsView stats={stats} onRefresh={handleRefresh} />;
}
```

## Testing

### 1. **Component Testing**

```typescript
// ✅ Good: Test components with React Testing Library
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { TaskCard } from '../TaskCard';

describe('TaskCard', () => {
  const mockTask: Task = {
    id: '123',
    title: 'Test Task',
    status: 'pending',
  };

  it('renders task title', () => {
    const { getByText } = render(
      <TaskCard task={mockTask} onPress={jest.fn()} />
    );
    expect(getByText('Test Task')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <TaskCard task={mockTask} onPress={onPress} />
    );

    fireEvent.press(getByText('Test Task'));
    expect(onPress).toHaveBeenCalledWith('123');
  });
});
```

### 2. **Hook Testing**

```typescript
// ✅ Good: Test hooks
import { renderHook, waitFor } from '@testing-library/react-hooks';
import { useTasks } from '../useTasks';

describe('useTasks', () => {
  it('fetches tasks on mount', async () => {
    const mockTasks = [{ id: '1', title: 'Task 1' }];
    jest.spyOn(tasksApi, 'getTasks').mockResolvedValue(mockTasks);

    const { result } = renderHook(() => useTasks());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.tasks).toEqual(mockTasks);
  });
});
```

## Accessibility

### 1. **Accessibility Props**

```typescript
// ✅ Good: Proper accessibility
import { TouchableOpacity, Text } from 'react-native';

<TouchableOpacity
  accessibilityRole="button"
  accessibilityLabel="Create new task"
  accessibilityHint="Opens the task creation form"
  onPress={handleCreate}
>
  <Text>Create Task</Text>
</TouchableOpacity>

<Image
  source={require('./logo.png')}
  accessibilityRole="image"
  accessible={true}
  accessibilityLabel="ZFlow app logo"
/>
```

## Security

### 1. **Secure Storage**

```typescript
// ✅ Good: Use Expo SecureStore for sensitive data
import * as SecureStore from 'expo-secure-store';

async function saveToken(token: string) {
  await SecureStore.setItemAsync('authToken', token);
}

async function getToken(): Promise<string | null> {
  return await SecureStore.getItemAsync('authToken');
}

// ❌ Bad: AsyncStorage for sensitive data
import AsyncStorage from '@react-native-async-storage/async-storage';
await AsyncStorage.setItem('authToken', token); // Not secure!
```

## Build and Deployment

### 1. **Environment Configuration**

```javascript
// app.json / app.config.js
export default {
  expo: {
    name: 'ZFlow',
    slug: 'zflow-ios',
    version: '1.0.0',
    extra: {
      apiUrl: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001',
    },
  },
};

// Access in code
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.apiUrl;
```

### 2. **EAS Build**

```json
// eas.json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "env": {
        "EXPO_PUBLIC_API_URL": "http://localhost:3001"
      }
    },
    "preview": {
      "distribution": "internal",
      "env": {
        "EXPO_PUBLIC_API_URL": "https://staging-api.zflow.app"
      }
    },
    "production": {
      "env": {
        "EXPO_PUBLIC_API_URL": "https://api.zflow.app"
      }
    }
  }
}
```

---

**Last Updated**: 2025-10-10
**Component**: ZFlow iOS App
**Tech Stack**: React Native + Expo + TypeScript
**Related**: See `apps/zflow-ios/CODING_RULES.md` for API patterns
