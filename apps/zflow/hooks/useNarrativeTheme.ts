import { useMemo } from 'react'
import type { SeasonTheme, SeasonThemeConfig } from '../types/narrative'
import { SEASON_THEMES } from '../types/narrative'

// =====================================================
// Hook for managing narrative theming
// =====================================================
export function useNarrativeTheme(theme?: SeasonTheme) {
  const themeConfig = useMemo(() => {
    if (!theme) return SEASON_THEMES.spring // Default to spring
    return SEASON_THEMES[theme]
  }, [theme])

  const cssVariables = useMemo(() => ({
    '--season-primary': themeConfig.colors.primary,
    '--season-secondary': themeConfig.colors.secondary,
    '--season-accent': themeConfig.colors.accent,
    '--season-text': themeConfig.colors.text,
    '--season-background': themeConfig.colors.background,
  }), [themeConfig])

  const gradientClasses = useMemo(() => ({
    background: `bg-gradient-to-br ${themeConfig.gradient}`,
    card: `bg-gradient-to-r ${themeConfig.gradient}`,
    subtle: `bg-gradient-to-b ${themeConfig.gradient}`,
    overlay: `bg-gradient-to-t from-black/20 via-transparent to-transparent`
  }), [themeConfig])

  const colorClasses = useMemo(() => {
    const baseColorName = getColorNameFromHex(themeConfig.colors.primary)

    return {
      primary: `text-${baseColorName}-600 dark:text-${baseColorName}-400`,
      primaryBg: `bg-${baseColorName}-50 dark:bg-${baseColorName}-900/20`,
      accent: `text-${baseColorName}-700 dark:text-${baseColorName}-300`,
      accentBg: `bg-${baseColorName}-100 dark:bg-${baseColorName}-800/30`,
      border: `border-${baseColorName}-200 dark:border-${baseColorName}-700`,
      hover: `hover:bg-${baseColorName}-50 dark:hover:bg-${baseColorName}-900/10`
    }
  }, [themeConfig])

  return {
    theme: themeConfig,
    cssVariables,
    gradientClasses,
    colorClasses,
    applyTheme: (element: HTMLElement) => {
      Object.entries(cssVariables).forEach(([key, value]) => {
        element.style.setProperty(key, value)
      })
    }
  }
}

// =====================================================
// Hook for season transitions and animations
// =====================================================
export function useSeasonTransition(currentTheme?: SeasonTheme, previousTheme?: SeasonTheme) {
  const currentConfig = useNarrativeTheme(currentTheme)
  const previousConfig = useNarrativeTheme(previousTheme)

  const transitionConfig = useMemo(() => {
    if (!previousTheme || currentTheme === previousTheme) {
      return {
        hasTransition: false,
        direction: 'none' as const,
        duration: 0
      }
    }

    const themeOrder: SeasonTheme[] = ['spring', 'summer', 'autumn', 'winter']
    const currentIndex = themeOrder.indexOf(currentTheme!)
    const previousIndex = themeOrder.indexOf(previousTheme)

    const isForward = (currentIndex > previousIndex) ||
      (previousIndex === 3 && currentIndex === 0) // winter to spring

    return {
      hasTransition: true,
      direction: isForward ? 'forward' : 'backward',
      duration: 800
    }
  }, [currentTheme, previousTheme])

  const transitionClasses = useMemo(() => ({
    enter: 'transition-all duration-800 ease-in-out',
    enterFrom: transitionConfig.direction === 'forward'
      ? 'transform translate-x-full opacity-0'
      : 'transform -translate-x-full opacity-0',
    enterTo: 'transform translate-x-0 opacity-100',
    leave: 'transition-all duration-800 ease-in-out',
    leaveFrom: 'transform translate-x-0 opacity-100',
    leaveTo: transitionConfig.direction === 'forward'
      ? 'transform -translate-x-full opacity-0'
      : 'transform translate-x-full opacity-0'
  }), [transitionConfig])

  return {
    currentConfig,
    previousConfig,
    transitionConfig,
    transitionClasses
  }
}

