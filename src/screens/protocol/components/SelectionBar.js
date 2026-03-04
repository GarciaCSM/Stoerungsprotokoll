import React from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import s from '../../../styles/ProtocolScreenStyles';
import { THEME } from '../../../styles/globalStyles';

const LINE_OPTIONS   = [
  { label: 'Linie 1', value: 'Linie 1' },
  { label: 'Linie 2', value: 'Linie 2' },
  { label: 'Linie 3', value: 'Linie 3' },
  { label: 'Linie 4', value: 'Linie 4' },
  { label: 'Linie 5', value: 'Linie 5' },
  { label: 'Linie 6', value: 'Linie 6' },
];
const LEADER_OPTIONS = [{ label: 'Melih Iskender', value: 'Melih Iskender' }];
const SHIFT_OPTIONS  = [
  { label: 'Frühschicht', value: 'Frühschicht' },
  { label: 'Spätschicht', value: 'Spätschicht' },
];
const BEREICH_OPTIONS = [
  { label: 'Abfüllung',  value: 'Abfüllung' },
  { label: 'Verpackung', value: 'Verpackung' },
];

export default function SelectionBar({
  localLine, setLocalLine,
  localLeader, setLocalLeader,
  localShift, setLocalShift,
  localBereich, setLocalBereich,
  selectionConfirmed, setSelectionConfirmed,
  lineLocked, setLineLocked,
  openSelectModal, setOpenSelectModal,
  shiftData,
  anzahlArbeiter,
  sollPerHour,
  handleConfirmSelection,
  showConfirm,
}) {
  return (
    <>
      <View style={s.topSelectionBar}>
        {!selectionConfirmed ? (
          <>
            <View style={s.selectionGroup}>
              {/* Linie */}
              <TouchableOpacity
                style={[s.selectionChip, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}
                onPress={() => { if (!lineLocked) setOpenSelectModal('line'); }}
                activeOpacity={lineLocked ? 1 : 0.7}
              >
                <View>
                  <Text style={s.selectionLabelSmall}>Linie</Text>
                  <Text style={s.selectionValueSmall}>{localLine || ''}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    if (lineLocked) {
                      showConfirm({
                        title: 'Linie entsperren',
                        message: 'Linie wirklich entsperren?',
                        onConfirm: async () => {
                          setLineLocked(false);
                          try { await AsyncStorage.removeItem('assigned_line_locked'); } catch {}
                        },
                      });
                    } else {
                      setLineLocked(true);
                      AsyncStorage.setItem('assigned_line_locked', 'true');
                    }
                  }}
                  style={{ paddingLeft: 8, paddingRight: 4 }}
                >
                  <MaterialIcons
                    name={lineLocked ? 'lock' : 'lock-open'}
                    size={18}
                    color={lineLocked ? THEME.colors.dark.warning : THEME.colors.dark.foregroundMuted}
                  />
                </TouchableOpacity>
              </TouchableOpacity>

              {/* Linienführer */}
              <TouchableOpacity style={s.selectionChip} onPress={() => setOpenSelectModal('leader')}>
                <Text style={s.selectionLabelSmall}>Linienführer</Text>
                <Text style={s.selectionValueSmall}>{localLeader || ''}</Text>
              </TouchableOpacity>

              {/* Schicht */}
              <TouchableOpacity style={s.selectionChip} onPress={() => setOpenSelectModal('shift')}>
                <Text style={s.selectionLabelSmall}>Schicht</Text>
                <Text style={s.selectionValueSmall}>{localShift || ''}</Text>
              </TouchableOpacity>

              {/* Station */}
              <TouchableOpacity style={s.selectionChip} onPress={() => setOpenSelectModal('bereich')}>
                <Text style={s.selectionLabelSmall}>Station</Text>
                <Text style={s.selectionValueSmall}>{localBereich || ''}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={s.confirmSmallButton} onPress={handleConfirmSelection}>
              <Text style={s.confirmSmallButtonText}>Bestätigen</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 12 }}>
            <View style={s.selectionSummarySmall}>
              <Text style={{ color: THEME.colors.dark.foregroundMuted, fontSize: 11 }}>Linie</Text>
              <Text style={{ color: THEME.colors.dark.foreground, fontWeight: '700', marginLeft: 8 }}>{shiftData.selectedLine}</Text>
              {lineLocked && <MaterialIcons name="lock" size={14} color={THEME.colors.dark.warning} style={{ marginLeft: 8 }} />}
              {shiftData.selectedBereich ? (
                <>
                  <Text style={{ color: THEME.colors.dark.foregroundMuted, fontSize: 11, marginLeft: 12 }}>Station</Text>
                  <Text style={{ color: THEME.colors.dark.foreground, fontWeight: '700', marginLeft: 8 }}>{shiftData.selectedBereich}</Text>
                </>
              ) : null}
              <Text style={{ color: THEME.colors.dark.foregroundMuted, fontSize: 11, marginLeft: 12 }}>Schicht</Text>
              <Text style={{ color: THEME.colors.dark.foreground, fontWeight: '700', marginLeft: 8 }}>{shiftData.selectedShift}</Text>
              <Text style={{ color: THEME.colors.dark.foregroundMuted, fontSize: 11, marginLeft: 12 }}>Führer</Text>
              <Text style={{ color: THEME.colors.dark.foreground, fontWeight: '700', marginLeft: 8 }}>{shiftData.selectedLeader}</Text>
              <MaterialIcons name="people" size={13} color={THEME.colors.dark.foregroundMuted} style={{ marginLeft: 12 }} />
              <Text style={{ color: anzahlArbeiter != null ? THEME.colors.dark.foreground : THEME.colors.dark.foregroundMuted, fontWeight: '700', marginLeft: 4 }}>
                {anzahlArbeiter != null ? anzahlArbeiter : ''}
              </Text>
              {sollPerHour > 0 ? (
                <>
                  <MaterialIcons name="speed" size={13} color={THEME.colors.dark.foregroundMuted} style={{ marginLeft: 12 }} />
                  <Text style={{ color: THEME.colors.dark.foreground, fontWeight: '700', marginLeft: 4 }}>
                    {sollPerHour}/h
                  </Text>
                </>
              ) : null}
            </View>
            <TouchableOpacity onPress={() => setSelectionConfirmed(false)}>
              <Text style={s.editSelectionText}>Ändern</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Picker Modal */}
      <Modal visible={openSelectModal !== null} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalSelectCard}>
            <View style={s.modalHeaderRow}>
              <Text style={s.modalTitle}>
                {openSelectModal === 'line' ? 'Linie wählen' : openSelectModal === 'leader' ? 'Linienführer wählen' : openSelectModal === 'bereich' ? 'Station wählen' : 'Schicht wählen'}
              </Text>
              <TouchableOpacity onPress={() => setOpenSelectModal(null)}>
                <Text style={s.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView>
              {(openSelectModal === 'line' ? LINE_OPTIONS : openSelectModal === 'leader' ? LEADER_OPTIONS : openSelectModal === 'bereich' ? BEREICH_OPTIONS : SHIFT_OPTIONS).map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: THEME.colors.dark.border }}
                  onPress={() => {
                    if (openSelectModal === 'line')    setLocalLine(opt.value);
                    if (openSelectModal === 'leader')  setLocalLeader(opt.value);
                    if (openSelectModal === 'shift')   setLocalShift(opt.value);
                    if (openSelectModal === 'bereich') setLocalBereich(opt.value);
                    setOpenSelectModal(null);
                  }}
                >
                  <Text style={{ color: THEME.colors.dark.foreground, fontWeight: '600' }}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 }}>
              <TouchableOpacity onPress={() => setOpenSelectModal(null)} style={[s.modalButton, s.modalCancel]}>
                <Text style={s.modalCancelText}>Abbrechen</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
