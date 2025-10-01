// mapscreen/components/EnhancedMapScreen.js - Refactored Version
import React, { useRef, useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, StatusBar, Text, Animated } from 'react-native';
import { WebView } from 'react-native-webview';

// Import components
import LoadingScreen from '../components/LoadingScreen';

// Import ImprovedFloatingButtons with fallback
let ImprovedFloatingButtons;
try {
  ImprovedFloatingButtons = require('../components/ImprovedFloatingButtons').default;
} catch (error) {
  console.warn('ImprovedFloatingButtons not found, using basic fallback');
  ImprovedFloatingButtons = ({ onLocationFound, on_center_location, on_fit_to_packages, on_toggle_settings, theme }) => (
    <View style={{ position: 'absolute', bottom: 20, right: 20, backgroundColor: '#007AFF', width: 60, height: 60, borderRadius: 30 }} />
  );
}

// Import hooks with fallbacks
let useLocationTracking, usePackageManager, useMapControls, useAnimations;

try {
  useLocationTracking = require('../hooks/useLocationTracking').default;
} catch (error) {
  console.warn('useLocationTracking not found, using fallback');
  useLocationTracking = () => ({
    currentLocation: null,
    isTracking: false,
    permissionStatus: 'unknown',
    getCurrentLocation: () => Promise.resolve(null),
    startLocationTracking: () => { },
    stopLocationTracking: () => { }
  });
}

try {
  usePackageManager = require('../hooks/usePackageManager').default;
} catch (error) {
  console.warn('usePackageManager not found, using fallback');
  usePackageManager = (adapter, initialPackages) => ({
    packages: initialPackages || [],
    isLoading: false,
    error: null,
    updatePackageStatus: () => Promise.resolve({}),
    loadPackages: () => Promise.resolve([]),
    getPackageDetails: () => Promise.resolve(null),
    subscribeToUpdates: () => () => { }
  });
}

try {
  useMapControls = require('../hooks/useMapControls').default;
} catch (error) {
  console.warn('useMapControls not found, using fallback');
  useMapControls = () => ({
    updateDriverLocation: () => { },
    centerOnLocation: () => { },
    fitToPackages: () => { },
    loadPackagesOnMap: () => { }
  });
}

try {
  useAnimations = require('../hooks/useAnimations').useAnimations;
} catch (error) {
  console.warn('useAnimations not found, using fallback');
  useAnimations = () => ({
    fadeIn: () => ({ start: () => { } }),
    getAnimatedValue: () => new Animated.Value(1)
  });
}

// ============================================================================
// UPDATED IMPORTS - Using new refactored utils structure
// ============================================================================

let generateMapHTML, themes, AdapterFactory;
let createUserLocationMarker, sendMarkerToMap;

