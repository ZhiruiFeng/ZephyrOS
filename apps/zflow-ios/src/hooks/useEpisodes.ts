import { useState, useEffect, useCallback } from 'react';
import { narrativeApiClient } from '../lib/api/narrative-api';
import type {
  Episode,
  CreateEpisodeRequest,
  UpdateEpisodeRequest,
} from '../lib/api/narrative-api';

interface UseEpisodesReturn {
  episodes: Episode[];
  loading: boolean;
  error: string | null;
  createEpisode: (data: CreateEpisodeRequest) => Promise<Episode>;
  updateEpisode: (id: string, data: UpdateEpisodeRequest) => Promise<Episode>;
  deleteEpisode: (id: string) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useEpisodes(seasonId?: string, options?: {
  limit?: number;
  dateFrom?: string;
  dateTo?: string;
}): UseEpisodesReturn {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEpisodes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await narrativeApiClient.episodes.list({
        season_id: seasonId,
        limit: options?.limit,
        date_from: options?.dateFrom,
        date_to: options?.dateTo,
      });

      setEpisodes(response.episodes);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch episodes';
      setError(errorMessage);
      console.error('Error fetching episodes:', err);
    } finally {
      setLoading(false);
    }
  }, [seasonId, options?.limit, options?.dateFrom, options?.dateTo]);

  const createEpisode = useCallback(async (data: CreateEpisodeRequest): Promise<Episode> => {
    try {
      setError(null);
      const newEpisode = await narrativeApiClient.episodes.create(data);

      // Add to local state if it matches current filters
      if (!seasonId || data.season_id === seasonId) {
        setEpisodes(prev => [newEpisode, ...prev]);
      }

      return newEpisode;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create episode';
      setError(errorMessage);
      throw err;
    }
  }, [seasonId]);

  const updateEpisode = useCallback(async (id: string, data: UpdateEpisodeRequest): Promise<Episode> => {
    try {
      setError(null);
      const updatedEpisode = await narrativeApiClient.episodes.update(id, data);

      // Update local state
      setEpisodes(prev => prev.map(episode =>
        episode.id === id ? updatedEpisode : episode
      ));

      return updatedEpisode;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update episode';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const deleteEpisode = useCallback(async (id: string): Promise<void> => {
    try {
      setError(null);
      await narrativeApiClient.episodes.delete(id);

      // Remove from local state
      setEpisodes(prev => prev.filter(episode => episode.id !== id));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete episode';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const refetch = useCallback(async () => {
    await fetchEpisodes();
  }, [fetchEpisodes]);

  useEffect(() => {
    fetchEpisodes();
  }, [fetchEpisodes]);

  return {
    episodes,
    loading,
    error,
    createEpisode,
    updateEpisode,
    deleteEpisode,
    refetch,
  };
}