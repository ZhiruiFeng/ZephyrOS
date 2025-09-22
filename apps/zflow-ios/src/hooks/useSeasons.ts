import { useState, useEffect, useCallback } from 'react';
import { narrativeApiClient } from '../lib/api/narrative-api';
import type {
  Season,
  CreateSeasonRequest,
  UpdateSeasonRequest,
} from '../lib/api/narrative-api';

interface UseSeasonsReturn {
  seasons: Season[];
  activeSeason: Season | null;
  loading: boolean;
  error: string | null;
  createSeason: (data: CreateSeasonRequest) => Promise<Season>;
  updateSeason: (id: string, data: UpdateSeasonRequest) => Promise<Season>;
  deleteSeason: (id: string) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useSeasons(): UseSeasonsReturn {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [activeSeason, setActiveSeason] = useState<Season | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSeasons = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [seasonsResponse, currentSeason] = await Promise.all([
        narrativeApiClient.seasons.list(),
        narrativeApiClient.seasons.getCurrent(),
      ]);

      setSeasons(seasonsResponse.seasons);
      setActiveSeason(currentSeason);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch seasons';
      setError(errorMessage);
      console.error('Error fetching seasons:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createSeason = useCallback(async (data: CreateSeasonRequest): Promise<Season> => {
    try {
      setError(null);
      const newSeason = await narrativeApiClient.seasons.create(data);

      // Update local state
      setSeasons(prev => [newSeason, ...prev]);

      // If this is the first season or it's active, update active season
      if (newSeason.status === 'active' || seasons.length === 0) {
        setActiveSeason(newSeason);
      }

      return newSeason;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create season';
      setError(errorMessage);
      throw err;
    }
  }, [seasons.length]);

  const updateSeason = useCallback(async (id: string, data: UpdateSeasonRequest): Promise<Season> => {
    try {
      setError(null);
      const updatedSeason = await narrativeApiClient.seasons.update(id, data);

      // Update local state
      setSeasons(prev => prev.map(season =>
        season.id === id ? updatedSeason : season
      ));

      // Update active season if needed
      if (activeSeason?.id === id) {
        setActiveSeason(updatedSeason);
      }

      return updatedSeason;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update season';
      setError(errorMessage);
      throw err;
    }
  }, [activeSeason]);

  const deleteSeason = useCallback(async (id: string): Promise<void> => {
    try {
      setError(null);
      await narrativeApiClient.seasons.delete(id);

      // Update local state
      setSeasons(prev => prev.filter(season => season.id !== id));

      // Update active season if needed
      if (activeSeason?.id === id) {
        setActiveSeason(null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete season';
      setError(errorMessage);
      throw err;
    }
  }, [activeSeason]);

  const refetch = useCallback(async () => {
    await fetchSeasons();
  }, [fetchSeasons]);

  useEffect(() => {
    fetchSeasons();
  }, [fetchSeasons]);

  return {
    seasons,
    activeSeason,
    loading,
    error,
    createSeason,
    updateSeason,
    deleteSeason,
    refetch,
  };
}