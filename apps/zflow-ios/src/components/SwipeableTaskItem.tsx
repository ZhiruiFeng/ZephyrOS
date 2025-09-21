import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  PanResponder,
} from 'react-native';
import { TaskMemory } from '../types/task';

interface SwipeableTaskItemProps {
  task: TaskMemory;
  onEdit: (task: TaskMemory) => void;
  onDelete: (task: TaskMemory) => void;
  onToggleComplete: (task: TaskMemory) => void;
  renderTask: (task: TaskMemory) => React.ReactElement;
}

export default function SwipeableTaskItem({
  task,
  onEdit,
  onDelete,
  onToggleComplete,
  renderTask,
}: SwipeableTaskItemProps) {
  const translateX = new Animated.Value(0);
  const [swipeThreshold] = React.useState(100);
  const [isSwipeOpen, setIsSwipeOpen] = React.useState(false);

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, gestureState) => {
      return Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dy) < 50;
    },
    onPanResponderMove: (_, gestureState) => {
      const clampedValue = Math.max(-swipeThreshold, Math.min(swipeThreshold, gestureState.dx));
      translateX.setValue(clampedValue);
    },
    onPanResponderRelease: (_, gestureState) => {
      const { dx } = gestureState;
      
      if (dx > swipeThreshold * 0.5) {
        // Swiped right - complete task
        Animated.spring(translateX, {
          toValue: swipeThreshold,
          useNativeDriver: true,
        }).start();
        setTimeout(() => {
          onToggleComplete(task);
          resetPosition();
        }, 200);
      } else if (dx < -swipeThreshold * 0.5) {
        // Swiped left - show actions
        Animated.spring(translateX, {
          toValue: -swipeThreshold,
          useNativeDriver: true,
        }).start();
        setIsSwipeOpen(true);
      } else {
        // Return to original position
        resetPosition();
      }
    },
  });

  const resetPosition = () => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
    }).start();
    setIsSwipeOpen(false);
  };

  const handleActionPress = (action: 'edit' | 'delete') => {
    resetPosition();
    if (action === 'edit') {
      onEdit(task);
    } else {
      onDelete(task);
    }
  };

  return (
    <View style={styles.container}>
      {/* Background Actions */}
      <View style={styles.backgroundActions}>
        <View style={styles.leftAction}>
          <View style={[styles.actionButton, styles.completeAction]}>
            <Text style={styles.actionText}>✓ Complete</Text>
          </View>
        </View>
        <View style={styles.rightActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.editAction]}
            onPress={() => handleActionPress('edit')}
          >
            <Text style={styles.actionText}>✏️ Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteAction]}
            onPress={() => handleActionPress('delete')}
          >
            <Text style={styles.actionText}>🗑️ Delete</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content */}
      <Animated.View
        style={[
          styles.contentContainer,
          {
            transform: [{ translateX }],
          },
        ]}
        {...panResponder.panHandlers}
      >
        {renderTask(task)}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
  backgroundActions: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
  },
  leftAction: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingLeft: 20,
    backgroundColor: '#10B981',
  },
  rightActions: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingRight: 20,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  completeAction: {
    backgroundColor: '#10B981',
  },
  editAction: {
    backgroundColor: '#3B82F6',
  },
  deleteAction: {
    backgroundColor: '#EF4444',
  },
  actionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  contentContainer: {
    backgroundColor: '#fff',
    zIndex: 1,
  },
});
