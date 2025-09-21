import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Linking } from 'react-native';
import 'react-native-gesture-handler';

import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/contexts/AuthContext';

export default function App() {
  useEffect(() => {
    // Handle incoming URLs (for authentication redirects)
    const handleUrl = (url: string) => {
      console.log('📱 App received URL:', url);
      // The authentication will be handled by WebBrowser automatically
      // This is just for logging and future use
    };

    // Listen for URL events
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleUrl(url);
    });

    // Handle initial URL if app was opened via URL
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleUrl(url);
      }
    });

    return () => {
      subscription?.remove();
    };
  }, []);

  return (
    <AuthProvider>
      <AppNavigator />
      <StatusBar style="auto" />
    </AuthProvider>
  );
}
