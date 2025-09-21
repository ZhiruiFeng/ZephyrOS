import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { TaskMemory } from '../../types/task';
import SwipeableTaskItem from '../SwipeableTaskItem';

interface ArchiveViewProps {
  tasks: TaskMemory[];
  loading: boolean;
  renderTaskContent: (task: TaskMemory) => React.ReactNode;
  onEdit: (task: TaskMemory) => void;
  onDelete: (task: TaskMemory) => void;
  onToggleComplete: (task: TaskMemory) => void;
}

export default function ArchiveView({
  tasks,
  loading,
  renderTaskContent,
  onEdit,
  onDelete,
  onToggleComplete,
}: ArchiveViewProps) {
  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading archived tasks...</Text>
      </View>
    );
  }

  if (tasks.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No archived tasks</Text>
        <Text style={styles.emptySubtext}>Completed and cancelled tasks will appear here</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.taskList}>
        {tasks.map((task) => (
          <SwipeableTaskItem
            key={task.id}
            task={task}
            onEdit={onEdit}
            onDelete={onDelete}
            onToggleComplete={onToggleComplete}
            renderTask={renderTaskContent}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    padding: 20,
  },
  emptyContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)', // glass effect
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
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
});