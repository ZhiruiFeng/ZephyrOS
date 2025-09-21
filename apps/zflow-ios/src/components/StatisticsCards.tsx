import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';

export type ViewKey = 'current' | 'future' | 'archive';

interface StatisticsCardsProps {
  stats: {
    current: number;
    future: number;
    archive: number;
  };
  activeView: ViewKey;
  onViewChange: (view: ViewKey) => void;
  t?: any; // translations
}

export default function StatisticsCards({ stats, activeView, onViewChange, t }: StatisticsCardsProps) {
  const cards: Array<{
    key: ViewKey;
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    description: string;
    count: number;
    iconBgColor: string;
    iconColor: string;
    countColor: string;
    borderColor: string;
  }> = [
    {
      key: 'current' as ViewKey,
      icon: 'hourglass-outline',
      title: 'Current',
      description: `${t?.ui?.inProgress || 'In Progress'} + Completed within 24h`,
      count: stats.current,
      iconBgColor: '#dbeafe', // primary-100
      iconColor: '#0284c7', // primary-600
      countColor: '#0284c7', // primary-600
      borderColor: '#93c5fd' // primary-300
    },
    {
      key: 'future' as ViewKey,
      icon: 'list-outline',
      title: 'Future',
      description: t?.ui?.backlogItems || 'Backlog Items',
      count: stats.future,
      iconBgColor: '#bfdbfe', // primary-200
      iconColor: '#1d4ed8', // primary-700
      countColor: '#1d4ed8', // primary-700
      borderColor: '#93c5fd' // primary-300
    },
    {
      key: 'archive' as ViewKey,
      icon: 'archive-outline',
      title: 'Archive',
      description: 'Archived + Cancelled',
      count: stats.archive,
      iconBgColor: '#93c5fd', // primary-300
      iconColor: '#1e3a8a', // primary-800
      countColor: '#1e3a8a', // primary-800
      borderColor: '#93c5fd' // primary-300
    }
  ];

  return (
    <View style={styles.container}>
      {cards.map((card) => {
        const isActive = activeView === card.key;
        
        return (
          <TouchableOpacity
            key={card.key}
            style={[
              styles.card,
              isActive && { 
                borderColor: card.borderColor, 
                borderWidth: 2,
                shadowOpacity: 0.15,
                transform: [{ translateY: -2 }]
              }
            ]}
            onPress={() => onViewChange(card.key)}
            activeOpacity={0.8}
          >
            <View style={styles.cardContent}>
              <View style={styles.cardHeader}>
                <View style={[styles.iconContainer, { backgroundColor: card.iconBgColor }]}>
                  <Ionicons
                    name={card.icon}
                    size={20}
                    color={card.iconColor}
                  />
                </View>
                <View style={styles.cardTextContainer}>
                  <Text style={styles.cardTitle}>{card.title}</Text>
                  <Text style={styles.cardDescription} numberOfLines={2}>
                    {card.description}
                  </Text>
                </View>
              </View>
              <Text style={[styles.cardCount, { color: card.countColor }]}>
                {card.count}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  card: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.7)', // glass effect
    borderRadius: 12,
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
  cardContent: {
    padding: 12,
    justifyContent: 'space-between',
    minHeight: 100,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  cardTextContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 2,
  },
  cardDescription: {
    fontSize: 10,
    color: '#9ca3af',
    lineHeight: 14,
  },
  cardCount: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'left',
  },
});

