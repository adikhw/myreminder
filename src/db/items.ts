import type { SQLiteDatabase } from 'expo-sqlite';
import { addDays, set } from 'date-fns';

import { defaultRulesForType } from '@/domain/schedule';
import type {
  ClassSchedule,
  Item,
  ItemInput,
  ItemType,
  Priority,
  ReminderRule,
} from '@/domain/types';
import { makeId } from '@/lib/id';

interface ItemRow {
  id: string;
  type: string;
  title: string;
  note: string;
  priority: string;
  due_at: number | null;
  all_day: number;
  weekday: number | null;
  start_min: number | null;
  end_min: number | null;
  room: string | null;
  teacher: string | null;
  enabled: number;
  done: number;
  rules_json: string;
  created_at: number;
}

const ITEM_COLUMNS = `
  id, type, title, note, priority, due_at, all_day,
  weekday, start_min, end_min, room, teacher,
  enabled, done, rules_json, created_at
`;

export async function listItems(
  db: SQLiteDatabase,
  options: { type?: ItemType } = {},
): Promise<Item[]> {
  const rows = options.type
    ? await db.getAllAsync<ItemRow>(
        `SELECT ${ITEM_COLUMNS} FROM items WHERE type = ? ORDER BY created_at ASC`,
        options.type,
      )
    : await db.getAllAsync<ItemRow>(
        `SELECT ${ITEM_COLUMNS} FROM items ORDER BY created_at ASC`,
      );

  return rows.map(rowToItem);
}

export async function getItem(db: SQLiteDatabase, id: string): Promise<Item | null> {
  const row = await db.getFirstAsync<ItemRow>(
    `SELECT ${ITEM_COLUMNS} FROM items WHERE id = ?`,
    id,
  );
  return row ? rowToItem(row) : null;
}

export async function createItem(db: SQLiteDatabase, input: ItemInput): Promise<Item> {
  const id = makeId('item');
  const createdAt = Date.now();
  await insertItem(db, id, input, createdAt);
  const created = await getItem(db, id);
  if (!created) throw new Error('Item gagal disimpan.');
  return created;
}

export async function updateItem(
  db: SQLiteDatabase,
  id: string,
  input: ItemInput,
): Promise<Item | null> {
  const existing = await getItem(db, id);
  if (!existing) return null;

  await db.runAsync(
    `UPDATE items SET
      type = ?, title = ?, note = ?, priority = ?, due_at = ?, all_day = ?,
      weekday = ?, start_min = ?, end_min = ?, room = ?, teacher = ?,
      enabled = ?, done = ?, rules_json = ?
    WHERE id = ?`,
    [
      input.type,
      input.title.trim(),
      input.note,
      input.priority,
      input.dueAt,
      boolToInt(input.allDay),
      input.schedule?.weekday ?? null,
      input.schedule?.startMinutes ?? null,
      input.schedule?.endMinutes ?? null,
      input.room,
      input.teacher,
      boolToInt(input.enabled),
      boolToInt(input.done),
      JSON.stringify(input.rules),
      id,
    ],
  );
  return getItem(db, id);
}

export async function deleteItem(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('DELETE FROM items WHERE id = ?', id);
}

export async function setItemDone(
  db: SQLiteDatabase,
  id: string,
  done: boolean,
): Promise<void> {
  await db.runAsync('UPDATE items SET done = ? WHERE id = ?', boolToInt(done), id);
}

export async function setItemEnabled(
  db: SQLiteDatabase,
  id: string,
  enabled: boolean,
): Promise<void> {
  await db.runAsync('UPDATE items SET enabled = ? WHERE id = ?', boolToInt(enabled), id);
}

export async function countItemsByType(db: SQLiteDatabase): Promise<Record<ItemType, number>> {
  const rows = await db.getAllAsync<{ type: string; total: number }>(
    'SELECT type, COUNT(*) AS total FROM items GROUP BY type',
  );
  const counts: Record<ItemType, number> = { task: 0, event: 0, class: 0 };
  for (const row of rows) {
    if (row.type === 'task' || row.type === 'event' || row.type === 'class') {
      counts[row.type] = row.total;
    }
  }
  return counts;
}

