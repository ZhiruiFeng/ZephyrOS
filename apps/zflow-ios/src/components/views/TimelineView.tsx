import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TimelineItem } from '../../hooks/useTimeline';
import { TimelineEvent, Category } from '../../types/timeline';

interface TimelineViewProps {
  selectedDate: Date;
  timelineItems: TimelineItem[];
  loading: boolean;
  onItemClick: (item: TimelineItem) => void;
  onEditItem: (item: TimelineItem) => void;
  onDeleteItem: (item: TimelineItem) => void;
  onDateChange?: (date: Date) => void;
  refetchTimeline?: () => void;
  t: any;
  lang?: string;
}

// Transform TimelineItem to TimelineEvent
const transformTimelineItems = (items: TimelineItem[]): TimelineEvent[] => {
  return items.map(item => {
    // For time-entries, use the timeline_item_type from metadata
    let displayType = item.type;
    if (item.type === 'time_entry' && item.metadata?.timelineItemType) {
      displayType = item.metadata.timelineItemType;
    }

    // For memories: show as a point-in-time bookmark at captured_at
    const isMemory = displayType === 'memory';
    const capturedAt = isMemory ? (item.metadata?.capturedAt as string | undefined) : undefined;
    const memoryStart = isMemory ? (capturedAt || item.startTime) : undefined;

    // For standalone tasks (not time entries): show as creation point-in-time
    const isCreationTask = item.type === 'task';

    return {
      id: item.id,
      title: item.title,
      start: isMemory ? (memoryStart as string) : item.startTime,
      end: (isMemory || isCreationTask)
        ? (isMemory ? (memoryStart as string) : item.startTime)
        : (item.endTime || new Date(new Date(item.startTime).getTime() + (item.duration || 30) * 60000).toISOString()),
      type: displayType as 'task' | 'activity' | 'memory',
      categoryId: item.category?.id,
      source: item.metadata?.source as string,
      energy: item.metadata?.energy ? {
        avg: item.metadata.energy.avg,
        min: item.metadata.energy.min,
        max: item.metadata.energy.max,
        samples: item.metadata.energy.samples
      } : undefined,
      meta: {
        note: item.description || undefined,
        tags: item.tags,
        isCrossDaySegment: item.metadata?.isCrossDaySegment,
        originalId: item.metadata?.originalId,
        originalStart: item.metadata?.originalStart,
        originalEnd: item.metadata?.originalEnd,
        capturedAt: capturedAt,
        originalType: item.type,
        relatedItemId: item.type === 'time_entry' ? item.metadata?.taskId : undefined,
        timelineItemType: item.metadata?.timelineItemType,
        timelineItemTitle: item.metadata?.timelineItemTitle,
        timelineItemId: item.metadata?.timelineItemId,
        isOldTask: item.metadata?.isOldTask,
        createdAt: item.metadata?.createdAt,
        isCreationEvent: isCreationTask
      }
    };
  });
};

// Transform categories
const transformCategories = (items: TimelineItem[]): Category[] => {
  const categoryMap = new Map<string, Category>();
  
  items.forEach(item => {
    if (item.category && !categoryMap.has(item.category.id)) {
      categoryMap.set(item.category.id, {
        id: item.category.id,
        name: item.category.name,
        color: item.category.color,
        icon: item.category.icon
      });
    }
  });

  // Add default categories if none exist
  if (categoryMap.size === 0) {
    categoryMap.set('default', {
      id: 'default',
      name: 'General',
      color: '#C6D2DE',
      icon: 'Circle'
    });
  }

  return Array.from(categoryMap.values());
};

