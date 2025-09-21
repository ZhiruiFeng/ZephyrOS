import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Surface, Card, Button, Chip, Badge } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { TaskMemory } from '../types/task';
import { useAuth } from '../contexts/AuthContext';
import { useTasks, useUpdateTask } from '../hooks/useZMemoryApi';

export default function FocusScreen() {
  const { user } = useAuth();
  const [selectedTask, setSelectedTask] = useState<TaskMemory | null>(null);
  const [notes, setNotes] = useState('');
  const [originalNotes, setOriginalNotes] = useState('');
  const [viewMode, setViewMode] = useState<'current' | 'backlog'>('current');
  const [showTaskSelector, setShowTaskSelector] = useState(true);
  const [timer, setTimer] = useState({ isRunning: false, startTime: null as Date | null, elapsed: 0 });
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'pending'>('saved');

  const { updateTask } = useUpdateTask();

  // Fetch tasks based on view mode
  const taskParams = useMemo(() => {
    if (!user) return undefined;

    if (viewMode === 'current') {
      return {
        limit: 100,
        sort_by: 'updated_at' as const,
        sort_order: 'desc' as const,
        // Filter for current tasks (in_progress, pending)
      };
    } else {
      return {
        limit: 200,
        sort_by: 'created_at' as const,
        sort_order: 'desc' as const,
      };
    }
  }, [user, viewMode]);

  const { tasks } = useTasks(taskParams);

  // Filter tasks based on view mode
  const filteredTasks = useMemo(() => {
    if (!tasks) return [];

    if (viewMode === 'current') {
      return tasks.filter(task =>
        task.content.status === 'in_progress' ||
        task.content.status === 'pending'
      );
    }

    return tasks;
  }, [tasks, viewMode]);

  // Timer effects
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (timer.isRunning && timer.startTime) {
      interval = setInterval(() => {
        setTimer(prev => ({
          ...prev,
          elapsed: Date.now() - (prev.startTime?.getTime() || 0),
        }));
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timer.isRunning, timer.startTime]);

  // Auto-save effect
  useEffect(() => {
    if (!selectedTask || notes === originalNotes) return;

    const hasSignificantChange = notes.length > originalNotes.length + 20 ||
      Math.abs(notes.length - originalNotes.length) / Math.max(originalNotes.length, 1) > 0.3;

    if (hasSignificantChange) {
      setAutoSaveStatus('pending');

      const timeoutId = setTimeout(() => {
        handleAutoSave();
      }, 5000);

      return () => clearTimeout(timeoutId);
    }
  }, [notes, originalNotes, selectedTask]);

  const handleAutoSave = async () => {
    if (!selectedTask || notes === originalNotes) return;

    setAutoSaveStatus('saving');
    try {
      await updateTask(selectedTask.id, {
        content: {
          ...selectedTask.content,
          notes: notes,
        }
      });
      setOriginalNotes(notes);
      setAutoSaveStatus('saved');
    } catch (error) {
      setAutoSaveStatus('pending');
      console.error('Auto-save failed:', error);
    }
  };

  const startTimer = () => {
    setTimer({
      isRunning: true,
      startTime: new Date(),
      elapsed: 0,
    });
  };

  const stopTimer = () => {
    setTimer(prev => ({
      ...prev,
      isRunning: false,
    }));

    // Show completion dialog or energy review
    Alert.alert(
      'Focus Session Complete',
      `You focused for ${formatTime(timer.elapsed)}. How do you feel?`,
      [
        { text: 'Great!', style: 'default' },
        { text: 'Could be better', style: 'default' },
        { text: 'Continue', style: 'cancel' },
      ]
    );
  };

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const selectTask = (task: TaskMemory) => {
    setSelectedTask(task);
    setNotes(task.content.notes || '');
    setOriginalNotes(task.content.notes || '');
    setShowTaskSelector(false);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return '#f43f5e';
      case 'high': return '#f59e0b';
      case 'medium': return '#10b981';
      case 'low': return '#94a3b8';
      default: return '#6b7280';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#059669'; // green-600 to match zflow
      case 'in_progress': return '#2563eb'; // blue-600 to match zflow
      case 'pending': return '#6b7280'; // gray-500 to match zflow
      case 'cancelled': return '#dc2626'; // red-600 to match zflow
      case 'on_hold': return '#d97706'; // amber-600 to match zflow
      default: return '#6b7280';
    }
  };

  if (!user) {
    return (
      <Surface style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.title}>Please sign in to use Focus mode</Text>
        </View>
      </Surface>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with Timer */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setShowTaskSelector(true)}
          >
            <Ionicons name="grid-outline" size={20} color="#3B82F6" />
          </TouchableOpacity>

          {selectedTask && (
            <View style={styles.taskInfo}>
              <Text style={styles.selectedTaskTitle} numberOfLines={1}>
                {selectedTask.content.title}
              </Text>
              <View style={styles.taskMeta}>
                <Chip
                  style={[styles.statusChip, { backgroundColor: getStatusColor(selectedTask.content.status) }]}
                  textStyle={styles.chipText}
                >
                  {selectedTask.content.status.replace('_', ' ')}
                </Chip>
                {selectedTask.content.priority && (
                  <Ionicons
                    name="flag"
                    size={14}
                    color={getPriorityColor(selectedTask.content.priority)}
                  />
                )}
              </View>
            </View>
          )}
        </View>

        <View style={styles.timerContainer}>
          <Text style={styles.timerText}>
            {timer.isRunning ? formatTime(timer.elapsed) : '00:00'}
          </Text>
          <TouchableOpacity
            style={[styles.timerButton, timer.isRunning && styles.timerButtonActive]}
            onPress={timer.isRunning ? stopTimer : startTimer}
            disabled={!selectedTask}
          >
            <Ionicons
              name={timer.isRunning ? 'stop' : 'play'}
              size={16}
              color={timer.isRunning ? '#fff' : '#3B82F6'}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content */}
      {showTaskSelector ? (
        <ScrollView style={styles.content}>
          {/* View Mode Toggle */}
          <View style={styles.viewToggle}>
            <TouchableOpacity
              style={[styles.toggleButton, viewMode === 'current' && styles.toggleButtonActive]}
              onPress={() => setViewMode('current')}
            >
              <Text style={[styles.toggleText, viewMode === 'current' && styles.toggleTextActive]}>
                Current Tasks
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleButton, viewMode === 'backlog' && styles.toggleButtonActive]}
              onPress={() => setViewMode('backlog')}
            >
              <Text style={[styles.toggleText, viewMode === 'backlog' && styles.toggleTextActive]}>
                All Tasks
              </Text>
            </TouchableOpacity>
          </View>

          {/* Task List */}
          <View style={styles.taskList}>
            {filteredTasks.map((task) => (
              <TouchableOpacity
                key={task.id}
                style={styles.taskCard}
                onPress={() => selectTask(task)}
              >
                <View style={styles.taskCardHeader}>
                  <Text style={styles.taskCardTitle} numberOfLines={2}>
                    {task.content.title}
                  </Text>
                  <View style={styles.taskCardMeta}>
                    <Chip
                      style={[styles.statusChip, { backgroundColor: getStatusColor(task.content.status) }]}
                      textStyle={styles.chipText}
                    >
                      {task.content.status.replace('_', ' ')}
                    </Chip>
                  </View>
                </View>

                {task.content.description && (
                  <Text style={styles.taskCardDescription} numberOfLines={2}>
                    {task.content.description}
                  </Text>
                )}

                <View style={styles.taskCardFooter}>
                  {task.content.priority && (
                    <View style={styles.priorityIndicator}>
                      <Ionicons
                        name="flag"
                        size={12}
                        color={getPriorityColor(task.content.priority)}
                      />
                      <Text style={styles.priorityText}>{task.content.priority}</Text>
                    </View>
                  )}

                  <Text style={styles.taskDate}>
                    {new Date(task.updated_at).toLocaleDateString()}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      ) : (
        <KeyboardAvoidingView
          style={styles.workArea}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView style={styles.content}>
            <Card style={styles.notesCard}>
              <Card.Content>
                <View style={styles.notesHeader}>
                  <Text style={styles.notesTitle}>Focus Notes</Text>
                  <View style={styles.autoSaveIndicator}>
                    {autoSaveStatus === 'saving' && (
                      <Text style={styles.autoSaveText}>Saving...</Text>
                    )}
                    {autoSaveStatus === 'saved' && (
                      <Text style={styles.autoSaveText}>Saved</Text>
                    )}
                    {autoSaveStatus === 'pending' && (
                      <Text style={styles.autoSaveText}>Pending</Text>
                    )}
                  </View>
                </View>

                <TextInput
                  style={styles.notesInput}
                  multiline
                  placeholder="Take notes while you focus on this task..."
                  value={notes}
                  onChangeText={setNotes}
                  textAlignVertical="top"
                />
              </Card.Content>
            </Card>

            <Button
              mode="outlined"
              onPress={handleAutoSave}
              style={styles.saveButton}
              disabled={notes === originalNotes}
            >
              Save Notes
            </Button>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  taskInfo: {
    flex: 1,
    marginRight: 12,
  },
  selectedTaskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusChip: {
    height: 24,
    borderRadius: 12,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#ffffff',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timerText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    fontFamily: 'monospace',
  },
  timerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#3B82F6',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  toggleTextActive: {
    color: '#ffffff',
  },
  taskList: {
    gap: 12,
  },
  taskCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  taskCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  taskCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
    marginRight: 12,
  },
  taskCardMeta: {
    alignItems: 'flex-end',
  },
  taskCardDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  taskCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priorityIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
    textTransform: 'capitalize',
  },
  taskDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  workArea: {
    flex: 1,
  },
  notesCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  notesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  notesTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  autoSaveIndicator: {
    alignItems: 'flex-end',
  },
  autoSaveText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  notesInput: {
    minHeight: 200,
    fontSize: 16,
    color: '#374151',
    textAlignVertical: 'top',
    padding: 0,
    margin: 0,
  },
  saveButton: {
    borderRadius: 12,
    borderColor: '#3B82F6',
  },
});