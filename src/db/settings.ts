import type { SQLiteDatabase } from 'expo-sqlite';

export type SettingKey = 'snooze_minutes' | 'holiday_mode' | 'setup_guide_seen';

export interface AppSettings {
  snoozeMinutes: number;
  holidayMode: boolean;
  setupGuideSeen: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  snoozeMinutes: 10,
  holidayMode: false,
  setupGuideSeen: false,
};

export async function loadSettings(db: SQLiteDatabase): Promise<AppSettings> {
  const rows = await db.getAllAsync<{ key: string; value: string }>(
    'SELECT key, value FROM settings',
  );
  const values = new Map(rows.map((row) => [row.key, row.value]));

  const snooze = Number(values.get('snooze_minutes'));
  return {
    snoozeMinutes:
      Number.isFinite(snooze) && snooze >= 1 && snooze <= 120
        ? Math.round(snooze)
        : DEFAULT_SETTINGS.snoozeMinutes,
    holidayMode: readBool(values.get('holiday_mode')),
    setupGuideSeen: readBool(values.get('setup_guide_seen')),
  };
}

export async function setSetting(
  db: SQLiteDatabase,
  key: SettingKey,
  value: string,
): Promise<void> {
  await db.runAsync(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    key,
    value,
  );
}

export async function setSnoozeMinutes(db: SQLiteDatabase, minutes: number): Promise<void> {
  await setSetting(db, 'snooze_minutes', String(Math.round(minutes)));
}

export async function setHolidayMode(db: SQLiteDatabase, enabled: boolean): Promise<void> {
  await setSetting(db, 'holiday_mode', enabled ? '1' : '0');
}

export async function setSetupGuideSeen(db: SQLiteDatabase, seen: boolean): Promise<void> {
  await setSetting(db, 'setup_guide_seen', seen ? '1' : '0');
}

function readBool(value: string | undefined): boolean {
  return value === '1' || value === 'true';
}
