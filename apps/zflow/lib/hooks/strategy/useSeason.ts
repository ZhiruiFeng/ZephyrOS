import { adaptSeasonToStrategy } from '../../adapters/strategy'
import type { UseStrategySeasonReturn } from '../../types/strategy'
import type { Season } from '../../../../zmemory/types/narrative'

export function useSeason(): UseStrategySeasonReturn {
  // For now, create a mock current season since the API endpoint doesn't exist yet
  const mockSeason: Season = {
    id: 'current-season-2024',
    user_id: 'mock-user-123',
    title: 'Focus & Growth Season',
    theme: 'spring',
    intention: 'Focus on productivity improvements and strategic thinking workflows',
    start_date: '2024-09-01',
    end_date: '2024-12-31',
    status: 'active',
    created_at: '2024-09-01T00:00:00Z',
    updated_at: '2024-09-19T00:00:00Z',
    metadata: {
      strategicTheme: 'Operational Excellence',
      keyMetrics: ['Task completion rate', 'Focus sessions completed', 'Strategic insights captured'],
      quarterlyGoals: ['Improve workflow efficiency', 'Implement strategic planning system', 'Build habit tracking']
    }
  }

  // Use mock data for now, but keep the same interface for when API is ready
  const season = adaptSeasonToStrategy(mockSeason)

  return {
    season,
    loading: false,
    error: null,
    refetch: () => Promise.resolve()
  }
}

export function useSeasons() {
  // Mock seasons data for now since API endpoint doesn't exist yet
  const mockSeasons: Season[] = [
    {
      id: 'current-season-2024',
      user_id: 'mock-user-123',
      title: 'Focus & Growth Season',
      theme: 'spring',
      intention: 'Focus on productivity improvements and strategic thinking workflows',
      start_date: '2024-09-01',
      end_date: '2024-12-31',
      status: 'active',
      created_at: '2024-09-01T00:00:00Z',
      updated_at: '2024-09-19T00:00:00Z',
      metadata: {
        strategicTheme: 'Operational Excellence',
        keyMetrics: ['Task completion rate', 'Focus sessions completed', 'Strategic insights captured'],
        quarterlyGoals: ['Improve workflow efficiency', 'Implement strategic planning system', 'Build habit tracking']
      }
    },
    {
      id: 'previous-season-2024',
      user_id: 'mock-user-123',
      title: 'Foundation Season',
      theme: 'winter',
      intention: 'Build core systems and establish workflows',
      start_date: '2024-05-01',
      end_date: '2024-08-31',
      status: 'completed',
      created_at: '2024-05-01T00:00:00Z',
      updated_at: '2024-08-31T00:00:00Z',
      metadata: {
        strategicTheme: 'System Building',
        keyMetrics: ['Systems implemented', 'Processes documented'],
        quarterlyGoals: ['Set up productivity stack', 'Define workflows']
      }
    }
  ]

  const seasons = mockSeasons.map(adaptSeasonToStrategy)

  return {
    seasons,
    loading: false,
    error: null,
    refetch: () => Promise.resolve()
  }
}
