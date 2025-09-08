import React from 'react';
import { View, StyleSheet } from 'react-native';
import MapScreen from './mapscreen';

const App = () => {
  return (
    <View style={styles.container}>
      <MapScreen
        dataSource="local"
        onPackageUpdate={(pkg) => console.log('Paquete actualizado:', pkg)}
        onLocationUpdate={(location) => console.log('Ubicación:', location)}
        theme="light"
        enableRealTimeTracking={true}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});

export default App;