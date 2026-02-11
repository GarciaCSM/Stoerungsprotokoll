import React from 'react';
import { Modal, View, Text, TouchableOpacity } from 'react-native';
import protocolScreenStyles from '../styles/ProtocolScreenStyles';

const ConfirmModal = ({ visible, title = 'Bestätigen', message = 'Bist du sicher?', onCancel, onConfirm }) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={protocolScreenStyles.modalOverlay}>
        <View style={protocolScreenStyles.modalContainer}>
          <Text style={protocolScreenStyles.modalTitle}>{title}</Text>
          <Text style={protocolScreenStyles.modalMessage}>{message}</Text>

          <View style={protocolScreenStyles.modalButtonsRow}>
            <TouchableOpacity style={[protocolScreenStyles.modalButton, protocolScreenStyles.modalCancel]} onPress={onCancel}>
              <Text style={protocolScreenStyles.modalCancelText}>Abbrechen</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[protocolScreenStyles.modalButton, protocolScreenStyles.modalConfirm]} onPress={onConfirm}>
              <Text style={protocolScreenStyles.modalConfirmText}>Bestätigen</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default ConfirmModal;
