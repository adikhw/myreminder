import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { DateTimeField } from '@/components/date-time-field';
import { RuleEditorSheet } from '@/components/rule-editor-sheet';
import { AppText, Ionicons, type IconName } from '@/components/ui/app-text';
import { Badge, Chip, SegmentedControl } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, SectionHeader } from '@/components/ui/card';
import { PageHeader, Screen } from '@/components/ui/screen';
import { SwitchRow } from '@/components/ui/switch-row';
import { Divider, TextField } from '@/components/ui/text-field';
import { useDatabase } from '@/db/DatabaseProvider';
import { createItem, deleteItem, getItem, updateItem } from '@/db/items';
import {
  ALL_DAY_ANCHOR_MINUTES,
  WEEKDAY_LABELS,
  WEEKDAY_ORDER,
} from '@/domain/constants';
import { formatRule } from '@/domain/format';
import { defaultRulesForType, validateItemInput } from '@/domain/schedule';
import type { ItemInput, ItemType, Priority, ReminderRule } from '@/domain/types';
import { useSettings } from '@/settings/SettingsProvider';
import { rescheduleAll } from '@/notifications/scheduler';
import { hasNotificationPermission, requestNotificationPermission } from '@/notifications/setup';
import { useTheme } from '@/theme';
import { LoadingScreen } from '@/components/loading-screen';

interface FormState {
  type: ItemType;
  title: string;
  note: string;
  priority: Priority;
  hasDeadline: boolean;
  dueAt: number;
  allDay: boolean;
  weekday: number;
  startMinutes: number;
  endMinutes: number;
  room: string;
  teacher: string;
  enabled: boolean;
  done: boolean;
  rules: ReminderRule[];
}

const TYPE_OPTIONS: { value: ItemType; label: string; icon: IconName }[] = [
  { value: 'task', label: 'Tugas', icon: 'checkbox-outline' },
  { value: 'event', label: 'Acara', icon: 'calendar-outline' },
  { value: 'class', label: 'Mapel', icon: 'school-outline' },
];

const PRIORITY_OPTIONS: { value: Priority; label: string }[] = [
  { value: 'low', label: 'Rendah' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'Tinggi' },
];

