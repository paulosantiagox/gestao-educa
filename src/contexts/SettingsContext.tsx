import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface GlobalSettings {
  testMode: boolean;
  debugMode: boolean;
  allowDeletions: boolean;
  sortByStatus: boolean;
}

interface SettingsContextType {
  settings: GlobalSettings;
  updateSettings: (newSettings: Partial<GlobalSettings>) => void;
}

const defaultSettings: GlobalSettings = {
  testMode: false,
  debugMode: false,
  allowDeletions: false,
  sortByStatus: false,
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<GlobalSettings>(() => {
    const saved = localStorage.getItem('globalSettings');
    return saved ? JSON.parse(saved) : defaultSettings;
  });

  useEffect(() => {
    localStorage.setItem('globalSettings', JSON.stringify(settings));
  }, [settings]);

  const updateSettings = (newSettings: Partial<GlobalSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return context;
}
