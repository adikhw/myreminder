import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

import { LoadingScreen } from '@/components/loading-screen';
import { useDatabase } from '@/db/DatabaseProvider';
import {
  loadSettings,
  setHolidayMode as persistHolidayMode,
  setSetupGuideSeen as persistSetupGuideSeen,
  setSnoozeMinutes as persistSnoozeMinutes,
  type AppSettings,
} from '@/db/settings';
import { rescheduleAll } from '@/notifications/scheduler';

interface SettingsContextValue {
  settings: AppSettings;
  refreshSettings: () => Promise<void>;
  updateSnoozeMinutes: (minutes: number) => Promise<void>;
  updateHolidayMode: (enabled: boolean) => Promise<void>;
  markGuideSeen: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const db = useDatabase();
  const [settings, setSettings] = useState<AppSettings | null>(null);

  const refreshSettings = useCallback(async () => {
    const next = await loadSettings(db);
    setSettings(next);
  }, [db]);

  useEffect(() => {
    let active = true;
    loadSettings(db)
      .then((next) => {
        if (active) setSettings(next);
      })
      .catch(() => {
        if (active) {
          setSettings({ snoozeMinutes: 10, holidayMode: false, setupGuideSeen: false });
        }
      });
    return () => {
      active = false;
    };
  }, [db]);

  const updateSnoozeMinutes = useCallback(
    async (minutes: number) => {
      await persistSnoozeMinutes(db, minutes);
      await refreshSettings();
    },
    [db, refreshSettings],
  );

  const updateHolidayMode = useCallback(
    async (enabled: boolean) => {
      await persistHolidayMode(db, enabled);
      await refreshSettings();
      await rescheduleAll(db);
    },
    [db, refreshSettings],
  );

  const markGuideSeen = useCallback(async () => {
    await persistSetupGuideSeen(db, true);
    await refreshSettings();
  }, [db, refreshSettings]);

  if (!settings) return <LoadingScreen label="Memuat pengaturan…" />;

  return (
    <SettingsContext.Provider
      value={{
        settings,
        refreshSettings,
        updateSnoozeMinutes,
        updateHolidayMode,
        markGuideSeen,
      }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const value = useContext(SettingsContext);
  if (!value) throw new Error('useSettings must be used inside SettingsProvider');
  return value;
}
