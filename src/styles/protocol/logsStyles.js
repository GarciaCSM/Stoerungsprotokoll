import { StyleSheet } from 'react-native';
import { THEME } from '../globalStyles';

const COLORS = THEME.colors.dark;

export default StyleSheet.create({
  // Störung selector grid
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  disturbanceCard: {
    width: '31%',
    minWidth: THEME.dimensions.minWidthLarge,
    maxWidth: '32%',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'flex-start',
    minHeight: 90,
  },
  disturbanceIcon: {
    marginBottom: 8,
  },
  stoerungModal: {
    backgroundColor: COLORS.card,
    borderRadius: THEME.radius.lg,
    padding: THEME.spacing.xl,
    margin: THEME.spacing.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  // Active störung display
  stoerTimerText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.warning,
    textAlign: 'center',
    marginTop: 12,
  },
  selectedIssueText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.foreground,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  sonstigesInput: {
    backgroundColor: COLORS.backgroundLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.foreground,
    marginTop: 12,
    minHeight: 80,
    textAlignVertical: 'top',
  },

  // Logs section
  logsSection: {
    backgroundColor: 'transparent',
    borderRadius: 0,
    padding: 0,
    margin: THEME.spacing.lg,
    borderWidth: 0,
  },
  tableTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 12,
  },
  tableTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.foreground,
  },
  smallDangerButton: {
    color: COLORS.danger,
    fontSize: 13,
    fontWeight: '600',
  },

  // Tabs
  tabRow: {
    flexDirection: 'row',
    marginBottom: THEME.spacing.md,
    gap: THEME.spacing.sm,
    backgroundColor: COLORS.backgroundLight,
    padding: THEME.spacing.xs,
    borderRadius: THEME.radius.round,
    alignSelf: 'flex-start',
  },
  tabButton: {
    paddingHorizontal: THEME.spacing.lg,
    paddingVertical: THEME.spacing.sm,
    borderRadius: THEME.radius.md,
    backgroundColor: 'transparent',
  },
  tabActive: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
  },
  tabText: {
    fontSize: 13,
    color: COLORS.foregroundMuted,
    fontWeight: '500',
  },
  tabTextActive: {
    color: COLORS.foreground,
    fontWeight: '600',
  },

  // Table
  tableContainer: {
    backgroundColor: COLORS.card,
    borderRadius: THEME.radius.lg,
    padding: THEME.spacing.lg,
    maxWidth: 760,
    width: '92%',
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tableHeaderCell: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.foregroundMuted,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  tableHeaderCellLeft: {
    textAlign: 'left',
  },
  tableScroll: {
    maxHeight: THEME.dimensions.maxHeightLogsTable,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    minHeight: 52,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tableCell: {
    flex: 1,
    fontSize: 15,
    color: COLORS.foreground,
    textAlign: 'center',
  },
  tableCellLeft: {
    fontSize: 15,
    color: COLORS.foreground,
    fontWeight: '500',
    textAlign: 'left',
  },
  tableNote: {
    fontSize: 12,
    color: COLORS.foregroundMuted,
    marginTop: 4,
    fontStyle: 'italic',
  },
  tableEmpty: {
    textAlign: 'center',
    color: COLORS.foregroundMuted,
    fontSize: 14,
    paddingVertical: 24,
  },

  // Summary grid
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    minWidth: THEME.dimensions.minWidthMedium,
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  summaryCount: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.foreground,
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: COLORS.foregroundMuted,
    textAlign: 'center',
    marginBottom: 8,
  },
  summaryTime: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.warning,
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlayModal,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalSelectCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignSelf: 'center',
    maxWidth: 900,
    width: '90%',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.foreground,
  },
  modalClose: {
    fontSize: 20,
    color: COLORS.foregroundMuted,
    fontWeight: '600',
    padding: 4,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCancel: {
    backgroundColor: COLORS.backgroundLight,
  },
  modalConfirm: {
    backgroundColor: COLORS.danger,
  },
  modalCancelText: {
    color: COLORS.foreground,
    fontWeight: '600',
    fontSize: 14,
  },
  modalConfirmText: {
    color: COLORS.foreground,
    fontWeight: '700',
    fontSize: 14,
  },
  modalContainerCompact: {
    width: '88%',
    maxWidth: 360,
    backgroundColor: COLORS.card,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalMessageCompact: {
    fontSize: 14,
    color: COLORS.foregroundMuted,
    marginBottom: 12,
    textAlign: 'center',
  },
  modalButtonsRowCompact: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  modalButtonCompact: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    minWidth: THEME.dimensions.minWidthSmall,
    alignItems: 'center',
  },
});