// =====================================================
// Hook for theme-based mood suggestions
// =====================================================
export function useThemeMoodSuggestions(theme?: SeasonTheme) {
  const suggestions = useMemo(() => {
    const baseSuggestions = {
      spring: [
        { emoji: '🌱', label: 'Growing', category: 'positive' as const },
        { emoji: '🌸', label: 'Blooming', category: 'positive' as const },
        { emoji: '🌈', label: 'Hopeful', category: 'positive' as const },
        { emoji: '🐛', label: 'Transforming', category: 'neutral' as const },
        { emoji: '☔', label: 'Reflective', category: 'calm' as const }
      ],
      summer: [
        { emoji: '☀️', label: 'Energetic', category: 'energetic' as const },
        { emoji: '🌊', label: 'Free', category: 'positive' as const },
        { emoji: '🍉', label: 'Satisfied', category: 'positive' as const },
        { emoji: '🏖️', label: 'Relaxed', category: 'calm' as const },
        { emoji: '🔥', label: 'Passionate', category: 'energetic' as const }
      ],
      autumn: [
        { emoji: '🍂', label: 'Reflective', category: 'calm' as const },
        { emoji: '🍁', label: 'Changing', category: 'neutral' as const },
        { emoji: '🎃', label: 'Festive', category: 'positive' as const },
        { emoji: '🌰', label: 'Grounded', category: 'calm' as const },
        { emoji: '🌙', label: 'Contemplative', category: 'calm' as const }
      ],
      winter: [
        { emoji: '❄️', label: 'Peaceful', category: 'calm' as const },
        { emoji: '🕯️', label: 'Introspective', category: 'calm' as const },
        { emoji: '☃️', label: 'Playful', category: 'positive' as const },
        { emoji: '🧘', label: 'Centered', category: 'calm' as const },
        { emoji: '📚', label: 'Focused', category: 'neutral' as const }
      ]
    }

    return theme ? baseSuggestions[theme] : baseSuggestions.spring
  }, [theme])

  return suggestions
}

// =====================================================
// Utility functions
// =====================================================

function getColorNameFromHex(hex: string): string {
  // Simple mapping for common colors used in themes
  const colorMap: Record<string, string> = {
    '#22c55e': 'green',
    '#f59e0b': 'amber',
    '#ea580c': 'orange',
    '#64748b': 'slate'
  }

  return colorMap[hex] || 'blue' // fallback
}

// =====================================================
// Hook for adaptive theme based on time of year
// =====================================================
export function useAdaptiveTheme(): SeasonTheme {
  const currentDate = new Date()
  const month = currentDate.getMonth() // 0-11

  if (month >= 2 && month <= 4) return 'spring' // March-May
  if (month >= 5 && month <= 7) return 'summer' // June-August
  if (month >= 8 && month <= 10) return 'autumn' // September-November
  return 'winter' // December-February
}

// =====================================================
// Hook for theme-based content suggestions
// =====================================================
export function useThemeContentSuggestions(theme?: SeasonTheme) {
  const suggestions = useMemo(() => {
    const contentSuggestions = {
      spring: {
        episodeTitles: [
          'New Beginnings',
          'Fresh Start',
          'Growing Pains',
          'Budding Ideas',
          'Spring Cleaning'
        ],
        reflectionPrompts: [
          'What am I ready to let grow in my life?',
          'What old patterns am I ready to shed?',
          'How am I nurturing my goals?',
          'What seeds am I planting for the future?'
        ],
        intentions: [
          'Embrace change and growth',
          'Cultivate new habits',
          'Open to fresh perspectives',
          'Plant seeds for future success'
        ]
      },
      summer: {
        episodeTitles: [
          'Peak Performance',
          'Summer Vibes',
          'Energy Boost',
          'Sunshine Days',
          'Adventure Time'
        ],
        reflectionPrompts: [
          'How am I using my peak energy?',
          'What brings me joy and vitality?',
          'How am I balancing work and play?',
          'What adventures am I embracing?'
        ],
        intentions: [
          'Live with full energy',
          'Embrace joy and playfulness',
          'Take bold actions',
          'Connect with others deeply'
        ]
      },
      autumn: {
        episodeTitles: [
          'Harvest Time',
          'Letting Go',
          'Cozy Reflections',
          'Changing Colors',
          'Grateful Heart'
        ],
        reflectionPrompts: [
          'What am I harvesting from my efforts?',
          'What am I ready to release?',
          'How has this season changed me?',
          'What am I most grateful for?'
        ],
        intentions: [
          'Practice gratitude daily',
          'Release what no longer serves',
          'Celebrate achievements',
          'Prepare for rest and renewal'
        ]
      },
      winter: {
        episodeTitles: [
          'Inner Journey',
          'Quiet Contemplation',
          'Cozy Moments',
          'Deep Reflection',
          'Finding Peace'
        ],
        reflectionPrompts: [
          'What wisdom have I gained this year?',
          'How am I caring for my inner self?',
          'What brings me peace and comfort?',
          'What am I dreaming of for the future?'
        ],
        intentions: [
          'Embrace stillness and reflection',
          'Practice self-care deeply',
          'Connect with inner wisdom',
          'Dream and plan for renewal'
        ]
      }
    }

    return theme ? contentSuggestions[theme] : contentSuggestions.spring
  }, [theme])

  return suggestions
}