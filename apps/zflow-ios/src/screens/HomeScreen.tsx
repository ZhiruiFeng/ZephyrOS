import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Surface, Text, useTheme } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { TaskMemory } from '../types/task';
import { useAuth } from '../contexts/AuthContext';
import StatisticsCards, { ViewKey } from '../components/StatisticsCards';
import FilterControls from '../components/FilterControls';
import TaskEditor from '../components/TaskEditor';
import { useTaskFiltering } from '../hooks/useTaskFiltering';
// import { useTaskTimer } from '../hooks/useZMemoryApi';
import CurrentView from '../components/views/CurrentView';
import FutureView from '../components/views/FutureView';
import ArchiveView from '../components/views/ArchiveView';
import TimelineView from '../components/views/TimelineView';
import TimelineStats, { TimelineDetailedStats } from '../components/TimelineStats';
import DateSelector from '../components/DateSelector';
import MobileCategorySheet from '../components/MobileCategorySheet';
import {
  useTasks,
  useCategories,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useCreateCategory
} from '../hooks/useZMemoryApi';
import { useTimeline, TimelineItem } from '../hooks/useTimeline';

interface HomeScreenProps {
  onScroll?: (event: any) => void;
  onRegisterAddTask?: (callback: () => void) => void;
}

export type MainViewMode = 'tasks' | 'timeline';

