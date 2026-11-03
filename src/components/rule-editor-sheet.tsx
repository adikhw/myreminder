import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import {
  DAY_MS,
  HOUR_MS,
  MAX_BEFORE_OFFSET_MS,
  MAX_REPEAT_COUNT,
  MINUTE_MS,
  WEEK_MS,
} from '@/domain/constants';
import { formatMinutes } from '@/domain/format';
import type { ItemType, ReminderRule } from '@/domain/types';
import { useTheme } from '@/theme';

import { AppText, Ionicons, type IconName } from './ui/app-text';
import { Chip, SegmentedControl } from './ui/badge';
import { BottomSheet } from './ui/bottom-sheet';
import { Button } from './ui/button';
import { DateTimeField } from './date-time-field';
import { TextField } from './ui/text-field';

type RuleKind = 'before' | 'repeat' | 'eve';
type UnitKey = 'minutes' | 'hours' | 'days' | 'weeks';

const UNIT_MS: Record<UnitKey, number> = {
  minutes: MINUTE_MS,
  hours: HOUR_MS,
  days: DAY_MS,
  weeks: WEEK_MS,
};

const UNIT_LABELS: { value: UnitKey; label: string }[] = [
  { value: 'minutes', label: 'Menit' },
  { value: 'hours', label: 'Jam' },
  { value: 'days', label: 'Hari' },
  { value: 'weeks', label: 'Minggu' },
];

interface RuleEditorSheetProps {
  visible: boolean;
  type: ItemType;
  initialRule: ReminderRule | null;
  onClose: () => void;
  onSave: (rule: ReminderRule) => void;
}

