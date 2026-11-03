export type Priority = 'low' | 'normal' | 'high';

export type ItemType = 'task' | 'event' | 'class';

/**
 * A reminder that fires a fixed amount of time before the item's anchor.
 * Tasks and events anchor on `dueAt`; classes anchor on their weekly start.
 */
export interface ReminderRuleBefore {
  kind: 'before';
  offsetMs: number;
}

/**
 * A self-contained repeating reminder. It has no anchor and always stops
 * after `maxCount` fires, which keeps the schedule finite and testable.
 */
export interface ReminderRuleRepeat {
  kind: 'repeat';
  startAt: number;
  everyMs: number;
  maxCount: number;
}

/**
 * A class-only reminder that fires the evening before a class.
 * `atMinutes` is minutes since local midnight (20:00 = 1200).
 */
export interface ReminderRuleEve {
  kind: 'eve';
  atMinutes: number;
}

export type ReminderRule = ReminderRuleBefore | ReminderRuleRepeat | ReminderRuleEve;

/** Weekly class slot. `weekday` follows `Date.getDay()`: 0 = Sunday, 1 = Monday. */
export interface ClassSchedule {
  weekday: number;
  startMinutes: number;
  endMinutes: number;
}

/**
 * One record drives the task list, the calendar, and the class timetable.
 * Storing a single shape keeps one reminder engine instead of three.
 */
export interface Item {
  id: string;
  type: ItemType;
  title: string;
  note: string;
  priority: Priority;
  dueAt: number | null;
  allDay: boolean;
  schedule: ClassSchedule | null;
  room: string | null;
  teacher: string | null;
  enabled: boolean;
  done: boolean;
  rules: ReminderRule[];
}

/** Editable fields of an item; the id is assigned by the database layer. */
export type ItemInput = Omit<Item, 'id'>;