export default function HomeScreen({ onScroll, onRegisterAddTask }: HomeScreenProps) {
  const { user } = useAuth();
  const theme = useTheme();
  const [activeView, setActiveView] = useState<ViewKey>('current');
  const [mainViewMode, setMainViewMode] = useState<MainViewMode>('tasks');
  const [timelineViewMode, setTimelineViewMode] = useState<'timeline' | 'stats'>('timeline');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [displayMode, setDisplayMode] = useState<'list' | 'grid'>('list');
  const [showTaskEditor, setShowTaskEditor] = useState(false);
  
  const [editingTask, setEditingTask] = useState<TaskMemory | null>(null);
  const [showMobileCategorySheet, setShowMobileCategorySheet] = useState(false);

  // Filter states
  const [search, setSearch] = useState('');
  const [filterPriority, setFilterPriority] = useState<'all' | 'low' | 'medium' | 'high' | 'urgent'>('all');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'uncategorized' | string>('all');
  const [sortMode, setSortMode] = useState<'none' | 'priority' | 'due_date'>('none');

  // Stabilize task params to prevent unnecessary API calls
  const taskParams = useMemo(() => {
    return user ? {
      limit: 500,
      sort_by: 'updated_at' as const,
      sort_order: 'desc' as const,
      root_tasks_only: true,
    } : undefined;
  }, [user]);

  // ZMemory API hooks
  const { tasks, loading, error: tasksError, refetch: refetchTasks } = useTasks(taskParams);

  const { categories, refetch: refetchCategories } = useCategories();
  const { createTask } = useCreateTask();
  const { updateTask } = useUpdateTask();
  const { deleteTask } = useDeleteTask();
  const { createCategory } = useCreateCategory();

  // Timer functionality (TODO: Implement timer state management)
  // const { startTimer, stopTimer } = useTaskTimer();

  // Timeline data
  const { timelineData, isLoading: timelineLoading, refetch: refetchTimeline } = useTimeline(selectedDate);

  // CRUD Operations
  const handleCreateTask = useCallback(() => {
    setEditingTask(null);
    setShowTaskEditor(true);
  }, []);

  // Show error alert if tasks fail to load
  useEffect(() => {
    if (tasksError) {
      Alert.alert('Error', 'Failed to fetch tasks. Please check your connection.');
    }
  }, [tasksError]);

  // Register the add task callback with the parent navigator
  useEffect(() => {
    if (onRegisterAddTask) {
      onRegisterAddTask(handleCreateTask);
    }
  }, [onRegisterAddTask, handleCreateTask]);

  // Apply filtering with proper task categorization
  const {
    currentList,
    futureList,
    archiveList,
    stats: taskStats
  } = useTaskFiltering({
    tasks,
    selectedCategory,
    search,
    filterPriority,
    sortMode,
    timerRunningTaskId: undefined, // TODO: Add timer state management
  });

  // Calculate category counts like the web version
  const categoryCounts = useMemo(() => {
    const counts = {
      byId: {} as Record<string, number>,
      byIdCompleted: {} as Record<string, number>,
      byIdIncomplete: {} as Record<string, number>,
      uncategorized: 0,
      uncategorizedCompleted: 0,
      uncategorizedIncomplete: 0,
      total: tasks?.length || 0,
      totalCompleted: 0,
      totalIncomplete: 0,
    };

    if (!tasks || !Array.isArray(tasks)) return counts;

    for (const task of tasks) {
      if (!task || !task.content) continue;

      const completed = task.content.status === 'completed';
      const catId = (task as any).category_id || task.content.category_id;

      if (catId) {
        counts.byId[catId] = (counts.byId[catId] || 0) + 1;
        if (completed) {
          counts.byIdCompleted[catId] = (counts.byIdCompleted[catId] || 0) + 1;
        } else {
          counts.byIdIncomplete[catId] = (counts.byIdIncomplete[catId] || 0) + 1;
        }
      } else {
        counts.uncategorized += 1;
        if (completed) {
          counts.uncategorizedCompleted += 1;
        } else {
          counts.uncategorizedIncomplete += 1;
        }
      }

      if (completed) {
        counts.totalCompleted += 1;
      } else {
        counts.totalIncomplete += 1;
      }
    }

    return counts;
  }, [tasks]);

  // Use stats from useTaskFiltering hook with safety checks
  const stats = {
    current: taskStats?.current || 0,
    future: taskStats?.future || 0,
    archive: taskStats?.archive || 0,
  };

  const handleEditTask = useCallback((task: TaskMemory) => {
    setEditingTask(task);
    setShowTaskEditor(true);
  }, []);

  const handleSaveTask = async (taskId: string | null, data: any) => {
    try {
      if (taskId) {
        await updateTask(taskId, data);
      } else {
        await createTask(data);
      }

      await refetchTasks();
      setShowTaskEditor(false);
      setEditingTask(null);
    } catch (error) {
      console.error('❌ Error saving task:', error);
      Alert.alert('Error', 'Failed to save task. Please try again.');
    }
  };

  const handleDeleteTask = useCallback((task: TaskMemory) => {
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
              await deleteTask(task.id);
              await refetchTasks();
            } catch (error) {
              console.error('❌ Error deleting task:', error);
              Alert.alert('Error', 'Failed to delete task. Please try again.');
            }
          }
        }
      ]
    );
  }, [deleteTask, refetchTasks]);

  const handleToggleComplete = useCallback(async (task: TaskMemory) => {
    try {
      const newStatus = task.content.status === 'completed' ? 'pending' : 'completed';
      await updateTask(task.id, {
        content: { ...task.content, status: newStatus }
      });
      await refetchTasks();
    } catch (error) {
      console.error('❌ Error updating task status:', error);
      Alert.alert('Error', 'Failed to update task status. Please try again.');
    }
  }, [updateTask, refetchTasks]);

  // Timeline event handlers
  const handleTimelineItemClick = useCallback((item: TimelineItem) => {
    // TODO: Implement navigation to detailed view
    console.log('Timeline item clicked:', item);
  }, []);

  const handleEditTimelineItem = useCallback((item: TimelineItem) => {
    // TODO: Implement timeline item editing
    console.log('Edit timeline item:', item);
  }, []);

  const handleDeleteTimelineItem = useCallback((item: TimelineItem) => {
    // TODO: Implement timeline item deletion
    console.log('Delete timeline item:', item);
  }, []);

  // Additional callback handlers
  const handleOpenMobileCategorySelector = useCallback(() => {
    setShowMobileCategorySheet(true);
  }, []);

  const handleOpenFocus = useCallback(() => {
    console.log('Navigate to Focus');
    // TODO: Implement focus navigation
  }, []);

  const handleOpenTimeModal = useCallback(() => {
    console.log('Open Time Modal');
    // TODO: Implement time modal
  }, []);

  const handleCloseTaskEditor = useCallback(() => {
    setShowTaskEditor(false);
    setEditingTask(null);
  }, []);

  const handleDismissMobileCategorySheet = useCallback(() => {
    setShowMobileCategorySheet(false);
  }, []);

  // Get priority icon based on web version
  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <Ionicons name="flag" size={16} color="#f43f5e" />;
      case 'high':
        return <Ionicons name="flag" size={16} color="#f59e0b" />;
      case 'medium':
        return <Ionicons name="flag" size={16} color="#10b981" />;
      case 'low':
        return <Ionicons name="flag" size={16} color="#94a3b8" />;
      default:
        return null;
    }
  };

  // Get dynamic card styling based on task state
  const getTaskCardStyle = (task: TaskMemory) => {
    const isCompleted = task.content.status === 'completed';
    const isInProgress = task.content.status === 'in_progress';

    if (isInProgress) {
      return [styles.taskCard, styles.inProgressCard];
    }
    if (isCompleted) {
      return [styles.taskCard, styles.completedCard];
    }
    return styles.taskCard;
  };

  // Task content renderer with modern styling
  const renderTaskContent = (item: TaskMemory) => (
    <View style={getTaskCardStyle(item)}>
      <View style={styles.taskContent}>
        {/* Header with status indicator and actions */}
        <View style={styles.taskHeader}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              style={styles.statusIndicator}
              onPress={() => handleToggleComplete(item)}
            >
              <View style={[
                styles.statusDot,
                { backgroundColor: item.content.status === 'completed' ? '#10B981' : '#e5e7eb' }
              ]}>
                {item.content.status === 'completed' && (
                  <Ionicons name="checkmark" size={12} color="#fff" />
                )}
              </View>
            </TouchableOpacity>

            {/* Priority indicator */}
            {item.content.priority && (
              <View style={styles.priorityContainer}>
                {getPriorityIcon(item.content.priority)}
              </View>
            )}
          </View>

          {/* Status badge */}
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.content.status) }]}>
            <Text style={styles.statusText}>{item.content.status.replace('_', ' ')}</Text>
          </View>
        </View>

        {/* Title */}
        <Text style={[
          styles.taskTitle,
          item.content.status === 'completed' && styles.completedTaskTitle
        ]}>
          {item.content.title}
        </Text>

        {/* Description */}
        {item.content.description && (
          <Text style={styles.taskDescription} numberOfLines={2}>
            {item.content.description}
          </Text>
        )}

        {/* Footer with category and date */}
        <View style={styles.taskFooter}>
          <View style={styles.footerLeft}>
            {/* Category indicator */}
            {(item.content.category_id || (item as any).category_id) && (
              <View style={styles.categoryIndicator}>
                <View style={[
                  styles.categoryDot,
                  { backgroundColor: '#6B7280' } // Default color, can be enhanced with actual category colors
                ]} />
              </View>
            )}
          </View>

          <Text style={styles.taskDate}>
            {new Date(item.updated_at).toLocaleDateString()}
          </Text>
        </View>
      </View>
    </View>
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
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        <View style={styles.content}>
          {/* Main View Mode Toggle */}
          <View style={styles.mainViewToggle}>
            <View style={styles.toggleContainer}>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  mainViewMode === 'tasks' && styles.toggleButtonActive
                ]}
                onPress={() => setMainViewMode('tasks')}
              >
                <Ionicons
                  name="grid-outline"
                  size={16}
                  color={mainViewMode === 'tasks' ? '#fff' : '#6b7280'}
                />
                <Text style={[
                  styles.toggleButtonText,
                  mainViewMode === 'tasks' && styles.toggleButtonTextActive
                ]}>
                  Tasks
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  mainViewMode === 'timeline' && styles.toggleButtonActive
                ]}
                onPress={() => setMainViewMode('timeline')}
              >
                <Ionicons
                  name="bar-chart-outline"
                  size={16}
                  color={mainViewMode === 'timeline' ? '#fff' : '#6b7280'}
                />
                <Text style={[
                  styles.toggleButtonText,
                  mainViewMode === 'timeline' && styles.toggleButtonTextActive
                ]}>
                  Timeline
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Content based on view mode */}
          {mainViewMode === 'timeline' ? (
            <>
              {/* Timeline View Mode Toggle */}
              <View style={styles.timelineViewToggle}>
                <View style={styles.timelineToggleContainer}>
                  <TouchableOpacity
                    style={[
                      styles.timelineToggleButton,
                      timelineViewMode === 'timeline' && styles.timelineToggleButtonActive
                    ]}
                    onPress={() => setTimelineViewMode('timeline')}
                  >
                    <Ionicons
                      name="time-outline"
                      size={16}
                      color={timelineViewMode === 'timeline' ? '#fff' : '#6b7280'}
                    />
                    <Text style={[
                      styles.timelineToggleButtonText,
                      timelineViewMode === 'timeline' && styles.timelineToggleButtonTextActive
                    ]}>
                      Timeline
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.timelineToggleButton,
                      timelineViewMode === 'stats' && styles.timelineToggleButtonActive
                    ]}
                    onPress={() => setTimelineViewMode('stats')}
                  >
                    <Ionicons
                      name="bar-chart-outline"
                      size={16}
                      color={timelineViewMode === 'stats' ? '#fff' : '#6b7280'}
                    />
                    <Text style={[
                      styles.timelineToggleButtonText,
                      timelineViewMode === 'stats' && styles.timelineToggleButtonTextActive
                    ]}>
                      Statistics
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Date Selector */}
              <DateSelector
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
              />

              {/* Timeline Stats */}
              <TimelineStats
                timelineData={timelineData}
                t={{
                  ui: {
                    recorded: 'Total Duration',
                    statistics: 'Statistics',
                    categories: 'Categories',
                  },
                  task: {
                    tags: 'Tags',
                  }
                }}
              />

              {/* Timeline Content */}
              {timelineViewMode === 'timeline' ? (
                <TimelineView
                  selectedDate={selectedDate}
                  timelineItems={timelineData.items}
                  loading={timelineLoading}
                  onItemClick={handleTimelineItemClick}
                  onEditItem={handleEditTimelineItem}
                  onDeleteItem={handleDeleteTimelineItem}
                  refetchTimeline={refetchTimeline}
                  t={{
                    common: {
                      loading: 'Loading...',
                    }
                  }}
                />
              ) : (
                <TimelineDetailedStats
                  timelineData={timelineData}
                  t={{
                    ui: {
                      statistics: 'Record Type Breakdown',
                      task: 'Task',
                      activity: 'Activity',
                      noData: 'No data',
                    }
                  }}
                />
              )}
            </>
          ) : (
            <>
              {/* Statistics Cards */}
              <StatisticsCards
                stats={stats}
                activeView={activeView}
                onViewChange={setActiveView}
                t={{
                  ui: {
                    inProgress: 'In Progress',
                    backlogItems: 'Backlog Items'
                  }
                }}
              />

              {/* Filter Controls */}
              <FilterControls
                search={search}
                filterPriority={filterPriority}
                selectedCategory={selectedCategory}
                sortMode={sortMode}
                displayMode={displayMode}
                onSearchChange={setSearch}
                onPriorityChange={setFilterPriority}
                onCategoryChange={setSelectedCategory}
                onSortModeChange={setSortMode}
                onDisplayModeChange={setDisplayMode}
                onOpenMobileCategorySelector={handleOpenMobileCategorySelector}
                onOpenFocus={handleOpenFocus}
                onOpenTimeModal={handleOpenTimeModal}
                categories={categories}
              />

              {/* Task Views */}
              <View style={styles.taskViews}>
                {activeView === 'current' && (
                  <CurrentView
                    tasks={currentList || []}
                    loading={loading}
                    renderTaskContent={renderTaskContent}
                    onEdit={handleEditTask}
                    onDelete={handleDeleteTask}
                    onToggleComplete={handleToggleComplete}
                  />
                )}

                {activeView === 'future' && (
                  <FutureView
                    tasks={futureList || []}
                    loading={loading}
                    renderTaskContent={renderTaskContent}
                    onEdit={handleEditTask}
                    onDelete={handleDeleteTask}
                    onToggleComplete={handleToggleComplete}
                  />
                )}

                {activeView === 'archive' && (
                  <ArchiveView
                    tasks={archiveList || []}
                    loading={loading}
                    renderTaskContent={renderTaskContent}
                    onEdit={handleEditTask}
                    onDelete={handleDeleteTask}
                    onToggleComplete={handleToggleComplete}
                  />
                )}
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {/* Task Editor Modal */}
      <TaskEditor
        isOpen={showTaskEditor}
        onClose={handleCloseTaskEditor}
        task={editingTask}
        onSave={handleSaveTask}
        title={editingTask ? 'Edit Task' : 'Create Task'}
      />

      {/* Mobile Category Sheet */}
      <MobileCategorySheet
        visible={showMobileCategorySheet}
        onDismiss={handleDismissMobileCategorySheet}
        categories={categories}
        counts={categoryCounts}
        selected={selectedCategory}
        onSelect={setSelectedCategory}
        onCreate={async (categoryData: { name: string; color?: string }) => {
          try {
            await createCategory(categoryData);
            await refetchCategories();
          } catch (error) {
            console.error('❌ Error creating category:', error);
            Alert.alert('Error', 'Failed to create category. Please try again.');
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f9ff', // primary-50 background
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 100, // Add padding for bottom navigation
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 12,
  },
  taskViews: {
    marginBottom: 24,
  },
  // Modern glassmorphism task card
  taskCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 12,
  },
  inProgressCard: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)', // primary-50 tint
    borderColor: 'rgba(59, 130, 246, 0.3)',
    borderWidth: 2,
    shadowColor: '#3B82F6',
    shadowOpacity: 0.2,
  },
  completedCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.05)', // success tint
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  taskContent: {
    padding: 16,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusIndicator: {
    padding: 2,
  },
  statusDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  priorityContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
    textTransform: 'capitalize',
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    lineHeight: 22,
    marginBottom: 4,
  },
  completedTaskTitle: {
    textDecorationLine: 'line-through',
    color: '#64748b',
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
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIndicator: {
    marginRight: 8,
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  taskDate: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },
  mainViewToggle: {
    alignItems: 'center',
    marginBottom: 24,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.7)', // glass effect
    borderRadius: 25,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    gap: 8,
  },
  toggleButtonActive: {
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
  toggleButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6b7280',
  },
  toggleButtonTextActive: {
    color: '#fff',
  },
  timelineContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)', // glass effect
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  comingSoonText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  timelineViewToggle: {
    alignItems: 'center',
    marginBottom: 16,
  },
  timelineToggleContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 25,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  timelineToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    gap: 8,
  },
  timelineToggleButtonActive: {
    backgroundColor: '#0284c7',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  timelineToggleButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6b7280',
  },
  timelineToggleButtonTextActive: {
    color: '#fff',
  },
});
