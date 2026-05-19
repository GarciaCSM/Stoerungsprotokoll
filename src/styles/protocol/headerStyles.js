import { StyleSheet } from 'react-native';
import { THEME } from '../globalStyles';

const COLORS = THEME.colors.dark;

export default StyleSheet.create({
  baseCard: {
    backgroundColor: COLORS.card,
    borderRadius: THEME.radius.lg,
    padding: THEME.spacing.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    flex: 1,
    padding: THEME.spacing.xl,
  },
  scrollContent: {
    paddingBottom: 160,
  },

  // Header Bar
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  appIcon: {
    width: 40,
    height: 40,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleGroup: {
    flexDirection: 'column',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.foreground,
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.foregroundMuted,
    marginTop: 2,
  },
  headerTime: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.foreground,
    letterSpacing: THEME.letterSpacing.wider,
  },

  // Runtime status indicator
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.overlayVeryLow,
  },
  statusText: {
    fontSize: 12,
    color: COLORS.foregroundMuted,
    fontWeight: '600',
  },

  // Dashboard Grid Layout
  dashboardGrid: {
    flexDirection: 'column',
    gap: 16,
    marginBottom: 16,
  },
  dashboardColumn: {
    flex: 1,
    gap: 16,
  },
  rightColumn: {
    flex: 1,
  },

  // Top selection bar
  topSelectionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: THEME.spacing.md,
    marginBottom: THEME.spacing.lg,
    paddingHorizontal: THEME.spacing.xl,
  },
  selectionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  selectionChip: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: THEME.spacing.sm,
    paddingHorizontal: THEME.spacing.md,
    borderRadius: THEME.radius.md,
    minWidth: THEME.dimensions.minWidthSmall,
    alignItems: 'flex-start',
  },
  selectionChipMissing: {
    borderColor: COLORS.danger,
  },
  selectionChipFilled: {
    borderColor: COLORS.success,
  },
  selectionLabelSmall: {
    fontSize: 9,
    color: COLORS.foregroundMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  selectionValueSmall: {
    fontSize: 12,
    color: COLORS.foreground,
    fontWeight: '600',
  },
  confirmSmallButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: THEME.spacing.sm,
    paddingHorizontal: THEME.spacing.md,
    borderRadius: THEME.radius.md,
    marginRight: THEME.spacing.sm,
  },
  confirmSmallButtonDisabled: {
    backgroundColor: COLORS.backgroundLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    opacity: 0.65,
  },
  confirmSmallButtonText: {
    color: COLORS.foreground,
    fontWeight: '700',
    fontSize: 13,
  },
  confirmSmallButtonTextDisabled: {
    color: COLORS.foregroundMuted,
  },
  selectionSummarySmall: {
    backgroundColor: COLORS.backgroundLight,
    paddingVertical: THEME.spacing.sm,
    paddingHorizontal: THEME.spacing.md,
    borderRadius: THEME.radius.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  editSelectionText: {
    color: COLORS.foregroundMuted,
    fontSize: 12,
    marginRight: 8,
  },
});
