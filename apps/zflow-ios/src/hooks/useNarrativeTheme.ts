import { useMemo } from 'react';

// API Season Theme Types (from the API)
type ApiSeasonTheme = 'growth' | 'exploration' | 'focus' | 'balance' | 'transformation' | 'adventure' | 'learning' | 'creation' | 'connection' | 'renewal';

// UI Season Theme Types (for theming)
type UISeasonTheme = 'spring' | 'summer' | 'autumn' | 'winter';

// Map API themes to UI themes
function mapApiThemeToUI(apiTheme: ApiSeasonTheme): UISeasonTheme {
  switch (apiTheme) {
    case 'growth':
    case 'creation':
    case 'renewal':
      return 'spring';
    case 'exploration':
    case 'adventure':
      return 'summer';
    case 'transformation':
    case 'balance':
    case 'connection':
      return 'autumn';
    case 'focus':
    case 'learning':
      return 'winter';
    default:
      return 'spring';
  }
}

// Map UI themes to API themes (for creation)
function mapUIThemeToApi(uiTheme: UISeasonTheme): ApiSeasonTheme {
  switch (uiTheme) {
    case 'spring':
      return 'growth';
    case 'summer':
      return 'exploration';
    case 'autumn':
      return 'transformation';
    case 'winter':
      return 'focus';
    default:
      return 'growth';
  }
}

interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  text: string;
  background: string;
}

interface SeasonThemeConfig {
  name: string;
  colors: ThemeColors;
  emoji: string;
  description: string;
}

export function useNarrativeTheme(theme: ApiSeasonTheme | UISeasonTheme) {
  // Convert API theme to UI theme if needed
  const uiTheme: UISeasonTheme = typeof theme === 'string' && ['spring', 'summer', 'autumn', 'winter'].includes(theme)
    ? theme as UISeasonTheme
    : mapApiThemeToUI(theme as ApiSeasonTheme);
  const themeConfig = useMemo((): SeasonThemeConfig => {
    switch (uiTheme) {
      case 'spring':
        return {
          name: 'Spring',
          colors: {
            primary: '#22c55e',
            secondary: '#86efac',
            accent: '#16a34a',
            text: '#14532d',
            background: '#f0fdf4'
          },
          emoji: '🌱',
          description: 'Growth, renewal, and new beginnings'
        };
      case 'summer':
        return {
          name: 'Summer',
          colors: {
            primary: '#f59e0b',
            secondary: '#fbbf24',
            accent: '#d97706',
            text: '#92400e',
            background: '#fffbeb'
          },
          emoji: '☀️',
          description: 'Energy, vitality, and peak activity'
        };
      case 'autumn':
        return {
          name: 'Autumn',
          colors: {
            primary: '#ea580c',
            secondary: '#fb923c',
            accent: '#c2410c',
            text: '#9a3412',
            background: '#fff7ed'
          },
          emoji: '🍂',
          description: 'Reflection, harvest, and transformation'
        };
      case 'winter':
        return {
          name: 'Winter',
          colors: {
            primary: '#64748b',
            secondary: '#94a3b8',
            accent: '#475569',
            text: '#1e293b',
            background: '#f8fafc'
          },
          emoji: '❄️',
          description: 'Rest, contemplation, and inner work'
        };
      default:
        return {
          name: 'Spring',
          colors: {
            primary: '#22c55e',
            secondary: '#86efac',
            accent: '#16a34a',
            text: '#14532d',
            background: '#f0fdf4'
          },
          emoji: '🌱',
          description: 'Growth, renewal, and new beginnings'
        };
    }
  }, [uiTheme]);

  return {
    theme: themeConfig,
    colorClasses: themeConfig.colors,
  };
}

export const SEASON_THEMES: UISeasonTheme[] = ['spring', 'summer', 'autumn', 'winter'];

// Export mapping functions
export { mapApiThemeToUI, mapUIThemeToApi };
export type { ApiSeasonTheme, UISeasonTheme };

export const MOOD_SUGGESTIONS = [
  // Positive
  { emoji: '😊', label: 'Happy', category: 'positive' },
  { emoji: '🥳', label: 'Celebratory', category: 'positive' },
  { emoji: '😍', label: 'Loving', category: 'positive' },
  { emoji: '🤗', label: 'Grateful', category: 'positive' },
  { emoji: '🌟', label: 'Inspired', category: 'positive' },

  // Energetic
  { emoji: '🚀', label: 'Motivated', category: 'energetic' },
  { emoji: '💪', label: 'Strong', category: 'energetic' },
  { emoji: '🔥', label: 'Passionate', category: 'energetic' },
  { emoji: '⚡', label: 'Energized', category: 'energetic' },

  // Calm
  { emoji: '😌', label: 'Peaceful', category: 'calm' },
  { emoji: '🧘', label: 'Centered', category: 'calm' },
  { emoji: '🌸', label: 'Gentle', category: 'calm' },
  { emoji: '💙', label: 'Serene', category: 'calm' },

  // Neutral
  { emoji: '😐', label: 'Neutral', category: 'neutral' },
  { emoji: '🤔', label: 'Thoughtful', category: 'neutral' },
  { emoji: '📚', label: 'Focused', category: 'neutral' },

  // Negative
  { emoji: '😔', label: 'Sad', category: 'negative' },
  { emoji: '😟', label: 'Worried', category: 'negative' },
  { emoji: '😤', label: 'Frustrated', category: 'negative' },
  { emoji: '😴', label: 'Tired', category: 'negative' }
] as const;