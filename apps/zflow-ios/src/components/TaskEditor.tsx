import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { 
  Modal, 
  Portal, 
  Text, 
  TextInput, 
  Button, 
  Card, 
  useTheme,
  SegmentedButtons,
  Menu,
  Chip
} from 'react-native-paper';
import { TaskMemory } from '../types/task';
import VoiceInputController from './VoiceInputController';

interface TaskForm {
  title: string;
  description: string;
  status: string;
  priority: string;
  category_id?: string;
  due_date?: string;
  estimated_duration?: number;
  progress: number;
  assignee?: string;
  notes?: string;
  tags?: string;
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
  title = 'Edit Task'
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
    tags: '',
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (task) {
      setForm({
        title: task.content.title || '',
        description: task.content.description || '',
        status: task.content.status || 'pending',
        priority: task.content.priority || 'medium',
        category_id: task.content.category_id || '',
        due_date: task.content.due_date || '',
        estimated_duration: task.content.estimated_duration || 0,
        progress: task.content.progress || 0,
        assignee: task.content.assignee || '',
        notes: task.content.notes || '',
        tags: task.tags ? task.tags.join(', ') : '',
      });
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
        tags: '',
      });
    }
  }, [task, isOpen]);

  const statusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'on_hold', label: 'On Hold' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  const priorityOptions = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' },
  ];

  const handleSave = async () => {
    if (!form.title.trim()) {
      return;
    }

    setSaving(true);
    try {
      await onSave(task?.id || null, {
        content: {
          title: form.title.trim(),
          description: form.description.trim(),
          status: form.status,
          priority: form.priority,
          category_id: form.category_id || null,
          due_date: form.due_date || null,
          estimated_duration: form.estimated_duration || null,
          progress: form.progress,
          assignee: form.assignee || null,
          notes: form.notes || null,
        },
        tags: form.tags ? form.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : []
      });
      onClose();
    } catch (error) {
      console.error('Error saving task:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <Portal>
      <Modal
        visible={isOpen}
        onDismiss={onClose}
        contentContainerStyle={[styles.modalContainer, { backgroundColor: theme.colors.surface }]}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <Card style={styles.card}>
            <Card.Title title={title} titleStyle={{ color: theme.colors.onSurface }} />
            <Card.Content style={styles.content}>
              {/* Title */}
              <View style={styles.inputWithVoice}>
                <TextInput
                  label="Title"
                  value={form.title}
                  onChangeText={(text) => setForm(prev => ({ ...prev, title: text }))}
                  style={[styles.input, styles.inputWithVoiceField]}
                  mode="outlined"
                  placeholder="Enter task title"
                />
                <VoiceInputController
                  onTranscriptionReceived={(text) => setForm(prev => ({ ...prev, title: prev.title + text }))}
                  style={styles.voiceButtonContainer}
                />
              </View>

              {/* Description */}
              <View style={styles.inputWithVoice}>
                <TextInput
                  label="Description"
                  value={form.description}
                  onChangeText={(text) => setForm(prev => ({ ...prev, description: text }))}
                  style={[styles.input, styles.inputWithVoiceField]}
                  mode="outlined"
                  placeholder="Enter task description"
                  multiline
                  numberOfLines={3}
                />
                <VoiceInputController
                  onTranscriptionReceived={(text) => setForm(prev => ({ ...prev, description: prev.description + text }))}
                  style={styles.voiceButtonContainer}
                />
              </View>

              {/* Status */}
              <View style={styles.section}>
                <Text variant="titleMedium" style={{ color: theme.colors.onSurface, marginBottom: 8 }}>
                  Status
                </Text>
                <SegmentedButtons
                  value={form.status}
                  onValueChange={(value) => setForm(prev => ({ ...prev, status: value }))}
                  buttons={statusOptions.map(option => ({
                    value: option.value,
                    label: option.label,
                  }))}
                  style={styles.segmentedButtons}
                />
              </View>

              {/* Priority */}
              <View style={styles.section}>
                <Text variant="titleMedium" style={{ color: theme.colors.onSurface, marginBottom: 8 }}>
                  Priority
                </Text>
                <SegmentedButtons
                  value={form.priority}
                  onValueChange={(value) => setForm(prev => ({ ...prev, priority: value }))}
                  buttons={priorityOptions.map(option => ({
                    value: option.value,
                    label: option.label,
                  }))}
                  style={styles.segmentedButtons}
                />
              </View>

              {/* Due Date */}
              <TextInput
                label="Due Date (YYYY-MM-DD)"
                value={form.due_date}
                onChangeText={(text) => setForm(prev => ({ ...prev, due_date: text }))}
                style={styles.input}
                mode="outlined"
                placeholder="2024-12-31"
              />

              {/* Estimated Duration */}
              <TextInput
                label="Estimated Duration (minutes)"
                value={form.estimated_duration?.toString() || ''}
                onChangeText={(text) => setForm(prev => ({ 
                  ...prev, 
                  estimated_duration: parseInt(text) || 0 
                }))}
                style={styles.input}
                mode="outlined"
                placeholder="60"
                keyboardType="numeric"
              />

              {/* Progress */}
              <View style={styles.section}>
                <Text variant="titleMedium" style={{ color: theme.colors.onSurface, marginBottom: 8 }}>
                  Progress: {form.progress}%
                </Text>
                <View style={[styles.progressBar, { backgroundColor: theme.colors.outline }]}>
                  <View 
                    style={[
                      styles.progressFill, 
                      { 
                        width: `${form.progress}%`,
                        backgroundColor: theme.colors.primary 
                      }
                    ]} 
                  />
                </View>
              </View>

              {/* Assignee */}
              <View style={styles.inputWithVoice}>
                <TextInput
                  label="Assignee"
                  value={form.assignee}
                  onChangeText={(text) => setForm(prev => ({ ...prev, assignee: text }))}
                  style={[styles.input, styles.inputWithVoiceField]}
                  mode="outlined"
                  placeholder="Who is responsible?"
                />
                <VoiceInputController
                  onTranscriptionReceived={(text) => setForm(prev => ({ ...prev, assignee: prev.assignee + text }))}
                  style={styles.voiceButtonContainer}
                />
              </View>

              {/* Notes */}
              <View style={styles.inputWithVoice}>
                <TextInput
                  label="Notes"
                  value={form.notes}
                  onChangeText={(text) => setForm(prev => ({ ...prev, notes: text }))}
                  style={[styles.input, styles.inputWithVoiceField]}
                  mode="outlined"
                  placeholder="Additional notes"
                  multiline
                  numberOfLines={3}
                />
                <VoiceInputController
                  onTranscriptionReceived={(text) => setForm(prev => ({ ...prev, notes: prev.notes + text }))}
                  style={styles.voiceButtonContainer}
                />
              </View>

              {/* Tags */}
              <View style={styles.inputWithVoice}>
                <TextInput
                  label="Tags (comma-separated)"
                  value={form.tags}
                  onChangeText={(text) => setForm(prev => ({ ...prev, tags: text }))}
                  style={[styles.input, styles.inputWithVoiceField]}
                  mode="outlined"
                  placeholder="work, urgent, project"
                />
                <VoiceInputController
                  onTranscriptionReceived={(text) => setForm(prev => ({ ...prev, tags: prev.tags + text }))}
                  style={styles.voiceButtonContainer}
                />
              </View>
            </Card.Content>

            <Card.Actions style={styles.actions}>
              <Button mode="outlined" onPress={handleCancel} disabled={saving}>
                Cancel
              </Button>
              <Button 
                mode="contained" 
                onPress={handleSave} 
                loading={saving}
                disabled={!form.title.trim() || saving}
              >
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </Card.Actions>
          </Card>
        </ScrollView>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    margin: 20,
    maxHeight: '90%',
    borderRadius: 12,
  },
  scrollView: {
    maxHeight: '100%',
  },
  card: {
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  input: {
    marginBottom: 16,
  },
  section: {
    marginBottom: 16,
  },
  segmentedButtons: {
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  actions: {
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 16,
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
});