import React, { useState, useCallback, useEffect } from 'react';
import { 
  StyleSheet, 
  StatusBar, 
  Platform
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';

import EnhancedMapScreen from './mapscreen/components/EnhancedMapScreen';
import { UI_CONFIG } from './mapscreen/config/ui_config';

SplashScreen.preventAutoHideAsync();

const App = () => {
  const [isReady, setIsReady] = useState(false);
  const [packages, setPackages] = useState([]);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      console.log('🚀 Iniciando aplicación...');
      await loadInitialData();
      setIsReady(true);
      await SplashScreen.hideAsync();
      console.log('✅ Aplicación inicializada correctamente');
    } catch (error) {
      console.error('❌ Error inicializando aplicación:', error);
    }
  };

  const loadInitialData = async () => {
    const mockPackages = [
      {
        id: '1',
        trackingNumber: 'PKG001',
        status: 'OUT_FOR_DELIVERY',
        latitude: 20.6597,
        longitude: -103.3496,
        address: 'Av. Vallarta 1234, Guadalajara',
        priority: 'high',
        estimatedDelivery: new Date(Date.now() + 2 * 60 * 60 * 1000)
      },
      {
        id: '2',
        trackingNumber: 'PKG002',
        status: 'IN_TRANSIT',
        latitude: 20.6720,
        longitude: -103.3448,
        address: 'Av. Chapultepec 567, Guadalajara',
        priority: 'medium',
        estimatedDelivery: new Date(Date.now() + 4 * 60 * 60 * 1000)
      },
      {
        id: '3',
        trackingNumber: 'PKG003',
        status: 'PENDING_PICKUP',
        latitude: 20.6534,
        longitude: -103.3677,
        address: 'Centro Histórico, Guadalajara',
        priority: 'low',
        estimatedDelivery: new Date(Date.now() + 6 * 60 * 60 * 1000)
      }
    ];

    await new Promise(resolve => setTimeout(resolve, 1500));
    setPackages(mockPackages);
  };

  const handlePackageUpdate = useCallback((updatedPackage) => {
    console.log('📦 Paquete actualizado:', updatedPackage.trackingNumber);
    setPackages(prev => 
      prev.map(pkg => 
        pkg.id === updatedPackage.id ? updatedPackage : pkg
      )
    );
  }, []);

  const handleLocationUpdate = useCallback((location) => {
    if (__DEV__) {
      console.log('📍 Ubicación actualizada:', {
        lat: location.latitude?.toFixed(6),
        lng: location.longitude?.toFixed(6),
        accuracy: location.accuracy ? `±${Math.round(location.accuracy)}m` : 'N/A'
      });
    }
  }, []);

  const handleError = useCallback((error) => {
    console.error('❌ Error en MapScreen:', error);
  }, []);

  if (!isReady) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor="transparent"
          translucent={Platform.OS === 'android'}
        />

        <EnhancedMapScreen
          dataSource="local"
          initialPackages={packages}
          theme="light"
          enableRealTimeTracking={true}
          enableGeofencing={true}
          enableHaptics={true}
          onPackageUpdate={handlePackageUpdate}
          onLocationUpdate={handleLocationUpdate}
          onError={handleError}
          testID="main-map-screen"
          developmentMode={__DEV__}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: UI_CONFIG.themes.light.colors.background,
  },
});

export default App;