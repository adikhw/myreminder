import * as SQLite from 'expo-sqlite';

const DATABASE_NAME = 'myreminder.db';
const DATABASE_VERSION = 1;

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

/**
 * One shared connection for the app. A headless notification task may get its
 * own JS runtime and connection, so every caller awaits this function instead
 * of holding a module-level handle.
 */
export function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = openAndMigrate().catch((error: unknown) => {
      databasePromise = null;
      throw error;
    });
  }
  return databasePromise;
}

async function openAndMigrate(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  await migrate(db);
  return db;
}

export async function migrate(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');

  const versionRow = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let currentVersion = versionRow?.user_version ?? 0;
  if (currentVersion >= DATABASE_VERSION) return;

  if (currentVersion < 1) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS items (
        id TEXT PRIMARY KEY NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('task', 'event', 'class')),
        title TEXT NOT NULL,
        note TEXT NOT NULL DEFAULT '',
        priority TEXT NOT NULL DEFAULT 'normal',
        due_at INTEGER,
        all_day INTEGER NOT NULL DEFAULT 0,
        weekday INTEGER,
        start_min INTEGER,
        end_min INTEGER,
        room TEXT,
        teacher TEXT,
        enabled INTEGER NOT NULL DEFAULT 1,
        done INTEGER NOT NULL DEFAULT 0,
        rules_json TEXT NOT NULL DEFAULT '[]',
        created_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_items_type ON items (type);
      CREATE INDEX IF NOT EXISTS idx_items_due_at ON items (due_at);

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );

      INSERT OR IGNORE INTO settings (key, value) VALUES
        ('snooze_minutes', '10'),
        ('holiday_mode', '0'),
        ('setup_guide_seen', '0');
    `);
    currentVersion = 1;
  }

  await db.execAsync(`PRAGMA user_version = ${currentVersion};`);
}

/** For tests and the debug screen. */
export async function resetDatabase(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync('DELETE FROM items; DELETE FROM settings;');
  await db.execAsync(`
    INSERT OR IGNORE INTO settings (key, value) VALUES
      ('snooze_minutes', '10'),
      ('holiday_mode', '0'),
      ('setup_guide_seen', '0');
  `);
}
