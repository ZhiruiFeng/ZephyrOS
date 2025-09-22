import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Linking } from 'react-native';
import 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/contexts/AuthContext';
import ThemeProvider from './src/theme/ThemeProvider';
import { STTConfigProvider } from './src/contexts/STTConfigContext';

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
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <STTConfigProvider>
            <AppNavigator />
            <StatusBar style="auto" />
          </STTConfigProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
