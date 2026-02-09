import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { homeScreenStyles } from '../styles/HomeScreenStyles';
import { useShift } from '../context/ShiftContext';
import ProtocolScreen from './ProtocolScreen';

const CustomDropdown = ({ label, value, options, onSelect, placeholder, isOpen, onToggle }) => {
  const handleSelect = (option) => {
    onSelect(option.value);
    onToggle();
  };

  return (
    <View style={homeScreenStyles.dropdownWrapper}>
      <TouchableOpacity 
        style={homeScreenStyles.dropdownButton}
        onPress={onToggle}
      >
        <Text style={homeScreenStyles.dropdownButtonText}>
          {value || placeholder}
        </Text>
        <Text style={homeScreenStyles.dropdownArrow}>{isOpen ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      
      {isOpen && (
        <ScrollView style={homeScreenStyles.dropdownList} nestedScrollEnabled={true}>
          {options.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={homeScreenStyles.dropdownItem}
              onPress={() => handleSelect(option)}
            >
              <Text style={homeScreenStyles.dropdownItemText}>{option.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

const HomeScreen = () => {
  const { shiftData, updateShiftData } = useShift();
  const [openDropdown, setOpenDropdown] = useState(null);
  const [showProtocol, setShowProtocol] = useState(false);
  const [showLineModal, setShowLineModal] = useState(false);
  const [hasAssignedLine, setHasAssignedLine] = useState(false);

  const toggleDropdown = (dropdownName) => {
    setOpenDropdown(openDropdown === dropdownName ? null : dropdownName);
  };

  const handleContinue = () => {
    if (shiftData.selectedLine && shiftData.selectedLeader && shiftData.selectedShift) {
      setShowProtocol(true);
    }
  };

  const handleBack = () => {
    setShowProtocol(false);
  };

  const handleLineSelect = async (value) => {
    updateShiftData({ selectedLine: value });
    await persistAssignedLine(value);
  };

  const persistAssignedLine = async (value) => {
    try {
      if (value) {
        await AsyncStorage.setItem('assigned_line', value);
        setHasAssignedLine(true);
      } else {
        await AsyncStorage.removeItem('assigned_line');
        // also remove persisted leader and shift when assignment is cleared
        await AsyncStorage.removeItem('assigned_leader');
        await AsyncStorage.removeItem('assigned_shift');
        setHasAssignedLine(false);
      }
    } catch (e) {
      console.warn('Failed to persist assigned line', e);
    }
  };

  // persist leader/shift as well
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

  const handleLeaderSelect = async (value) => {
    updateShiftData({ selectedLeader: value });
    await persistAssignedLeader(value);
  };

  const handleShiftSelect = async (value) => {
    updateShiftData({ selectedShift: value });
    await persistAssignedShift(value);
  };

  const lineOptions = [
    { label: 'Linie 1', value: 'Linie 1' },
    { label: 'Linie 2', value: 'Linie 2' },
    { label: 'Linie 3', value: 'Linie 3' },
    { label: 'Linie 4', value: 'Linie 4' },
    { label: 'Linie 5', value: 'Linie 5' },
    { label: 'Linie 6', value: 'Linie 6' },
  ];

  const leaderOptions = [
    { label: 'Melih Iskender', value: 'Melih Iskender' },
  ];

  const shiftOptions = [
    { label: 'Frühschicht', value: 'Frühschicht' },
    { label: 'Spätschicht', value: 'Spätschicht' },
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

        <View style={[homeScreenStyles.formGroup, { zIndex: 3 }]}>
          <Text style={homeScreenStyles.label}>Produktionslinie</Text>

          {/* If an assigned_line exists we show a non-editable display; change via long-press (hidden) */}
          {hasAssignedLine && shiftData.selectedLine ? (
            <TouchableOpacity onLongPress={() => setShowLineModal(true)}>
              <Text style={homeScreenStyles.assignedLineText}>{shiftData.selectedLine}</Text>
            </TouchableOpacity>
          ) : (
            <CustomDropdown
              value={shiftData.selectedLine}
              options={lineOptions}
              onSelect={handleLineSelect}
              placeholder="Bitte wählen..."
              isOpen={openDropdown === 'line'}
              onToggle={() => toggleDropdown('line')}
            />
          )}
        </View>

        <View style={[homeScreenStyles.formGroup, { zIndex: 2 }]}>
          <Text style={homeScreenStyles.label}>Linienführer</Text>
          <CustomDropdown
            value={shiftData.selectedLeader}
            options={leaderOptions}
            onSelect={handleLeaderSelect}
            placeholder="Bitte wählen..."
            isOpen={openDropdown === 'leader'}
            onToggle={() => toggleDropdown('leader')}
          />
        </View>

        <View style={[homeScreenStyles.formGroup, { zIndex: 1 }]}>
          <Text style={homeScreenStyles.label}>Schicht</Text>
          <CustomDropdown
            value={shiftData.selectedShift}
            options={shiftOptions}
            onSelect={handleShiftSelect}
            placeholder="Bitte wählen..."
            isOpen={openDropdown === 'shift'}
            onToggle={() => toggleDropdown('shift')}
          />
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
                  <Text style={{color: '#fff'}}>Zuweisung entfernen</Text>
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