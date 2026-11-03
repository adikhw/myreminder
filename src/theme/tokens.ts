export interface ThemeColors {
  background: string;
  backgroundAlt: string;
  surface: string;
  surfaceAlt: string;
  surfacePressed: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;
  primary: string;
  primaryPressed: string;
  primarySoft: string;
  onPrimary: string;
  border: string;
  borderStrong: string;
  danger: string;
  dangerSoft: string;
  onDanger: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  overlay: string;
  shadow: string;
  tabBar: string;
  input: string;
  inputFocused: string;
}

export interface Theme {
  mode: 'light' | 'dark';
  colors: ThemeColors;
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
    xxxl: number;
  };
  radius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
    pill: number;
  };
  fontSize: {
    micro: number;
    caption: number;
    small: number;
    body: number;
    bodyLarge: number;
    heading: number;
    title: number;
    display: number;
  };
  lineHeight: {
    micro: number;
    caption: number;
    small: number;
    body: number;
    bodyLarge: number;
    heading: number;
    title: number;
    display: number;
  };
}

const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 40,
} as const;

const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
} as const;

const fontSize = {
  micro: 11,
  caption: 12,
  small: 13,
  body: 15,
  bodyLarge: 16,
  heading: 19,
  title: 24,
  display: 31,
} as const;

const lineHeight = {
  micro: 15,
  caption: 17,
  small: 19,
  body: 22,
  bodyLarge: 24,
  heading: 26,
  title: 31,
  display: 38,
} as const;

export const lightTheme: Theme = {
  mode: 'light',
  colors: {
    background: '#F4F5FB',
    backgroundAlt: '#EBEDF8',
    surface: '#FFFFFF',
    surfaceAlt: '#F1F3FC',
    surfacePressed: '#E9EBF7',
    text: '#16172B',
    textSecondary: '#5A5E78',
    textMuted: '#8A8FA7',
    textInverse: '#FFFFFF',
    primary: '#4F46E5',
    primaryPressed: '#4338CA',
    primarySoft: '#ECEDFF',
    onPrimary: '#FFFFFF',
    border: '#E2E4F1',
    borderStrong: '#CFD2E6',
    danger: '#D92D45',
    dangerSoft: '#FFF0F2',
    onDanger: '#FFFFFF',
    success: '#087F5B',
    successSoft: '#E8FBF4',
    warning: '#B45309',
    warningSoft: '#FFF7E6',
    overlay: 'rgba(15, 16, 32, 0.46)',
    shadow: 'rgba(27, 30, 69, 0.10)',
    tabBar: '#FFFFFF',
    input: '#F7F8FD',
    inputFocused: '#FFFFFF',
  },
  spacing,
  radius,
  fontSize,
  lineHeight,
};

export const darkTheme: Theme = {
  mode: 'dark',
  colors: {
    background: '#0B0C12',
    backgroundAlt: '#10121B',
    surface: '#151722',
    surfaceAlt: '#1C1F2D',
    surfacePressed: '#232739',
    text: '#F3F4FA',
    textSecondary: '#B3B7CA',
    textMuted: '#7E839B',
    textInverse: '#0B0C12',
    primary: '#8B87FF',
    primaryPressed: '#A6A2FF',
    primarySoft: '#242452',
    onPrimary: '#12132A',
    border: '#262A3B',
    borderStrong: '#363B52',
    danger: '#FF7A8A',
    dangerSoft: '#2C161C',
    onDanger: '#240B10',
    success: '#4ADEB4',
    successSoft: '#102820',
    warning: '#F6C45B',
    warningSoft: '#2B2312',
    overlay: 'rgba(0, 0, 0, 0.60)',
    shadow: 'rgba(0, 0, 0, 0.42)',
    tabBar: '#10121A',
    input: '#1A1D2A',
    inputFocused: '#1F2333',
  },
  spacing,
  radius,
  fontSize,
  lineHeight,
};

export const themes = {
  light: lightTheme,
  dark: darkTheme,
} as const;