// Try to import from new refactored structure
try {
  const mapUtils = require('../utils');
  generateMapHTML = mapUtils.generateMapHTML;
  createUserLocationMarker = mapUtils.createUserLocationMarker;
  sendMarkerToMap = mapUtils.sendMarkerToMap;
} catch (error) {
  console.warn('New utils structure not found, trying old structure...');
  
  // Fallback to old structure
  // try {
  //   const oldMapHelpers = require('../utils/MapHelpers');
  //   generateMapHTML = oldMapHelpers.generateMapHTML;
  // } catch (fallbackError) {
  //   console.warn('MapHelpers not found, using basic fallback');
  //   generateMapHTML = (currentLocation, theme) => `
  //     <!DOCTYPE html>
  //     <html>
  //     <head>
  //         <meta charset="utf-8">
  //         <meta name="viewport" content="width=device-width, initial-scale=1.0">
  //         <title>Basic Map</title>
  //     </head>
  //     <body>
  //         <div id="map" style="width: 100vw; height: 100vh; background: #e0e0e0; display: flex; align-items: center; justify-content: center; font-family: Arial, sans-serif;">
  //             <div style="text-align: center;">
  //                 <h2>Map Loading...</h2>
  //                 <p>Location: ${currentLocation ? `${currentLocation.latitude}, ${currentLocation.longitude}` : 'Unknown'}</p>
  //                 <p>Theme: ${theme}</p>
  //             </div>
  //         </div>
  //         <script>
  //             setTimeout(() => {
  //                 if (window.ReactNativeWebView) {
  //                     window.ReactNativeWebView.postMessage(JSON.stringify({
  //                         type: 'mapReady',
  //                         timestamp: new Date().toISOString()
  //                     }));
  //                 }
  //             }, 1000);
  //         </script>
  //     </body>
  //     </html>
  //   `;
  // }
  
  // Create fallback marker helpers if not available
  if (!createUserLocationMarker) {
    createUserLocationMarker = (location, options = {}) => ({
      id: options.id || `user-location-${Date.now()}`,
      coordinates: {
        latitude: location.latitude,
        longitude: location.longitude
      },
      accuracy: location.accuracy || 999,
      timestamp: location.timestamp || new Date().toISOString(),
      title: options.title || 'Mi Ubicación Actual',
      description: `Precisión: ±${Math.round(location.accuracy || 0)}m`,
      isUserLocation: true
    });
  }
  
  if (!sendMarkerToMap) {
    sendMarkerToMap = (mapRef, markerData) => {
      if (!mapRef?.current) return false;
      
      try {
        const message = JSON.stringify({
          type: 'addUserLocationMarker',
          marker: markerData,
          timestamp: new Date().toISOString(),
          messageId: `msg_${Date.now()}`
        });
        
        mapRef.current.postMessage(message);
        return true;
      } catch (error) {
        console.error('Error sending marker:', error);
        return false;
      }
    };
  }
}

// try {
//   themes = require('../utils/constants').themes;
// } catch (error) {
//   console.warn('themes not found, using fallback');
//   themes = {
//     light: { background: '#ffffff', primary: '#007AFF', text: '#000000' },
//     dark: { background: '#1a1a1a', primary: '#0A84FF', text: '#ffffff' }
//   };
// }

try {
  AdapterFactory = require('../adapters/AdapterFactory').default;
} catch (error) {
  console.warn('AdapterFactory not found, using fallback');
  AdapterFactory = {
    createAdapter: () => ({
      getPackages: () => Promise.resolve([]),
      updatePackageStatus: () => Promise.resolve({})
    })
  };
}

// ============================================================================
// Main Component
// ============================================================================

