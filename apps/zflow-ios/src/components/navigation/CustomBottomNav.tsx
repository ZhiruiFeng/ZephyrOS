import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

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
}

export default function CustomBottomNav({ tabs, activeTab, onTabPress, onAddPress }: CustomBottomNavProps) {
  const insets = useSafeAreaInsets();

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
          size={20}
          color={isActive ? '#0284c7' : '#6b7280'}
        />
        <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
          {tab.label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
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
            <Ionicons name="add" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Last two tabs */}
        {tabs.slice(2).map((tab) => renderTab(tab))}
      </View>
    </View>
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
    paddingTop: 12, // Add padding to accommodate FAB overlap
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
    paddingVertical: 8, // py-2 equivalent
    gap: 4, // gap-1 equivalent
    minHeight: 44, // iOS minimum touch target
  },
  tabLabel: {
    fontSize: 11,
    lineHeight: 11,
    color: '#6b7280',
    fontWeight: '400',
    textAlign: 'center',
  },
  tabLabelActive: {
    color: '#0284c7',
  },
  fabContainer: {
    flex: 1, // Takes equal space like the tabs
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  fab: {
    position: 'absolute',
    top: -28, // Lift it higher so border goes under it like web app
    width: 56, // w-14 equivalent
    height: 56, // h-14 equivalent
    borderRadius: 28,
    backgroundColor: '#0284c7',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 8, // Android shadow
    zIndex: 50,
  },
});