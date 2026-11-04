const listeners = new Set<() => void>();

/**
 * Notification actions can change items from outside the React tree, and they
 * may run in a separate headless runtime. Screens subscribe here to reload.
 */
export function bumpItemsRevision(): void {
  listeners.forEach((listener) => listener());
}

export function subscribeItemsRevision(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