export default function TimelineView({
  selectedDate,
  timelineItems,
  loading,
  onItemClick,
  t
}: TimelineViewProps) {
  const [now, setNow] = useState<Date>(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const events = useMemo(() => transformTimelineItems(timelineItems), [timelineItems]);

  const day = selectedDate;

  const dayEvents = useMemo(() => {
    const dayStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 0, 0, 0, 0);
    const dayEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 23, 59, 59, 999);
    return events.filter(event => {
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);
      return eventStart <= dayEnd && eventEnd >= dayStart;
    });
  }, [events, selectedDate]);

  const sorted = [...dayEvents].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  const isToday = selectedDate.toDateString() === now.toDateString();

  const handleEventClick = (event: TimelineEvent) => {
    // Find the original timeline item
    const originalItem = timelineItems.find(item => item.id === event.id);
    if (originalItem) {
      onItemClick(originalItem);
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDuration = (start: string, end: string) => {
    const startTime = new Date(start);
    const endTime = new Date(end);
    const durationMs = endTime.getTime() - startTime.getTime();
    const durationMinutes = Math.round(durationMs / 60000);
    
    if (durationMinutes < 60) {
      return `${durationMinutes}m`;
    }
    
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'task':
        return 'checkmark-circle-outline';
      case 'activity':
        return 'play-circle-outline';
      case 'memory':
        return 'bookmark-outline';
      default:
        return 'time-outline';
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'task':
        return '#10B981';
      case 'activity':
        return '#3B82F6';
      case 'memory':
        return '#8B5CF6';
      default:
        return '#6B7280';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingContent}>
          <View style={styles.spinner} />
          <Text style={styles.loadingText}>{t?.common?.loading || 'Loading...'}</Text>
        </View>
      </View>
    );
  }

  if (sorted.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyContent}>
          <Ionicons name="time-outline" size={48} color="#9CA3AF" />
          <Text style={styles.emptyTitle}>No timeline events</Text>
          <Text style={styles.emptySubtitle}>
            {isToday ? 'Start tracking your activities today!' : 'No events recorded for this day.'}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.timelineContainer}>
        {/* Timeline line */}
        <View style={styles.timelineLine} />
        
        <View style={styles.eventsContainer}>
          {sorted.map((event, index) => {
            const isLast = index === sorted.length - 1;
            const eventStart = new Date(event.start);
            const eventEnd = new Date(event.end);
            const isPointInTime = eventStart.getTime() === eventEnd.getTime();
            
            return (
              <View key={event.id} style={styles.eventWrapper}>
                {/* Time label */}
                <View style={styles.timeLabel}>
                  <Text style={styles.timeText}>{formatTime(event.start)}</Text>
                </View>
                
                {/* Event content */}
                <TouchableOpacity
                  style={styles.eventContainer}
                  onPress={() => handleEventClick(event)}
                  activeOpacity={0.7}
                >
                  <View style={styles.eventContent}>
                    {/* Event indicator */}
                    <View style={[
                      styles.eventIndicator,
                      { backgroundColor: getEventColor(event.type) },
                      isPointInTime && styles.eventIndicatorPoint
                    ]}>
                      <Ionicons 
                        name={getEventIcon(event.type)} 
                        size={16} 
                        color="#fff" 
                      />
                    </View>
                    
                    {/* Event details */}
                    <View style={styles.eventDetails}>
                      <View style={styles.eventHeader}>
                        <Text style={styles.eventTitle}>{event.title}</Text>
                        {!isPointInTime && (
                          <Text style={styles.eventDuration}>
                            {formatDuration(event.start, event.end)}
                          </Text>
                        )}
                      </View>
                      
                      {event.meta?.note && (
                        <Text style={styles.eventNote} numberOfLines={2}>
                          {event.meta.note}
                        </Text>
                      )}
                      
                      {event.meta?.tags && event.meta.tags.length > 0 && (
                        <View style={styles.eventTags}>
                          {event.meta.tags.slice(0, 3).map(tag => (
                            <View key={tag} style={styles.eventTag}>
                              <Text style={styles.eventTagText}>#{tag}</Text>
                            </View>
                          ))}
                          {event.meta.tags.length > 3 && (
                            <Text style={styles.eventTagMore}>
                              +{event.meta.tags.length - 3} more
                            </Text>
                          )}
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
                
                {/* Connection line to next event */}
                {!isLast && <View style={styles.connectionLine} />}
              </View>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F9FF', // primary-50 background
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  spinner: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderTopColor: '#3B82F6',
    // Note: React Native doesn't support CSS animations, would need Animated API
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyContent: {
    alignItems: 'center',
    gap: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  timelineContainer: {
    paddingHorizontal: 16,
    paddingTop: 32,
    paddingBottom: 100,
    position: 'relative',
  },
  timelineLine: {
    position: 'absolute',
    left: 28,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#3B82F6',
    opacity: 0.2,
  },
  eventsContainer: {
    position: 'relative',
    zIndex: 1,
  },
  eventWrapper: {
    marginBottom: 24,
  },
  timeLabel: {
    position: 'absolute',
    left: -60,
    top: 8,
    width: 50,
    alignItems: 'flex-end',
  },
  timeText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  eventContainer: {
    marginLeft: 48,
  },
  eventContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  eventIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  eventIndicatorPoint: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  eventDetails: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 12,
    padding: 16,
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
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
    marginRight: 8,
  },
  eventDuration: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  eventNote: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 8,
  },
  eventTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  eventTag: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  eventTagText: {
    fontSize: 12,
    color: '#374151',
  },
  eventTagMore: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  connectionLine: {
    position: 'absolute',
    left: 44,
    top: 32,
    bottom: -24,
    width: 2,
    backgroundColor: '#E5E7EB',
  },
});