export default function ItemFormScreen() {
  const theme = useTheme();
  const db = useDatabase();
  const { settings, markGuideSeen } = useSettings();
  const params = useLocalSearchParams<{ id: string; type?: string; date?: string }>();
  const id = params.id ?? 'new';
  const isNew = id === 'new';
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [form, setForm] = useState<FormState>(() => initialForm(params.type, params.date));
  const [ruleSheetVisible, setRuleSheetVisible] = useState(false);
  const [editingRuleIndex, setEditingRuleIndex] = useState<number | null>(null);

  useEffect(() => {
    if (isNew) return;
    let active = true;
    getItem(db, id)
      .then((item) => {
        if (!active) return;
        if (!item) {
          Alert.alert('Item tidak ditemukan', 'Data mungkin sudah dihapus.');
          close();
          return;
        }
        const schedule = item.schedule;
        setForm({
          type: item.type,
          title: item.title,
          note: item.note,
          priority: item.priority,
          hasDeadline: item.dueAt !== null,
          dueAt: item.dueAt ?? defaultDueAt(),
          allDay: item.allDay,
          weekday: schedule?.weekday ?? new Date().getDay(),
          startMinutes: schedule?.startMinutes ?? 8 * 60,
          endMinutes: schedule?.endMinutes ?? 10 * 60,
          room: item.room ?? '',
          teacher: item.teacher ?? '',
          enabled: item.enabled,
          done: item.done,
          rules: [...item.rules],
        });
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setLoading(false);
        Alert.alert('Gagal memuat', 'Item tidak bisa dibuka. Coba lagi.');
        close();
      });
    return () => {
      active = false;
    };
  }, [db, id, isNew]);

  if (loading) return <LoadingScreen label="Memuat item…" />;

  const isTask = form.type === 'task';
  const isEvent = form.type === 'event';
  const isClass = form.type === 'class';
  const title = isNew
    ? form.type === 'task'
      ? 'Tambah tugas'
      : form.type === 'event'
        ? 'Tambah acara'
        : 'Tambah mapel'
    : form.type === 'task'
      ? 'Edit tugas'
      : form.type === 'event'
        ? 'Edit acara'
        : 'Edit mapel';

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  function changeType(type: ItemType) {
    setForm((previous) => ({
      ...previous,
      type,
      hasDeadline: type === 'event' ? true : type === 'task' ? false : previous.hasDeadline,
      dueAt: previous.dueAt || defaultDueAt(),
      allDay: false,
      rules: defaultRulesForType(type),
      priority: type === 'task' ? previous.priority : 'normal',
    }));
  }

  function toggleAllDay(allDay: boolean) {
    if (allDay) {
      update('dueAt', atMinutes(form.dueAt, ALL_DAY_ANCHOR_MINUTES));
    } else {
      update('dueAt', atMinutes(form.dueAt, 9 * 60));
    }
    update('allDay', allDay);
  }

  function openNewRule() {
    setEditingRuleIndex(null);
    setRuleSheetVisible(true);
  }

  function openEditRule(index: number) {
    setEditingRuleIndex(index);
    setRuleSheetVisible(true);
  }

  function saveRule(rule: ReminderRule) {
    setForm((previous) => {
      const rules = [...previous.rules];
      if (editingRuleIndex === null) rules.push(rule);
      else rules[editingRuleIndex] = rule;
      return { ...previous, rules };
    });
  }

  function removeRule(index: number) {
    setForm((previous) => ({
      ...previous,
      rules: previous.rules.filter((_, ruleIndex) => ruleIndex !== index),
    }));
  }

  async function save() {
    const input = buildInput(form);
    const validation = validateItemInput(input);
    if (!validation.ok) {
      setErrors(validation.errors);
      Alert.alert('Periksa lagi', validation.errors.join('\n'));
      return;
    }

    setErrors([]);
    setSaving(true);
    try {
      if (isNew) await createItem(db, input);
      else await updateItem(db, id, input);

      await rescheduleAll(db);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      close();

      if (input.rules.length > 0) {
        const granted = await hasNotificationPermission();
        if (!granted) {
          Alert.alert(
            'Pengingat disimpan',
            'Izin notifikasi belum aktif, jadi pengingat belum bisa muncul. Aktifkan sekarang?',
            [
              { text: 'Nanti', style: 'cancel' },
              {
                text: 'Aktifkan',
                onPress: async () => {
                  const enabled = await requestNotificationPermission();
                  if (enabled) {
                    await rescheduleAll(db);
                    if (!settings.setupGuideSeen) {
                      await markGuideSeen();
                      router.replace('/guide');
                    }
                  }
                },
              },
            ],
          );
        }
      }
    } catch {
      Alert.alert('Gagal menyimpan', 'Perubahan belum tersimpan. Coba lagi.');
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete() {
    Alert.alert('Hapus item?', 'Item ini dan semua pengingatnya akan dihapus.', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          await deleteItem(db, id);
          await rescheduleAll(db);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
          close();
        },
      },
    ]);
  }

  return (
    <Screen scroll>
      <PageHeader
        back
        eyebrow={isNew ? 'Baru' : 'Ubah item'}
        title={title}
        subtitle={
          isClass
            ? 'Jadwal diulang setiap minggu; pengingat disesuaikan otomatis.'
            : isEvent
              ? 'Acara muncul di kalender dan bisa punya pengingat.'
              : 'Tugas bisa punya deadline, pengingat berulang, atau keduanya.'
        }
      />

      {!isNew ? (
        <View style={{ marginBottom: theme.spacing.lg }}>
          <Badge
            label={TYPE_OPTIONS.find((option) => option.value === form.type)?.label ?? 'Item'}
            tone="primary"
          />
        </View>
      ) : (
        <View style={{ marginBottom: theme.spacing.lg }}>
          <SegmentedControl options={TYPE_OPTIONS} value={form.type} onChange={changeType} />
        </View>
      )}

      {errors.length > 0 ? (
        <Card style={{ marginBottom: theme.spacing.lg }} accent={theme.colors.danger}>
          {errors.map((error) => (
            <AppText key={error} variant="caption" color="danger">
              • {error}
            </AppText>
          ))}
        </Card>
      ) : null}

      <Card style={{ marginBottom: theme.spacing.lg }}>
        <TextField
          label="Judul"
          value={form.title}
          onChangeText={(value) => update('title', value)}
          placeholder={isClass ? 'Contoh: Matematika' : 'Apa yang perlu diingat?'}
          autoFocus={isNew}
          maxLength={120}
        />
        <TextField
          label="Catatan (opsional)"
          value={form.note}
          onChangeText={(value) => update('note', value)}
          placeholder="Detail singkat, materi, atau hal yang perlu dibawa."
          multiline
          maxLength={2000}
          containerStyle={{ marginTop: theme.spacing.md }}
        />
      </Card>

      {isTask ? (
        <Card style={{ marginBottom: theme.spacing.lg }}>
          <AppText variant="label" color="textSecondary" style={{ marginBottom: 7 }}>
            Prioritas
          </AppText>
          <View style={styles.chips}>
            {PRIORITY_OPTIONS.map((option) => (
              <Chip
                key={option.value}
                label={option.label}
                selected={form.priority === option.value}
                onPress={() => update('priority', option.value)}
              />
            ))}
          </View>
          <Divider style={{ marginVertical: theme.spacing.md }} />
          <SwitchRow
            title="Punya deadline"
            description="Tanpa deadline, pengingat “sebelum” tidak akan berbunyi."
            icon="timer-outline"
            value={form.hasDeadline}
            onValueChange={(value) => update('hasDeadline', value)}
          />
          {form.hasDeadline ? (
            <View style={styles.dateRow}>
              <DateTimeField
                label="Tanggal deadline"
                value={form.dueAt}
                mode="date"
                onChange={(value) => update('dueAt', value)}
              />
              <DateTimeField
                label="Jam deadline"
                value={form.dueAt}
                mode="time"
                onChange={(value) => update('dueAt', value)}
              />
            </View>
          ) : null}
        </Card>
      ) : null}

      {isEvent ? (
        <Card style={{ marginBottom: theme.spacing.lg }}>
          <SwitchRow
            title="Seharian"
            description="Acara tanpa jam tertentu; pengingat memakai pukul 08:00."
            icon="sunny-outline"
            value={form.allDay}
            onValueChange={toggleAllDay}
          />
          <View style={styles.dateRow}>
            <DateTimeField
              label="Tanggal acara"
              value={form.dueAt}
              mode="date"
              onChange={(value) => update('dueAt', value)}
            />
            {!form.allDay ? (
              <DateTimeField
                label="Jam acara"
                value={form.dueAt}
                mode="time"
                onChange={(value) => update('dueAt', value)}
              />
            ) : null}
          </View>
        </Card>
      ) : null}

      {isClass ? (
        <Card style={{ marginBottom: theme.spacing.lg }}>
          <AppText variant="label" color="textSecondary" style={{ marginBottom: 7 }}>
            Hari
          </AppText>
          <View style={styles.chips}>
            {WEEKDAY_ORDER.map((weekday) => (
              <Chip
                key={weekday}
                label={WEEKDAY_LABELS[weekday]}
                selected={form.weekday === weekday}
                onPress={() => update('weekday', weekday)}
              />
            ))}
          </View>
          <View style={styles.dateRow}>
            <DateTimeField
              label="Jam mulai"
              value={dateAtMinutes(form.startMinutes)}
              mode="time"
              onChange={(value) => update('startMinutes', minutesOf(value))}
            />
            <DateTimeField
              label="Jam selesai"
              value={dateAtMinutes(form.endMinutes)}
              mode="time"
              onChange={(value) => update('endMinutes', minutesOf(value))}
            />
          </View>
          <TextField
            label="Ruangan (opsional)"
            value={form.room}
            onChangeText={(value) => update('room', value)}
            placeholder="Contoh: R.201"
            maxLength={80}
            containerStyle={{ marginTop: theme.spacing.md }}
          />
          <TextField
            label="Guru (opsional)"
            value={form.teacher}
            onChangeText={(value) => update('teacher', value)}
            placeholder="Contoh: Bu Sari"
            maxLength={80}
            containerStyle={{ marginTop: theme.spacing.md }}
          />
          <Divider style={{ marginVertical: theme.spacing.md }} />
          <SwitchRow
            title="Aktif"
            description="Matikan saat libur panjang; jadwal tetap tersimpan."
            icon="pause-circle-outline"
            value={form.enabled}
            onValueChange={(value) => update('enabled', value)}
          />
        </Card>
      ) : null}

      <SectionHeader
        title="Pengingat"
        actionLabel="Tambah"
        onAction={openNewRule}
        style={{ marginTop: theme.spacing.sm }}
      />
      <Card style={{ marginBottom: theme.spacing.lg }} padding="sm">
        {form.rules.length === 0 ? (
          <View style={styles.emptyRules}>
            <Ionicons name="notifications-off-outline" size={20} color={theme.colors.textMuted} />
            <AppText variant="caption" color="textSecondary" style={{ textAlign: 'center' }}>
              Belum ada pengingat. Item tetap tersimpan di daftar dan kalender.
            </AppText>
          </View>
        ) : (
          form.rules.map((rule, index) => (
            <Pressable
              key={`${rule.kind}-${index}`}
              accessibilityRole="button"
              accessibilityLabel={`Edit pengingat ${formatRule(rule)}`}
              onPress={() => openEditRule(index)}
              style={({ pressed }) => [
                styles.ruleRow,
                {
                  backgroundColor: pressed ? theme.colors.surfacePressed : 'transparent',
                  borderRadius: theme.radius.md,
                },
              ]}>
              <View style={[styles.ruleIcon, { backgroundColor: theme.colors.primarySoft }]}>
                <Ionicons
                  name={
                    rule.kind === 'repeat'
                      ? 'repeat-outline'
                      : rule.kind === 'eve'
                        ? 'moon-outline'
                        : 'notifications-outline'
                  }
                  size={17}
                  color={theme.colors.primary}
                />
              </View>
              <AppText variant="small" style={{ flex: 1 }}>
                {formatRule(rule)}
              </AppText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Hapus pengingat"
                hitSlop={10}
                onPress={(event) => {
                  event.stopPropagation();
                  removeRule(index);
                }}>
                <Ionicons name="trash-outline" size={17} color={theme.colors.danger} />
              </Pressable>
            </Pressable>
          ))
        )}
      </Card>

      {isTask && !form.hasDeadline && form.rules.some((rule) => rule.kind === 'before') ? (
        <Card style={{ marginBottom: theme.spacing.lg }} accent={theme.colors.warning}>
          <AppText variant="caption" style={{ color: theme.colors.warning }}>
            Pengingat “sebelum” butuh deadline. Aktifkan deadline atau hapus pengingat tersebut.
          </AppText>
        </Card>
      ) : null}

      <Button
        label={isNew ? 'Simpan item' : 'Simpan perubahan'}
        icon="checkmark"
        onPress={save}
        loading={saving}
        disabled={saving}
        fullWidth
      />
      {!isNew ? (
        <Button
          label="Hapus item"
          icon="trash-outline"
          variant="danger"
          onPress={confirmDelete}
          disabled={saving}
          fullWidth
          style={{ marginTop: theme.spacing.sm }}
        />
      ) : null}

      {ruleSheetVisible ? (
        <RuleEditorSheet
          visible
          type={form.type}
          initialRule={editingRuleIndex === null ? null : (form.rules[editingRuleIndex] ?? null)}
          onClose={() => setRuleSheetVisible(false)}
          onSave={saveRule}
        />
      ) : null}
    </Screen>
  );
}

