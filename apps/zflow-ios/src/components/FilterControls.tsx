import React, { useState } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, Text } from 'react-native';
import { Menu, useTheme } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { Category } from '../types/task';

export type SortMode = 'none' | 'priority' | 'due_date';
export type DisplayMode = 'list' | 'grid';

interface FilterControlsProps {
  search: string;
  filterPriority: 'all' | 'low' | 'medium' | 'high' | 'urgent';
  selectedCategory: 'all' | 'uncategorized' | string;
  sortMode: SortMode;
  displayMode?: DisplayMode;
  onSearchChange: (value: string) => void;
  onPriorityChange: (value: 'all' | 'low' | 'medium' | 'high' | 'urgent') => void;
  onCategoryChange: (value: 'all' | 'uncategorized' | string) => void;
  onSortModeChange: (mode: SortMode) => void;
  onDisplayModeChange?: (mode: DisplayMode) => void;
  onOpenMobileCategorySelector?: () => void;
  onOpenFocus?: () => void;
  onOpenTimeModal?: () => void;
  categories: Category[];
}

export default function FilterControls({
  search,
  filterPriority,
  selectedCategory,
  sortMode,
  displayMode = 'list',
  onSearchChange,
  onPriorityChange,
  onCategoryChange,
  onSortModeChange,
  onDisplayModeChange,
  onOpenMobileCategorySelector,
  onOpenFocus,
  onOpenTimeModal,
  categories,
}: FilterControlsProps) {
  const theme = useTheme();
  const [priorityMenuVisible, setPriorityMenuVisible] = useState(false);
  const [categoryMenuVisible, setCategoryMenuVisible] = useState(false);
  const [sortMenuVisible, setSortMenuVisible] = useState(false);

  const priorityOptions = [
    { value: 'all', label: 'All Priorities' },
    { value: 'urgent', label: 'Urgent' },
    { value: 'high', label: 'High' },
    { value: 'medium', label: 'Medium' },
    { value: 'low', label: 'Low' },
  ];

  const sortOptions = [
    { value: 'none', label: 'No Sorting' },
    { value: 'priority', label: 'By Priority' },
    { value: 'due_date', label: 'By Due Date' },
  ];

  const categoryOptions = [
    { value: 'all', label: 'All Categories' },
    { value: 'uncategorized', label: 'Uncategorized' },
    ...categories.map(cat => ({ value: cat.id, label: cat.name })),
  ];

  const getCurrentPriorityLabel = () => {
    const option = priorityOptions.find(opt => opt.value === filterPriority);
    return option?.label || 'All Priorities';
  };

  const getCurrentSortLabel = () => {
    const option = sortOptions.find(opt => opt.value === sortMode);
    return option?.label || 'No Sorting';
  };

  const getCurrentCategoryLabel = () => {
    if (selectedCategory === 'all') return 'All Categories';
    if (selectedCategory === 'uncategorized') return 'Uncategorized';
    const category = categories.find(c => c.id === selectedCategory);
    return category?.name || 'Select Category';
  };

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={16} color="#6b7280" style={styles.searchIcon} />
        <TextInput
          placeholder="Search tasks..."
          onChangeText={onSearchChange}
          value={search}
          style={styles.searchInput}
          placeholderTextColor="#9ca3af"
        />
      </View>

      {/* Filter Row */}
      <View style={styles.filterRow}>
        {/* Priority Filter */}
        <Menu
          visible={priorityMenuVisible}
          onDismiss={() => setPriorityMenuVisible(false)}
          anchor={
            <TouchableOpacity
              style={styles.filterButton}
              onPress={() => setPriorityMenuVisible(true)}
            >
              <Ionicons name="flag" size={16} color="#0284c7" />
              <Text style={styles.filterButtonText}>
                {getCurrentPriorityLabel()}
              </Text>
            </TouchableOpacity>
          }
        >
          {priorityOptions.map((option) => (
            <Menu.Item
              key={option.value}
              onPress={() => {
                onPriorityChange(option.value as any);
                setPriorityMenuVisible(false);
              }}
              title={option.label}
              leadingIcon="flag"
            />
          ))}
        </Menu>

        {/* Category Filter */}
        <TouchableOpacity
          style={styles.filterButton}
          onPress={onOpenMobileCategorySelector}
        >
          <Ionicons name="folder" size={16} color="#0284c7" />
          <Text style={styles.filterButtonText}>
            {getCurrentCategoryLabel()}
          </Text>
        </TouchableOpacity>

        {/* Sort Filter */}
        <Menu
          visible={sortMenuVisible}
          onDismiss={() => setSortMenuVisible(false)}
          anchor={
            <TouchableOpacity
              style={styles.filterButton}
              onPress={() => setSortMenuVisible(true)}
            >
              <Ionicons name="swap-vertical" size={16} color="#0284c7" />
              <Text style={styles.filterButtonText}>
                {getCurrentSortLabel()}
              </Text>
            </TouchableOpacity>
          }
        >
          {sortOptions.map((option) => (
            <Menu.Item
              key={option.value}
              onPress={() => {
                onSortModeChange(option.value as any);
                setSortMenuVisible(false);
              }}
              title={option.label}
              leadingIcon="sort"
            />
          ))}
        </Menu>
      </View>

      {/* Action Buttons Row */}
      <View style={styles.actionRow}>
        {/* Display Mode Toggle */}
        {onDisplayModeChange && (
          <View style={styles.displayModeToggle}>
            <TouchableOpacity
              style={[
                styles.displayModeButton,
                displayMode === 'list' && styles.displayModeButtonActive
              ]}
              onPress={() => onDisplayModeChange('list')}
            >
              <Text style={[
                styles.displayModeButtonText,
                displayMode === 'list' && styles.displayModeButtonTextActive
              ]}>
                List
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.displayModeButton,
                displayMode === 'grid' && styles.displayModeButtonActive
              ]}
              onPress={() => onDisplayModeChange('grid')}
            >
              <Ionicons
                name="grid-outline"
                size={14}
                color={displayMode === 'grid' ? '#fff' : '#6b7280'}
              />
              <Text style={[
                styles.displayModeButtonText,
                displayMode === 'grid' && styles.displayModeButtonTextActive
              ]}>
                Grid
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {onOpenFocus && (
            <TouchableOpacity style={styles.focusButton} onPress={onOpenFocus}>
              <Ionicons name="flash" size={16} color="#fff" />
              <Text style={styles.focusButtonText}>Focus</Text>
            </TouchableOpacity>
          )}

          {onOpenTimeModal && (
            <TouchableOpacity style={styles.timeButton} onPress={onOpenTimeModal}>
              <Ionicons name="time" size={16} color="#0284c7" />
              <Text style={styles.timeButtonText}>Time</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.7)', // glass effect
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.7)', // glass effect
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  filterButtonText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
    flex: 1,
    textAlign: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  displayModeToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.7)', // glass effect
    borderRadius: 20,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  displayModeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  displayModeButtonActive: {
    backgroundColor: '#0284c7', // primary-600
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  displayModeButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
  },
  displayModeButtonTextActive: {
    color: '#fff',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  focusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0284c7', // primary-600
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  focusButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#fff',
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.7)', // glass effect
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  timeButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#0284c7',
  },
});