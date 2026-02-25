import { StyleSheet, Platform } from 'react-native';
import { THEME } from '../globalStyles';

const COLORS = THEME.colors.dark;

export default StyleSheet.create({
  sollIstRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  sollIstCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  sollIstCardSpacing: {
    marginTop: 12,
  },
  sollIstZeitRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  sollIstColumn: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'flex-start',
  },
  zeitColumn: {
    flex: 2,
  },
  zeitStartRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  zeitStartItem: {
    flex: 1,
    paddingRight: 8,
  },
  sollIstTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.foregroundMuted,
    textTransform: 'uppercase',
    letterSpacing: THEME.letterSpacing.wide,
    marginBottom: 12,
  },
  sollIstValue: {
    fontSize: 48,
    fontWeight: '800',
    color: COLORS.foreground,
    lineHeight: 52,
    letterSpacing: -1,
  },
  sollIstSubtext: {
    fontSize: 12,
    color: COLORS.foregroundMuted,
    marginTop: 6,
  },
  sollIstLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.foregroundMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sollIstDiff: {
    fontSize: 13,
    color: COLORS.foregroundMuted,
    marginTop: 4,
  },

  // Zeitübersicht
  zeitTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.foregroundMuted,
    textTransform: 'uppercase',
    letterSpacing: THEME.letterSpacing.wide,
    marginBottom: 16,
  },
  zeitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  zeitRowLast: {
    marginBottom: 0,
  },
  zeitPairRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  zeitPairItem: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  zeitPairLabel: {
    fontSize: 13,
    color: COLORS.foregroundMuted,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: THEME.letterSpacing.normal,
  },
  zeitPairValue: {
    fontSize: 16,
    color: COLORS.foreground,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  zeitInnerBox: {
    backgroundColor: COLORS.panel,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.panelBorder,
    width: '100%',
  },
  zeitLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  zeitLabelText: {
    fontSize: 13,
    color: COLORS.foregroundMuted,
    fontWeight: '500',
  },
  zeitValue: {
    fontSize: 16,
    color: COLORS.foreground,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: THEME.letterSpacing.tight,
  },
});