export function RuleEditorSheet({
  visible,
  type,
  initialRule,
  onClose,
  onSave,
}: RuleEditorSheetProps) {
  const theme = useTheme();
  const initialSplit =
    initialRule && initialRule.kind !== 'eve'
      ? splitDuration(initialRule.kind === 'before' ? initialRule.offsetMs : initialRule.everyMs)
      : { amount: 30, unit: 'minutes' as UnitKey };

  const [kind, setKind] = useState<RuleKind>(
    initialRule?.kind ?? (type === 'class' ? 'eve' : 'before'),
  );
  const [amount, setAmount] = useState(String(initialSplit.amount));
  const [unit, setUnit] = useState<UnitKey>(initialSplit.unit);
  const [maxCount, setMaxCount] = useState(
    initialRule?.kind === 'repeat' ? String(initialRule.maxCount) : '3',
  );
  const [startAt, setStartAt] = useState(() =>
    initialRule?.kind === 'repeat' ? initialRule.startAt : Date.now(),
  );
  const [eveMinutes, setEveMinutes] = useState(
    initialRule?.kind === 'eve' ? initialRule.atMinutes : 20 * 60,
  );
  const [error, setError] = useState<string | null>(null);

  const kindOptions: { value: RuleKind; label: string; icon: IconName }[] = [
    { value: 'before', label: 'Sebelum', icon: 'time-outline' },
    { value: 'repeat', label: 'Berulang', icon: 'repeat-outline' },
    ...(type === 'class'
      ? [{ value: 'eve' as const, label: 'Malam', icon: 'moon-outline' as IconName }]
      : []),
  ];

  function save() {
    setError(null);
    const amountNumber = Number(amount);
    const maxNumber = Number(maxCount);

    if (kind === 'before') {
      if (!Number.isInteger(amountNumber) || amountNumber <= 0) {
        setError('Isi jarak dengan angka bulat lebih dari 0.');
        return;
      }
      const offsetMs = amountNumber * UNIT_MS[unit];
      if (offsetMs > MAX_BEFORE_OFFSET_MS) {
        setError('Jarak pengingat maksimal 30 hari.');
        return;
      }
      onSave({ kind: 'before', offsetMs });
      onClose();
      return;
    }

    if (kind === 'repeat') {
      if (!Number.isInteger(amountNumber) || amountNumber <= 0) {
        setError('Isi interval dengan angka bulat lebih dari 0.');
        return;
      }
      const everyMs = amountNumber * UNIT_MS[unit];
      if (everyMs < MINUTE_MS) {
        setError('Interval minimal 1 menit.');
        return;
      }
      if (!Number.isInteger(maxNumber) || maxNumber < 1 || maxNumber > MAX_REPEAT_COUNT) {
        setError(`Jumlah pengulangan harus 1 sampai ${MAX_REPEAT_COUNT}.`);
        return;
      }
      if (!Number.isFinite(startAt)) {
        setError('Waktu mulai tidak valid.');
        return;
      }
      onSave({ kind: 'repeat', startAt, everyMs, maxCount: maxNumber });
      onClose();
      return;
    }

    onSave({ kind: 'eve', atMinutes: eveMinutes });
    onClose();
  }

  const preview =
    kind === 'before'
      ? `Muncul ${amount || '0'} ${UNIT_LABELS.find((item) => item.value === unit)?.label.toLowerCase() ?? ''} sebelum waktu item.`
      : kind === 'repeat'
        ? `Muncul tiap ${amount || '0'} ${UNIT_LABELS.find((item) => item.value === unit)?.label.toLowerCase() ?? ''}, sebanyak ${maxCount || '0'} kali.`
        : `Muncul pukul ${formatMinutes(eveMinutes)} sehari sebelum mapel.`;

  return (
    <BottomSheet
      visible={visible}
      title={initialRule ? 'Edit pengingat' : 'Tambah pengingat'}
      onClose={onClose}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        style={{ flexGrow: 0, flexShrink: 1 }}
        contentContainerStyle={{ paddingBottom: 8 }}>
        <SegmentedControl options={kindOptions} value={kind} onChange={setKind} />

        {kind !== 'eve' ? (
          <>
            <AppText variant="label" color="textSecondary" style={{ marginTop: 16, marginBottom: 7 }}>
              {kind === 'before' ? 'Jarak sebelum' : 'Interval'}
            </AppText>
            <View style={styles.amountRow}>
              <TextField
                value={amount}
                onChangeText={setAmount}
                keyboardType="number-pad"
                placeholder="30"
                containerStyle={styles.amountField}
                maxLength={4}
              />
              <View style={styles.units}>
                {UNIT_LABELS.map((option) => (
                  <Chip
                    key={option.value}
                    label={option.label}
                    selected={unit === option.value}
                    onPress={() => setUnit(option.value)}
                  />
                ))}
              </View>
            </View>
            {kind === 'before' ? (
              <AppText variant="caption" color="textMuted" style={{ marginTop: 7 }}>
                Maksimal 30 hari sebelum waktu item.
              </AppText>
            ) : null}
          </>
        ) : (
          <View style={{ marginTop: 16 }}>
            <DateTimeField
              label="Jam malam sebelumnya"
              value={dateAtMinutes(eveMinutes)}
              mode="time"
              onChange={(value) => {
                const date = new Date(value);
                setEveMinutes(date.getHours() * 60 + date.getMinutes());
              }}
            />
            <AppText variant="caption" color="textMuted" style={{ marginTop: 7 }}>
              Contoh: 20:00, sehari sebelum mapel.
            </AppText>
          </View>
        )}

        {kind === 'repeat' ? (
          <>
            <TextField
              label="Jumlah pengulangan"
              value={maxCount}
              onChangeText={setMaxCount}
              keyboardType="number-pad"
              placeholder="3"
              maxLength={3}
              helper={`Maksimal ${MAX_REPEAT_COUNT} kali.`}
              containerStyle={{ marginTop: 14 }}
            />
            <View style={styles.startRow}>
              <DateTimeField
                label="Mulai tanggal"
                value={startAt}
                mode="date"
                onChange={setStartAt}
              />
              <DateTimeField
                label="Mulai jam"
                value={startAt}
                mode="time"
                onChange={setStartAt}
              />
            </View>
          </>
        ) : null}

        <View
          style={[
            styles.preview,
            { backgroundColor: theme.colors.primarySoft, borderRadius: theme.radius.md },
          ]}>
          <Ionicons name="notifications-outline" size={17} color={theme.colors.primary} />
          <AppText variant="caption" color="primary" style={{ flex: 1 }}>
            {preview}
          </AppText>
        </View>

        {error ? (
          <AppText variant="caption" color="danger" style={{ marginTop: 10 }}>
            {error}
          </AppText>
        ) : null}

        <Button label="Simpan pengingat" icon="checkmark" onPress={save} fullWidth style={{ marginTop: 16 }} />
        <Button label="Batal" variant="ghost" onPress={onClose} fullWidth style={{ marginTop: 6 }} />
      </ScrollView>
    </BottomSheet>
  );
}

function splitDuration(ms: number): { amount: number; unit: UnitKey } {
  if (ms % WEEK_MS === 0) return { amount: ms / WEEK_MS, unit: 'weeks' };
  if (ms % DAY_MS === 0) return { amount: ms / DAY_MS, unit: 'days' };
  if (ms % HOUR_MS === 0) return { amount: ms / HOUR_MS, unit: 'hours' };
  return { amount: Math.max(1, Math.round(ms / MINUTE_MS)), unit: 'minutes' };
}

function dateAtMinutes(minutes: number): number {
  const now = new Date();
  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    Math.floor(minutes / 60),
    minutes % 60,
    0,
    0,
  ).getTime();
}

const styles = StyleSheet.create({
  amountRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  amountField: { width: 78 },
  units: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 7, paddingTop: 1 },
  startRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 11,
    marginTop: 16,
  },
});
