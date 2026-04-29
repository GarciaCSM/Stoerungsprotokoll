import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, Modal } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import s from '../../../styles/ProtocolScreenStyles';
import { THEME } from '../../../styles/globalStyles';

function StörungGrid({ buttons, onSelect, onClose }) {
  return (
    <View style={s.modalSelectCard}>
      <View style={s.modalHeaderRow}>
        <Text style={s.modalTitle}>Störung auswählen</Text>
        <TouchableOpacity onPress={onClose}>
          <Text style={s.modalClose}>✕</Text>
        </TouchableOpacity>
      </View>
      <View style={s.gridContainer}>
        {buttons.map((label, i) => (
          <TouchableOpacity
            key={i}
            style={s.disturbanceCard}
            onPress={() => onSelect(label)}
          >
            <View style={{ alignItems: 'center' }}>
              <MaterialIcons name="warning" size={20} color={THEME.colors.dark.foregroundMuted} style={s.disturbanceIcon} />
              <Text style={s.actionButtonText} numberOfLines={2} ellipsizeMode="tail">{label}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export default function ActionSection({
  currentView, setCurrentView,
  timer,
  selectedFA,
  selectionConfirmed,
  showConfirm,
  setFaSearchError,
  effectiveLine,
  lineButtonConfig,
  onEnde,
  formatTime,
  scrollViewRef,
}) {
  // All buttons are locked until a shift is confirmed (and unlocked again after Ende)
  const allDisabled = !selectionConfirmed;
  const stoerungDisabled = allDisabled || !selectedFA || !timer.running;
  const [sonstigesModalVisible, setSonstigesModalVisible] = useState(false);
  const [sonstigesDraft, setSonstigesDraft] = useState('');

  const openSonstigesModal = () => {
    setSonstigesDraft(timer.sonstigesText || '');
    setSonstigesModalVisible(true);
  };

  const confirmSonstiges = () => {
    const note = sonstigesDraft.trim();
    if (!note) return;
    timer.setSonstigesText(note);
    timer.handleIssueSelect('Sonstiges', note);
    setSonstigesModalVisible(false);
    setCurrentView('initial');
  };

  const cancelSonstiges = () => {
    setSonstigesModalVisible(false);
    setCurrentView('störung');
  };

  useEffect(() => {
    if (currentView !== 'störung') return;
    const handle = setTimeout(() => {
      scrollViewRef?.current?.scrollToEnd?.({ animated: true });
    }, 50);
    return () => clearTimeout(handle);
  }, [currentView, scrollViewRef]);

  return (
    <>
      {/* Active Störung timer */}
      {timer.stoerRunning && (
        <View style={{ padding: 16 }}>
          <Text style={s.stoerTimerText}>Stör-Timer: {formatTime(timer.stoerElapsed)}</Text>
        </View>
      )}

      {/* Active Störung label + Sonstiges input */}
      {timer.selectedIssue && (
        <View style={{ padding: 16 }}>
          <Text style={s.selectedIssueText}>Aktuelle Störung: {timer.selectedIssue}</Text>
          {timer.selectedIssue === 'Sonstiges' && !!timer.sonstigesText && (
            <Text style={[s.selectedIssueText, { marginTop: 8, color: THEME.colors.dark.foregroundMuted }]}>Notiz: {timer.sonstigesText}</Text>
          )}
        </View>
      )}

      {/* Action Buttons (initial view) */}
      {currentView === 'initial' && (
        <View style={s.actionsSection}>
          {timer.showStartOnly ? (
            <View style={s.buttonsRow}>
              <TouchableOpacity
                style={[s.actionButton, s.startButton, (allDisabled || !selectedFA) && s.actionButtonDisabled]}
                onPress={() => showConfirm({
                  title: 'Weiter',
                  message: 'Produktion fortsetzen?',
                  onConfirm: () => timer.handleStart(selectedFA, setFaSearchError, setCurrentView),
                })}
                disabled={allDisabled || !selectedFA}
              >
                <MaterialIcons name="play-arrow" size={20} color={(allDisabled || !selectedFA) ? THEME.colors.dark.foregroundMuted : THEME.colors.dark.foreground} />
                <Text style={[s.actionButtonText, (allDisabled || !selectedFA) && s.actionButtonTextDisabled]}>Weiter</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.actionButton, s.modalCancel, allDisabled && s.actionButtonDisabled]}
                onPress={() => timer.handleCancelStoer(setCurrentView)}
                disabled={allDisabled}
              >
                <Text style={[s.modalCancelText, allDisabled && s.actionButtonTextDisabled]}>Abbrechen</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={s.buttonsRow}>
              {/* Start / Weiter */}
              <TouchableOpacity
                style={[s.actionButton, s.startButton, timer.activeButton === 'start' && s.actionButtonActive, (allDisabled || !selectedFA) && s.actionButtonDisabled]}
                onPress={() => showConfirm({
                  title: timer.pauseRunning ? 'Produktion fortsetzen' : 'Produktion starten',
                  message: timer.pauseRunning
                    ? 'Bist du sicher, dass du die Produktion fortsetzen möchtest?'
                    : 'Bist du sicher, dass du die Produktion starten möchtest?',
                  onConfirm: () => timer.handleStart(selectedFA, setFaSearchError, setCurrentView),
                })}
                disabled={allDisabled || !selectedFA || (timer.activeButton === 'start' && !timer.pauseRunning)}
              >
                <MaterialIcons name="play-arrow" size={20} color={(allDisabled || !selectedFA) ? THEME.colors.dark.foregroundMuted : THEME.colors.dark.foreground} />
                <Text style={[s.actionButtonText, (allDisabled || !selectedFA) && s.actionButtonTextDisabled]}>
                  {timer.pauseRunning ? 'Weiter' : 'Produktion starten'}
                </Text>
              </TouchableOpacity>

              {/* Störung */}
              <TouchableOpacity
                style={[s.actionButton, s.stoerungButton, timer.activeButton === 'störung' && s.actionButtonActive, stoerungDisabled && s.actionButtonDisabled]}
                onPress={() => timer.handleStörungClick(setCurrentView)}
                disabled={stoerungDisabled}
              >
                <MaterialIcons name="warning" size={20} color={stoerungDisabled ? THEME.colors.dark.foregroundMuted : THEME.colors.dark.foreground} />
                <Text style={[s.actionButtonText, stoerungDisabled && s.actionButtonTextDisabled]}>Störung melden</Text>
              </TouchableOpacity>

              {/* Pause */}
              <TouchableOpacity
                style={[s.actionButton, s.pauseButton, timer.activeButton === 'pause' && s.actionButtonActive, (allDisabled || !selectedFA) && s.actionButtonDisabled]}
                onPress={() => {
                  if (timer.pauseRunning) {
                    timer.handleStart(selectedFA, setFaSearchError, setCurrentView); // Resume production
                  } else {
                    timer.handlePause(selectedFA, setFaSearchError); // Start pause
                  }
                }}
                disabled={allDisabled || !selectedFA}
              >
                <MaterialIcons name="pause" size={20} color={(allDisabled || !selectedFA) ? THEME.colors.dark.foregroundMuted : THEME.colors.dark.foreground} />
                <Text style={[s.actionButtonText, (allDisabled || !selectedFA) && s.actionButtonTextDisabled]}>
                  {timer.pauseRunning ? 'Pause beenden' : 'Pause setzen'}
                </Text>
              </TouchableOpacity>

              {/* Schicht beenden */}
              <TouchableOpacity
                style={[s.actionButton, s.endeButton, allDisabled && s.actionButtonDisabled]}
                onPress={() => showConfirm({
                  title: 'Auftrags-/Schichtende',
                  message: 'Bist du sicher, dass du die Schicht/Auftrag beenden möchtest?',
                  onConfirm: onEnde,
                })}
                disabled={allDisabled}
              >
                <MaterialIcons name="stop" size={20} color={allDisabled ? THEME.colors.dark.foregroundMuted : THEME.colors.dark.foreground} />
                <Text style={[s.actionButtonText, allDisabled && s.actionButtonTextDisabled]}>Auftrags-/Schichtende</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Störung selector */}
      {currentView === 'störung' && lineButtonConfig[effectiveLine]?.störung && (
        <View style={s.stoerungModal}>
          <Text style={s.sectionTitle}>STÖRUNG AUSWÄHLEN</Text>
          <StörungGrid
            buttons={lineButtonConfig[effectiveLine].störung}
            onSelect={(label) => {
              if (label === 'Sonstiges') {
                openSonstigesModal();
                return;
              }
              timer.handleIssueSelect(label);
              setCurrentView('initial');
            }}
            onClose={() => timer.handleCancelStoer(setCurrentView)}
          />
        </View>
      )}

      <Modal
        visible={sonstigesModalVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={cancelSonstiges}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <View style={{ width: '100%', maxWidth: 480, backgroundColor: '#1f2937', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: 'rgba(252, 165, 165, 0.25)' }}>
            <Text style={[s.sectionTitle, { marginBottom: 12 }]}>SONSTIGES - NOTIZ</Text>
            <Text style={{ color: THEME.colors.dark.foregroundMuted, marginBottom: 12 }}>Bitte zuerst den Kommentar eingeben. Danach wird die Störung aktiviert.</Text>
            <TextInput
              style={[s.sonstigesInput, { minHeight: 110 }]}
              placeholder="Beschreibe die Störung..."
              placeholderTextColor={THEME.colors.dark.foregroundDim}
              value={sonstigesDraft}
              onChangeText={setSonstigesDraft}
              multiline
              autoFocus
              textAlignVertical="top"
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 16 }}>
              <TouchableOpacity onPress={cancelSonstiges} style={[s.actionButton, s.modalCancel]}>
                <Text style={s.modalCancelText}>Abbrechen</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={confirmSonstiges}
                disabled={!sonstigesDraft.trim()}
                style={[s.actionButton, s.stoerungButton, !sonstigesDraft.trim() && s.actionButtonDisabled]}
              >
                <Text style={s.actionButtonText}>Weiter</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
