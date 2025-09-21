import React, { useState } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, Text } from 'react-native';
import { Menu, useTheme } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';

export type SortMode = 'none' | 'priority' | 'due_date';

interface FilterControlsProps {
  search: string;
  filterPriority: 'all' | 'low' | 'medium' | 'high' | 'urgent';
  selectedCategory: 'all' | 'uncategorized' | string;
  sortMode: SortMode;
  onSearchChange: (value: string) => void;
  onPriorityChange: (value: 'all' | 'low' | 'medium' | 'high' | 'urgent') => void;
  onCategoryChange: (value: 'all' | 'uncategorized' | string) => void;
  onSortModeChange: (mode: SortMode) => void;
  categories: Array<{ id: string; name: string }>;
}

export default function FilterControls({
  search,
  filterPriority,
  selectedCategory,
  sortMode,
  onSearchChange,
  onPriorityChange,
  onCategoryChange,
  onSortModeChange,
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
        <Menu
          visible={categoryMenuVisible}
          onDismiss={() => setCategoryMenuVisible(false)}
          anchor={
            <TouchableOpacity
              style={styles.filterButton}
              onPress={() => setCategoryMenuVisible(true)}
            >
              <Ionicons name="folder" size={16} color="#0284c7" />
              <Text style={styles.filterButtonText}>
                {getCurrentCategoryLabel()}
              </Text>
            </TouchableOpacity>
          }
        >
          {categoryOptions.map((option) => (
            <Menu.Item
              key={option.value}
              onPress={() => {
                onCategoryChange(option.value as any);
                setCategoryMenuVisible(false);
              }}
              title={option.label}
              leadingIcon="folder"
            />
          ))}
        </Menu>

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
});