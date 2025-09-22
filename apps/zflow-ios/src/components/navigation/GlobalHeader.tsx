import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
// import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';

interface GlobalHeaderProps {
  title?: string;
  showBackButton?: boolean;
  onBackPress?: () => void;
  rightActions?: React.ReactNode;
}

export default function GlobalHeader({ 
  title, 
  showBackButton = false, 
  onBackPress,
  rightActions 
}: GlobalHeaderProps) {
  // const insets = useSafeAreaInsets();
  const insets = { top: 44, bottom: 0, left: 0, right: 0 }; // Fixed safe area for now
  const { user } = useAuth();

  const defaultRightActions = (
    <>
      <TouchableOpacity 
        style={styles.headerIcon}
        activeOpacity={0.6}
        onPress={() => console.log('Profile pressed')}
      >
        <Ionicons name="person" size={20} color="#6b7280" />
      </TouchableOpacity>
      <TouchableOpacity 
        style={styles.headerIcon}
        activeOpacity={0.6}
        onPress={() => console.log('Settings pressed')}
      >
        <Ionicons name="settings" size={20} color="#6b7280" />
      </TouchableOpacity>
      <TouchableOpacity 
        style={styles.signOutButton}
        activeOpacity={0.6}
        onPress={() => console.log('Sign out pressed')}
      >
        <Text style={styles.signOutText}>Sign out</Text>
      </TouchableOpacity>
    </>
  );

  return (
    <View style={[styles.header, { paddingTop: insets.top }]}>
      <View style={styles.headerLeft}>
        {showBackButton ? (
          <TouchableOpacity 
            style={styles.backButton}
            onPress={onBackPress}
            activeOpacity={0.6}
          >
            <Ionicons name="arrow-back" size={20} color="#6b7280" />
          </TouchableOpacity>
        ) : (
          <Ionicons name="grid" size={20} color="#0284c7" />
        )}
        <Text style={styles.logoText}>
          {title || 'ZFlow'}
        </Text>
      </View>
      <View style={styles.headerRight}>
        {rightActions || defaultRightActions}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 2,
    backgroundColor: '#ffffff',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 0.5,
    },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  logoText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginLeft: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerIcon: {
    padding: 8,
    borderRadius: 20,
  },
  signOutButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  signOutText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
});
