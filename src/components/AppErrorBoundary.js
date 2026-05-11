import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Fängt Render-Fehler ab — im Dev-Client siehst du Text statt sofortigem "Crash".
 */
export default class AppErrorBoundary extends React.Component {
  state = { error: null, info: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    this.setState({ info: info?.componentStack || String(info) });
    console.error('[AppErrorBoundary]', error, info);
  }

  handleClearStorage = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      await AsyncStorage.multiRemove(keys);
      this.setState({ error: null, info: null });
    } catch (e) {
      console.warn('Clear storage failed', e);
    }
  };

  render() {
    const { error, info } = this.state;
    if (!error) return this.props.children;

    return (
      <View style={styles.wrap}>
        <Text style={styles.title}>App-Fehler (Dev)</Text>
        <Text style={styles.msg}>{error.message || String(error)}</Text>
        <ScrollView style={styles.stack}>
          <Text style={styles.pre}>{info || '(kein Stack)'}</Text>
        </ScrollView>
        <TouchableOpacity style={styles.btn} onPress={() => this.setState({ error: null, info: null })}>
          <Text style={styles.btnText}>Erneut versuchen</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.btnDanger]} onPress={this.handleClearStorage}>
          <Text style={styles.btnText}>AsyncStorage leeren & neu</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 24, paddingTop: 48, backgroundColor: '#1a1a1e' },
  title: { color: '#f87171', fontSize: 20, fontWeight: '700', marginBottom: 12 },
  msg: { color: '#e4e4e7', fontSize: 16, marginBottom: 16 },
  stack: { flex: 1, maxHeight: 320, marginBottom: 16 },
  pre: { color: '#a1a1aa', fontSize: 12, fontFamily: 'monospace' },
  btn: { backgroundColor: '#3f3f46', padding: 14, borderRadius: 8, marginBottom: 10 },
  btnDanger: { backgroundColor: '#7f1d1d' },
  btnText: { color: '#fafafa', textAlign: 'center', fontWeight: '600' },
});
