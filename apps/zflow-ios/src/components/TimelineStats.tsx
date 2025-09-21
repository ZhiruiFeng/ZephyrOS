import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TimelineData } from '../hooks/useTimeline';

interface TimelineStatsProps {
  timelineData: TimelineData;
  className?: string;
  t?: any;
}

export default function TimelineStats({
  timelineData,
  t
}: TimelineStatsProps) {
  const { totalDuration, categories, tags, items } = timelineData;

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  return (
    <View style={styles.container}>
      {/* Total Duration */}
      <View style={styles.statCard}>
        <View style={styles.statContent}>
          <View style={[styles.iconContainer, styles.blueIcon]}>
            <Ionicons name="time-outline" size={20} color="#3B82F6" />
          </View>
          <View style={styles.statText}>
            <Text style={styles.statLabel}>{t?.ui?.recorded || 'Total Duration'}</Text>
            <Text style={styles.statValue}>
              {formatDuration(totalDuration)}
            </Text>
          </View>
        </View>
      </View>

      {/* Total Items */}
      <View style={styles.statCard}>
        <View style={styles.statContent}>
          <View style={[styles.iconContainer, styles.greenIcon]}>
            <Ionicons name="trending-up-outline" size={20} color="#10B981" />
          </View>
          <View style={styles.statText}>
            <Text style={styles.statLabel}>{t?.ui?.statistics || 'Total Items'}</Text>
            <Text style={styles.statValue}>
              {items.length}
            </Text>
          </View>
        </View>
      </View>

      {/* Categories */}
      <View style={styles.statCard}>
        <View style={styles.statContent}>
          <View style={[styles.iconContainer, styles.purpleIcon]}>
            <Ionicons name="folder-outline" size={20} color="#8B5CF6" />
          </View>
          <View style={styles.statText}>
            <Text style={styles.statLabel}>{t?.ui?.categories || 'Categories'}</Text>
            <Text style={styles.statValue}>
              {categories.length}
            </Text>
          </View>
        </View>
      </View>

      {/* Tags */}
      <View style={styles.statCard}>
        <View style={styles.statContent}>
          <View style={[styles.iconContainer, styles.amberIcon]}>
            <Ionicons name="pricetag-outline" size={20} color="#F59E0B" />
          </View>
          <View style={styles.statText}>
            <Text style={styles.statLabel}>{t?.task?.tags || 'Tags'}</Text>
            <Text style={styles.statValue}>
              {tags.length}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

// Detailed stats component for showing breakdown
export function TimelineDetailedStats({ timelineData, t }: { timelineData: TimelineData, t?: any }) {
  const { items, categories, tags } = timelineData;

  const getItemTypeCount = (type: string) => {
    return items.filter(item => item.type === type).length;
  };

  const getItemTypeDuration = (type: string) => {
    return items
      .filter(item => item.type === type && item.duration)
      .reduce((total, item) => total + (item.duration || 0), 0);
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  return (
    <View style={styles.detailedContainer}>
      {/* Item Types Breakdown */}
      <View style={styles.detailedCard}>
        <Text style={styles.detailedTitle}>{t?.ui?.statistics || 'Record Type Breakdown'}</Text>
        <View style={styles.breakdownContainer}>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Time Entries</Text>
            <View style={styles.breakdownValue}>
              <Text style={styles.breakdownCount}>
                {getItemTypeCount('time_entry')}
              </Text>
              <Text style={styles.breakdownDuration}>
                ({formatDuration(getItemTypeDuration('time_entry'))})
              </Text>
            </View>
          </View>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Memories</Text>
            <Text style={styles.breakdownCount}>
              {getItemTypeCount('memory')}
            </Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>{t?.ui?.task || 'Task'}</Text>
            <Text style={styles.breakdownCount}>
              {getItemTypeCount('task')}
            </Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>{t?.ui?.activity || 'Activity'}</Text>
            <Text style={styles.breakdownCount}>
              {getItemTypeCount('activity')}
            </Text>
          </View>
        </View>
      </View>

      {/* Top Categories */}
      <View style={styles.detailedCard}>
        <Text style={styles.detailedTitle}>Top Categories</Text>
        <View style={styles.categoriesContainer}>
          {categories.slice(0, 5).map(category => (
            <View key={category.id} style={styles.categoryRow}>
              <View style={styles.categoryLeft}>
                <View 
                  style={[styles.categoryDot, { backgroundColor: category.color }]}
                />
                <Text style={styles.categoryName}>{category.name}</Text>
              </View>
              <Text style={styles.categoryCount}>
                {category.count}
              </Text>
            </View>
          ))}
          {categories.length === 0 && (
            <Text style={styles.noData}>{t?.ui?.noData || 'No data'}</Text>
          )}
        </View>
      </View>

      {/* Top Tags */}
      <View style={[styles.detailedCard, styles.tagsCard]}>
        <Text style={styles.detailedTitle}>Top Tags</Text>
        <View style={styles.tagsContainer}>
          {tags.slice(0, 10).map(tag => (
            <View
              key={tag.name}
              style={styles.tagChip}
            >
              <Text style={styles.tagText}>#{tag.name}</Text>
              <Text style={styles.tagCount}>({tag.count})</Text>
            </View>
          ))}
          {tags.length === 0 && (
            <Text style={styles.noData}>{t?.ui?.noData || 'No data'}</Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
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
  statContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  blueIcon: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  greenIcon: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  purpleIcon: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
  },
  amberIcon: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  statText: {
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  detailedContainer: {
    gap: 16,
  },
  detailedCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 12,
    padding: 20,
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
  tagsCard: {
    flex: 2,
  },
  detailedTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  breakdownContainer: {
    gap: 12,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  breakdownValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  breakdownCount: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  breakdownDuration: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  categoriesContainer: {
    gap: 12,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  categoryName: {
    fontSize: 14,
    color: '#6B7280',
  },
  categoryCount: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  noData: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
  },
  tagText: {
    fontSize: 12,
    color: '#374151',
  },
  tagCount: {
    fontSize: 10,
    color: '#9CA3AF',
  },
});
