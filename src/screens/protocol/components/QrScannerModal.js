import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet, Dimensions,
} from 'react-native';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { MaterialIcons } from '@expo/vector-icons';
import { THEME } from '../../../styles/globalStyles';

const SCAN_TYPES = [
  BarCodeScanner.Constants.BarCodeType.qr,
  BarCodeScanner.Constants.BarCodeType.code128,
  BarCodeScanner.Constants.BarCodeType.code39,
  BarCodeScanner.Constants.BarCodeType.code39mod43,
  BarCodeScanner.Constants.BarCodeType.ean13,
];

export default function QrScannerModal({ visible, onScanned, onClose }) {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setScanned(false);
    BarCodeScanner.requestPermissionsAsync().then(({ status }) => {
      setHasPermission(status === 'granted');
    });
  }, [visible]);

  function handleBarCodeScanned({ data }) {
    if (scanned) return;
    setScanned(true);
    // Erlaubt beide Formate: reine Zahl ("123456") oder mit Präfix ("FA-123456", "FA 123456")
    const clean = data.trim().replace(/^FA[-\s]*/i, '');
    onScanned(clean);
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.container}>
        {hasPermission === false ? (
          <View style={styles.center}>
            <MaterialIcons name="no-photography" size={52} color={THEME.colors.dark.danger} />
            <Text style={styles.errorText}>Kamera-Zugriff verweigert</Text>
            <Text style={styles.hintText}>
              Bitte Kamera-Berechtigung in den Geräte-Einstellungen für diese App aktivieren.
            </Text>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>Schließen</Text>
            </TouchableOpacity>
          </View>
        ) : hasPermission === null ? (
          <View style={styles.center}>
            <Text style={styles.hintText}>Kamera-Berechtigung wird angefragt…</Text>
          </View>
        ) : (
          <>
            <BarCodeScanner
              onBarCodeScanned={handleBarCodeScanned}
              barCodeTypes={SCAN_TYPES}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={styles.overlay} pointerEvents="box-none">
              <View style={styles.topBar}>
                <Text style={styles.title}>FA-Nummer scannen</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeIconBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                  <MaterialIcons name="close" size={30} color="#fff" />
                </TouchableOpacity>
              </View>

              <View style={styles.frameWrapper}>
                <View style={styles.frame}>
                  <View style={[styles.corner, styles.tl]} />
                  <View style={[styles.corner, styles.tr]} />
                  <View style={[styles.corner, styles.bl]} />
                  <View style={[styles.corner, styles.br]} />
                </View>
              </View>

              <Text style={styles.hint}>
                QR-Code oder Barcode auf den FA-Beleg halten
              </Text>
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}

const { width, height } = Dimensions.get('window');
const FRAME = Math.min(width, height) * 0.55;
const CORNER = 24;
const BORDER = 4;
const ACCENT = THEME.colors.dark.accent ?? '#4a9eff';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#111',
  },
  errorText: {
    color: THEME.colors.dark.danger,
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    textAlign: 'center',
  },
  hintText: {
    color: '#aaa',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 20,
  },
  closeBtn: {
    marginTop: 28,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#333',
  },
  closeBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 20,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  topBar: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
  closeIconBtn: {
    padding: 6,
  },
  frameWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: {
    width: FRAME,
    height: FRAME,
    backgroundColor: 'transparent',
  },
  corner: {
    position: 'absolute',
    width: CORNER,
    height: CORNER,
    borderColor: ACCENT,
  },
  tl: { top: 0, left: 0, borderTopWidth: BORDER, borderLeftWidth: BORDER, borderTopLeftRadius: 6 },
  tr: { top: 0, right: 0, borderTopWidth: BORDER, borderRightWidth: BORDER, borderTopRightRadius: 6 },
  bl: { bottom: 0, left: 0, borderBottomWidth: BORDER, borderLeftWidth: BORDER, borderBottomLeftRadius: 6 },
  br: { bottom: 0, right: 0, borderBottomWidth: BORDER, borderRightWidth: BORDER, borderBottomRightRadius: 6 },
  hint: {
    color: '#ddd',
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
