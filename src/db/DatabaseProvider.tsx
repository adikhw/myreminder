import * as SplashScreen from 'expo-splash-screen';
import type { SQLiteDatabase } from 'expo-sqlite';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

import { LoadingScreen } from '@/components/loading-screen';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { getDatabase } from '@/db/database';
import { useTheme } from '@/theme';

const DatabaseContext = createContext<SQLiteDatabase | null>(null);

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export function DatabaseProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<SQLiteDatabase | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setError(null);
    getDatabase()
      .then((database) => {
        if (active) setDb(database);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Database gagal dibuka.');
      });
    return () => {
      active = false;
    };
  }, [attempt]);

  useEffect(() => {
    if (db || error) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [db, error]);

  if (error) {
    return <DatabaseError message={error} onRetry={() => setAttempt((value) => value + 1)} />;
  }
  if (!db) return <LoadingScreen />;
  return <DatabaseContext.Provider value={db}>{children}</DatabaseContext.Provider>;
}

export function useDatabase(): SQLiteDatabase {
  const db = useContext(DatabaseContext);
  if (!db) throw new Error('useDatabase must be used inside DatabaseProvider');
  return db;
}

function DatabaseError({ message, onRetry }: { message: string; onRetry: () => void }) {
  const theme = useTheme();
  return (
    <Screen scroll contentContainerStyle={{ justifyContent: 'center', flexGrow: 1 }}>
      <AppText variant="title">Database tidak bisa dibuka</AppText>
      <AppText variant="body" color="textSecondary" style={{ marginTop: 10 }}>
        {message}
      </AppText>
      <Button
        label="Coba lagi"
        onPress={onRetry}
        style={{ marginTop: theme.spacing.xl }}
      />
    </Screen>
  );
}
