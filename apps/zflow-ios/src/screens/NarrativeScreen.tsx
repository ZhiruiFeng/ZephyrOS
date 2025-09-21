import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Surface, Text, Button, useTheme } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';

export default function NarrativeScreen() {
  const theme = useTheme();
  const [selectedSeason, setSelectedSeason] = useState<string | null>(null);

  // Mock data for seasons and episodes
  const seasons = [
    {
      id: '1',
      title: 'Spring 2024',
      description: 'New beginnings and growth',
      color: '#10B981',
      episodeCount: 12,
      isActive: true,
    },
    {
      id: '2',
      title: 'Summer 2024',
      description: 'Adventure and exploration',
      color: '#F59E0B',
      episodeCount: 8,
      isActive: false,
    },
    {
      id: '3',
      title: 'Fall 2024',
      description: 'Reflection and harvest',
      color: '#EF4444',
      episodeCount: 15,
      isActive: false,
    },
  ];

  const episodes = [
    {
      id: '1',
      title: 'Starting a New Project',
      description: 'Began working on the ZFlow iOS app',
      date: '2024-03-15',
      mood: 'excited',
      seasonId: '1',
    },
    {
      id: '2',
      title: 'Team Meeting',
      description: 'Discussed project roadmap and timeline',
      date: '2024-03-16',
      mood: 'focused',
      seasonId: '1',
    },
    {
      id: '3',
      title: 'Code Review',
      description: 'Reviewed authentication implementation',
      date: '2024-03-17',
      mood: 'satisfied',
      seasonId: '1',
    },
  ];

  const handleCreateSeason = () => {
    Alert.alert(
      'Create New Season',
      'This feature will be implemented soon. You\'ll be able to create new life seasons to organize your narrative.',
      [{ text: 'OK' }]
    );
  };

  const handleCreateEpisode = () => {
    Alert.alert(
      'Create New Episode',
      'This feature will be implemented soon. You\'ll be able to add new episodes to capture important moments.',
      [{ text: 'OK' }]
    );
  };

  const handleSeasonSelect = (seasonId: string) => {
    setSelectedSeason(seasonId === selectedSeason ? null : seasonId);
  };

  const getMoodEmoji = (mood: string) => {
    switch (mood) {
      case 'excited': return '😊';
      case 'focused': return '🤔';
      case 'satisfied': return '😌';
      case 'happy': return '😄';
      case 'grateful': return '🙏';
      default: return '😐';
    }
  };

  const filteredEpisodes = selectedSeason 
    ? episodes.filter(episode => episode.seasonId === selectedSeason)
    : episodes;

  return (
    <Surface style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Surface style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.outline }]}>
        <Text variant="headlineLarge" style={{ color: theme.colors.onSurface, marginBottom: 4 }}>
          Narrative
        </Text>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          Your personal story and insights
        </Text>
      </Surface>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Welcome Card */}
          <View style={styles.welcomeCard}>
            <View style={styles.welcomeHeader}>
              <Ionicons name="book" size={32} color="#0284c7" />
              <Text style={styles.welcomeTitle}>Life as a Story</Text>
            </View>
            <Text style={styles.welcomeDescription}>
              Organize your life into seasons and episodes. Capture important moments, 
              track your mood, and reflect on your journey.
            </Text>
          </View>

          {/* Seasons Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Seasons</Text>
              <TouchableOpacity 
                style={styles.addButton}
                onPress={handleCreateSeason}
              >
                <Ionicons name="add" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.seasonsList}>
              {seasons.map((season) => (
                <TouchableOpacity
                  key={season.id}
                  style={[
                    styles.seasonCard,
                    selectedSeason === season.id && styles.seasonCardSelected,
                    { borderLeftColor: season.color }
                  ]}
                  onPress={() => handleSeasonSelect(season.id)}
                >
                  <View style={styles.seasonHeader}>
                    <View style={styles.seasonInfo}>
                      <Text style={styles.seasonTitle}>{season.title}</Text>
                      <Text style={styles.seasonDescription}>{season.description}</Text>
                    </View>
                    <View style={styles.seasonBadges}>
                      {season.isActive && (
                        <View style={styles.activeBadge}>
                          <Text style={styles.activeBadgeText}>Active</Text>
                        </View>
                      )}
                      <View style={styles.episodeCountBadge}>
                        <Text style={styles.episodeCountText}>{season.episodeCount} episodes</Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Episodes Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                Episodes {selectedSeason && `(${seasons.find(s => s.id === selectedSeason)?.title})`}
              </Text>
              <TouchableOpacity 
                style={styles.addButton}
                onPress={handleCreateEpisode}
              >
                <Ionicons name="add" size={20} color="#fff" />
              </TouchableOpacity>
            </View>

            {filteredEpisodes.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="document-text-outline" size={48} color="#d1d5db" />
                <Text style={styles.emptyText}>No episodes yet</Text>
                <Text style={styles.emptySubtext}>
                  {selectedSeason 
                    ? 'Add episodes to this season to capture important moments'
                    : 'Select a season or create episodes to start building your narrative'
                  }
                </Text>
              </View>
            ) : (
              <View style={styles.episodesList}>
                {filteredEpisodes.map((episode) => (
                  <View key={episode.id} style={styles.episodeCard}>
                    <View style={styles.episodeHeader}>
                      <View style={styles.episodeTitleContainer}>
                        <Text style={styles.episodeMood}>{getMoodEmoji(episode.mood)}</Text>
                        <Text style={styles.episodeTitle}>{episode.title}</Text>
                      </View>
                      <Text style={styles.episodeDate}>{episode.date}</Text>
                    </View>
                    <Text style={styles.episodeDescription}>{episode.description}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Quick Stats */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Stats</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Ionicons name="layers" size={24} color="#0284c7" />
                <Text style={styles.statNumber}>{seasons.length}</Text>
                <Text style={styles.statLabel}>Seasons</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="document-text" size={24} color="#0284c7" />
                <Text style={styles.statNumber}>{episodes.length}</Text>
                <Text style={styles.statLabel}>Episodes</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="calendar" size={24} color="#0284c7" />
                <Text style={styles.statNumber}>2024</Text>
                <Text style={styles.statLabel}>Current Year</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
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
  welcomeCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  welcomeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
    marginLeft: 12,
  },
  welcomeDescription: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  addButton: {
    backgroundColor: '#0284c7',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  seasonsList: {
    gap: 12,
  },
  seasonCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
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
  seasonCardSelected: {
    borderColor: '#0284c7',
    backgroundColor: '#f0f9ff',
  },
  seasonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  seasonInfo: {
    flex: 1,
  },
  seasonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  seasonDescription: {
    fontSize: 14,
    color: '#64748b',
  },
  seasonBadges: {
    alignItems: 'flex-end',
    gap: 8,
  },
  activeBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  activeBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#fff',
  },
  episodeCountBadge: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  episodeCountText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
  },
  episodesList: {
    gap: 12,
  },
  episodeCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
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
  episodeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  episodeTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  episodeMood: {
    fontSize: 20,
    marginRight: 12,
  },
  episodeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
  },
  episodeDate: {
    fontSize: 12,
    color: '#94a3b8',
  },
  episodeDescription: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 12,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
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
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
});

