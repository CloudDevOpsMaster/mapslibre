import React from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';

const LoadingScreen = ({ message = 'Cargando...', theme = 'light' }) => {
  const themeColors = {
    light: { background: '#ffffff', text: '#2c3e50' },
    dark: { background: '#1a1a1a', text: '#f7fafc' }
  };

  const colors = themeColors[theme];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color="#3498db" />
      <Text style={[styles.text, { color: colors.text }]}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    marginTop: 16,
    fontSize: 16,
  },
});

export default LoadingScreen;