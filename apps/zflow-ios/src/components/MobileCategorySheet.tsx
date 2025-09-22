import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Modal, Portal, Text, Button, TextInput, useTheme } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { Category } from '../types/task';
import VoiceInputController from './VoiceInputController';

interface CategoryCounts {
  byId: Record<string, number>;
  byIdCompleted: Record<string, number>;
  byIdIncomplete: Record<string, number>;
  uncategorized: number;
  uncategorizedCompleted: number;
  uncategorizedIncomplete: number;
  total: number;
  totalCompleted: number;
  totalIncomplete: number;
}

interface MobileCategorySheetProps {
  visible: boolean;
  onDismiss: () => void;
  categories: Category[];
  counts: CategoryCounts;
  selected: 'all' | 'uncategorized' | string;
  onSelect: (key: 'all' | 'uncategorized' | string) => void;
  onCreate?: (payload: { name: string; color?: string }) => Promise<void>;
}

const presetColors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#6B7280', '#9CA3AF'];

export default function MobileCategorySheet({
  visible,
  onDismiss,
  categories,
  counts,
  selected,
  onSelect,
  onCreate,
}: MobileCategorySheetProps) {
  const theme = useTheme();
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(presetColors[0]);
  const [submitting, setSubmitting] = useState(false);

  const handleSelect = (key: 'all' | 'uncategorized' | string) => {
    onSelect(key);
    onDismiss();
  };

  const handleCreate = async () => {
    if (!newName.trim() || !onCreate) return;

    setSubmitting(true);
    try {
      await onCreate({ name: newName.trim(), color: newColor });
      setNewName('');
      setIsCreating(false);
      onDismiss();
    } catch (error) {
      console.error('Failed to create category:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const getCategoryCount = (categoryId: string | 'all' | 'uncategorized') => {
    if (categoryId === 'all') return counts.total;
    if (categoryId === 'uncategorized') return counts.uncategorized;
    return counts.byId[categoryId] || 0;
  };

  if (!visible) {
    return null;
  }

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modal}
        dismissable={true}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Categories</Text>
            <TouchableOpacity onPress={onDismiss} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {/* Category List */}
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {/* All Categories */}
            <TouchableOpacity
              style={[styles.categoryItem, selected === 'all' && styles.selectedItem]}
              onPress={() => handleSelect('all')}
            >
              <View style={styles.categoryLeft}>
                <View style={[styles.colorDot, { backgroundColor: '#3B82F6' }]} />
                <Text style={[styles.categoryName, selected === 'all' && styles.selectedText]}>
                  All Categories
                </Text>
              </View>
              <Text style={[styles.categoryCount, selected === 'all' && styles.selectedText]}>
                {getCategoryCount('all')}
              </Text>
            </TouchableOpacity>

            {/* Uncategorized */}
            <TouchableOpacity
              style={[styles.categoryItem, selected === 'uncategorized' && styles.selectedItem]}
              onPress={() => handleSelect('uncategorized')}
            >
              <View style={styles.categoryLeft}>
                <View style={[styles.colorDot, { backgroundColor: '#9CA3AF' }]} />
                <Text style={[styles.categoryName, selected === 'uncategorized' && styles.selectedText]}>
                  Uncategorized
                </Text>
              </View>
              <Text style={[styles.categoryCount, selected === 'uncategorized' && styles.selectedText]}>
                {getCategoryCount('uncategorized')}
              </Text>
            </TouchableOpacity>

            {/* User Categories */}
            {categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[styles.categoryItem, selected === category.id && styles.selectedItem]}
                onPress={() => handleSelect(category.id)}
              >
                <View style={styles.categoryLeft}>
                  <View style={[styles.colorDot, { backgroundColor: category.color || '#6B7280' }]} />
                  <Text style={[styles.categoryName, selected === category.id && styles.selectedText]}>
                    {category.name}
                  </Text>
                </View>
                <Text style={[styles.categoryCount, selected === category.id && styles.selectedText]}>
                  {getCategoryCount(category.id)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Create New Category */}
          {isCreating ? (
            <View style={styles.createForm}>
              <View style={styles.inputWithVoice}>
                <TextInput
                  label="Category Name"
                  value={newName}
                  onChangeText={setNewName}
                  style={[styles.nameInput, styles.inputWithVoiceField]}
                  mode="outlined"
                  placeholder="Enter category name"
                />
                <VoiceInputController
                  onTranscriptionReceived={(text) => setNewName(prev => prev + text)}
                  style={styles.voiceButtonContainer}
                />
              </View>

              <View style={styles.colorPicker}>
                <Text style={styles.colorPickerLabel}>Color</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorList}>
                  {presetColors.map((color) => (
                    <TouchableOpacity
                      key={color}
                      style={[
                        styles.colorOption,
                        { backgroundColor: color },
                        newColor === color && styles.selectedColor
                      ]}
                      onPress={() => setNewColor(color)}
                    />
                  ))}
                </ScrollView>
              </View>

              <View style={styles.createActions}>
                <Button
                  mode="outlined"
                  onPress={() => {
                    setIsCreating(false);
                    setNewName('');
                  }}
                  style={styles.cancelButton}
                >
                  Cancel
                </Button>
                <Button
                  mode="contained"
                  onPress={handleCreate}
                  loading={submitting}
                  disabled={!newName.trim() || submitting}
                  style={styles.createButton}
                >
                  Create
                </Button>
              </View>
            </View>
          ) : (
            onCreate && (
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => setIsCreating(true)}
              >
                <Ionicons name="add" size={20} color="#3B82F6" />
                <Text style={styles.addButtonText}>Add Category</Text>
              </TouchableOpacity>
            )
          )}
        </View>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: {
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
    margin: 0,
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    minHeight: '70%',
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
  },
  closeButton: {
    padding: 4,
  },
  scrollView: {
    maxHeight: 500,
    flex: 1,
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f9fafb',
  },
  selectedItem: {
    backgroundColor: '#eff6ff',
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  categoryName: {
    fontSize: 16,
    color: '#374151',
    flex: 1,
  },
  selectedText: {
    color: '#3B82F6',
    fontWeight: '500',
  },
  categoryCount: {
    fontSize: 14,
    color: '#9ca3af',
    marginLeft: 8,
  },
  createForm: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  nameInput: {
    marginBottom: 16,
  },
  inputWithVoice: {
    position: 'relative',
    marginBottom: 16,
  },
  inputWithVoiceField: {
    marginBottom: 0,
    paddingRight: 48,
  },
  voiceButtonContainer: {
    position: 'absolute',
    right: 8,
    top: 20,
    zIndex: 1,
  },
  colorPicker: {
    marginBottom: 16,
  },
  colorPickerLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  colorList: {
    flexDirection: 'row',
  },
  colorOption: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedColor: {
    borderColor: '#1f2937',
  },
  createActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
  },
  createButton: {
    flex: 1,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    margin: 20,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
  },
  addButtonText: {
    fontSize: 16,
    color: '#3B82F6',
    marginLeft: 8,
    fontWeight: '500',
  },
});