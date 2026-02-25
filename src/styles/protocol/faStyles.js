import { StyleSheet } from 'react-native';
import { THEME } from '../globalStyles';

const COLORS = THEME.colors.dark;

export default StyleSheet.create({
  faSectionCard: {
    backgroundColor: COLORS.card,
    borderRadius: THEME.radius.lg,
    padding: THEME.spacing.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.foregroundMuted,
    textTransform: 'uppercase',
    letterSpacing: THEME.letterSpacing.wide,
    marginBottom: 16,
  },

  // Search
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

  // Results
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

  // Selected FA
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
    backgroundColor: COLORS.background,
    //backgroundColor: COLORS.danger,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
});
