import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { THEME } from '../styles/globalStyles';

const SampleComponent = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>This is a sample component!</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: THEME.colors.light.borderLight,
    borderRadius: THEME.radius.md,
  },
  text: {
    fontSize: 16,
    color: THEME.colors.light.foregroundDim,
  },
});

export default SampleComponent;