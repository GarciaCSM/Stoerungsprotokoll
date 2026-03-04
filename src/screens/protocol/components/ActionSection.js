import React from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
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
}) {
  // All buttons are locked until a shift is confirmed (and unlocked again after Ende)
  const allDisabled = !selectionConfirmed;
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
          {timer.selectedIssue === 'Sonstiges' && (
            <TextInput
              style={s.sonstigesInput}
              placeholder="Beschreibe die Störung..."
              placeholderTextColor={THEME.colors.dark.foregroundDim}
              value={timer.sonstigesText}
              onChangeText={timer.setSonstigesText}
              multiline
            />
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
                  title: timer.pauseRunning ? 'Weiter' : 'Produktion starten',
                  message: timer.pauseRunning ? 'Produktion fortsetzen?' : 'Produktion jetzt starten?',
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
                style={[s.actionButton, s.stoerungButton, timer.activeButton === 'störung' && s.actionButtonActive, allDisabled && s.actionButtonDisabled]}
                onPress={() => timer.handleStörungClick(setCurrentView)}
                disabled={allDisabled}
              >
                <MaterialIcons name="warning" size={20} color={allDisabled ? THEME.colors.dark.foregroundMuted : THEME.colors.dark.foreground} />
                <Text style={[s.actionButtonText, allDisabled && s.actionButtonTextDisabled]}>Störung melden</Text>
              </TouchableOpacity>

              {/* Pause */}
              <TouchableOpacity
                style={[s.actionButton, s.pauseButton, timer.activeButton === 'pause' && s.actionButtonActive, (allDisabled || !selectedFA) && s.actionButtonDisabled]}
                onPress={() => showConfirm({
                  title: timer.pauseRunning ? 'Pause beenden' : 'Pause starten',
                  message: timer.pauseRunning ? 'Möchtest du die Pause beenden und weiterproduzieren?' : 'Möchtest du die Produktion anhalten (Pause)?',
                  onConfirm: () => timer.handlePause(selectedFA, setFaSearchError),
                })}
                disabled={allDisabled || !selectedFA}
              >
                <MaterialIcons name="pause" size={20} color={(allDisabled || !selectedFA) ? THEME.colors.dark.foregroundMuted : THEME.colors.dark.foreground} />
                <Text style={[s.actionButtonText, (allDisabled || !selectedFA) && s.actionButtonTextDisabled]}>Pause setzen</Text>
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
            onSelect={(label) => { timer.handleIssueSelect(label); setCurrentView('initial'); }}
            onClose={() => timer.handleCancelStoer(setCurrentView)}
          />
        </View>
      )}
    </>
  );
}
