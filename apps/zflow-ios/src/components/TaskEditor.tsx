import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, Platform, StyleSheet } from 'react-native';
import {
  Modal,
  Portal,
  Text,
  TextInput,
  Button,
  useTheme,
  Divider
} from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { TaskMemory } from '../types/task';
import VoiceInputController from './VoiceInputController';

type CreateMode = 'normal' | 'current';
type Priority = 'low' | 'medium' | 'high' | 'urgent';

interface TaskForm {
  title: string;
  description: string;
  status: string;
  priority: Priority;
  category_id?: string;
  due_date?: string;
  estimated_duration?: number;
  progress: number;
  assignee?: string;
  notes?: string;
  tags: string[];
}

interface TaskEditorProps {
  isOpen: boolean;
  onClose: () => void;
  task?: TaskMemory | null;
  onSave: (taskId: string | null, data: any) => Promise<void>;
  title?: string;
}

export default function TaskEditor({
  isOpen,
  onClose,
  task,
  onSave,
  title = 'Create Task'
}: TaskEditorProps) {
  const theme = useTheme();
  const [form, setForm] = useState<TaskForm>({
    title: '',
    description: '',
    status: 'pending',
    priority: 'medium',
    category_id: '',
    due_date: '',
    estimated_duration: 0,
    progress: 0,
    assignee: '',
    notes: '',
    tags: [],
  });

  const [saving, setSaving] = useState(false);
  const [createMode, setCreateMode] = useState<CreateMode>('normal');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hasInteracted, setHasInteracted] = useState(false);

  useEffect(() => {
    if (task) {
      setForm({
        title: task.content.title || '',
        description: task.content.description || '',
        status: task.content.status || 'pending',
        priority: (task.content.priority as Priority) || 'medium',
        category_id: task.content.category_id || '',
        due_date: task.content.due_date || '',
        estimated_duration: task.content.estimated_duration || 0,
        progress: task.content.progress || 0,
        assignee: task.content.assignee || '',
        notes: task.content.notes || '',
        tags: task.tags || [],
      });
      setShowAdvanced(true);
    } else {
      setForm({
        title: '',
        description: '',
        status: 'pending',
        priority: 'medium',
        category_id: '',
        due_date: '',
        estimated_duration: 0,
        progress: 0,
        assignee: '',
        notes: '',
        tags: [],
      });
      setShowAdvanced(false);
      setCreateMode('normal');
    }
  }, [task, isOpen]);

  const priorityOptions: { value: Priority; label: string; color: string; icon: string }[] = [
    { value: 'low', label: 'Low', color: '#6b7280', icon: 'remove-outline' },
    { value: 'medium', label: 'Medium', color: '#2563eb', icon: 'radio-button-on-outline' },
    { value: 'high', label: 'High', color: '#ea580c', icon: 'arrow-up-outline' },
    { value: 'urgent', label: 'Urgent', color: '#ef4444', icon: 'warning-outline' },
  ];

  // Helper functions
  const addTag = () => {
    if (newTag.trim() && !form.tags.includes(newTag.trim())) {
      setForm(prev => ({ ...prev, tags: [...prev.tags, newTag.trim()] }));
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setForm(prev => ({ ...prev, tags: prev.tags.filter(tag => tag !== tagToRemove) }));
  };

  const formatDateForDisplay = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString();
  };

  // Validation functions
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!form.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (form.title.trim().length < 3) {
      newErrors.title = 'Title must be at least 3 characters';
    }

    if (form.due_date) {
      const dueDate = new Date(form.due_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (dueDate < today) {
        newErrors.due_date = 'Due date cannot be in the past';
      }
    }

    if (form.estimated_duration && form.estimated_duration < 0) {
      newErrors.estimated_duration = 'Duration must be positive';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFieldChange = (field: string, value: any) => {
    setHasInteracted(true);
    setForm(prev => ({ ...prev, [field]: value }));

    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleSave = async () => {
    setHasInteracted(true);

    if (!validateForm()) {
      return;
    }

    setSaving(true);
    try {
      await onSave(task?.id || null, {
        content: {
          title: form.title.trim(),
          description: form.description.trim(),
          status: createMode === 'current' ? 'in_progress' : form.status,
          priority: form.priority,
          category_id: form.category_id || null,
          due_date: form.due_date || null,
          estimated_duration: form.estimated_duration || null,
          progress: form.progress,
          assignee: form.assignee || null,
          notes: form.notes || null,
        },
        tags: form.tags
      });
      onClose();
    } catch (error) {
      console.error('Error saving task:', error);
      setErrors({ general: 'Failed to save task. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    onClose();
  };

  // Error message component
  const ErrorMessage = ({ message }: { message?: string }) => {
    if (!message) return null;
    return (
      <View style={styles.errorMessage}>
        <Ionicons name="alert-circle" size={16} color="#EF4444" />
        <Text style={styles.errorText}>{message}</Text>
      </View>
    );
  };

  return (
    <Portal>
      <Modal
        visible={isOpen}
        onDismiss={onClose}
        contentContainerStyle={[styles.modalContainer, { backgroundColor: theme.colors.surface }]}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <Text variant="headlineMedium" style={styles.headerTitle}>
              {task ? 'Edit Task' : title}
            </Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close task editor"
              accessibilityHint="Closes the task creation form without saving"
            >
              <Ionicons name="close" size={20} color={theme.colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            {/* Create Mode Selection - Only for new tasks */}
            {!task && (
              <View style={styles.modeContainer}>
                <View style={styles.modeRow}>
                  <TouchableOpacity
                    style={[
                      styles.modeButton,
                      createMode === 'normal' && styles.modeButtonSelected
                    ]}
                    onPress={() => setCreateMode('normal')}
                    accessibilityRole="button"
                    accessibilityLabel="Create normal task"
                    accessibilityHint="Creates a task for later completion"
                    accessibilityState={{ selected: createMode === 'normal' }}
                  >
                    <Text style={[
                      styles.modeButtonText,
                      createMode === 'normal' && styles.modeButtonTextSelected
                    ]}>
                      Create Task
                    </Text>
                    <Text style={styles.modeButtonSubtext}>
                      Plan for later
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.modeButton,
                      createMode === 'current' && styles.modeButtonSelectedGreen
                    ]}
                    onPress={() => setCreateMode('current')}
                    accessibilityRole="button"
                    accessibilityLabel="Start task now"
                    accessibilityHint="Creates and immediately starts working on this task"
                    accessibilityState={{ selected: createMode === 'current' }}
                  >
                    <Text style={[
                      styles.modeButtonText,
                      createMode === 'current' && styles.modeButtonTextSelectedGreen
                    ]}>
                      Start Now
                    </Text>
                    <Text style={styles.modeButtonSubtext}>
                      Begin immediately
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Title */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Title *</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  value={form.title}
                  onChangeText={(text) => handleFieldChange('title', text)}
                  placeholder="What needs to be done?"
                  style={[
                    styles.input,
                    styles.inputWithVoice,
                    errors.title && hasInteracted && styles.inputError
                  ]}
                  mode="outlined"
                  dense={false}
                  outlineStyle={{
                    borderRadius: 12,
                    borderColor: errors.title && hasInteracted ? '#EF4444' : '#D1D5DB'
                  }}
                  error={!!(errors.title && hasInteracted)}
                />
                <View style={styles.voiceButton}>
                  <VoiceInputController
                    onTranscriptionReceived={(text) => handleFieldChange('title', form.title + text)}
                    style={{}}
                  />
                </View>
              </View>
              <ErrorMessage message={hasInteracted ? errors.title : undefined} />
            </View>

            {/* Description */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Description</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  value={form.description}
                  onChangeText={(text) => handleFieldChange('description', text)}
                  placeholder="Add details about this task..."
                  style={[styles.input, styles.inputWithVoice]}
                  mode="outlined"
                  multiline
                  numberOfLines={3}
                  dense={false}
                  outlineStyle={{ borderRadius: 12 }}
                />
                <View style={styles.voiceButton}>
                  <VoiceInputController
                    onTranscriptionReceived={(text) => handleFieldChange('description', form.description + text)}
                    style={{}}
                  />
                </View>
              </View>
            </View>

            {/* Priority */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Priority</Text>
              <View style={styles.priorityContainer}>
                {priorityOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.priorityButton,
                      form.priority === option.value && styles.priorityButtonSelected
                    ]}
                    onPress={() => handleFieldChange('priority', option.value)}
                  >
                    <Ionicons
                      name={option.icon as any}
                      size={20}
                      color={form.priority === option.value ? '#3B82F6' : '#6B7280'}
                    />
                    <Text style={[
                      styles.priorityText,
                      form.priority === option.value && styles.priorityTextSelected
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Due Date - Only for normal mode */}
            {createMode === 'normal' && (
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Due Date</Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={[styles.dateButtonText, !form.due_date && styles.dateButtonPlaceholder]}>
                    {form.due_date ? formatDateForDisplay(form.due_date) : 'Select due date'}
                  </Text>
                  <Ionicons name="calendar-outline" size={20} color="#6B7280" />
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    value={form.due_date ? new Date(form.due_date) : new Date()}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(_, selectedDate) => {
                      setShowDatePicker(false);
                      if (selectedDate) {
                        handleFieldChange('due_date', selectedDate.toISOString().split('T')[0]);
                      }
                    }}
                  />
                )}
                <ErrorMessage message={hasInteracted ? errors.due_date : undefined} />
              </View>
            )}

            {/* Tags */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Tags</Text>
              <View style={styles.tagContainer}>
                {form.tags.map((tag) => (
                  <View key={tag} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                    <TouchableOpacity
                      style={styles.tagRemoveButton}
                      onPress={() => removeTag(tag)}
                    >
                      <Ionicons name="close" size={16} color="#1E40AF" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
              <View style={styles.tagInputContainer}>
                <TextInput
                  value={newTag}
                  onChangeText={setNewTag}
                  placeholder="Add tag..."
                  style={styles.tagInput}
                  mode="outlined"
                  dense
                  outlineStyle={{ borderRadius: 12 }}
                  onSubmitEditing={addTag}
                />
                <TouchableOpacity
                  style={styles.tagAddButton}
                  onPress={addTag}
                  disabled={!newTag.trim()}
                >
                  <Ionicons name="add" size={20} color="white" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Advanced Options Toggle */}
            <TouchableOpacity
              style={styles.advancedToggle}
              onPress={() => setShowAdvanced(!showAdvanced)}
            >
              <Text style={styles.advancedToggleText}>
                {showAdvanced ? 'Hide' : 'Show'} Advanced Options
              </Text>
              <Ionicons
                name={showAdvanced ? 'chevron-up' : 'chevron-down'}
                size={20}
                color="#2563EB"
              />
            </TouchableOpacity>

            {/* Advanced Fields */}
            {showAdvanced && (
              <View>
                <Divider style={styles.divider} />

                {/* Estimated Duration */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>Estimated Duration</Text>
                  <TextInput
                    value={form.estimated_duration?.toString() || ''}
                    onChangeText={(text) => handleFieldChange('estimated_duration', parseInt(text) || 0)}
                    placeholder="Duration in minutes"
                    style={[
                      styles.input,
                      errors.estimated_duration && hasInteracted && styles.inputError
                    ]}
                    mode="outlined"
                    keyboardType="numeric"
                    dense={false}
                    outlineStyle={{
                      borderRadius: 12,
                      borderColor: errors.estimated_duration && hasInteracted ? '#EF4444' : '#D1D5DB'
                    }}
                    error={!!(errors.estimated_duration && hasInteracted)}
                  />
                  <ErrorMessage message={hasInteracted ? errors.estimated_duration : undefined} />
                </View>

                {/* Assignee */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>Assignee</Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      value={form.assignee}
                      onChangeText={(text) => handleFieldChange('assignee', text)}
                      placeholder="Who is responsible?"
                      style={[styles.input, styles.inputWithVoice]}
                      mode="outlined"
                      dense={false}
                      outlineStyle={{ borderRadius: 12 }}
                    />
                    <View style={styles.voiceButton}>
                      <VoiceInputController
                        onTranscriptionReceived={(text) => handleFieldChange('assignee', form.assignee + text)}
                        style={{}}
                      />
                    </View>
                  </View>
                </View>

                {/* Notes */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>Notes</Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      value={form.notes}
                      onChangeText={(text) => handleFieldChange('notes', text)}
                      placeholder="Additional notes..."
                      style={[styles.input, styles.inputWithVoice]}
                      mode="outlined"
                      multiline
                      numberOfLines={3}
                      dense={false}
                      outlineStyle={{ borderRadius: 12 }}
                    />
                    <View style={styles.voiceButton}>
                      <VoiceInputController
                        onTranscriptionReceived={(text) => handleFieldChange('notes', form.notes + text)}
                        style={{}}
                      />
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* General Error Message */}
            {errors.general && (
              <View style={styles.generalError}>
                <View style={styles.generalErrorContent}>
                  <Ionicons name="alert-circle" size={20} color="#EF4444" />
                  <Text style={styles.generalErrorText}>{errors.general}</Text>
                </View>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <Button
                mode="outlined"
                onPress={handleCancel}
                disabled={saving}
                style={styles.cancelButton}
                contentStyle={styles.buttonContent}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleSave}
                loading={saving}
                disabled={!form.title.trim() || saving}
                style={styles.saveButton}
                contentStyle={styles.buttonContent}
                buttonColor={createMode === 'current' ? '#10B981' : '#2563EB'}
                accessibilityLabel={
                  saving
                    ? 'Saving task'
                    : createMode === 'current'
                      ? 'Start task now'
                      : task
                        ? 'Update task'
                        : 'Create task'
                }
                accessibilityHint={
                  createMode === 'current'
                    ? 'Saves the task and immediately starts working on it'
                    : 'Saves the task to your task list'
                }
                accessibilityState={{ disabled: !form.title.trim() || saving }}
              >
                {saving
                  ? 'Saving...'
                  : createMode === 'current'
                    ? 'Start Task'
                    : task
                      ? 'Update Task'
                      : 'Create Task'
                }
              </Button>
            </View>
          </View>
        </ScrollView>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    margin: 16,
    maxHeight: '90%',
    borderRadius: 20,
  },
  scrollView: {
    maxHeight: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 24,
    paddingBottom: 16,
  },
  headerTitle: {
    color: '#111827',
    fontWeight: '700',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  modeContainer: {
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  modeButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  modeButtonSelected: {
    backgroundColor: '#ffffff',
    borderColor: '#3b82f6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  modeButtonSelectedGreen: {
    backgroundColor: '#ffffff',
    borderColor: '#10b981',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4b5563',
  },
  modeButtonTextSelected: {
    color: '#2563eb',
  },
  modeButtonTextSelectedGreen: {
    color: '#059669',
  },
  modeButtonSubtext: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  inputContainer: {
    position: 'relative',
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  inputWithVoice: {
    paddingRight: 48,
  },
  inputError: {
    borderWidth: 2,
    borderColor: '#ef4444',
  },
  voiceButton: {
    position: 'absolute',
    right: 8,
    top: 8,
    zIndex: 1,
  },
  priorityContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityButton: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
    alignItems: 'center',
  },
  priorityButtonSelected: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
    color: '#4b5563',
  },
  priorityTextSelected: {
    color: '#2563eb',
  },
  dateButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateButtonText: {
    fontSize: 16,
    color: '#111827',
  },
  dateButtonPlaceholder: {
    color: '#6b7280',
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  tag: {
    backgroundColor: '#dbeafe',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tagText: {
    color: '#1e40af',
    fontSize: 14,
  },
  tagRemoveButton: {
    marginLeft: 8,
  },
  tagInputContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  tagInput: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
  },
  tagAddButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  advancedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginBottom: 16,
  },
  advancedToggleText: {
    color: '#2563eb',
    fontWeight: '500',
    marginRight: 8,
  },
  divider: {
    marginBottom: 16,
  },
  generalError: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  generalErrorContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  generalErrorText: {
    color: '#b91c1c',
    marginLeft: 8,
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 16,
  },
  cancelButton: {
    flex: 1,
  },
  saveButton: {
    flex: 1,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  errorMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    marginLeft: 4,
  },
});