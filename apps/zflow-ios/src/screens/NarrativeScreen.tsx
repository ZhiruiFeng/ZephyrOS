import React, { useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Surface, Text, Button, useTheme } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useSeasons } from '../hooks/useSeasons';
import { useEpisodes } from '../hooks/useEpisodes';
import { useNarrativeTheme, ApiSeasonTheme } from '../hooks/useNarrativeTheme';
import { CreateSeasonModal } from '../components/narrative/CreateSeasonModal';
import { CreateEpisodeModal } from '../components/narrative/CreateEpisodeModal';
import type { CreateSeasonRequest, CreateEpisodeRequest, Season } from '../lib/api/narrative-api';

interface NarrativeScreenProps {
  onScroll?: (event: any) => void;
}

interface SeasonChipProps {
  season: Season;
  isSelected: boolean;
  onPress: () => void;
  theme: any;
}

function SeasonChip({ season, isSelected, onPress, theme }: SeasonChipProps) {
  const { theme: seasonTheme } = useNarrativeTheme(season.theme);

  return (
    <TouchableOpacity
      style={[
        styles.seasonChip,
        {
          backgroundColor: isSelected ? seasonTheme.colors.primary : theme.colors.surface,
          borderColor: seasonTheme.colors.primary,
        }
      ]}
      onPress={onPress}
    >
      <Text style={styles.seasonChipEmoji}>{seasonTheme.emoji}</Text>
      <Text
        style={[
          styles.seasonChipText,
          { color: isSelected ? '#fff' : theme.colors.onSurface }
        ]}
      >
        {season.title}
      </Text>
    </TouchableOpacity>
  );
}

