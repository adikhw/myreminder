let counter = 0;

/**
 * Small local-only identifier. Randomness is enough here because ids never
 * leave the device and only need to be unique within this database.
 */
export function makeId(prefix = 'item'): string {
  counter = (counter + 1) % 1000;
  const time = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${time}${counter.toString(36)}${random}`;
}