const MapScreen = ({
  dataSource = 'local',
  apiConfig = {},
  adapter: customAdapter = null,
  initialPackages = [],
  onPackageUpdate,
  onLocationUpdate,
  onError,
  theme = 'light',
  locationConfig = {},
  primaryColor,
  accentColor,
  testID = 'map-screen',
}) => {
  // Refs
  const webViewRef = useRef(null);

  // State
  const [isMapReady, setIsMapReady] = useState(false);
  const [isWebViewLoaded, setIsWebViewLoaded] = useState(false);
  const [notification, setNotification] = useState({ message: null, type: 'info' });
  const [showSettings, setShowSettings] = useState(false);
  const [initializationError, setInitializationError] = useState(null);

  // Message queue
  const [messageQueue, setMessageQueue] = useState([]);
  const messageQueueRef = useRef([]);

  // Animations
  const { fadeIn, getAnimatedValue } = useAnimations();
  const fadeAnim = getAnimatedValue('screenFade', 0);

  // Services and Adapters
  const adapter = useRef(
    customAdapter || AdapterFactory.createAdapter(dataSource, apiConfig || {})
  );

  // Hooks
  const {
    currentLocation,
    getCurrentLocation,
  } = useLocationTracking(locationConfig || {});

  const {
    packages,
    isLoading: packagesLoading,
  } = usePackageManager(adapter.current, initialPackages || []);

  // Theme handling
  const safeThemes = themes || { light: {}, dark: {} };
  const selectedTheme = safeThemes[theme] || safeThemes.light || {};
  const currentTheme = {
    background: '#ffffff',
    primary: '#007AFF',
    accent: '#FF3B30',
    text: '#000000',
    textSecondary: '#6b7280',
    ...selectedTheme,
    ...(primaryColor ? { primary: primaryColor } : {}),
    ...(accentColor ? { accent: accentColor } : {})
  };

  // WebView readiness check
  const isWebViewReady = useCallback(() => {
    return isMapReady && isWebViewLoaded && webViewRef.current;
  }, [isMapReady, isWebViewLoaded]);

  // Message sending function
  const sendMessageToWebView = useCallback((message) => {
    const enrichedMessage = {
      ...message,
      timestamp: new Date().toISOString(),
      source: 'map_screen',
      messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    if (isWebViewReady()) {
      try {
        const messageString = JSON.stringify(enrichedMessage);
        console.log(`📤 [${enrichedMessage.messageId}] Sending message:`, message.type);
        webViewRef.current.postMessage(messageString);
        return true;
      } catch (error) {
        console.error(`❌ [${enrichedMessage.messageId}] Error sending message:`, error);
        return false;
      }
    } else {
      console.log(`⏳ [${enrichedMessage.messageId}] Adding to queue:`, message.type);
      setMessageQueue(prev => [...prev, enrichedMessage]);
      messageQueueRef.current = [...messageQueueRef.current, enrichedMessage];
      return false;
    }
  }, [isWebViewReady]);

  // Process message queue
  const processMessageQueue = useCallback(() => {
    if (!isWebViewReady() || messageQueueRef.current.length === 0) return;

    const currentQueue = [...messageQueueRef.current];
    console.log(`📋 Processing ${currentQueue.length} queued messages...`);

    setMessageQueue([]);
    messageQueueRef.current = [];

    currentQueue.forEach((message, index) => {
      setTimeout(() => {
        try {
          if (webViewRef.current) {
            webViewRef.current.postMessage(JSON.stringify(message));
            console.log(`📤 [${message.messageId}] Processed message ${index + 1}/${currentQueue.length}`);
          }
        } catch (error) {
          console.error(`❌ Error processing queued message ${index + 1}:`, error);
        }
      }, index * 100);
    });
  }, [isWebViewReady]);

  // WebView message handler
  const handleWebViewMessage = useCallback((event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log('📨 Message from WebView:', data.type);

      switch (data.type) {
        case 'mapReady': {
          console.log('🗺️ MapLibre ready');
          setIsMapReady(true);
          break;
        }
        case 'userLocationMarkerAdded': {
          console.log('✅ User location marker added:', data.markerId);
          if (onLocationUpdate && data.coordinates) {
            onLocationUpdate({
              latitude: data.coordinates.latitude,
              longitude: data.coordinates.longitude,
              accuracy: data.accuracy,
              timestamp: data.timestamp
            });
          }
          break;
        }
        case 'mapCentered': {
          console.log('🎯 Map centered on location');
          break;
        }
        case 'error': {
          console.error('❌ Map error:', data.error);
          if (onError) {
            onError({ type: 'MAP_ERROR', message: data.error });
          }
          break;
        }
        default: {
          console.log('❓ Unknown message type:', data.type, data);
        }
      }
    } catch (error) {
      console.error('❌ Error processing WebView message:', error);
    }
  }, [onError, onLocationUpdate]);

  // Map controls
  const {
    updateDriverLocation,
    centerOnLocation,
    fitToPackages,
    loadPackagesOnMap
  } = useMapControls(sendMessageToWebView, isWebViewReady());

  // ============================================================================
  // Action handlers - REFACTORED to use new marker helpers
  // ============================================================================

  const handleLocationFound = useCallback((locationData) => {
    console.log('📍 Location found:', locationData);
    if (onLocationUpdate) {
      onLocationUpdate(locationData);
    }
  }, [onLocationUpdate]);

  const handleCenterLocation = useCallback(async (locationData = null) => {
    const targetLocation = locationData || currentLocation;

    if (targetLocation) {
      centerOnLocation(targetLocation);
    } else {
      try {
        const location = await getCurrentLocation();
        if (location) {
          // ✨ NEW: Use refactored marker helper
          const markerData = createUserLocationMarker(location, {
            title: "Mi Ubicación Actual",
            id: `user-center-${Date.now()}`
          });

          // ✨ NEW: Use refactored send function
          const success = sendMarkerToMap(webViewRef, markerData);

          if (success) {
            centerOnLocation(location);
            console.log('✅ Ubicación actual obtenida, pin enviado y mapa centrado.');
          } else {
            console.warn('⚠️ No se pudo enviar el marcador');
          }
        }
      } catch (error) {
        console.error('❌ Error al obtener la ubicación:', error);
        if (onError) {
          onError({ type: 'LOCATION_ERROR', message: error.message });
        }
      }
    }
  }, [currentLocation, centerOnLocation, getCurrentLocation, onError]);

  const handleFitToPackages = useCallback(() => {
    if (packages && packages.length > 0) {
      fitToPackages();
    } else {
      console.warn('⚠️ No hay paquetes para ajustar la vista');
    }
  }, [packages, fitToPackages]);

  const handleToggleSettings = useCallback(() => {
    setShowSettings(prev => !prev);
  }, []);

  // ============================================================================
  // Effects
  // ============================================================================

  useEffect(() => {
    if (fadeIn && typeof fadeIn === 'function') {
      fadeIn('screenFade').start();
    }
  }, [fadeIn]);

  useEffect(() => {
    if (isWebViewReady() && messageQueueRef.current.length > 0) {
      const timeoutId = setTimeout(processMessageQueue, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [isWebViewReady, processMessageQueue]);

  useEffect(() => {
    if (currentLocation && updateDriverLocation) {
      updateDriverLocation(currentLocation);
      if (onLocationUpdate) {
        onLocationUpdate(currentLocation);
      }
    }
  }, [currentLocation, updateDriverLocation, onLocationUpdate]);

  useEffect(() => {
    if (isMapReady && packages && packages.length > 0 && loadPackagesOnMap) {
      loadPackagesOnMap(packages, currentLocation);
    }
  }, [isMapReady, packages, currentLocation, loadPackagesOnMap]);

  // ============================================================================
  // Render
  // ============================================================================

  // Loading state
  if (packagesLoading) {
    return <LoadingScreen theme={theme} message="Loading packages..." />;
  }

  // Error state
  if (initializationError) {
    return (
      <View style={[styles.container, { backgroundColor: currentTheme.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: currentTheme.text }}>Initialization Error: {initializationError}</Text>
      </View>
    );
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
        renderLoading={() => <LoadingScreen theme={theme} message="Loading map..." />}
        onLoad={() => {
          console.log('📱 WebView loaded');
          setIsWebViewLoaded(true);
        }}
        onLoadEnd={() => {
          console.log('✅ WebView load finished');
        }}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('WebView error:', nativeEvent);
          setIsWebViewLoaded(false);
          if (onError) {
            onError({ type: 'MAP_LOAD_ERROR', message: nativeEvent.description });
          }
        }}
      />

      {/* Basic Notification System */}
      {notification.message && (
        <View style={styles.notification}>
          <Text style={styles.notificationText}>{notification.message}</Text>
        </View>
      )}

      {/* Floating Buttons */}
      <ImprovedFloatingButtons
        mapRef={webViewRef}
        onLocationFound={handleLocationFound}
        on_center_location={handleCenterLocation}
        on_fit_to_packages={handleFitToPackages}
        on_toggle_settings={handleToggleSettings}
        theme={theme}
      />

      {/* Debug info */}
      {__DEV__ && (
        <View style={styles.debugInfo}>
          <Text style={styles.debugText}>
            Map: {isMapReady ? '✅' : '❌'} | WebView: {isWebViewLoaded ? '✅' : '❌'}
          </Text>
          <Text style={styles.debugText}>
            Queue: {messageQueue.length} msgs | Packages: {packages.length}
          </Text>
          {currentLocation && (
            <Text style={styles.debugText}>
              Location: {currentLocation.latitude.toFixed(4)}, {currentLocation.longitude.toFixed(4)}
            </Text>
          )}
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
  notification: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    zIndex: 1000,
  },
  notificationText: {
    color: '#ffffff',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
  },
  debugInfo: {
    position: 'absolute',
    top: 100,
    left: 10,
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 10,
    borderRadius: 6,
    zIndex: 1000,
  },
  debugText: {
    color: '#fff',
    fontSize: 11,
    fontFamily: 'monospace',
  },
});

export default MapScreen;