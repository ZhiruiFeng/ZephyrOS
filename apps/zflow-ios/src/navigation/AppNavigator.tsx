import React, { useState } from 'react';
import { View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Surface, Text, useTheme } from 'react-native-paper';

import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import TasksScreen from '../screens/TasksScreen';
import NarrativeScreen from '../screens/NarrativeScreen';
import { useAuth } from '../contexts/AuthContext';
import CustomBottomNav from '../components/navigation/CustomBottomNav';

export type RootStackParamList = {
  Main: undefined;
  Login: undefined;
  Loading: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

// Placeholder screen component
function PlaceholderScreen({ title, subtitle }: { title: string; subtitle: string }) {
  const theme = useTheme();
  
  return (
    <Surface style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Surface style={{
        padding: 20,
        backgroundColor: theme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.outline,
        elevation: 2,
      }}>
        <Text variant="headlineMedium" style={{ color: theme.colors.onSurface, marginBottom: 4 }}>
          {title}
        </Text>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          {subtitle}
        </Text>
      </Surface>
      <View style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
      }}>
        <Text variant="headlineSmall" style={{ color: theme.colors.onSurface, marginBottom: 8 }}>
          Coming Soon
        </Text>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
          This section will be implemented soon
        </Text>
      </View>
    </Surface>
  );
}

function MainTabs() {
  const [activeTab, setActiveTab] = useState('Overview');

  const tabs = [
    { key: 'Overview', label: 'Overview', icon: 'checkbox-outline' as const, iconFocused: 'checkbox' as const },
    { key: 'Focus', label: 'Focus', icon: 'locate-outline' as const, iconFocused: 'locate' as const },
    { key: 'Agents', label: 'Agents', icon: 'chatbox-ellipses-outline' as const, iconFocused: 'chatbox-ellipses' as const },
    { key: 'Narrative', label: 'Narrative', icon: 'book-outline' as const, iconFocused: 'book' as const },
  ];

  const handleTabPress = (tab: string) => {
    setActiveTab(tab);
  };

  const handleAddPress = () => {
    console.log('Add button pressed');
    // TODO: Navigate to add task screen
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'Overview':
        return <HomeScreen />;
      case 'Focus':
        return <TasksScreen />;
      case 'Agents':
        return <PlaceholderScreen title="Agents" subtitle="AI assistants and automation" />;
      case 'Narrative':
        return <NarrativeScreen />;
      default:
        return <HomeScreen />;
    }
  };

  return (
    <View style={{ flex: 1 }}>
      {renderContent()}
      <CustomBottomNav
        tabs={tabs}
        activeTab={activeTab}
        onTabPress={handleTabPress}
        onAddPress={handleAddPress}
      />
    </View>
  );
}

export default function AppNavigator() {
  const { user, loading } = useAuth();

  // Show loading spinner while checking auth state
  if (loading) {
    return (
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Loading" component={() => (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <Text>Loading...</Text>
            </View>
          )} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <Stack.Screen name="Main" component={MainTabs} />
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}