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
  showConfirm,
  setFaSearchError,
  effectiveLine,
  lineButtonConfig,
  onEnde,
  formatTime,
}) {
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
                style={[s.actionButton, s.startButton, !selectedFA && s.actionButtonDisabled]}
                onPress={() => showConfirm({
                  title: 'Weiter',
                  message: 'Produktion fortsetzen?',
                  onConfirm: () => timer.handleStart(selectedFA, setFaSearchError, setCurrentView),
                })}
                disabled={!selectedFA}
              >
                <MaterialIcons name="play-arrow" size={20} color={selectedFA ? THEME.colors.dark.foreground : THEME.colors.dark.foregroundMuted} />
                <Text style={[s.actionButtonText, !selectedFA && s.actionButtonTextDisabled]}>Weiter</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.actionButton, s.modalCancel]} onPress={() => timer.handleCancelStoer(setCurrentView)}>
                <Text style={s.modalCancelText}>Abbrechen</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={s.buttonsRow}>
              {/* Start / Weiter */}
              <TouchableOpacity
                style={[s.actionButton, s.startButton, timer.activeButton === 'start' && s.actionButtonActive, !selectedFA && s.actionButtonDisabled]}
                onPress={() => showConfirm({
                  title: timer.pauseRunning ? 'Weiter' : 'Produktion starten',
                  message: timer.pauseRunning ? 'Produktion fortsetzen?' : 'Produktion jetzt starten?',
                  onConfirm: () => timer.handleStart(selectedFA, setFaSearchError, setCurrentView),
                })}
                disabled={!selectedFA || timer.activeButton === 'start'}
              >
                <MaterialIcons name="play-arrow" size={20} color={selectedFA ? THEME.colors.dark.foreground : THEME.colors.dark.foregroundMuted} />
                <Text style={[s.actionButtonText, !selectedFA && s.actionButtonTextDisabled]}>
                  {timer.pauseRunning ? 'Weiter' : 'Produktion starten'}
                </Text>
              </TouchableOpacity>

              {/* Störung */}
              <TouchableOpacity
                style={[s.actionButton, s.stoerungButton, timer.activeButton === 'störung' && s.actionButtonActive]}
                onPress={() => timer.handleStörungClick(setCurrentView)}
              >
                <MaterialIcons name="warning" size={20} color={THEME.colors.dark.foreground} />
                <Text style={s.actionButtonText}>Störung melden</Text>
              </TouchableOpacity>

              {/* Pause */}
              <TouchableOpacity
                style={[s.actionButton, s.pauseButton, timer.activeButton === 'pause' && s.actionButtonActive, !selectedFA && s.actionButtonDisabled]}
                onPress={() => timer.handlePause(selectedFA, setFaSearchError)}
                disabled={!selectedFA}
              >
                <MaterialIcons name="pause" size={20} color={selectedFA ? THEME.colors.dark.foreground : THEME.colors.dark.foregroundMuted} />
                <Text style={[s.actionButtonText, !selectedFA && s.actionButtonTextDisabled]}>Pause setzen</Text>
              </TouchableOpacity>

              {/* Schicht beenden */}
              <TouchableOpacity
                style={[s.actionButton, s.endeButton]}
                onPress={() => showConfirm({
                  title: 'Schicht beenden',
                  message: 'Bist du sicher, dass du die Schicht beenden möchtest?',
                  onConfirm: onEnde,
                })}
              >
                <MaterialIcons name="stop" size={20} color={THEME.colors.dark.foreground} />
                <Text style={s.actionButtonText}>Schicht beenden</Text>
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
            onClose={() => setCurrentView('initial')}
          />
        </View>
      )}
    </>
  );
}
