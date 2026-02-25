import { StyleSheet } from 'react-native';
import { THEME } from '../globalStyles';

const COLORS = THEME.colors.dark;

export default StyleSheet.create({
  actionsSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 8,
    minHeight: 48,
  },
  actionButtonText: {
    fontSize: 13,
    color: COLORS.foreground,
    textAlign: 'center',
    fontWeight: '600',
  },
  actionButtonDisabled: {
    backgroundColor: COLORS.overlayLow,
    borderWidth: 1,
    borderColor: COLORS.overlayLower,
    opacity: 0.5,
  },
  actionButtonTextDisabled: {
    color: COLORS.textDisabled,
  },
  actionButtonActive: {
    opacity: 0.7,
  },
  startButton: {
    backgroundColor: COLORS.success,
  },
  stoerungButton: {
    backgroundColor: COLORS.warning,
  },
  pauseButton: {
    backgroundColor: COLORS.info,
  },
  endeButton: {
    backgroundColor: COLORS.danger,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: COLORS.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    ...THEME.shadow.small,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.foregroundMuted,
  },
});
