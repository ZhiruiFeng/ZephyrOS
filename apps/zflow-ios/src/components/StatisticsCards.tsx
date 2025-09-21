import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, IconButton, useTheme } from 'react-native-paper';
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
}

export default function StatisticsCards({ stats, activeView, onViewChange }: StatisticsCardsProps) {
  const theme = useTheme();
  
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
      icon: 'time-outline',
      title: 'Current',
      description: 'In Progress + Completed within 24h',
      count: stats.current,
      iconBgColor: theme.colors.primaryContainer,
      iconColor: theme.colors.primary,
      countColor: theme.colors.primary,
      borderColor: theme.colors.primary
    },
    {
      key: 'future' as ViewKey,
      icon: 'list-outline',
      title: 'Future',
      description: 'Backlog Items',
      count: stats.future,
      iconBgColor: theme.colors.secondaryContainer,
      iconColor: theme.colors.secondary,
      countColor: theme.colors.secondary,
      borderColor: theme.colors.secondary
    },
    {
      key: 'archive' as ViewKey,
      icon: 'archive-outline',
      title: 'Archive',
      description: 'Archived + Cancelled',
      count: stats.archive,
      iconBgColor: theme.colors.tertiaryContainer,
      iconColor: theme.colors.tertiary,
      countColor: theme.colors.tertiary,
      borderColor: theme.colors.tertiary
    }
  ];

  return (
    <View style={styles.container}>
      {cards.map((card) => {
        const isActive = activeView === card.key;
        
        return (
          <Card
            key={card.key}
            style={[
              styles.card,
              isActive && { borderColor: card.borderColor, borderWidth: 2 }
            ]}
            mode={isActive ? 'elevated' : 'outlined'}
            onPress={() => onViewChange(card.key)}
          >
            <Card.Content style={styles.cardContent}>
              <View style={styles.cardHeader}>
                <View style={[styles.iconContainer, { backgroundColor: card.iconBgColor }]}>
                  <Ionicons
                    name={card.icon}
                    size={20}
                    color={card.iconColor}
                  />
                </View>
                <View style={styles.textContainer}>
                  <Text variant="titleSmall" style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
                    {card.title}
                  </Text>
                  <Text variant="bodySmall" style={[styles.cardDescription, { color: theme.colors.onSurfaceVariant }]}>
                    {card.description}
                  </Text>
                </View>
              </View>
              <Text variant="headlineLarge" style={[styles.cardCount, { color: card.countColor }]}>
                {card.count}
              </Text>
            </Card.Content>
          </Card>
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
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  cardTitle: {
    marginBottom: 2,
  },
  cardDescription: {
    // Using Paper's typography variants
  },
  cardCount: {
    textAlign: 'left',
  },
});

