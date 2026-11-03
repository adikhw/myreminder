import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { listItems } from '@/db/items';
import { useDatabase } from '@/db/DatabaseProvider';
import type { Item, ItemType } from '@/domain/types';

export function useItems(type?: ItemType) {
  const db = useDatabase();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const next = await listItems(db, type ? { type } : {});
    setItems(next);
    setLoading(false);
    return next;
  }, [db, type]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      listItems(db, type ? { type } : {})
        .then((next) => {
          if (active) {
            setItems(next);
            setLoading(false);
          }
        })
        .catch(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, [db, type]),
  );

  return { items, loading, reload, setItems };
}
