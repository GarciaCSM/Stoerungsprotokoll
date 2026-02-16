import { StyleSheet } from 'react-native';

// Central theme / design tokens — expandable and safe to change app-wide
export const THEME = {
  colors: {
    dark: {
      background: '#1E293B',
      backgroundLight: '#2D3B4E',
      card: '#334155',
      cardHover: '#3B4A5F',
      border: '#475569',
      borderLight: '#64748B',
      foreground: '#F1F5F9',
      foregroundMuted: '#94A3B8',
      foregroundDim: '#64748B',
      success: '#22C55E',
      warning: '#F59E0B',
      danger: '#EF4444',
      info: '#3B82F6',
      primary: '#3B82F6',
      primaryHover: '#2563EB',
      netto: '#10B981',
      brutto: '#64748B',
      panel: '#0E2940',
      panelBorder: '#123246',
      overlayVeryLow: 'rgba(255,255,255,0.06)',
      overlayLow: 'rgba(255,255,255,0.04)',
      overlayLower: 'rgba(255,255,255,0.03)',
      textDisabled: 'rgba(241,245,249,0.48)',
      overlayModal: 'rgba(0, 0, 0, 0.7)',
    },
    light: {
      background: '#F5F7FA',
      backgroundLight: '#FFFFFF',
      card: '#FFFFFF',
      cardHover: '#FBFBFD',
      border: '#E6E9EE',
      borderLight: '#F0F2F5',
      foreground: '#2C3E50',
      foregroundMuted: '#7F8C8D',
      foregroundDim: '#95A1AA',
      success: '#22C55E',
      warning: '#F59E0B',
      danger: '#EF4444',
      info: '#3498DB',
      primary: '#3498DB',
      primaryHover: '#2B83C9',
      onPrimary: '#FFFFFF',
      overlayModal: 'rgba(0,0,0,0.4)',
    },
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
  },
  radius: {
    sm: 6,
    md: 8,
    lg: 12,
    round: 999,
  },
  shadow: {
    small: { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
    medium: { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 10, elevation: 4 },
  },
  // UI dimensions — centralize magic numbers for consistency
  dimensions: {
    minWidthSmall: 110,      // chips, small cards
    minWidthMedium: 120,     // summary cards
    minWidthLarge: 160,      // disturbance cards
    maxHeightFaResults: 220, // FA search results container
    maxHeightFaList: 180,    // FA results scrollable list
    maxHeightLogsTable: 256, // logs table max height
  },
  // Typography letter spacing — standardized values
  letterSpacing: {
    tight: 0.5,
    normal: 0.6,
    wide: 1,
    wider: 2,
  },
};

const globalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.light.background,
    padding: 16,
    flexDirection: 'row', // Adjust layout for landscape mode
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  title: {
    fontSize: 32, // Larger font size for tablet
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
  },
});

export default globalStyles;