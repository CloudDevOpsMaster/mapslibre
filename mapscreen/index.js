// mapscreen/index.js - Fixed version with improved message queue system
import React, { useRef, useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, StatusBar, Text, Animated } from 'react-native';
import { WebView } from 'react-native-webview';

// Static imports
import LoadingScreen from './components/LoadingScreen';
import NotificationSystem from './components/NotificationSystem';
import ImprovedFloatingButtons from './components/ImprovedFloatingButtons';

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
  const [isWebViewLoaded, setIsWebViewLoaded] = useState(false); // NEW: Track WebView load state
  const [notification, setNotification] = useState({ message: null, type: 'info' });
  const [showSettings, setShowSettings] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('priority');
  const [initializationError, setInitializationError] = useState(null);
  const [userLocationMarkers, setUserLocationMarkers] = useState([]);

  // Message queue with better state management
  const [messageQueue, setMessageQueue] = useState([]);
  const messageQueueRef = useRef([]);
  const lastProcessedTime = useRef(0);

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

  // IMPROVED: Better WebView readiness detection
  const isWebViewReady = useCallback(() => {
    return isMapReady && isWebViewLoaded && webViewRef.current;
  }, [isMapReady, isWebViewLoaded]);

  // IMPROVED: Enhanced message sending function with better error handling
  const sendMessageToWebView = useCallback((message) => {
    const enrichedMessage = {
      ...message,
      timestamp: new Date().toISOString(),
      source: 'map_screen',
      messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    // Check if WebView is fully ready
    if (isWebViewReady()) {
      try {
        const messageString = JSON.stringify(enrichedMessage);
        console.log(`📤 [${enrichedMessage.messageId}] Enviando mensaje inmediato:`, message.type);
        webViewRef.current.postMessage(messageString);
        return true;
      } catch (error) {
        console.error(`❌ [${enrichedMessage.messageId}] Error enviando mensaje:`, error);
        console.error('📄 Contenido del mensaje:', enrichedMessage);
        return false;
      }
    } else {
      // Add to queue with diagnostic info
      const queuedAt = Date.now();
      const queueItem = { 
        ...enrichedMessage, 
        queuedAt,
        queueReason: {
          mapReady: isMapReady,
          webViewLoaded: isWebViewLoaded,
          webViewRef: !!webViewRef.current
        }
      };
      
      console.log(`⏳ [${enrichedMessage.messageId}] Agregando mensaje a cola:`, message.type, 
        `(mapa listo: ${isMapReady}, webView: ${isWebViewLoaded})`);
      
      setMessageQueue(prev => [...prev, queueItem]);
      messageQueueRef.current = [...messageQueueRef.current, queueItem];
      return false;
    }
  }, [isWebViewReady, isMapReady, isWebViewLoaded]);

  // IMPROVED: More robust queue processing
  const processMessageQueue = useCallback(() => {
    if (!isWebViewReady()) {
      console.warn('⚠️ Intentando procesar cola pero WebView no está listo completamente');
      return;
    }

    const currentQueue = [...messageQueueRef.current];
    if (currentQueue.length === 0) {
      console.log('✅ Cola de mensajes vacía');
      return;
    }

    // Prevent processing too frequently
    const now = Date.now();
    if (now - lastProcessedTime.current < 1000) {
      console.log('⏱️ Evitando procesamiento frecuente de cola');
      return;
    }
    lastProcessedTime.current = now;

    console.log(`📋 Procesando ${currentQueue.length} mensajes de la cola...`);

    // Clear queue before processing to prevent reprocessing
    setMessageQueue([]);
    messageQueueRef.current = [];

    let successCount = 0;
    let failureCount = 0;

    // Process messages with staggered timing
    currentQueue.forEach((message, index) => {
      setTimeout(() => {
        try {
          if (!webViewRef.current) {
            console.error(`❌ WebView no disponible para mensaje ${index + 1}`);
            failureCount++;
            return;
          }

          const messageString = JSON.stringify(message);
          console.log(`📤 [${message.messageId}] Procesando mensaje ${index + 1}/${currentQueue.length}:`, message.type);
          webViewRef.current.postMessage(messageString);
          successCount++;
        } catch (error) {
          console.error(`❌ [${message.messageId}] Error procesando mensaje ${index + 1}:`, error);
          failureCount++;
        }
      }, index * 150); // 150ms between messages
    });

    // Final status report
    setTimeout(() => {
      console.log(`✅ Cola procesada: ${successCount} exitosos, ${failureCount} fallidos`);
      
      // Notify about queue processing
      if (onError && failureCount > 0) {
        onError({
          type: 'MESSAGE_QUEUE_PROCESSING_ERROR',
          message: `${failureCount} mensajes fallaron al procesarse`,
          details: { successCount, failureCount, totalMessages: currentQueue.length }
        });
      }
    }, currentQueue.length * 150 + 100);
  }, [isWebViewReady, onError]);

  // IMPROVED: Enhanced WebView message handler
  const handleWebViewMessage = useCallback((event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log('📨 Mensaje recibido del WebView:', data.type);
      
      switch (data.type) {
        case 'mapReady': {
          console.log('🗺️ MapLibre está listo para recibir comandos');
          setIsMapReady(true);
          // Processing will be triggered by useEffect
          break;
        }
          
        case 'packageSelected': {
          const selectedPkg = packages.find(p => p.id === data.packageId);
          if (selectedPkg) {
            console.log('📦 Paquete seleccionado:', selectedPkg.trackingNumber);
          }
          break;
        }
          
        case 'routeCalculated': {
          console.log('🛣️ Ruta calculada:', data.route);
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

        case 'userLocationMarkerAdded': {
          console.log('✅ Marcador de usuario agregado exitosamente');
          console.log(`📍 Precisión: ±${data.accuracy}m (${data.precision})`);
          
          if (notificationService.current) {
            let message = '';
            let type = 'info';
            
            if (data.precision === 'excellent') {
              message = `🎯 ¡Ubicación de alta precisión! ±${Math.round(data.accuracy)}m`;
              type = 'success';
            } else if (data.precision === 'high') {
              message = `📍 Ubicación encontrada con precisión de ±${Math.round(data.accuracy)}m`;
              type = 'info';
            } else if (data.precision === 'good') {
              message = `📌 Ubicación encontrada ±${Math.round(data.accuracy)}m`;
              type = 'info';
            } else {
              message = `📍 Ubicación aproximada ±${Math.round(data.accuracy)}m`;
              type = 'warning';
            }
            
            notificationService.current.showTemporaryNotification(message, type);
          }
          break;
        }

        case 'mapCentered': {
          console.log('🎯 Mapa centrado exitosamente');
          console.log('📍 Coordenadas:', data.coordinates, 'Zoom:', data.zoom);
          break;
        }

        case 'userLocationMarkerError': {
          console.error('❌ Error agregando marcador de usuario:', data.error);
          
          if (notificationService.current) {
            notificationService.current.showTemporaryNotification(
              '❌ Error agregando marcador en el mapa', 
              'error'
            );
          }
          
          onError?.({
            type: 'USER_LOCATION_MARKER_ERROR',
            message: data.error,
            timestamp: data.timestamp
          });
          break;
        }
          
        case 'error': {
          console.error('❌ Error del mapa:', data.error);
          
          if (notificationService.current) {
            notificationService.current.showTemporaryNotification(
              'Error del mapa: ' + data.error, 
              'error'
            );
          }
          
          onError?.({ 
            type: 'MAP_ERROR', 
            message: data.error,
            timestamp: data.timestamp 
          });
          break;
        }
          
        default: {
          console.log('❓ Tipo de mensaje desconocido:', data.type, data);
        }
      }
    } catch (error) {
      console.error('❌ Error procesando mensaje del WebView:', error);
      console.error('📄 Mensaje original:', event.nativeEvent.data);
      
      if (notificationService.current) {
        notificationService.current.showTemporaryNotification(
          '⚠️ Error de comunicación con el mapa', 
          'error'
        );
      }
    }
  }, [packages, onRouteCalculated, onError, handleGeofenceEnter]);

  // Use the improved message sending function in useMapControls
  const {
    updateDriverLocation,
    centerOnLocation,
    fitToPackages,
    loadPackagesOnMap
  } = useMapControls(sendMessageToWebView, isWebViewReady());

  // IMPROVED: Enhanced location found handler with better error handling
  const handleLocationFound = useCallback((locationData) => {
    console.log('📍 Nueva ubicación encontrada:', {
      id: locationData.id || 'unknown',
      coordinates: locationData.coordinate || locationData.coordinates,
      accuracy: locationData.accuracy,
      timestamp: locationData.timestamp
    });

    try {
      // Add to local state for tracking
      setUserLocationMarkers(prev => {
        const newMarker = {
          id: locationData.id || `user-location-${Date.now()}`,
          coordinate: locationData.coordinate || locationData.coordinates,
          accuracy: locationData.accuracy,
          timestamp: locationData.timestamp || new Date().toISOString(),
          title: locationData.title,
          description: locationData.description,
          isUserLocation: true
        };

        // Keep only the latest 5 locations for performance
        const updatedMarkers = [newMarker, ...prev.slice(0, 4)];
        console.log(`📊 Total marcadores de usuario: ${updatedMarkers.length}`);

        return updatedMarkers;
      });

      // Notify based on precision if available
      if (locationData.accuracy && notificationService.current) {
        if (locationData.accuracy <= 10) {
          console.log('🎯 Precisión excelente detectada');
        } else if (locationData.accuracy <= 50) {
          console.log('📍 Precisión buena detectada');
        } else {
          console.log('📌 Precisión básica detectada');
        }
      }

      // Call original callback if exists
      if (onLocationUpdate) {
        onLocationUpdate(locationData.coordinate || locationData.coordinates);
      }
    } catch (error) {
      console.error('❌ Error procesando ubicación encontrada:', error);
      onError?.({
        type: 'LOCATION_PROCESSING_ERROR',
        message: error.message,
        locationData
      });
    }
  }, [onLocationUpdate, onError]);

  // Geofence handling
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
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) *
      Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  // Action handlers
  const handleCenterLocation = useCallback(async (locationData = null) => {
    const targetLocation = locationData || currentLocation;
    
    if (targetLocation) {
      centerOnLocation(targetLocation);
      
      if (locationData) {
        console.log('🎯 Centrando en nueva ubicación:', {
          lat: locationData.latitude.toFixed(6),
          lng: locationData.longitude.toFixed(6),
          accuracy: locationData.accuracy ? `±${Math.round(locationData.accuracy)}m` : 'N/A'
        });

        setUserLocationMarkers(prev => [{
          id: `user-location-${Date.now()}`,
          coordinate: {
            latitude: locationData.latitude,
            longitude: locationData.longitude
          },
          accuracy: locationData.accuracy,
          timestamp: locationData.timestamp || new Date().toISOString(),
          isUserLocation: true,
          source: 'center_action'
        }, ...prev.slice(0, 4)]);
      }
    } else {
      try {
        console.log('📍 Obteniendo ubicación actual para centrar...');
        const location = await getCurrentLocation();
        
        if (location) {
          centerOnLocation(location);
          console.log('✅ Mapa centrado en ubicación actual');
          
          if (onLocationUpdate) {
            onLocationUpdate({
              latitude: location.latitude,
              longitude: location.longitude
            });
          }
        }
      } catch (error) {
        console.error('❌ Error obteniendo ubicación:', error);
        
        if (notificationService.current) {
          notificationService.current.showTemporaryNotification(
            'No se pudo obtener la ubicación actual', 
            'error'
          );
        }
      }
    }
  }, [currentLocation, centerOnLocation, getCurrentLocation, onLocationUpdate]);

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

  // Effects
  useEffect(() => {
    fadeIn('screenFade').start();
  }, [fadeIn]);

  // IMPROVED: Enhanced effect for processing message queue
  useEffect(() => {
    if (isWebViewReady() && messageQueueRef.current.length > 0) {
      console.log('🚀 WebView completamente listo, procesando cola de mensajes...');
      // Delay to ensure WebView is fully initialized
      const timeoutId = setTimeout(processMessageQueue, 800);
      return () => clearTimeout(timeoutId);
    }
  }, [isWebViewReady, processMessageQueue]);

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

  // Cleanup effect for old markers
  useEffect(() => {
    const cleanup = () => {
      if (userLocationMarkers.length > 5) {
        const markersToKeep = userLocationMarkers.slice(0, 5);
        setUserLocationMarkers(markersToKeep);
        console.log(`🧹 Auto-limpieza: manteniendo ${markersToKeep.length} marcadores más recientes`);
      }
    };

    const cleanupInterval = setInterval(cleanup, 30000);
    return () => clearInterval(cleanupInterval);
  }, [userLocationMarkers.length]);

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

  // Utility functions for external use
  const mapUtilities = {
    clearOldUserLocationMarkers: () => {
      if (webViewRef.current) {
        webViewRef.current.postMessage(JSON.stringify({
          type: 'clearUserMarkers',
          timestamp: new Date().toISOString()
        }));
        setUserLocationMarkers([]);
        console.log('🗑️ Marcadores de usuario limpiados');
      }
    },
    getUserLocationStats: () => {
      if (userLocationMarkers.length === 0) return null;

      const accuracies = userLocationMarkers
        .map(marker => marker.accuracy)
        .filter(acc => acc && acc > 0);

      if (accuracies.length === 0) return null;

      const avgAccuracy = accuracies.reduce((sum, acc) => sum + acc, 0) / accuracies.length;
      const bestAccuracy = Math.min(...accuracies);
      const worstAccuracy = Math.max(...accuracies);

      return {
        totalMarkers: userLocationMarkers.length,
        avgAccuracy: Math.round(avgAccuracy),
        bestAccuracy: Math.round(bestAccuracy),
        worstAccuracy: Math.round(worstAccuracy),
        lastUpdate: userLocationMarkers[0]?.timestamp
      };
    },
    sendMessageToWebView: (message) => {
      return sendMessageToWebView(message);
    },
    getWebViewStatus: () => {
      return {
        isMapReady,
        isWebViewLoaded,
        isWebViewReady: isWebViewReady(),
        queueLength: messageQueue.length,
        hasWebViewRef: !!webViewRef.current
      };
    }
  };

  // Error boundary for initialization
  if (initializationError) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f0f0' }}>
        <Text>Error initializing application: {initializationError}</Text>
      </View>
    );
  }

  // Loading state
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
        onLoad={() => {
          console.log('📱 WebView cargado completamente');
          setIsWebViewLoaded(true);
        }}
        onLoadEnd={() => {
          console.log('🏁 WebView load finalizado');
          // Additional delay to ensure everything is ready
          setTimeout(() => {
            console.log('✅ WebView completamente inicializado');
          }, 500);
        }}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('WebView error:', nativeEvent);
          setIsWebViewLoaded(false);
          onError?.({ type: 'MAP_LOAD_ERROR', message: nativeEvent.description });
        }}
        onHttpError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('WebView HTTP error:', nativeEvent);
          setIsWebViewLoaded(false);
          onError?.({ type: 'NETWORK_ERROR', message: 'Error de conexión al cargar el mapa' });
        }}
      />

      <NotificationSystem
        message={notification.message}
        type={notification.type}
        onHide={() => setNotification({ message: null, type: 'info' })}
      />

      <ImprovedFloatingButtons
        mapRef={webViewRef}
        onLocationFound={handleLocationFound}
        on_center_location={handleCenterLocation}
        on_fit_to_packages={handleFitToPackages}
        on_toggle_settings={handleToggleSettings}
        theme={theme}
      />

      {/* Debug info - Remove in production */}
      {__DEV__ && (
        <View style={styles.debugInfo}>
          <Text style={styles.debugText}>
            Estado: {isMapReady ? '✅' : '❌'} Mapa | {isWebViewLoaded ? '✅' : '❌'} WebView
          </Text>
          <Text style={styles.debugText}>
            Cola: {messageQueue.length} msgs | Marcadores: {userLocationMarkers.length}
          </Text>
          {userLocationMarkers.length > 0 && (
            <Text style={styles.debugText}>
              Última precisión: ±{Math.round(userLocationMarkers[0]?.accuracy || 0)}m
            </Text>
          )}
          <Text style={styles.debugText}>
            WebView Ready: {isWebViewReady() ? '✅' : '❌'}
          </Text>
        </View>
      )}
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
  debugInfo: {
    position: 'absolute',
    top: 100,
    left: 10,
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 10,
    borderRadius: 6,
    zIndex: 1000,
    maxWidth: 300,
  },
  debugText: {
    color: '#fff',
    fontSize: 11,
    fontFamily: 'monospace',
    lineHeight: 14,
  },
});

export default MapScreen;