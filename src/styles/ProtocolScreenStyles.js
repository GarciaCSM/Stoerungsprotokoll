import { StyleSheet } from 'react-native';

// Modern color palette based on screenshots
const COLORS = {
  background: '#F8FAFC',
  card: '#FFFFFF',
  border: '#E2E8F0',
  success: '#10B981',
  warning: '#F59E0B',
  info: '#3B82F6',
  destructive: '#EF4444',
  muted: '#F1F5F9',
  mutedForeground: '#64748B',
  foreground: '#0F172A',
};

export const protocolScreenStyles = StyleSheet.create({
  // Container
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },

  // Header
  titleInfoRow: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.foreground,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.mutedForeground,
    textAlign: 'center',
    marginBottom: 24,
  },

  // Timer Card
  timerCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 32,
    marginBottom: 24,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  timerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerText: {
    fontSize: 64,
    fontWeight: 'bold',
    color: COLORS.foreground,
    letterSpacing: -2,
  },

  // Status Badge
  timerChip: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginTop: 12,
    minWidth: 80,
    alignItems: 'center',
  },
  timerChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  timerChipGreen: {
    backgroundColor: COLORS.success,
  },
  timerChipRed: {
    backgroundColor: COLORS.warning,
  },
  timerChipPause: {
    backgroundColor: COLORS.info,
  },
  timerChipNeutral: {
    backgroundColor: COLORS.muted,
  },

  // Active Disruption Display
  selectedIssueText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.warning,
    marginTop: 12,
    textAlign: 'center',
  },
  stoerTimerText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.warning,
    marginTop: 8,
    textAlign: 'center',
  },

  // Action Buttons (Main 4 buttons)
  buttonsRowCentered: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginTop: 20,
    marginBottom: 20,
  },
  buttonSize: {
    width: 230,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    marginHorizontal: 6,
    paddingHorizontal: 10,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 0,
  },
  iconStartOutline: {
    width: 26,
    height: 26,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
    backgroundColor: 'transparent',
  },
  iconWarn: {
    backgroundColor: '#ffffff',
  },
  iconPause: {
    backgroundColor: '#ffffff',
  },
  iconEnde: {
    backgroundColor: '#ffffff',
  },
  buttonLabelOnButton: {
    color: '#ffffff',
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  startButton: {
    backgroundColor: COLORS.success,
    shadowColor: COLORS.success,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  actionButton: {
    backgroundColor: COLORS.warning,
    shadowColor: COLORS.warning,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  pauseButton: {
    backgroundColor: COLORS.info,
    shadowColor: COLORS.info,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  endeButton: {
    backgroundColor: COLORS.destructive,
    shadowColor: COLORS.destructive,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },

  // Disruption Selection Buttons
  responsiveButtonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  buttonResponsive: {
    width: '30%',
    minWidth: 100,
    backgroundColor: COLORS.card,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 16,
    margin: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 90,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },

  // Modal-like selector when choosing a störung
  modalSelectCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 'auto',
    marginBottom: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 3,
    alignSelf: 'center',
    maxWidth: 800,
    width: '90%',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.foreground,
  },
  modalClose: {
    fontSize: 18,
    color: COLORS.mutedForeground,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  disturbanceCard: {
    width: '31%',
    minWidth: 240,
    maxWidth: '32%',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 12,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 90,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  disturbanceIcon: {
    marginBottom: 6,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.foreground,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },

  // Summary Grid (overview)
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 12,
    marginBottom: 12,
  },
  summaryCard: {
    width: '32%',
    minWidth: 140,
    backgroundColor: COLORS.muted,
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  summaryCount: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.foreground,
    marginBottom: 6,
  },
  summaryLabel: {
    fontSize: 13,
    color: COLORS.mutedForeground,
    textAlign: 'center',
  },
  summaryTime: {
    fontSize: 12,
    color: COLORS.mutedForeground,
    textAlign: 'center',
    marginTop: 6,
    fontWeight: '600',
  },

  // Table Container
  tableContainer: {
    backgroundColor: COLORS.card,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignSelf: 'center',
    maxWidth: 760,
    width: '92%',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  tableTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.foreground,
    marginBottom: 6,
  },
  tableTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },

  // Tabs
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 0,
    paddingTop: 0,
    backgroundColor: 'transparent',
    marginBottom: 0,
  },
  tabButton: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    backgroundColor: 'transparent',
    marginRight: 4,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: COLORS.foreground,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.mutedForeground,
  },

  // Table
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.muted,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tableHeaderCell: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.mutedForeground,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableHeaderCellLeft: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.mutedForeground,
    textAlign: 'left',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingLeft: 12,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    minHeight: 52, // slightly smaller row height
  },
  tableCell: {
    flex: 1,
    fontSize: 15,
    color: COLORS.foreground,
    textAlign: 'center',
  },
  tableCellLeft: {
    flex: 1,
    fontSize: 15,
    color: COLORS.foreground,
    textAlign: 'left',
    fontWeight: '600',
    paddingLeft: 12,
  },
  tableNote: {
    fontSize: 13,
    color: COLORS.mutedForeground,
    marginTop: 4,
    fontStyle: 'italic',
  },
  tableEmpty: {
    padding: 24,
    alignItems: 'center',
  },
  tableEmptyText: {
    fontSize: 15,
    color: COLORS.mutedForeground,
  },
  tableScroll: {
    // show exactly 4 rows and then make the rest scrollable (using new row height)
    maxHeight: 52 * 4 + 48, // 4 * minHeight + header spacing (approx)
    maxHeight: 256,
  },

  // Clear Logs Button
  smallDangerButton: {
    fontSize: 13,
    color: COLORS.destructive,
    fontWeight: '600',
    padding: 0,
  },

  // Sonstiges Input
  sonstigesInput: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: COLORS.foreground,
    minHeight: 48,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
  },
  sonstigesContainer: {
    paddingHorizontal: 16,
    marginTop: 16,
  },

  // Back Button
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.mutedForeground,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.foreground,
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 15,
    color: COLORS.mutedForeground,
    marginBottom: 20,
    lineHeight: 22,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginLeft: 12,
  },
  modalCancel: {
    backgroundColor: COLORS.muted,
  },
  modalConfirm: {
    backgroundColor: COLORS.destructive,
  },
  modalCancelText: {
    color: COLORS.foreground,
    fontWeight: '600',
    fontSize: 14,
  },
  modalConfirmText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
