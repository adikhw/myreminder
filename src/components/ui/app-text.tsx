import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Text, type TextProps, type TextStyle } from 'react-native';

import { useTheme, type Theme } from '@/theme';
import type { ThemeColors } from '@/theme/tokens';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export type TextVariant =
  | 'display'
  | 'title'
  | 'heading'
  | 'subheading'
  | 'body'
  | 'bodyLarge'
  | 'small'
  | 'caption'
  | 'micro'
  | 'label';

const weights: Record<TextVariant, TextStyle['fontWeight']> = {
  display: '800',
  title: '800',
  heading: '700',
  subheading: '600',
  body: '400',
  bodyLarge: '400',
  small: '400',
  caption: '400',
  micro: '500',
  label: '600',
};

const sizeKeys: Record<TextVariant, keyof Theme['fontSize']> = {
  display: 'display',
  title: 'title',
  heading: 'heading',
  subheading: 'bodyLarge',
  body: 'body',
  bodyLarge: 'bodyLarge',
  small: 'small',
  caption: 'caption',
  micro: 'micro',
  label: 'small',
};

interface AppTextProps extends TextProps {
  variant?: TextVariant;
  color?: keyof ThemeColors;
  weight?: TextStyle['fontWeight'];
}

export function AppText({
  variant = 'body',
  color = 'text',
  weight,
  style,
  ...rest
}: AppTextProps) {
  const theme = useTheme();
  const sizeKey = sizeKeys[variant];

  return (
    <Text
      {...rest}
      style={[
        {
          fontSize: theme.fontSize[sizeKey],
          lineHeight: theme.lineHeight[sizeKey],
          fontWeight: weight ?? weights[variant],
          color: theme.colors[color],
        },
        style,
      ]}
    />
  );
}

export { Ionicons };