function initialForm(typeParam?: string, dateParam?: string): FormState {
  const type: ItemType =
    typeParam === 'event' || typeParam === 'class' ? typeParam : 'task';
  const date = dateParam ? new Date(Number(dateParam)) : new Date();
  const validDate = Number.isNaN(date.getTime()) ? new Date() : date;
  const dateAtNine = atMinutes(validDate.getTime(), 9 * 60);

  return {
    type,
    title: '',
    note: '',
    priority: 'normal',
    hasDeadline: type === 'event',
    dueAt: dateAtNine,
    allDay: false,
    weekday: validDate.getDay(),
    startMinutes: 8 * 60,
    endMinutes: 10 * 60,
    room: '',
    teacher: '',
    enabled: true,
    done: false,
    rules: defaultRulesForType(type),
  };
}

function buildInput(form: FormState): ItemInput {
  const isClass = form.type === 'class';
  const isEvent = form.type === 'event';
  const dueAt = form.type === 'task' ? (form.hasDeadline ? form.dueAt : null) : isEvent ? form.dueAt : null;

  return {
    type: form.type,
    title: form.title,
    note: form.note,
    priority: form.type === 'task' ? form.priority : 'normal',
    dueAt,
    allDay: isEvent ? form.allDay : false,
    schedule: isClass
      ? {
          weekday: form.weekday,
          startMinutes: form.startMinutes,
          endMinutes: form.endMinutes,
        }
      : null,
    room: isClass ? form.room.trim() || null : null,
    teacher: isClass ? form.teacher.trim() || null : null,
    enabled: isClass ? form.enabled : true,
    done: isClass ? false : form.done,
    rules: form.rules,
  };
}

function defaultDueAt(): number {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  return tomorrow.getTime();
}

function atMinutes(value: number, minutes: number): number {
  const date = new Date(value);
  date.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return date.getTime();
}

function dateAtMinutes(minutes: number): number {
  return atMinutes(Date.now(), minutes);
}

function minutesOf(value: number): number {
  const date = new Date(value);
  return date.getHours() * 60 + date.getMinutes();
}

function close() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dateRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  emptyRules: { alignItems: 'center', gap: 8, paddingVertical: 22, paddingHorizontal: 16 },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 6,
  },
  ruleIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
