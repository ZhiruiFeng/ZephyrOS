import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
// import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface TabItem {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconFocused: keyof typeof Ionicons.glyphMap;
}

interface CustomBottomNavProps {
  tabs: TabItem[];
  activeTab: string;
  onTabPress: (tab: string) => void;
  onAddPress: () => void;
  isVisible?: boolean;
}

export default function CustomBottomNav({ tabs, activeTab, onTabPress, onAddPress, isVisible = true }: CustomBottomNavProps) {
  // const insets = useSafeAreaInsets();
  const insets = { top: 0, bottom: 34, left: 0, right: 0 }; // Fixed safe area for now
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: isVisible ? 0 : 100,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isVisible, translateY]);

  const renderTab = (tab: TabItem) => {
    const isActive = activeTab === tab.key;

    return (
      <TouchableOpacity
        key={tab.key}
        style={styles.tabItem}
        onPress={() => onTabPress(tab.key)}
        activeOpacity={0.7}
      >
        <Ionicons
          name={isActive ? tab.iconFocused : tab.icon}
          size={18}
          color={isActive ? '#0284c7' : '#6b7280'}
        />
        <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
          {tab.label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <Animated.View style={[
      styles.container, 
      { 
        paddingBottom: insets.bottom,
        transform: [{ translateY }]
      }
    ]}>
      <View style={styles.innerContainer}>
        {/* First two tabs */}
        {tabs.slice(0, 2).map((tab) => renderTab(tab))}

        {/* Center container for FAB - this ensures perfect centering */}
        <View style={styles.fabContainer}>
          <TouchableOpacity
            style={styles.fab}
            onPress={onAddPress}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={18} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Last two tabs */}
        {tabs.slice(2).map((tab) => renderTab(tab))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    zIndex: 40,
    paddingTop: 2, // Minimized padding
    // Add safe area bottom padding for iOS devices
    paddingBottom: 0, // Will be handled by safe area
  },
  innerContainer: {
    maxWidth: 1280, // max-w-7xl equivalent
    marginHorizontal: 'auto',
    paddingHorizontal: 8, // px-2 equivalent
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabItem: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2, // Minimized padding
    gap: 1, // Minimized gap
    minHeight: 28, // Minimized minimum height
  },
  tabLabel: {
    fontSize: 10, // Smaller to match web mobile
    lineHeight: 10,
    color: '#6b7280',
    fontWeight: '400',
    textAlign: 'center',
  },
  tabLabelActive: {
    color: '#0284c7', // primary-600 color
  },
  fabContainer: {
    flex: 1, // Takes equal space like the tabs
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  fab: {
    position: 'absolute',
    top: -16, // Adjusted for minimized nav bar height
    width: 48, // Smaller FAB
    height: 48, // Smaller FAB
    borderRadius: 22,
    backgroundColor: '#0284c7', // primary-600 color
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2, // Reduced shadow to match web
    },
    shadowOpacity: 0.1,
    shadowRadius: 4, // Reduced shadow radius
    elevation: 4, // Android shadow
    zIndex: 50,
  },
});