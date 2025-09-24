// App.js - Ejemplo completo con el sistema mejorado
import React, { useState, useCallback, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  StatusBar, 
  Alert, 
  Appearance,
  Platform
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';

// Importar el componente mejorado
import EnhancedMapScreen from './mapscreen/components/EnhancedMapScreen';

// Importar configuración
import { UI_CONFIG } from './mapscreen/config/ui_config';

// Prevenir que se oculte el splash screen automáticamente
SplashScreen.preventAutoHideAsync();

const App = () => {
  // Estados para configuración de la app
  const [theme, setTheme] = useState(Appearance.getColorScheme() || 'light');
  const [isReady, setIsReady] = useState(false);
  const [appError, setAppError] = useState(null);
  
  // Estados para datos de la app
  const [packages, setPackages] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [appStats, setAppStats] = useState({
    packagesDelivered: 0,
    locationsTracked: 0,
    lastUpdate: null
  });

  // Configuración personalizada de la aplicación
  const appConfig = {
    // Configuración de ubicación
    locationConfig: {
      highPrecision: true,
      maxReadings: 3,
      timeout: 25000,
      trackingInterval: 5000
    },
    
    // Configuración de UI
    uiConfig: {
      primaryColor: '#007AFF',      // Azul iOS
      accentColor: '#FF3B30',       // Rojo iOS
      enableHaptics: true,
      enableNotifications: true,
      animationDuration: 300
    },
    
    // Configuración de rendimiento
    performanceConfig: {
      mode: 'high',                 // low | medium | high
      maxPackagesVisible: 100,
      enableClustering: true,
      clusterRadius: 50
    },
    
    // Configuración de API (ejemplo)
    apiConfig: {
      baseURL: 'https://api.tuempresa.com',
      apiKey: process.env.EXPO_PUBLIC_API_KEY,
      timeout: 10000
    }
  };

  // Inicialización de la app
  useEffect(() => {
    initializeApp();
  }, []);

  // Escuchar cambios de tema del sistema
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setTheme(colorScheme || 'light');
    });

    return () => subscription?.remove();
  }, []);

  const initializeApp = async () => {
    try {
      console.log('🚀 Iniciando aplicación...');

      // Simular carga de datos iniciales
      await loadInitialData();

      // Configurar tema inicial
      StatusBar.setBarStyle(theme === 'dark' ? 'light-content' : 'dark-content');

      // Marcar como lista
      setIsReady(true);

      // Ocultar splash screen
      await SplashScreen.hideAsync();

      console.log('✅ Aplicación inicializada correctamente');

    } catch (error) {
      console.error('❌ Error inicializando aplicación:', error);
      setAppError(error);
      
      // Mostrar splash screen de error personalizado
      Alert.alert(
        'Error de Inicialización',
        'No se pudo inicializar la aplicación correctamente.',
        [
          {
            text: 'Reintentar',
            onPress: () => {
              setAppError(null);
              setIsReady(false);
              initializeApp();
            }
          },
          {
            text: 'Salir',
            style: 'destructive',
            onPress: () => {
              // En una app real, podrías cerrar la aplicación
              console.log('Usuario eligió salir');
            }
          }
        ]
      );
    }
  };

  const loadInitialData = async () => {
    // Simular carga de paquetes iniciales
    const mockPackages = [
      {
        id: '1',
        trackingNumber: 'PKG001',
        status: 'OUT_FOR_DELIVERY',
        latitude: 20.6597,
        longitude: -103.3496,
        address: 'Av. Vallarta 1234, Guadalajara',
        priority: 'high',
        estimatedDelivery: new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 horas
      },
      {
        id: '2',
        trackingNumber: 'PKG002',
        status: 'IN_TRANSIT',
        latitude: 20.6720,
        longitude: -103.3448,
        address: 'Av. Chapultepec 567, Guadalajara',
        priority: 'medium',
        estimatedDelivery: new Date(Date.now() + 4 * 60 * 60 * 1000) // 4 horas
      },
      {
        id: '3',
        trackingNumber: 'PKG003',
        status: 'PENDING_PICKUP',
        latitude: 20.6534,
        longitude: -103.3677,
        address: 'Centro Histórico, Guadalajara',
        priority: 'low',
        estimatedDelivery: new Date(Date.now() + 6 * 60 * 60 * 1000) // 6 horas
      }
    ];

    // Simular delay de red
    await new Promise(resolve => setTimeout(resolve, 1500));

    setPackages(mockPackages);
  };

  // Handlers para eventos del MapScreen
  const handlePackageUpdate = useCallback((updatedPackage) => {
    console.log('📦 Paquete actualizado:', updatedPackage.trackingNumber);

    setPackages(prev => 
      prev.map(pkg => 
        pkg.id === updatedPackage.id ? updatedPackage : pkg
      )
    );

    // Actualizar estadísticas
    if (updatedPackage.status === 'DELIVERED') {
      setAppStats(prev => ({
        ...prev,
        packagesDelivered: prev.packagesDelivered + 1,
        lastUpdate: new Date().toISOString()
      }));
    }
  }, []);

  const handleLocationUpdate = useCallback((location) => {
    setUserLocation(location);
    
    setAppStats(prev => ({
      ...prev,
      locationsTracked: prev.locationsTracked + 1,
      lastUpdate: new Date().toISOString()
    }));

    // Log para desarrollo
    if (__DEV__) {
      console.log('📍 Ubicación actualizada:', {
        lat: location.latitude?.toFixed(6),
        lng: location.longitude?.toFixed(6),
        accuracy: location.accuracy ? `±${Math.round(location.accuracy)}m` : 'N/A'
      });
    }
  }, []);

  const handleRouteCalculated = useCallback((route) => {
    console.log('🛣️ Ruta calculada:', {
      distance: route.distance,
      duration: route.duration,
      waypoints: route.waypoints?.length || 0
    });

    // Aquí podrías actualizar el estado de la ruta
    // setCurrentRoute(route);
  }, []);

  const handleGeofenceEnter = useCallback((packageInfo) => {
    console.log('📍 Geofence activado para:', packageInfo.trackingNumber);

    // Mostrar notificación o actualizar UI
    Alert.alert(
      '📦 Zona de Entrega',
      `Has llegado a la zona de entrega del paquete ${packageInfo.trackingNumber}`,
      [
        {
          text: 'Marcar como Entregado',
          onPress: () => handlePackageUpdate({
            ...packageInfo,
            status: 'DELIVERED',
            deliveredAt: new Date().toISOString()
          })
        },
        { text: 'Cancelar', style: 'cancel' }
      ]
    );
  }, [handlePackageUpdate]);

  const handleError = useCallback((error) => {
    console.error('❌ Error en MapScreen:', error);

    // Manejo de errores por tipo
    switch (error.type) {
      case 'LOCATION_ERROR':
        Alert.alert(
          'Error de Ubicación',
          'No se pudo obtener tu ubicación. Verifica los permisos de la aplicación.',
          [{ text: 'OK' }]
        );
        break;

      case 'NETWORK_ERROR':
        Alert.alert(
          'Error de Conexión',
          'Problemas de conectividad. Verifica tu conexión a internet.',
          [
            { text: 'Reintentar', onPress: () => console.log('Reintentando...') },
            { text: 'Cancelar', style: 'cancel' }
          ]
        );
        break;

      case 'MAP_ERROR':
        Alert.alert(
          'Error del Mapa',
          'Problema cargando el mapa. La aplicación puede no funcionar correctamente.',
          [{ text: 'OK' }]
        );
        break;

      default:
        Alert.alert(
          'Error',
          error.message || 'Ha ocurrido un error inesperado.',
          [{ text: 'OK' }]
        );
    }
  }, []);

  // Función para alternar tema manualmente (opcional)
  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  }, []);

  // Funciones adicionales para interactuar con el mapa
  const centerOnUserLocation = useCallback(() => {
    if (userLocation) {
      // El MapScreen se encargará de centrar la vista
      console.log('🎯 Centrando en ubicación del usuario');
    } else {
      Alert.alert(
        'Ubicación no disponible',
        'No se ha detectado tu ubicación actual.',
        [{ text: 'OK' }]
      );
    }
  }, [userLocation]);

  const showPackageStats = useCallback(() => {
    Alert.alert(
      '📊 Estadísticas',
      `Paquetes activos: ${packages.length}\nPaquetes entregados: ${appStats.packagesDelivered}\nUbicaciones rastreadas: ${appStats.locationsTracked}`,
      [{ text: 'OK' }]
    );
  }, [packages.length, appStats]);

  // No renderizar hasta que esté lista la app
  if (!isReady) {
    return null; // El splash screen seguirá visible
  }

  // Renderizar error si hay problema crítico
  if (appError) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: '#ff6b6b' }]}>
        <StatusBar barStyle="light-content" backgroundColor="#ff6b6b" />
        {/* Aquí iría tu componente de error personalizado */}
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <StatusBar
          barStyle={theme === 'dark' ? 'light-content' : 'dark-content'}
          backgroundColor="transparent"
          translucent={Platform.OS === 'android'}
        />

        <EnhancedMapScreen
          // Configuración básica
          dataSource="local"
          initialPackages={packages}
          theme={theme}
          
          // Colores personalizados
          primaryColor={appConfig.uiConfig.primaryColor}
          accentColor={appConfig.uiConfig.accentColor}
          
          // Configuraciones de funcionalidad
          enableRealTimeTracking={true}
          enableGeofencing={true}
          enableHaptics={appConfig.uiConfig.enableHaptics}
          enableNotifications={appConfig.uiConfig.enableNotifications}
          
          // Configuración de ubicación
          locationConfig={appConfig.locationConfig}
          
          // Configuración de rendimiento
          performanceMode={appConfig.performanceConfig.mode}
          maxPackagesVisible={appConfig.performanceConfig.maxPackagesVisible}
          enableClustering={appConfig.performanceConfig.enableClustering}
          clusterRadius={appConfig.performanceConfig.clusterRadius}
          
          // Configuración de geofencing
          geofenceConfig={{
            radius: 100, // metros
            enableNotifications: true
          }}
          
          // Configuración de animaciones
          animationConfig={{
            respectReduceMotion: true,
            defaultDuration: appConfig.uiConfig.animationDuration
          }}
          
          // Override de configuración UI si es necesario
          uiConfigOverride={{
            // Puedes personalizar aspectos específicos del UI_CONFIG aquí
            designTokens: {
              spacing: {
                // Sobrescribir espaciados específicos si es necesario
              }
            }
          }}
          
          // Callbacks
          onPackageUpdate={handlePackageUpdate}
          onLocationUpdate={handleLocationUpdate}
          onRouteCalculated={handleRouteCalculated}
          onGeofenceEnter={handleGeofenceEnter}
          onError={handleError}
          
          // Configuración de testing
          testID="main-map-screen"
          developmentMode={__DEV__}
        />

        {/* Componentes adicionales de la app podrían ir aquí */}
        {/* Por ejemplo: barra de navegación, drawer, etc. */}
        
      </View>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: UI_CONFIG.themes.light.colors.background,
  },

  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: UI_CONFIG.designTokens.spacing.xl,
  },
});

export default App;