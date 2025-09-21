import React from 'react';
import { Provider as PaperProvider, MD3LightTheme, MD3DarkTheme } from 'react-native-paper';
import { useColorScheme } from 'react-native';

// Custom theme based on zflow web app colors
const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#0284c7', // zflow primary blue
    primaryContainer: '#e0f2fe',
    secondary: '#64748b',
    secondaryContainer: '#f1f5f9',
    tertiary: '#10B981',
    tertiaryContainer: '#ecfdf5',
    surface: '#ffffff',
    surfaceVariant: '#f8fafc',
    background: '#f8fafc',
    error: '#EF4444',
    errorContainer: '#fef2f2',
    onPrimary: '#ffffff',
    onSecondary: '#ffffff',
    onTertiary: '#ffffff',
    onSurface: '#1e293b',
    onSurfaceVariant: '#64748b',
    onBackground: '#1e293b',
    onError: '#ffffff',
    outline: '#e2e8f0',
    outlineVariant: '#f1f5f9',
    shadow: '#000000',
    scrim: '#000000',
    inverseSurface: '#374151',
    inverseOnSurface: '#f9fafb',
    inversePrimary: '#7dd3fc',
    elevation: {
      level0: 'transparent',
      level1: '#ffffff',
      level2: '#ffffff',
      level3: '#ffffff',
      level4: '#ffffff',
      level5: '#ffffff',
    },
  },
  roundness: 12, // More rounded corners like web app
};

const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#38bdf8', // lighter blue for dark mode
    primaryContainer: '#0f172a',
    secondary: '#94a3b8',
    secondaryContainer: '#1e293b',
    tertiary: '#34d399',
    tertiaryContainer: '#064e3b',
    surface: '#1e293b',
    surfaceVariant: '#334155',
    background: '#0f172a',
    error: '#f87171',
    errorContainer: '#7f1d1d',
    onPrimary: '#0f172a',
    onSecondary: '#0f172a',
    onTertiary: '#0f172a',
    onSurface: '#f1f5f9',
    onSurfaceVariant: '#cbd5e1',
    onBackground: '#f1f5f9',
    onError: '#0f172a',
    outline: '#475569',
    outlineVariant: '#334155',
    shadow: '#000000',
    scrim: '#000000',
    inverseSurface: '#f1f5f9',
    inverseOnSurface: '#374151',
    inversePrimary: '#0284c7',
    elevation: {
      level0: 'transparent',
      level1: '#1e293b',
      level2: '#334155',
      level3: '#475569',
      level4: '#64748b',
      level5: '#94a3b8',
    },
  },
  roundness: 12,
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

export default function ThemeProvider({ children }: ThemeProviderProps) {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;

  return (
    <PaperProvider theme={theme}>
      {children}
    </PaperProvider>
  );
}

export { lightTheme, darkTheme };


