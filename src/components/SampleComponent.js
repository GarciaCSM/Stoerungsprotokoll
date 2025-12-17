import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

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
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  text: {
    fontSize: 16,
    color: '#333',
  },
});

export default SampleComponent;