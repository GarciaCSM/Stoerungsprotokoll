import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useShift } from '../context/ShiftContext';
import { protocolScreenStyles } from '../styles/ProtocolScreenStyles';

const ProtocolScreen = ({ onBack }) => {
  const { shiftData } = useShift();

  return (
    <View style={protocolScreenStyles.container}>
      <ScrollView style={protocolScreenStyles.contentContainer}>
        <Text style={protocolScreenStyles.title}>Störungsprotokoll</Text>
        <Text style={protocolScreenStyles.subtitle}>Schichtinformationen</Text>

        <View style={protocolScreenStyles.infoCard}>
          <View style={protocolScreenStyles.infoRow}>
            <Text style={protocolScreenStyles.infoLabel}>Produktionslinie:</Text>
            <Text style={protocolScreenStyles.infoValue}>{shiftData.selectedLine}</Text>
          </View>

          <View style={protocolScreenStyles.infoRow}>
            <Text style={protocolScreenStyles.infoLabel}>Linienführer:</Text>
            <Text style={protocolScreenStyles.infoValue}>{shiftData.selectedLeader}</Text>
          </View>

          <View style={protocolScreenStyles.infoRow}>
            <Text style={protocolScreenStyles.infoLabel}>Schicht:</Text>
            <Text style={protocolScreenStyles.infoValue}>{shiftData.selectedShift}</Text>
          </View>
        </View>

        <TouchableOpacity style={protocolScreenStyles.backButton} onPress={onBack}>
          <Text style={protocolScreenStyles.backButtonText}>Zurück</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

export default ProtocolScreen;
