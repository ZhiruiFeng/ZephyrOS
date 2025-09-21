import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';

import LoginScreen from '../screens/LoginScreen';
import { useAuth } from '../contexts/AuthContext';
import CustomBottomNav from '../components/navigation/CustomBottomNav';

export type RootStackParamList = {
  Main: undefined;
  Login: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

// Placeholder screen component
function PlaceholderScreen({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <View style={{
        padding: 20,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0'
      }}>
        <Text style={{
          fontSize: 28,
          fontWeight: 'bold',
          color: '#1e293b',
          marginBottom: 4
        }}>
          {title}
        </Text>
        <Text style={{ fontSize: 14, color: '#64748b' }}>
          {subtitle}
        </Text>
      </View>
      <View style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
      }}>
        <Text style={{
          fontSize: 20,
          fontWeight: '600',
          color: '#64748b',
          marginBottom: 8
        }}>
          Coming Soon
        </Text>
        <Text style={{
          fontSize: 14,
          color: '#94a3b8',
          textAlign: 'center'
        }}>
          This section will be implemented soon
        </Text>
      </View>
    </SafeAreaView>
  );
}

function MainTabs() {
  const [activeTab, setActiveTab] = useState('Overview');

  const tabs = [
    { key: 'Overview', label: 'Overview', icon: 'checkbox-outline' as const, iconFocused: 'checkbox' as const },
    { key: 'Focus', label: 'Focus', icon: 'locate-outline' as const, iconFocused: 'locate' as const },
    { key: 'Agents', label: 'Agents', icon: 'chatbox-ellipses-outline' as const, iconFocused: 'chatbox-ellipses' as const },
    { key: 'Memory', label: 'Memory', icon: 'book-outline' as const, iconFocused: 'book' as const },
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
        return <PlaceholderScreen title="Overview" subtitle="Your productivity dashboard" />;
      case 'Focus':
        return <PlaceholderScreen title="Focus" subtitle="Work sessions and time tracking" />;
      case 'Agents':
        return <PlaceholderScreen title="Agents" subtitle="AI assistants and automation" />;
      case 'Memory':
        return <PlaceholderScreen title="Memory" subtitle="Your knowledge base and insights" />;
      default:
        return <PlaceholderScreen title="Overview" subtitle="Your productivity dashboard" />;
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