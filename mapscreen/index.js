// mapscreen/index.js - Main component with all fixes applied
import React, { useRef, useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, StatusBar, Text, Animated } from 'react-native';
import { WebView } from 'react-native-webview';

// Importaciones estáticas
import LoadingScreen from './components/LoadingScreen';
import NotificationSystem from './components/NotificationSystem';
import FloatingActionButtons from './components/FloatingActionButtons';

import useLocationTracking from './hooks/useLocationTracking';
import usePackageManager from './hooks/usePackageManager';
import useMapControls from './hooks/useMapControls';
import { useAnimations } from './hooks/useAnimations';

import NotificationService from './services/NotificationService';
import PackageService from './services/PackageService';

import { generateMapHTML } from './utils/MapHelpers';
import { themes } from './utils/constants';

import AdapterFactory from './adapters/AdapterFactory';

const MapScreen = ({ 
  dataSource = 'local',
  apiConfig = {},
  adapter: customAdapter = null,
  initialPackages = [],
  onPackageUpdate,
  onLocationUpdate,
  onRouteCalculated,
  onGeofenceEnter,
  onError,
  theme = 'light',
  enableRealTimeTracking = true,
  enableGeofencing = true,
  enableHaptics = true,
  locationConfig = {},
  customStyles = {},
  mapStyle = 'default',
  primaryColor,
  accentColor,
  performanceMode = 'medium',
  maxPackagesVisible = 50,
  enableClustering = true,
  clusterRadius = 50,
  geofenceConfig = {},
  testID = 'map-screen',
  animationConfig = {},
  uiConfigOverride = {}
}) => {
  // Refs
  const webViewRef = useRef(null);
  
  // State
  const [isMapReady, setIsMapReady] = useState(false);
  const [notification, setNotification] = useState({ message: null, type: 'info' });
  const [showSettings, setShowSettings] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('priority');
  const [initializationError, setInitializationError] = useState(null);

  // Animations
  const { fadeIn, getAnimatedValue } = useAnimations();
  const fadeAnim = getAnimatedValue('screenFade', 0);

  // Services and Adapters
  const adapter = useRef(
    customAdapter || AdapterFactory.createAdapter(dataSource, apiConfig || {})
  );
  
  const packageService = useRef(new PackageService(adapter.current));
  const notificationService = useRef(new NotificationService(enableHaptics));

  // Hooks
  const {
    currentLocation,
    isTracking,
    permissionStatus,
    getCurrentLocation,
    startLocationTracking,
    stopLocationTracking
  } = useLocationTracking(locationConfig || {});

  const {
    packages,
    isLoading: packagesLoading,
    error: packagesError,
    updatePackageStatus,
    loadPackages,
    getPackageDetails,
    subscribeToUpdates
  } = usePackageManager(adapter.current, initialPackages || []);

  const {
    updateDriverLocation,
    centerOnLocation,
    fitToPackages,
    loadPackagesOnMap
  } = useMapControls(webViewRef, isMapReady);

  // Theme - Safe handling with defaults
  const safeThemes = themes || { light: {}, dark: {} };
  const selectedTheme = safeThemes[theme] || safeThemes.light || {};
  const currentTheme = { 
    background: '#ffffff',
    primary: '#3498db',
    accent: '#e74c3c',
    text: '#2c3e50',
    textSecondary: '#7f8c8d',
    ...selectedTheme,
    ...(primaryColor ? { primary: primaryColor } : {}),
    ...(accentColor ? { accent: accentColor } : {})
  };

  // Effects
  useEffect(() => {
    fadeIn('screenFade').start();
  }, [fadeIn]);

  useEffect(() => {
    if (currentLocation) {
      updateDriverLocation(currentLocation);
      onLocationUpdate?.(currentLocation);
    }
  }, [currentLocation, updateDriverLocation, onLocationUpdate]);

  useEffect(() => {
    if (isMapReady && packages && packages.length > 0) {
      loadPackagesOnMap(packages, currentLocation);
    }
  }, [isMapReady, packages, currentLocation, loadPackagesOnMap]);

  useEffect(() => {
    if (packagesError && onError) {
      onError({ type: 'ADAPTER_ERROR', message: packagesError });
    }
  }, [packagesError, onError]);

  useEffect(() => {
    if (enableRealTimeTracking) {
      startLocationTracking((location) => {
        updateDriverLocation(location);
        onLocationUpdate?.(location);
        
        if (enableGeofencing && packages) {
          checkGeofences(location);
        }
      });
    }

    return () => {
      stopLocationTracking();
    };
  }, [enableRealTimeTracking, enableGeofencing, packages]);

  // Handlers
  const handleWebViewMessage = useCallback((event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      switch (data.type) {
        case 'mapReady': {
          setIsMapReady(true);
          break;
        }
          
        case 'packageSelected': {
          const selectedPkg = packages.find(p => p.id === data.packageId);
          if (selectedPkg) {
            // Handle package selection
          }
          break;
        }
          
        case 'routeCalculated': {
          onRouteCalculated?.(data.route);
          break;
        }
          
        case 'geofenceEntered': {
          const pkg = packages.find(p => p.id === data.packageId);
          if (pkg) {
            handleGeofenceEnter(pkg, data.distance);
          }
          break;
        }
          
        case 'error': {
          if (notificationService.current) {
            notificationService.current.showTemporaryNotification('Error del mapa: ' + data.error, 'error');
          }
          onError?.({ type: 'MAP_LOAD_ERROR', message: data.error });
          break;
        }
          
        default: {
          console.log('Unknown message type:', data.type);
        }
      }
    } catch (error) {
      console.error('Error parsing WebView message:', error);
    }
  }, [packages, onRouteCalculated, onError]);

  const handleGeofenceEnter = useCallback((pkg, distance) => {
    if (notificationService.current) {
      notificationService.current.showTemporaryNotification(
        `Llegaste a la zona de entrega de ${pkg.trackingNumber} (${distance}m)`,
        'info'
      );
    }
    
    onGeofenceEnter?.(pkg);
  }, [onGeofenceEnter]);

  const checkGeofences = useCallback((currentCoords) => {
    if (!packages) return;
    
    packages.forEach(pkg => {
      if (pkg.status === 'OUT_FOR_DELIVERY' || pkg.status === 'IN_TRANSIT') {
        const geofenceCheck = calculateDistance(
          currentCoords.latitude,
          currentCoords.longitude,
          pkg.latitude,
          pkg.longitude
        );
        
        if (geofenceCheck <= (geofenceConfig.radius || 100) && !pkg.geofenceTriggered) {
          pkg.geofenceTriggered = true;
          handleGeofenceEnter(pkg, geofenceCheck);
        }
      }
    });
  }, [packages, handleGeofenceEnter, geofenceConfig.radius]);

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
  };

  const handleCenterLocation = useCallback(() => {
    if (currentLocation) {
      centerOnLocation(currentLocation);
    } else {
      getCurrentLocation().then(location => {
        if (location) {
          centerOnLocation(location);
        }
      });
    }
  }, [currentLocation, centerOnLocation, getCurrentLocation]);

  const handleFitToPackages = useCallback(() => {
    if (packages && packages.length > 0) {
      fitToPackages();
    }
  }, [packages, fitToPackages]);

  const handleToggleSettings = useCallback(() => {
    setShowSettings(prev => !prev);
  }, []);

  const handleUpdatePackageStatus = useCallback(async (packageId, newStatus) => {
    try {
      const updatedPackage = await updatePackageStatus(packageId, newStatus);
      onPackageUpdate?.(updatedPackage);
      
      if (notificationService.current) {
        notificationService.current.showTemporaryNotification(`Estado actualizado: ${newStatus}`, 'success');
      }
    } catch (error) {
      if (notificationService.current) {
        notificationService.current.showTemporaryNotification('Error al actualizar estado', 'error');
      }
    }
  }, [updatePackageStatus, onPackageUpdate]);

  // Subscribe to package updates
  useEffect(() => {
    const unsubscribe = subscribeToUpdates((event) => {
      switch (event.type) {
        case 'packageUpdated': {
          setPackages(prev => 
            prev.map(p => p.id === event.package.id ? event.package : p)
          );
          break;
        }
        case 'packageAdded': {
          setPackages(prev => [...prev, event.package]);
          break;
        }
        case 'packageRemoved': {
          setPackages(prev => prev.filter(p => p.id !== event.packageId));
          break;
        }
        default: {
          console.log('Unknown event type:', event.type);
        }
      }
    });

    return unsubscribe;
  }, [subscribeToUpdates]);

  // Si hay error de inicialización, mostrar mensaje de error
  if (initializationError) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f0f0' }}>
        <Text>Error initializing application: {initializationError}</Text>
      </View>
    );
  }

  // Render
  if (packagesLoading) {
    return <LoadingScreen theme={theme} message="Cargando paquetes..." />;
  }

  return (
    <Animated.View style={[styles.container, { backgroundColor: currentTheme.background, opacity: fadeAnim }]} testID={testID}>
      <StatusBar 
        backgroundColor={currentTheme.background} 
        barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} 
      />
      
      <WebView
        ref={webViewRef}
        source={{ html: generateMapHTML(currentLocation, theme) }}
        style={styles.webview}
        onMessage={handleWebViewMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        renderLoading={() => <LoadingScreen theme={theme} message="Cargando mapa..." />}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('WebView error:', nativeEvent);
          onError?.({ type: 'MAP_LOAD_ERROR', message: nativeEvent.description });
        }}
        onHttpError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('WebView HTTP error:', nativeEvent);
          onError?.({ type: 'NETWORK_ERROR', message: 'Error de conexión al cargar el mapa' });
        }}
      />

      <NotificationSystem
        message={notification.message}
        type={notification.type}
        onHide={() => setNotification({ message: null, type: 'info' })}
      />

      <FloatingActionButtons
        onCenterLocation={handleCenterLocation}
        onFitToPackages={handleFitToPackages}
        onToggleSettings={handleToggleSettings}
        theme={theme}
      />

      {/* Settings panel would be implemented here */}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
});

export default MapScreen;