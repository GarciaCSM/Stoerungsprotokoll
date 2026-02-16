import { StyleSheet, Platform } from 'react-native';

import { THEME } from './globalStyles';

// use centralized theme palette (dark mode for Protocol screen)
const COLORS = THEME.colors.dark;

const protocolScreenStyles = StyleSheet.create({
  // Base Card Style — reusable across all card components
  baseCard: {
    backgroundColor: COLORS.card,
    borderRadius: THEME.radius.lg,
    padding: THEME.spacing.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  // Main Container
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    flex: 1,
    padding: THEME.spacing.xl,
  },
  // ensure there's inner scroll padding so last elements are reachable under floating controls
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

  // Compact top selection bar (line / leader / shift)
  topSelectionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: THEME.spacing.md,
    marginBottom: THEME.spacing.lg,
    paddingHorizontal: THEME.spacing.xl,          // align with card padding
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
    marginRight: THEME.spacing.sm,                 // spacing from right edge
  },
  confirmSmallButtonText: {
    color: COLORS.foreground,
    fontWeight: '700',
    fontSize: 13,
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
    marginRight: 8,                // spacing from right edge
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

  // Runtime status indicator (small LED + label)
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

  // FA-Section Card (single source-of-truth)
  faSectionCard: {
    backgroundColor: COLORS.card,
    borderRadius: THEME.radius.lg,
    padding: THEME.spacing.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  
  // Section Title
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.foregroundMuted,
    textTransform: 'uppercase',
    letterSpacing: THEME.letterSpacing.wide,
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
    color: COLORS.foreground,
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
    maxHeight: THEME.dimensions.maxHeightFaResults,
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
    maxHeight: THEME.dimensions.maxHeightFaList,
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
  sollIstCardSpacing: {
    marginTop: 12,
  },
  // New layout helpers for combined SOLL/IST + Zeitübersicht row
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

  // pair layout used for BRUTTO/NETTO and STÖRUNG/PAUSE side-by-side
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

  // inner box used for each Zeit‑element (dunklerer Blauton)
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
    color: COLORS.foreground,
    textAlign: 'center',
    fontWeight: '600',
  },
  // Disabled state for primary action (greyed out)
  actionButtonDisabled: {
    backgroundColor: COLORS.overlayLow,
    borderWidth: 1,
    borderColor: COLORS.overlayLower,
    opacity: 0.5,
  },
  actionButtonTextDisabled: {
    color: COLORS.textDisabled,
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

  tabText: {
    fontSize: 13,
    color: COLORS.foregroundMuted,
    fontWeight: '500',
  },

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

  // Summary Grid
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

  // Confirm Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlayModal,
    justifyContent: 'center',
    alignItems: 'center',
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

  /* Compact modal styles used by ConfirmModal */
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

  // Right Column (for dashboard grid layout)
  rightColumn: {
    flex: 1,
  },

  // Back Button (placed after ScrollView)
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
    borderRadius: THEME.radius.lg,
    padding: THEME.spacing.xl,
    margin: THEME.spacing.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  // Logs Section
  logsSection: {
    /* removed outer "card" box per UI request — keep spacing but no background/border */
    backgroundColor: 'transparent',
    borderRadius: 0,
    padding: 0,
    margin: THEME.spacing.lg,
    borderWidth: 0,
  },

  // Tabs: group the two tab buttons inside a single pill-like container
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
