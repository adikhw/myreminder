import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';
import { formatShortDate, formatTime } from '@/domain/format';

import { AppText, Ionicons } from './ui/app-text';

interface DateTimeFieldProps {
  label: string;
  value: number;
  mode: 'date' | 'time';
  onChange: (value: number) => void;
  disabled?: boolean;
}

export function DateTimeField({ label, value, mode, onChange, disabled = false }: DateTimeFieldProps) {
  const theme = useTheme();
  const [visible, setVisible] = useState(false);

  function handleChange(event: DateTimePickerEvent, picked?: Date) {
    if (Platform.OS === 'android') setVisible(false);
    if (event.type !== 'set' || !picked) return;

    const current = new Date(value);
    const next =
      mode === 'date'
        ? new Date(
            picked.getFullYear(),
            picked.getMonth(),
            picked.getDate(),
            current.getHours(),
            current.getMinutes(),
            0,
            0,
          )
        : new Date(
            current.getFullYear(),
            current.getMonth(),
            current.getDate(),
            picked.getHours(),
            picked.getMinutes(),
            0,
            0,
          );
    onChange(next.getTime());
  }

  return (
    <View style={{ flex: 1 }}>
      <AppText variant="label" color="textSecondary" style={{ marginBottom: 7 }}>
        {label}
      </AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${mode === 'date' ? formatShortDate(value) : formatTime(value)}`}
        disabled={disabled}
        onPress={() => setVisible(true)}
        style={({ pressed }) => [
          styles.field,
          {
            backgroundColor: theme.colors.input,
            borderColor: pressed ? theme.colors.primary : theme.colors.border,
            borderRadius: theme.radius.md,
            opacity: disabled ? 0.5 : 1,
          },
        ]}>
        <Ionicons
          name={mode === 'date' ? 'calendar-outline' : 'time-outline'}
          size={17}
          color={theme.colors.primary}
        />
        <AppText variant="body" numberOfLines={1} style={{ flex: 1 }}>
          {mode === 'date' ? formatShortDate(value) : formatTime(value)}
        </AppText>
        <Ionicons name="chevron-down" size={15} color={theme.colors.textMuted} />
      </Pressable>

      {visible ? (
        <DateTimePicker
          value={new Date(value)}
          mode={mode}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          is24Hour
          onChange={handleChange}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    minHeight: 47,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
