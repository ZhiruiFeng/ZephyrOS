import React, { useState, useMemo } from 'react';
import { View, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
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
      className={`flex-row items-center px-3 py-2 rounded-full mr-3 border ${
        isSelected ? 'bg-primary-600' : 'bg-white'
      }`}
      style={{
        borderColor: seasonTheme.colors.primary,
        backgroundColor: isSelected ? seasonTheme.colors.primary : theme.colors.surface,
      }}
      onPress={onPress}
    >
      <Text className="text-base mr-1.5">{seasonTheme.emoji}</Text>
      <Text
        className={`text-sm font-medium ${
          isSelected ? 'text-white' : 'text-gray-900'
        }`}
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
      <Surface className="flex-1">
        <View className="flex-1 justify-center items-center p-10">
          <Ionicons name="book" size={48} color={theme.colors.primary} />
          <Text variant="headlineSmall" className="text-gray-900 mt-4">
            Loading your narrative...
          </Text>
        </View>
      </Surface>
    );
  }

  // Error state
  if (error) {
    return (
      <Surface className="flex-1">
        <View className="flex-1 justify-center items-center p-10">
          <Ionicons name="alert-circle" size={48} color={theme.colors.error} />
          <Text variant="headlineSmall" className="text-gray-900 mt-4">
            Something went wrong
          </Text>
          <Text className="text-gray-600 mt-2 text-center leading-5">
            {error}
          </Text>
          <Button mode="contained" onPress={onRefresh} className="mt-4">
            Try Again
          </Button>
        </View>
      </Surface>
    );
  }

  // Empty state - no seasons
  if (seasons.length === 0) {
    return (
      <Surface className="flex-1">
        <View className="flex-1 justify-center items-center p-10">
          <Ionicons name="book" size={72} color={theme.colors.onSurfaceVariant} />
          <Text variant="headlineMedium" className="text-gray-900 mt-6">
            Start Your Life Narrative
          </Text>
          <Text className="text-gray-600 mt-2 text-center leading-5">
            Your life story begins with seasons - chapters that give meaning and structure to your experiences.
          </Text>
          <Button
            mode="contained"
            onPress={() => setShowCreateSeason(true)}
            className="mt-6"
            icon="plus"
          >
            Create Your First Season
          </Button>
        </View>
      </Surface>
    );
  }

  return (
    <Surface className="flex-1 bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <Surface className="p-5 border-b border-gray-200 shadow-sm bg-white/80">
        <Text variant="headlineLarge" className="text-gray-900 mb-1">
          Narrative
        </Text>
        <Text variant="bodyMedium" className="text-gray-600">
          Your personal story and insights
        </Text>
      </Surface>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={onRefresh} />
        }
      >
        <View className="p-4">
          {/* Current Season Cover */}
          {currentSeason && (
            <View className="rounded-2xl p-5 mb-6 border-2 shadow-lg bg-white/90 backdrop-blur-sm"
              style={{
                backgroundColor: currentTheme.colors.background,
                borderColor: currentTheme.colors.primary,
              }}>
              <View className="flex-row items-start">
                <Text className="text-4xl mr-4">{currentTheme.emoji}</Text>
                <View className="flex-1">
                  <Text className="text-2xl font-bold mb-1" style={{ color: currentTheme.colors.text }}>
                    {currentSeason.title}
                  </Text>
                  <Text className="text-base mb-2" style={{ color: currentTheme.colors.text }}>
                    {currentTheme.description}
                  </Text>
                  {currentSeason.intention && (
                    <Text className="text-sm italic" style={{ color: currentTheme.colors.text }}>
                      "{currentSeason.intention}"
                    </Text>
                  )}
                </View>
                <View className="items-end">
                  {currentSeason.status === 'active' && (
                    <View className="px-2 py-1 rounded-md" style={{ backgroundColor: currentTheme.colors.primary }}>
                      <Text className="text-xs font-medium text-white">Active</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          )}

          {/* Season Selector */}
          <View className="mb-6">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-lg font-semibold text-gray-900">Seasons</Text>
              <TouchableOpacity
                className="bg-primary-600 w-8 h-8 rounded-full justify-center items-center"
                onPress={() => setShowCreateSeason(true)}
              >
                <Ionicons name="add" size={20} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
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
          <View className="mb-6">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-lg font-semibold text-gray-900">
                Episodes {currentSeason && `(${currentSeason.title})`}
              </Text>
              <TouchableOpacity
                className="w-8 h-8 rounded-full justify-center items-center"
                style={{ backgroundColor: currentTheme.colors.primary }}
                onPress={() => setShowCreateEpisode(true)}
                disabled={!currentSeason}
              >
                <Ionicons name="add" size={20} color="#fff" />
              </TouchableOpacity>
            </View>

            {episodes.length === 0 ? (
              <View className="items-center p-10 bg-white rounded-xl border border-gray-200">
                <Ionicons name="document-text-outline" size={48} color={theme.colors.onSurfaceVariant} />
                <Text className="text-base font-semibold mt-3 mb-2 text-gray-900">
                  {currentSeason ? 'No episodes yet' : 'Select a season first'}
                </Text>
                <Text className="text-sm text-center leading-5 text-gray-600">
                  {currentSeason
                    ? 'Add episodes to capture important moments in this season'
                    : 'Create or select a season to start adding episodes'
                  }
                </Text>
              </View>
            ) : (
              <View className="space-y-3">
                {episodes.map((episode) => (
                  <View
                    key={episode.id}
                    className="rounded-xl p-4 shadow-sm border bg-white/90 backdrop-blur-sm"
                    style={{
                      backgroundColor: currentTheme.colors.background,
                      borderColor: currentTheme.colors.secondary
                    }}
                  >
                    <View className="flex-row justify-between items-start mb-2">
                      <View className="flex-row items-center flex-1">
                        {episode.mood_emoji && (
                          <Text className="text-xl mr-3">{episode.mood_emoji}</Text>
                        )}
                        <Text className="text-base font-semibold flex-1" style={{ color: currentTheme.colors.text }}>
                          {episode.title}
                        </Text>
                      </View>
                      <Text className="text-xs opacity-80" style={{ color: currentTheme.colors.text }}>
                        {episode.date_range_start === episode.date_range_end
                          ? episode.date_range_end
                          : `${episode.date_range_start} - ${episode.date_range_end}`
                        }
                      </Text>
                    </View>
                    {episode.reflection && (
                      <Text className="text-sm leading-5 opacity-90" style={{ color: currentTheme.colors.text }}>
                        {episode.reflection}
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Quick Stats */}
          <View className="mb-6">
            <Text className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</Text>
            <View className="flex-row space-x-3">
              <View className="flex-1 bg-white rounded-xl p-4 items-center shadow-sm border border-gray-200">
                <Ionicons name="layers" size={24} color={currentTheme.colors.primary} />
                <Text className="text-2xl font-bold text-gray-900 mt-2 mb-1">{seasons.length}</Text>
                <Text className="text-xs text-gray-600 text-center">Seasons</Text>
              </View>
              <View className="flex-1 bg-white rounded-xl p-4 items-center shadow-sm border border-gray-200">
                <Ionicons name="document-text" size={24} color={currentTheme.colors.primary} />
                <Text className="text-2xl font-bold text-gray-900 mt-2 mb-1">{episodes.length}</Text>
                <Text className="text-xs text-gray-600 text-center">Episodes</Text>
              </View>
              <View className="flex-1 bg-white rounded-xl p-4 items-center shadow-sm border border-gray-200">
                <Ionicons name="calendar" size={24} color={currentTheme.colors.primary} />
                <Text className="text-2xl font-bold text-gray-900 mt-2 mb-1">{new Date().getFullYear()}</Text>
                <Text className="text-xs text-gray-600 text-center">Current Year</Text>
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


