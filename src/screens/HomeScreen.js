import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
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

  const handleLineSelect = (value) => {
    updateShiftData({ selectedLine: value });
  };

  const handleLeaderSelect = (value) => {
    updateShiftData({ selectedLeader: value });
  };

  const handleShiftSelect = (value) => {
    updateShiftData({ selectedShift: value });
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
          <CustomDropdown
            value={shiftData.selectedLine}
            options={lineOptions}
            onSelect={handleLineSelect}
            placeholder="Bitte wählen..."
            isOpen={openDropdown === 'line'}
            onToggle={() => toggleDropdown('line')}
          />
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
      </ScrollView>
    </View>
  );
};

export default HomeScreen;