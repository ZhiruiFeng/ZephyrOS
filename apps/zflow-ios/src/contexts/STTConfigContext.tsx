import React, { createContext, useContext, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface STTConfig {
  provider: 'elevenlabs' | 'openai';
  showProviderInUI: boolean;
}

interface STTConfigContextType {
  config: STTConfig;
  updateConfig: (newConfig: Partial<STTConfig>) => Promise<void>;
}

const defaultConfig: STTConfig = {
  provider: 'elevenlabs',
  showProviderInUI: true,
};

const STTConfigContext = createContext<STTConfigContextType | undefined>(undefined);

interface STTConfigProviderProps {
  children: ReactNode;
}

export const STTConfigProvider: React.FC<STTConfigProviderProps> = ({ children }) => {
  const [config, setConfig] = useState<STTConfig>(defaultConfig);

  React.useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const storedConfig = await AsyncStorage.getItem('stt_config');
      if (storedConfig) {
        const parsedConfig = JSON.parse(storedConfig);
        setConfig({ ...defaultConfig, ...parsedConfig });
      }
    } catch (error) {
      console.error('Failed to load STT config:', error);
    }
  };

  const updateConfig = async (newConfig: Partial<STTConfig>) => {
    const updatedConfig = { ...config, ...newConfig };
    setConfig(updatedConfig);

    try {
      await AsyncStorage.setItem('stt_config', JSON.stringify(updatedConfig));
    } catch (error) {
      console.error('Failed to save STT config:', error);
    }
  };

  return (
    <STTConfigContext.Provider value={{ config, updateConfig }}>
      {children}
    </STTConfigContext.Provider>
  );
};

export const useSTTConfig = () => {
  const context = useContext(STTConfigContext);
  if (context === undefined) {
    throw new Error('useSTTConfig must be used within a STTConfigProvider');
  }
  return context;
};