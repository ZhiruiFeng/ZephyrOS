import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../utils/api';
import { User, Session } from '@supabase/supabase-js';
import { Alert } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user ?? null);
        console.log('Initial session loaded:', session?.user?.email || 'No user');
      } catch (error) {
        console.error('Error getting initial session:', error);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.email || 'No user');
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      // Force use of our custom scheme (don't let Expo override it in development)
      const redirectUri = 'zflow://auth';

      // Get Supabase OAuth URL
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUri,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        console.error('❌ Supabase OAuth error:', error);
        Alert.alert('Authentication Error', error.message);
        return;
      }

      if (!data?.url) {
        Alert.alert('Authentication Error', 'No authentication URL received');
        return;
      }

      // Open in-app browser for OAuth

      // Use WebBrowser to open in-app browser with auth URL
      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectUri
      );

      if (result.type === 'success' && result.url) {
        const url = result.url;

        // Extract tokens from URL fragments (Supabase uses fragment, not query params)
        const urlParts = url.split('#');
        if (urlParts.length > 1) {
          const fragment = urlParts[1];
          const params = new URLSearchParams(fragment);
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');

          // Process tokens

          if (accessToken) {
            // Set the session in Supabase
            const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || '',
            });

            if (sessionError) {
              console.error('Session error:', sessionError);
              Alert.alert('Authentication Error', 'Failed to establish session');
            }
          } else {
            Alert.alert('Authentication Error', 'No access token received');
          }
        } else {
          Alert.alert('Authentication Error', 'Invalid authentication response');
        }
      } else if (result.type === 'cancel') {
        // User cancelled authentication
      } else {
        Alert.alert('Authentication Error', 'Authentication was not completed');
      }
    } catch (error) {
      console.error('❌ Error in signInWithGoogle:', error);
      Alert.alert('Authentication Error', 'Failed to start Google authentication');
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      console.log('🚪 Signing out...');
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('❌ Sign out error:', error);
        Alert.alert('Sign Out Error', error.message);
      } else {
        console.log('✅ Successfully signed out');
      }
    } catch (error) {
      console.error('❌ Error in signOut:', error);
      Alert.alert('Sign Out Error', 'Failed to sign out');
    }
  };

  const value = {
    user,
    session,
    loading,
    signInWithGoogle,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}