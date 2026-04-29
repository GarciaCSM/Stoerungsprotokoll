import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { homeScreenStyles } from '../styles/HomeScreenStyles';
import { THEME } from '../styles/globalStyles';
import { useShift } from '../context/ShiftContext';
import ProtocolScreen from './ProtocolScreen';

// Not in use anymore, but keeping line assignment logic here for now in case we want to re-enable it on HomeScreen later.

const HomeScreen = () => {
  const { shiftData, updateShiftData } = useShift();
  const [showProtocol, setShowProtocol] = useState(false);
  const [showLineModal, setShowLineModal] = useState(false);
  const [hasAssignedLine, setHasAssignedLine] = useState(false);

  const handleContinue = () => {
    // proceed to protocol screen; selection is handled there
    setShowProtocol(true);
  };

  const handleBack = () => {
    setShowProtocol(false);
  };

  const persistAssignedLine = async (value) => {
    try {
      if (value) {
        await AsyncStorage.setItem('assigned_line', value);
        // lock by default when assigning
        await AsyncStorage.setItem('assigned_line_locked', 'true');
        setHasAssignedLine(true);
      } else {
        await AsyncStorage.removeItem('assigned_line');
        await AsyncStorage.removeItem('assigned_line_locked');
        // also remove persisted leader and shift when assignment is cleared
        await AsyncStorage.removeItem('assigned_leader');
        await AsyncStorage.removeItem('assigned_shift');
        setHasAssignedLine(false);
      }
    } catch (e) {
      console.warn('Failed to persist assigned line', e);
    }
  };

  // persist leader/shift as well (keine Inline-UI mehr auf HomeScreen)
  const persistAssignedLeader = async (value) => {
    try {
      if (value) {
        await AsyncStorage.setItem('assigned_leader', value);
      } else {
        await AsyncStorage.removeItem('assigned_leader');
      }
    } catch (e) {
      console.warn('Failed to persist assigned leader', e);
    }
  };

  const persistAssignedShift = async (value) => {
    try {
      if (value) {
        await AsyncStorage.setItem('assigned_shift', value);
      } else {
        await AsyncStorage.removeItem('assigned_shift');
      }
    } catch (e) {
      console.warn('Failed to persist assigned shift', e);
    }
  };

  const handleAssignLine = async (value) => {
    updateShiftData({ selectedLine: value });
    await persistAssignedLine(value);
    setShowLineModal(false);
  };

  const handleRemoveAssignment = async () => {
    updateShiftData({ selectedLine: null });
    await persistAssignedLine(null);
    setShowLineModal(false);
  };

  const lineOptions = [
    { label: 'Linie 1', value: 'Linie 1' },
    { label: 'Linie 2', value: 'Linie 2' },
    { label: 'Linie 3', value: 'Linie 3' },
    { label: 'Linie 4', value: 'Linie 4' },
    { label: 'Linie 5', value: 'Linie 5' },
    { label: 'Linie 6', value: 'Linie 6' },
  ];

  useEffect(() => {
    // load persisted assignment on start
    (async () => {
      try {
        const saved = await AsyncStorage.getItem('assigned_line');
        if (saved) {
          updateShiftData({ selectedLine: saved });
          setHasAssignedLine(true);
          // load leader and shift if saved
          const savedLeader = await AsyncStorage.getItem('assigned_leader');
          if (savedLeader) updateShiftData({ selectedLeader: savedLeader });
          const savedShift = await AsyncStorage.getItem('assigned_shift');
          if (savedShift) updateShiftData({ selectedShift: savedShift });
          // jump directly into protocol screen for assigned tablets
          setShowProtocol(true);
        }
      } catch (e) {
        console.warn('Failed to load assigned line', e);
      }
    })();
  }, []);

  if (showProtocol) {
    return <ProtocolScreen onBack={handleBack} />;
  }

  return (
    <View style={homeScreenStyles.container}>
      <ScrollView style={homeScreenStyles.formContainer}>
        <Text style={homeScreenStyles.title}>Störungsprotokoll</Text>
        <Text style={homeScreenStyles.subtitle}>Bitte geben Sie die Schichtinformationen ein</Text>

        <View style={[homeScreenStyles.formGroup, { zIndex: 1 }]}> 
          <Text style={homeScreenStyles.label}>Schicht‑Infos</Text>

          {hasAssignedLine && shiftData.selectedLine ? (
            <View>
              <Text style={homeScreenStyles.assignedLineText}>{shiftData.selectedLine}</Text>
              <Text style={{color: THEME.colors.light.foregroundMuted, marginTop: 6}}>{shiftData.selectedShift} · {shiftData.selectedLeader}</Text>
            </View>
          ) : (
            <Text style={{color: THEME.colors.light.foregroundMuted}}>Linie, Schicht und Linienführer kannst du jetzt im Protokoll oben auswählen.</Text>
          )}

        </View>

        <TouchableOpacity style={homeScreenStyles.submitButton} onPress={handleContinue}>
          <Text style={homeScreenStyles.submitButtonText}>Weiter</Text>
        </TouchableOpacity>

        {/* Hidden modal: assign/choose line for this tablet */}
        <Modal visible={showLineModal} transparent animationType="fade">
          <View style={homeScreenStyles.modalOverlay}>
            <View style={homeScreenStyles.modalCard}>
              <Text style={homeScreenStyles.modalTitle}>Produktionslinie zuweisen</Text>
              <ScrollView>
                {lineOptions.map((opt) => (
                  <TouchableOpacity key={opt.value} style={homeScreenStyles.modalItem} onPress={() => handleAssignLine(opt.value)}>
                    <Text style={homeScreenStyles.modalItemText}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <View style={{flexDirection: 'row', justifyContent: 'space-between', marginTop: 12}}>
                <TouchableOpacity onPress={() => setShowLineModal(false)} style={homeScreenStyles.modalCancel}>
                  <Text>Abbrechen</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleRemoveAssignment} style={homeScreenStyles.modalDanger}>
                  <Text style={{color: THEME.colors.light.foreground}}>Zuweisung entfernen</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

      </ScrollView>
    </View>
  );
};

export default HomeScreen;