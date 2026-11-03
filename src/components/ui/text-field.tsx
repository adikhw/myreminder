import { useState } from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '@/theme';

import { AppText } from './app-text';

interface TextFieldProps extends TextInputProps {
  label?: string;
  error?: string;
  helper?: string;
  containerStyle?: StyleProp<ViewStyle>;
}

export function TextField({
  label,
  error,
  helper,
  containerStyle,
  style,
  multiline = false,
  onFocus,
  onBlur,
  ...rest
}: TextFieldProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View style={containerStyle}>
      {label ? (
        <AppText variant="label" color="textSecondary" style={{ marginBottom: 7 }}>
          {label}
        </AppText>
      ) : null}
      <TextInput
        {...rest}
        multiline={multiline}
        placeholderTextColor={theme.colors.textMuted}
        selectionColor={theme.colors.primary}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        style={[
          styles.input,
          {
            backgroundColor: focused ? theme.colors.inputFocused : theme.colors.input,
            borderColor: error
              ? theme.colors.danger
              : focused
                ? theme.colors.primary
                : theme.colors.border,
            borderRadius: theme.radius.md,
            color: theme.colors.text,
            paddingVertical: multiline ? 12 : 13,
            minHeight: multiline ? 104 : undefined,
            textAlignVertical: multiline ? 'top' : 'center',
            fontSize: theme.fontSize.body,
          },
          style,
        ]}
      />
      {error ? (
        <AppText variant="caption" color="danger" style={{ marginTop: 6 }}>
          {error}
        </AppText>
      ) : helper ? (
        <AppText variant="caption" color="textMuted" style={{ marginTop: 6 }}>
          {helper}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
  },
});

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  return (
    <View
      style={[
        { height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.border },
        style,
      ]}
    />
  );
}
