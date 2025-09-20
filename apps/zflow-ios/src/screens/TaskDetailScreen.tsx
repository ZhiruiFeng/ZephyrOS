import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTask } from '../hooks/useTask';

type RootStackParamList = {
  Home: undefined;
  TaskList: undefined;
  TaskDetail: { taskId: string };
};

type TaskDetailScreenNavigationProp = StackNavigationProp<RootStackParamList, 'TaskDetail'>;
type TaskDetailScreenRouteProp = RouteProp<RootStackParamList, 'TaskDetail'>;

interface Props {
  navigation: TaskDetailScreenNavigationProp;
  route: TaskDetailScreenRouteProp;
}

export default function TaskDetailScreen({ navigation, route }: Props) {
  const { taskId } = route.params;
  const { task, isLoading, error, updateTask } = useTask(taskId);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#10b981';
      case 'in_progress':
        return '#f59e0b';
      case 'pending':
        return '#6b7280';
      default:
        return '#6b7280';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return '#ef4444';
      case 'high':
        return '#f97316';
      case 'medium':
        return '#eab308';
      case 'low':
        return '#10b981';
      default:
        return '#6b7280';
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!task) return;

    try {
      await updateTask({
        content: {
          ...task.content,
          status: newStatus as any,
        },
      });
      Alert.alert('成功', '任务状态已更新');
    } catch (error) {
      Alert.alert('错误', '更新任务状态失败');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>加载中...</Text>
      </View>
    );
  }

  if (error || !task) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
        <Text style={styles.errorTitle}>加载失败</Text>
        <Text style={styles.errorMessage}>
          无法加载任务详情，请稍后重试
        </Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.retryButtonText}>返回</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{task.content.title}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(task.content.status) }]}>
          <Text style={styles.statusText}>
            {task.content.status === 'in_progress' ? '进行中' : 
             task.content.status === 'completed' ? '已完成' : '待处理'}
          </Text>
        </View>
      </View>

      {task.content.description && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>描述</Text>
          <Text style={styles.description}>{task.content.description}</Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>优先级</Text>
        <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(task.content.priority) }]}>
          <Text style={styles.priorityText}>
            {task.content.priority === 'urgent' ? '紧急' :
             task.content.priority === 'high' ? '高' :
             task.content.priority === 'medium' ? '中' : '低'}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>创建时间</Text>
        <Text style={styles.dateText}>
          {new Date(task.created_at).toLocaleString('zh-CN')}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>最后更新</Text>
        <Text style={styles.dateText}>
          {new Date(task.updated_at).toLocaleString('zh-CN')}
        </Text>
      </View>

      <View style={styles.actions}>
        <Text style={styles.sectionTitle}>操作</Text>
        
        {task.content.status !== 'completed' && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#10b981' }]}
            onPress={() => handleStatusChange('completed')}
          >
            <Ionicons name="checkmark-circle" size={20} color="white" />
            <Text style={styles.actionButtonText}>标记为完成</Text>
          </TouchableOpacity>
        )}

        {task.content.status !== 'in_progress' && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#f59e0b' }]}
            onPress={() => handleStatusChange('in_progress')}
          >
            <Ionicons name="play-circle" size={20} color="white" />
            <Text style={styles.actionButtonText}>开始进行</Text>
          </TouchableOpacity>
        )}

        {task.content.status !== 'pending' && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#6b7280' }]}
            onPress={() => handleStatusChange('pending')}
          >
            <Ionicons name="pause-circle" size={20} color="white" />
            <Text style={styles.actionButtonText}>暂停任务</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    backgroundColor: 'white',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 14,
    color: 'white',
    fontWeight: '600',
  },
  section: {
    backgroundColor: 'white',
    padding: 20,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
  },
  priorityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  priorityText: {
    fontSize: 14,
    color: 'white',
    fontWeight: '600',
  },
  dateText: {
    fontSize: 16,
    color: '#6b7280',
  },
  actions: {
    backgroundColor: 'white',
    padding: 20,
    marginTop: 8,
    marginBottom: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 12,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ef4444',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