export async function seedDemoData(db: SQLiteDatabase): Promise<number> {
  const now = new Date();
  const tomorrowAfternoon = set(addDays(now, 1), {
    hours: 16,
    minutes: 0,
    seconds: 0,
    milliseconds: 0,
  }).getTime();
  const eventDay = set(addDays(now, 2), {
    hours: 14,
    minutes: 0,
    seconds: 0,
    milliseconds: 0,
  }).getTime();
  const repeatStart = now.getTime() + 10 * 60_000;

  const demo: { id: string; input: ItemInput; createdAt: number }[] = [
    {
      id: 'demo-task-1',
      createdAt: now.getTime() - 5_000,
      input: {
        type: 'task',
        title: 'Beli buku tulis',
        note: 'Stok buku tulis habis di toko dekat sekolah.',
        priority: 'high',
        dueAt: tomorrowAfternoon,
        allDay: false,
        schedule: null,
        room: null,
        teacher: null,
        enabled: true,
        done: false,
        rules: [{ kind: 'before', offsetMs: 60 * 60_000 }],
      },
    },
    {
      id: 'demo-task-2',
      createdAt: now.getTime() - 4_000,
      input: {
        type: 'task',
        title: 'Baca ulang catatan',
        note: 'Pengingat singkat untuk mengulang materi.',
        priority: 'normal',
        dueAt: null,
        allDay: false,
        schedule: null,
        room: null,
        teacher: null,
        enabled: true,
        done: false,
        rules: [
          { kind: 'repeat', startAt: repeatStart, everyMs: 30 * 60_000, maxCount: 3 },
        ],
      },
    },
    {
      id: 'demo-class-1',
      createdAt: now.getTime() - 3_000,
      input: {
        type: 'class',
        title: 'Matematika',
        note: '',
        priority: 'normal',
        dueAt: null,
        allDay: false,
        schedule: { weekday: 1, startMinutes: 8 * 60, endMinutes: 9 * 60 + 30 },
        room: 'R.201',
        teacher: 'Bu Sari',
        enabled: true,
        done: false,
        rules: defaultRulesForType('class'),
      },
    },
    {
      id: 'demo-class-2',
      createdAt: now.getTime() - 2_000,
      input: {
        type: 'class',
        title: 'Bahasa Indonesia',
        note: '',
        priority: 'normal',
        dueAt: null,
        allDay: false,
        schedule: { weekday: 3, startMinutes: 10 * 60, endMinutes: 11 * 60 + 30 },
        room: 'R.105',
        teacher: 'Pak Budi',
        enabled: true,
        done: false,
        rules: defaultRulesForType('class'),
      },
    },
    {
      id: 'demo-event-1',
      createdAt: now.getTime() - 1_000,
      input: {
        type: 'event',
        title: 'Kerja kelompok',
        note: 'Bawa laptop dan materi presentasi.',
        priority: 'normal',
        dueAt: eventDay,
        allDay: false,
        schedule: null,
        room: null,
        teacher: null,
        enabled: true,
        done: false,
        rules: defaultRulesForType('event'),
      },
    },
  ];

  await db.withTransactionAsync(async () => {
    for (const entry of demo) {
      await insertItemRow(db, entry.id, entry.input, entry.createdAt);
    }
  });
  return demo.length;
}

async function insertItem(
  db: SQLiteDatabase,
  id: string,
  input: ItemInput,
  createdAt: number,
): Promise<void> {
  await insertItemRow(db, id, input, createdAt);
}

async function insertItemRow(
  db: SQLiteDatabase,
  id: string,
  input: ItemInput,
  createdAt: number,
): Promise<void> {
  await db.runAsync(
    `INSERT OR REPLACE INTO items (
      id, type, title, note, priority, due_at, all_day,
      weekday, start_min, end_min, room, teacher,
      enabled, done, rules_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.type,
      input.title.trim(),
      input.note,
      input.priority,
      input.dueAt,
      boolToInt(input.allDay),
      input.schedule?.weekday ?? null,
      input.schedule?.startMinutes ?? null,
      input.schedule?.endMinutes ?? null,
      input.room,
      input.teacher,
      boolToInt(input.enabled),
      boolToInt(input.done),
      JSON.stringify(input.rules),
      createdAt,
    ],
  );
}

function rowToItem(row: ItemRow): Item {
  const schedule = readSchedule(row);
  return {
    id: row.id,
    type: readType(row.type),
    title: row.title,
    note: row.note,
    priority: readPriority(row.priority),
    dueAt: typeof row.due_at === 'number' && Number.isFinite(row.due_at) ? row.due_at : null,
    allDay: row.all_day === 1,
    schedule,
    room: row.room,
    teacher: row.teacher,
    enabled: row.enabled === 1,
    done: row.done === 1,
    rules: parseRules(row.rules_json),
  };
}

function readType(value: string): ItemType {
  if (value === 'event' || value === 'class') return value;
  return 'task';
}

function readPriority(value: string): Priority {
  if (value === 'low' || value === 'high') return value;
  return 'normal';
}

function readSchedule(row: ItemRow): ClassSchedule | null {
  if (row.weekday === null || row.start_min === null || row.end_min === null) return null;
  if (
    !Number.isInteger(row.weekday) ||
    row.weekday < 0 ||
    row.weekday > 6 ||
    !Number.isInteger(row.start_min) ||
    !Number.isInteger(row.end_min)
  ) {
    return null;
  }
  return {
    weekday: row.weekday,
    startMinutes: row.start_min,
    endMinutes: row.end_min,
  };
}

function parseRules(value: string): ReminderRule[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(isReminderRule);
}

function isReminderRule(value: unknown): value is ReminderRule {
  if (!value || typeof value !== 'object') return false;
  const rule = value as Record<string, unknown>;

  if (rule.kind === 'before') {
    return typeof rule.offsetMs === 'number' && Number.isFinite(rule.offsetMs) && rule.offsetMs > 0;
  }
  if (rule.kind === 'repeat') {
    return (
      typeof rule.startAt === 'number' &&
      Number.isFinite(rule.startAt) &&
      typeof rule.everyMs === 'number' &&
      Number.isFinite(rule.everyMs) &&
      rule.everyMs > 0 &&
      typeof rule.maxCount === 'number' &&
      Number.isInteger(rule.maxCount) &&
      rule.maxCount > 0
    );
  }
  if (rule.kind === 'eve') {
    return (
      typeof rule.atMinutes === 'number' &&
      Number.isInteger(rule.atMinutes) &&
      rule.atMinutes >= 0 &&
      rule.atMinutes <= 1439
    );
  }
  return false;
}

function boolToInt(value: boolean): number {
  return value ? 1 : 0;
}
