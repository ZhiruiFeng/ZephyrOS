import React from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Surface, Text, Button, useTheme } from 'react-native-paper';
import { useAuth } from '../contexts/AuthContext';

export default function LoginScreen() {
  const theme = useTheme();
  const { signInWithGoogle, loading } = useAuth();

  const handleLogin = async () => {
    console.log('🔐 Login button pressed - starting Google OAuth...');
    await signInWithGoogle();
  };

  return (
    <Surface style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        <Text variant="headlineLarge" style={{ color: theme.colors.onBackground, marginBottom: 8 }}>
          Welcome to ZFlow
        </Text>
        <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 32 }}>
          Sign in to access your personal AI workflow
        </Text>

        <Button
          mode="contained"
          onPress={handleLogin}
          loading={loading}
          disabled={loading}
          style={styles.loginButton}
          contentStyle={styles.loginButtonContent}
        >
          {loading ? 'Signing in...' : 'Sign in with Google'}
        </Button>
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loginButton: {
    minWidth: 200,
  },
  loginButtonContent: {
    paddingVertical: 8,
  },
});