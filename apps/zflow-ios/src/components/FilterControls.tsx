import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Searchbar, Menu, Button, useTheme } from 'react-native-paper';
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
      <Searchbar
        placeholder="Search tasks..."
        onChangeText={onSearchChange}
        value={search}
        style={styles.searchBar}
        inputStyle={styles.searchInput}
      />

      {/* Filter Row */}
      <View style={styles.filterRow}>
        {/* Priority Filter */}
        <Menu
          visible={priorityMenuVisible}
          onDismiss={() => setPriorityMenuVisible(false)}
          anchor={
            <Button
              mode="outlined"
              onPress={() => setPriorityMenuVisible(true)}
              style={styles.filterButton}
              contentStyle={styles.filterButtonContent}
              labelStyle={styles.filterButtonLabel}
            >
              <View style={styles.filterButtonInner}>
                <Ionicons name="flag" size={16} color={theme.colors.primary} />
                <View style={styles.filterButtonText}>
                  {getCurrentPriorityLabel()}
                </View>
              </View>
            </Button>
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
            <Button
              mode="outlined"
              onPress={() => setCategoryMenuVisible(true)}
              style={styles.filterButton}
              contentStyle={styles.filterButtonContent}
              labelStyle={styles.filterButtonLabel}
            >
              <View style={styles.filterButtonInner}>
                <Ionicons name="folder" size={16} color={theme.colors.primary} />
                <View style={styles.filterButtonText}>
                  {getCurrentCategoryLabel()}
                </View>
              </View>
            </Button>
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
            <Button
              mode="outlined"
              onPress={() => setSortMenuVisible(true)}
              style={styles.filterButton}
              contentStyle={styles.filterButtonContent}
              labelStyle={styles.filterButtonLabel}
            >
              <View style={styles.filterButtonInner}>
                <Ionicons name="swap-vertical" size={16} color={theme.colors.primary} />
                <View style={styles.filterButtonText}>
                  {getCurrentSortLabel()}
                </View>
              </View>
            </Button>
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
    padding: 16,
    marginBottom: 16,
  },
  searchBar: {
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  searchInput: {
    fontSize: 16,
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  filterButton: {
    flex: 1,
    borderRadius: 8,
  },
  filterButtonContent: {
    height: 40,
  },
  filterButtonLabel: {
    fontSize: 14,
  },
  filterButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  filterButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    textAlign: 'center',
  },
});