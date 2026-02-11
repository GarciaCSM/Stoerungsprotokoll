import { StyleSheet } from 'react-native';

// Dark Dashboard Theme
const COLORS = {
  // Dark Background
  background: '#1E293B',
  backgroundLight: '#2D3B4E',
  card: '#334155',
  cardHover: '#3B4A5F',
  
  // Borders
  border: '#475569',
  borderLight: '#64748B',
  
  // Text
  foreground: '#F1F5F9',
  foregroundMuted: '#94A3B8',
  foregroundDim: '#64748B',
  
  // Status Colors
  success: '#22C55E',
  successDark: '#16A34A',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',
  
  // Accent
  primary: '#3B82F6',
  primaryHover: '#2563EB',
  
  // Special
  netto: '#10B981',
  brutto: '#64748B',
};

const protocolScreenStyles = StyleSheet.create({
  // Main Container
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    flex: 1,
    padding: 20,
  },

  // Header Bar
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
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
    letterSpacing: 2,
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

  // FA-Section Card - Full Width
  faSectionCardFullWidth: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  faSectionCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  
  // Section Title
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.foregroundMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
  },

  // FA Search
  faSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  faSearchInput: {
    flex: 1,
    backgroundColor: COLORS.backgroundLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.foreground,
  },
  faSearchButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 8,
    gap: 6,
  },
  faSearchButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  faSearchError: {
    color: COLORS.danger,
    fontSize: 13,
    marginTop: 8,
    marginBottom: 4,
  },

  // FA Results
  faResultsContainer: {
    backgroundColor: COLORS.backgroundLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    marginTop: 8,
    maxHeight: 220,
  },
  faResultsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.foregroundMuted,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  faResultsList: {
    maxHeight: 180,
  },
  faResultItem: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  faResultFANr: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.foreground,
    marginBottom: 4,
  },
  faResultArtikel: {
    fontSize: 12,
    color: COLORS.foregroundMuted,
  },

  // Selected FA Display
  faSelectedContainer: {
    backgroundColor: COLORS.backgroundLight,
    borderWidth: 1,
    borderColor: COLORS.success,
    borderRadius: 8,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  faSelectedContent: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
  },
  faSelectedLabel: {
    fontSize: 10,
    color: COLORS.foregroundMuted,
    fontWeight: '600',
    marginBottom: 3,
    textTransform: 'uppercase',
  },
  faSelectedValue: {
    fontSize: 13,
    color: COLORS.foreground,
    fontWeight: '500',
  },
  faRemoveButton: {
    backgroundColor: COLORS.danger,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },

  // SOLL/IST Cards
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
  sollIstTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.foregroundMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  sollIstValue: {
    fontSize: 64,
    fontWeight: '700',
    color: COLORS.foreground,
    lineHeight: 64,
  },
  sollIstSubtext: {
    fontSize: 13,
    color: COLORS.foregroundMuted,
    marginTop: 8,
  },
  sollIstDiff: {
    fontSize: 13,
    color: COLORS.foregroundMuted,
    marginTop: 4,
  },

  // Zeitübersicht Card
  zeitCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  zeitTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.foregroundMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
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
    fontSize: 15,
    color: COLORS.foreground,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },

  // Action Buttons
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
    color: '#FFFFFF',
    textAlign: 'center',
    fontWeight: '600',
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

  // Störung Selector Grid
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  disturbanceCard: {
    width: '31%',
    minWidth: 160,
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

  // Modal für Störungsauswahl
  modalSelectCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 'auto',
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

  // Störung Timer
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

  // Protokoll Tabelle
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
  
  tabRow: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 8,
  },
  tabButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: COLORS.backgroundLight,
  },
  tabActive: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: 13,
    color: COLORS.foregroundMuted,
    fontWeight: '500',
  },

  tableContainer: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
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
    maxHeight: 256,
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

  // Summary Grid
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    minWidth: 120,
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

  // Confirm Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 24,
    width: '80%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalText: {
    fontSize: 16,
    color: COLORS.foreground,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
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
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },


  // Right Column (for dashboard grid layout)
  rightColumn: {
    flex: 1,
  },

  // Actions Section
  actionsSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },

  // Störung Modal (selection screen)
  stoerungModal: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 20,
    margin: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  // Logs Section
  logsSection: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 20,
    margin: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  // Tab Text Active
  tabTextActive: {
    color: COLORS.foreground,
    fontWeight: '600',
  },

  // Action Button Active State
  actionButtonActive: {
    opacity: 0.7,
  },
});

export default protocolScreenStyles;