export default function NarrativeScreen({ onScroll }: NarrativeScreenProps) {
  const theme = useTheme();
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);
  const [showCreateSeason, setShowCreateSeason] = useState(false);
  const [showCreateEpisode, setShowCreateEpisode] = useState(false);

  const {
    seasons,
    activeSeason,
    loading: seasonsLoading,
    error: seasonsError,
    createSeason,
    refetch: refetchSeasons,
  } = useSeasons();

  // Use active season or first season if no season is manually selected
  const currentSeason = useMemo(() => {
    if (selectedSeasonId) {
      return seasons.find(s => s.id === selectedSeasonId) || activeSeason;
    }
    return activeSeason || seasons[0] || null;
  }, [selectedSeasonId, seasons, activeSeason]);

  const {
    episodes,
    loading: episodesLoading,
    error: episodesError,
    createEpisode,
    refetch: refetchEpisodes,
  } = useEpisodes(currentSeason?.id);

  const { theme: currentTheme } = useNarrativeTheme(currentSeason?.theme || 'growth');

  const handleCreateSeason = async (data: CreateSeasonRequest) => {
    try {
      const newSeason = await createSeason(data);
      setSelectedSeasonId(newSeason.id);
      setShowCreateSeason(false);
    } catch (error) {
      console.error('Failed to create season:', error);
      throw error;
    }
  };

  const handleCreateEpisode = async (data: CreateEpisodeRequest) => {
    try {
      await createEpisode(data);
      setShowCreateEpisode(false);
    } catch (error) {
      console.error('Failed to create episode:', error);
      throw error;
    }
  };

  const handleSeasonSelect = (seasonId: string) => {
    setSelectedSeasonId(seasonId === selectedSeasonId ? null : seasonId);
  };

  const onRefresh = async () => {
    await Promise.all([refetchSeasons(), refetchEpisodes()]);
  };

  const loading = seasonsLoading || episodesLoading;
  const error = seasonsError || episodesError;

  // Loading state
  if (loading && seasons.length === 0) {
    return (
      <Surface style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <Ionicons name="book" size={48} color={theme.colors.primary} />
          <Text variant="headlineSmall" style={{ color: theme.colors.onSurface, marginTop: 16 }}>
            Loading your narrative...
          </Text>
        </View>
      </Surface>
    );
  }

  // Error state
  if (error) {
    return (
      <Surface style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={theme.colors.error} />
          <Text variant="headlineSmall" style={{ color: theme.colors.onSurface, marginTop: 16 }}>
            Something went wrong
          </Text>
          <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 8, textAlign: 'center' }}>
            {error}
          </Text>
          <Button mode="contained" onPress={onRefresh} style={{ marginTop: 16 }}>
            Try Again
          </Button>
        </View>
      </Surface>
    );
  }

  // Empty state - no seasons
  if (seasons.length === 0) {
    return (
      <Surface style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.emptyStateContainer}>
          <Ionicons name="book" size={72} color={theme.colors.onSurfaceVariant} />
          <Text variant="headlineMedium" style={{ color: theme.colors.onSurface, marginTop: 24 }}>
            Start Your Life Narrative
          </Text>
          <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 8, textAlign: 'center', lineHeight: 20 }}>
            Your life story begins with seasons - chapters that give meaning and structure to your experiences.
          </Text>
          <Button
            mode="contained"
            onPress={() => setShowCreateSeason(true)}
            style={{ marginTop: 24 }}
            icon="plus"
          >
            Create Your First Season
          </Button>
        </View>
      </Surface>
    );
  }

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

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={onRefresh} />
        }
      >
        <View style={styles.content}>
          {/* Current Season Cover */}
          {currentSeason && (
            <View style={[
              styles.seasonCover,
              { backgroundColor: currentTheme.colors.background, borderColor: currentTheme.colors.primary }
            ]}>
              <View style={styles.seasonCoverHeader}>
                <Text style={styles.seasonCoverEmoji}>{currentTheme.emoji}</Text>
                <View style={styles.seasonCoverText}>
                  <Text style={[styles.seasonCoverTitle, { color: currentTheme.colors.text }]}>
                    {currentSeason.title}
                  </Text>
                  <Text style={[styles.seasonCoverDescription, { color: currentTheme.colors.text }]}>
                    {currentTheme.description}
                  </Text>
                  {currentSeason.intention && (
                    <Text style={[styles.seasonCoverIntention, { color: currentTheme.colors.text }]}>
                      "{currentSeason.intention}"
                    </Text>
                  )}
                </View>
                <View style={styles.seasonCoverBadges}>
                  {currentSeason.status === 'active' && (
                    <View style={[styles.activeBadge, { backgroundColor: currentTheme.colors.primary }]}>
                      <Text style={styles.activeBadgeText}>Active</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          )}

          {/* Season Selector */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Seasons</Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => setShowCreateSeason(true)}
              >
                <Ionicons name="add" size={20} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.seasonsScroll}>
              {seasons.map((season) => (
                <SeasonChip
                  key={season.id}
                  season={season}
                  isSelected={currentSeason?.id === season.id}
                  onPress={() => handleSeasonSelect(season.id)}
                  theme={theme}
                />
              ))}
            </ScrollView>
          </View>

          {/* Episodes Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                Episodes {currentSeason && `(${currentSeason.title})`}
              </Text>
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: currentTheme.colors.primary }]}
                onPress={() => setShowCreateEpisode(true)}
                disabled={!currentSeason}
              >
                <Ionicons name="add" size={20} color="#fff" />
              </TouchableOpacity>
            </View>

            {episodes.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="document-text-outline" size={48} color={theme.colors.onSurfaceVariant} />
                <Text style={[styles.emptyText, { color: theme.colors.onSurface }]}>
                  {currentSeason ? 'No episodes yet' : 'Select a season first'}
                </Text>
                <Text style={[styles.emptySubtext, { color: theme.colors.onSurfaceVariant }]}>
                  {currentSeason
                    ? 'Add episodes to capture important moments in this season'
                    : 'Create or select a season to start adding episodes'
                  }
                </Text>
              </View>
            ) : (
              <View style={styles.episodesList}>
                {episodes.map((episode) => (
                  <View
                    key={episode.id}
                    style={[
                      styles.episodeCard,
                      { backgroundColor: currentTheme.colors.background, borderColor: currentTheme.colors.secondary }
                    ]}
                  >
                    <View style={styles.episodeHeader}>
                      <View style={styles.episodeTitleContainer}>
                        {episode.mood_emoji && (
                          <Text style={styles.episodeMood}>{episode.mood_emoji}</Text>
                        )}
                        <Text style={[styles.episodeTitle, { color: currentTheme.colors.text }]}>
                          {episode.title}
                        </Text>
                      </View>
                      <Text style={[styles.episodeDate, { color: currentTheme.colors.text }]}>
                        {episode.date_range_start === episode.date_range_end
                          ? episode.date_range_end
                          : `${episode.date_range_start} - ${episode.date_range_end}`
                        }
                      </Text>
                    </View>
                    {episode.reflection && (
                      <Text style={[styles.episodeDescription, { color: currentTheme.colors.text }]}>
                        {episode.reflection}
                      </Text>
                    )}
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
                <Ionicons name="layers" size={24} color={currentTheme.colors.primary} />
                <Text style={styles.statNumber}>{seasons.length}</Text>
                <Text style={styles.statLabel}>Seasons</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="document-text" size={24} color={currentTheme.colors.primary} />
                <Text style={styles.statNumber}>{episodes.length}</Text>
                <Text style={styles.statLabel}>Episodes</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="calendar" size={24} color={currentTheme.colors.primary} />
                <Text style={styles.statNumber}>{new Date().getFullYear()}</Text>
                <Text style={styles.statLabel}>Current Year</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Modals */}
      <CreateSeasonModal
        visible={showCreateSeason}
        onClose={() => setShowCreateSeason(false)}
        onSubmit={handleCreateSeason}
      />

      {currentSeason && (
        <CreateEpisodeModal
          visible={showCreateEpisode}
          onClose={() => setShowCreateEpisode(false)}
          onSubmit={handleCreateEpisode}
          seasonId={currentSeason.id}
          seasonTheme={currentSeason.theme}
        />
      )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  seasonCover: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  seasonCoverHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  seasonCoverEmoji: {
    fontSize: 40,
    marginRight: 16,
  },
  seasonCoverText: {
    flex: 1,
  },
  seasonCoverTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  seasonCoverDescription: {
    fontSize: 16,
    marginBottom: 8,
  },
  seasonCoverIntention: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  seasonCoverBadges: {
    alignItems: 'flex-end',
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
  seasonsScroll: {
    marginBottom: 8,
  },
  seasonChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 1,
  },
  seasonChipEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  seasonChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  episodesList: {
    gap: 12,
  },
  episodeCard: {
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
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
    flex: 1,
  },
  episodeDate: {
    fontSize: 12,
    opacity: 0.8,
  },
  episodeDescription: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.9,
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
    marginTop: 12,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  activeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  activeBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#fff',
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

