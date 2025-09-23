import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, RefreshControl, SafeAreaView, StatusBar } from 'react-native';
import { tasksApi } from '../lib/api';
import { TaskMemory } from '../types/task';
import { useAuth } from '../contexts/AuthContext';
import TaskEditor from '../components/TaskEditor';
import FilterControls from '../components/FilterControls';
import SwipeableTaskItem from '../components/SwipeableTaskItem';
import { useTaskFiltering } from '../hooks/useTaskFiltering';

interface TasksScreenProps {
  onScroll?: (event: any) => void;
  onRegisterAddTask?: (callback: () => void) => void;
}

export default function TasksScreen({ onScroll, onRegisterAddTask }: TasksScreenProps) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<TaskMemory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showTaskEditor, setShowTaskEditor] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskMemory | null>(null);
  
  // Filter states
  const [search, setSearch] = useState('');
  const [filterPriority, setFilterPriority] = useState<'all' | 'low' | 'medium' | 'high' | 'urgent'>('all');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'uncategorized' | string>('all');
  const [sortMode, setSortMode] = useState<'none' | 'priority' | 'due_date'>('none');
  
  // Mock categories for now - in real app, this would come from API
  const categories = [
    { id: 'work', name: 'Work' },
    { id: 'personal', name: 'Personal' },
    { id: 'health', name: 'Health' },
  ];

  const fetchTasks = async () => {
    try {
      console.log('📋 Fetching tasks for user:', user?.email);
      const fetchedTasks = await tasksApi.list({
        limit: 50,
        sort_by: 'updated_at',
        sort_order: 'desc'
      });
      console.log('✅ Successfully fetched tasks:', fetchedTasks.length);
      setTasks(fetchedTasks);
    } catch (error) {
      console.error('❌ Error fetching tasks:', error);
      Alert.alert('Error', 'Failed to fetch tasks. Please check your connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Apply filtering
  const { filteredTasks, stats } = useTaskFiltering({
    tasks,
    selectedCategory,
    search,
    filterPriority,
    sortMode,
  });

  useEffect(() => {
    if (user) {
      fetchTasks();
    }
  }, [user]);

  // Register the add task callback with the parent navigator
  useEffect(() => {
    if (onRegisterAddTask) {
      onRegisterAddTask(handleCreateTask);
    }
  }, [onRegisterAddTask]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTasks();
  };

  // CRUD Operations
  const handleCreateTask = () => {
    setEditingTask(null);
    setShowTaskEditor(true);
  };

  const handleEditTask = (task: TaskMemory) => {
    setEditingTask(task);
    setShowTaskEditor(true);
  };

  const handleSaveTask = async (taskId: string | null, data: any) => {
    try {
      if (taskId) {
        // Update existing task
        await tasksApi.update(taskId, data);
        console.log('✅ Task updated successfully');
      } else {
        // Create new task
        await tasksApi.create(data);
        console.log('✅ Task created successfully');
      }
      
      // Refresh the task list
      await fetchTasks();
      setShowTaskEditor(false);
      setEditingTask(null);
    } catch (error) {
      console.error('❌ Error saving task:', error);
      Alert.alert('Error', 'Failed to save task. Please try again.');
    }
  };

  const handleDeleteTask = (task: TaskMemory) => {
    Alert.alert(
      'Delete Task',
      `Are you sure you want to delete "${task.content.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await tasksApi.delete(task.id);
              console.log('✅ Task deleted successfully');
              await fetchTasks();
            } catch (error) {
              console.error('❌ Error deleting task:', error);
              Alert.alert('Error', 'Failed to delete task. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleToggleComplete = async (task: TaskMemory) => {
    try {
      const newStatus = task.content.status === 'completed' ? 'pending' : 'completed';
      await tasksApi.update(task.id, {
        content: { ...task.content, status: newStatus }
      });
      console.log('✅ Task status updated successfully');
      await fetchTasks();
    } catch (error) {
      console.error('❌ Error updating task status:', error);
      Alert.alert('Error', 'Failed to update task status. Please try again.');
    }
  };

  // Simple task content renderer for swipeable component
  const renderTaskContent = (item: TaskMemory) => (
    <View style={styles.taskCard}>
      <View style={styles.taskContent}>
        <View style={styles.taskHeader}>
          <View style={styles.taskTitleContainer}>
            <View style={styles.completeButton}>
              <Text style={[
                styles.completeButtonText,
                { color: item.content.status === 'completed' ? '#10B981' : '#d1d5db' }
              ]}>
                {item.content.status === 'completed' ? '✓' : '○'}
              </Text>
            </View>
            <Text style={[
              styles.taskTitle,
              item.content.status === 'completed' && styles.completedTaskTitle
            ]}>
              {item.content.title}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.content.status) }]}>
            <Text style={styles.statusText}>{item.content.status}</Text>
          </View>
        </View>
        {item.content.description && (
          <Text style={styles.taskDescription} numberOfLines={2}>
            {item.content.description}
          </Text>
        )}
        <View style={styles.taskFooter}>
          <Text style={styles.taskMeta}>
            {item.content.priority && `Priority: ${item.content.priority}`}
          </Text>
          <Text style={styles.taskDate}>
            {new Date(item.updated_at).toLocaleDateString()}
          </Text>
        </View>
      </View>
    </View>
  );

  const renderTask = ({ item }: { item: TaskMemory }) => (
    <SwipeableTaskItem
      task={item}
      onEdit={handleEditTask}
      onDelete={handleDeleteTask}
      onToggleComplete={handleToggleComplete}
      renderTask={renderTaskContent}
    />
  );

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
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
        <View style={styles.content}>
          <Text style={styles.title}>Please sign in to view tasks</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>Tasks</Text>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={handleCreateTask}
          >
            <Text style={styles.addButtonText}>+ Add Task</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.subtitle}>
          Connected to ZMemory API • {stats.filtered} of {stats.total} tasks
        </Text>
      </View>

      {/* Filter Controls */}
      <FilterControls
        search={search}
        filterPriority={filterPriority}
        selectedCategory={selectedCategory}
        sortMode={sortMode}
        onSearchChange={setSearch}
        onPriorityChange={setFilterPriority}
        onCategoryChange={setSelectedCategory}
        onSortModeChange={setSortMode}
        categories={categories}
      />

      {loading && tasks.length === 0 ? (
        <View style={styles.content}>
          <Text style={styles.loadingText}>Loading tasks...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredTasks}
          renderItem={renderTask}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {tasks.length === 0 ? 'No tasks found' : 'No tasks match your filters'}
              </Text>
              <Text style={styles.emptySubtext}>
                {tasks.length === 0 
                  ? 'Pull to refresh or create your first task' 
                  : 'Try adjusting your search or filters'
                }
              </Text>
            </View>
          }
        />
      )}

      {/* Task Editor Modal */}
      <TaskEditor
        isOpen={showTaskEditor}
        onClose={() => {
          setShowTaskEditor(false);
          setEditingTask(null);
        }}
        task={editingTask}
        onSave={handleSaveTask}
        title={editingTask ? 'Edit Task' : 'Create Task'}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  addButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: '#64748b',
    fontWeight: '500',
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
  },
  listContainer: {
    padding: 20,
    paddingTop: 16,
  },
  taskCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  taskContent: {
    padding: 20,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  taskTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 16,
  },
  completeButton: {
    marginRight: 16,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  completeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  taskTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#0f172a',
    flex: 1,
    lineHeight: 24,
  },
  completedTaskTitle: {
    textDecorationLine: 'line-through',
    color: '#64748b',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    textTransform: 'capitalize',
    letterSpacing: 0.5,
  },
  taskDescription: {
    fontSize: 15,
    color: '#64748b',
    lineHeight: 22,
    marginBottom: 16,
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  taskMeta: {
    fontSize: 13,
    color: '#94a3b8',
    textTransform: 'capitalize',
    fontWeight: '500',
  },
  taskDate: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 24,
  },
  taskActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
  },
  deleteButton: {
    borderColor: '#ef4444',
  },
  deleteButtonText: {
    color: '#ef4444',
  },
});