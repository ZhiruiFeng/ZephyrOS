import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Surface, Text, useTheme } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { TaskService } from '../services/taskService';
import { TaskMemory } from '../types/task';
import { useAuth } from '../contexts/AuthContext';
import StatisticsCards, { ViewKey } from '../components/StatisticsCards';
import FilterControls from '../components/FilterControls';
import SwipeableTaskItem from '../components/SwipeableTaskItem';
import TaskEditor from '../components/TaskEditor';
import { useTaskFiltering } from '../hooks/useTaskFiltering';

export default function HomeScreen() {
  const { user } = useAuth();
  const theme = useTheme();
  const [tasks, setTasks] = useState<TaskMemory[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<ViewKey>('current');
  const [showTaskEditor, setShowTaskEditor] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskMemory | null>(null);
  
  // Filter states
  const [search, setSearch] = useState('');
  const [filterPriority, setFilterPriority] = useState<'all' | 'low' | 'medium' | 'high' | 'urgent'>('all');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'uncategorized' | string>('all');
  const [sortMode, setSortMode] = useState<'none' | 'priority' | 'due_date'>('none');
  
  // Mock categories for now
  const categories = [
    { id: 'work', name: 'Work' },
    { id: 'personal', name: 'Personal' },
    { id: 'health', name: 'Health' },
  ];

  const fetchTasks = async () => {
    try {
      const fetchedTasks = await TaskService.getTasks({
        limit: 100,
        sort_by: 'updated_at',
        sort_order: 'desc'
      });
      setTasks(fetchedTasks);
    } catch (error) {
      console.error('❌ Error fetching tasks:', error);
      Alert.alert('Error', 'Failed to fetch tasks. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchTasks();
    }
  }, [user]);

  // Calculate statistics based on current view logic
  const calculateStats = () => {
    const now = Date.now();
    const windowMs = 24 * 60 * 60 * 1000; // 24 hours

    const currentTasks = tasks.filter((task) => {
      const content = task.content;
      const isInProgress = content.status === 'in_progress';
      const isCompletedRecently = content.status === 'completed' && 
        (now - new Date(task.updated_at).getTime()) < windowMs;
      const isPendingToday = content.status === 'pending' && 
        (!content.due_date || new Date(content.due_date).getTime() <= now + windowMs);
      
      return isInProgress || isCompletedRecently || isPendingToday;
    });

    const futureTasks = tasks.filter((task) => {
      const content = task.content;
      return content.status === 'on_hold' || 
        (content.status === 'pending' && content.due_date && new Date(content.due_date).getTime() > now);
    });

    const archiveTasks = tasks.filter((task) => {
      const content = task.content;
      return content.status === 'completed' || content.status === 'cancelled';
    });

    return {
      current: currentTasks.length,
      future: futureTasks.length,
      archive: archiveTasks.length,
    };
  };

  const stats = calculateStats();

  // Apply filtering
  const { filteredTasks } = useTaskFiltering({
    tasks,
    selectedCategory,
    search,
    filterPriority,
    sortMode,
  });

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
        await TaskService.updateTask(taskId, data);
      } else {
        await TaskService.createTask(data);
      }
      
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
              await TaskService.deleteTask(task.id);
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
      await TaskService.updateTask(task.id, {
        content: { ...task.content, status: newStatus }
      });
      await fetchTasks();
    } catch (error) {
      console.error('❌ Error updating task status:', error);
      Alert.alert('Error', 'Failed to update task status. Please try again.');
    }
  };

  // Task content renderer for swipeable component
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#10B981';
      case 'in_progress': return '#3B82F6';
      case 'pending': return '#F59E0B';
      case 'cancelled': return '#EF4444';
      case 'on_hold': return '#6B7280';
      default: return '#6B7280';
    }
  };

  if (!user) {
    return (
      <Surface style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.content}>
          <Text variant="headlineMedium" style={{ color: theme.colors.onBackground }}>
            Please sign in to view your dashboard
          </Text>
        </View>
      </Surface>
    );
  }

  return (
    <Surface style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Surface style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.outline }]}>
        <Text variant="headlineLarge" style={{ color: theme.colors.onSurface, marginBottom: 4 }}>
          Overview
        </Text>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          Your productivity dashboard
        </Text>
      </Surface>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Statistics Cards */}
          <StatisticsCards
            stats={stats}
            activeView={activeView}
            onViewChange={setActiveView}
          />

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

          {/* Quick Actions */}
          <View style={styles.quickActions}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.actionButton} onPress={handleCreateTask}>
                <Ionicons name="add-circle" size={24} color="#0284c7" />
                <Text style={styles.actionButtonText}>Add Task</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton}>
                <Ionicons name="time" size={24} color="#0284c7" />
                <Text style={styles.actionButtonText}>Start Timer</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton}>
                <Ionicons name="calendar" size={24} color="#0284c7" />
                <Text style={styles.actionButtonText}>Today's Plan</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Recent Tasks */}
          <View style={styles.recentTasks}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Tasks</Text>
              <TouchableOpacity>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </View>
            
            {loading ? (
              <Text style={styles.loadingText}>Loading tasks...</Text>
            ) : filteredTasks.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No tasks found</Text>
                <Text style={styles.emptySubtext}>Create your first task to get started</Text>
              </View>
            ) : (
              <View style={styles.taskList}>
                {filteredTasks.slice(0, 5).map((task) => (
                  <SwipeableTaskItem
                    key={task.id}
                    task={task}
                    onEdit={handleEditTask}
                    onDelete={handleDeleteTask}
                    onToggleComplete={handleToggleComplete}
                    renderTask={renderTaskContent}
                  />
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>

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
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    elevation: 2,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  quickActions: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
    marginTop: 8,
    textAlign: 'center',
  },
  recentTasks: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  viewAllText: {
    fontSize: 14,
    color: '#0284c7',
    fontWeight: '500',
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    padding: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
  },
  taskList: {
    gap: 12,
  },
  taskCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  taskContent: {
    padding: 16,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  taskTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  completeButton: {
    marginRight: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
  },
  completedTaskTitle: {
    textDecorationLine: 'line-through',
    color: '#64748b',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#fff',
    textTransform: 'capitalize',
  },
  taskDescription: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
    marginBottom: 12,
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskMeta: {
    fontSize: 12,
    color: '#94a3b8',
    textTransform: 'capitalize',
  },
  taskDate: {
    fontSize: 12,
    color: '#94a3b8',
  },
});
