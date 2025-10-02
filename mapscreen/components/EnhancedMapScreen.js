// mapscreen/components/EnhancedMapScreen.js - REFACTORED with UI_CONFIG
import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { View, StatusBar, Text, Animated } from 'react-native';
import { WebView } from 'react-native-webview';

// Import centralized styles
import { createMapScreenStyles } from '../utils/styleAdapter';
import { UI_CONFIG } from '../config/ui_config';

// Import components with fallback
let LoadingScreen, ImprovedFloatingButtons;

try {
  LoadingScreen = require('../components/LoadingScreen').default;
} catch (error) {
  console.warn('LoadingScreen not found, using fallback');
  LoadingScreen = ({ message }) => (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
      <Text>{message || 'Cargando...'}</Text>
    </View>
  );
}

try {
  ImprovedFloatingButtons = require('../components/ImprovedFloatingButtons').default;
} catch (error) {
  console.warn('ImprovedFloatingButtons not found, using basic fallback');
  ImprovedFloatingButtons = ({ theme }) => (
    <View style={{ 
      position: 'absolute', 
      bottom: 20, 
      right: 20, 
      backgroundColor: '#007AFF', 
      width: 60, 
      height: 60, 
      borderRadius: 30 
    }} />
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
    startLocationTracking: () => {},
    stopLocationTracking: () => {}
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
    subscribeToUpdates: () => () => {}
  });
}

try {
  useMapControls = require('../hooks/useMapControls').default;
} catch (error) {
  console.warn('useMapControls not found, using fallback');
  useMapControls = () => ({
    updateDriverLocation: () => {},
    centerOnLocation: () => {},
    fitToPackages: () => {},
    loadPackagesOnMap: () => {}
  });
}

try {
  useAnimations = require('../hooks/useAnimations').useAnimations;
} catch (error) {
  console.warn('useAnimations not found, using fallback');
  useAnimations = () => ({
    fadeIn: () => ({ start: () => {} }),
    getAnimatedValue: () => new Animated.Value(1)
  });
}

// Import utils with fallbacks
let generateMapHTML, createUserLocationMarker, sendMarkerToMap, AdapterFactory;

try {
  const mapUtils = require('../utils');
  generateMapHTML = mapUtils.generateMapHTML;
  createUserLocationMarker = mapUtils.createUserLocationMarker;
  sendMarkerToMap = mapUtils.sendMarkerToMap;
} catch (error) {
  console.warn('Utils not found, using fallbacks');
  
  generateMapHTML = (location, theme) => `
    <!DOCTYPE html>
    <html><body>
      <div style="display:flex;justify-content:center;align-items:center;height:100vh;">
        <p>Map utilities not available</p>
      </div>
    </body></html>
  `;
  
  createUserLocationMarker = (location, options = {}) => ({
    id: options.id || `user-location-${Date.now()}`,
    coordinates: { latitude: location.latitude, longitude: location.longitude },
    accuracy: location.accuracy || 999,
    timestamp: location.timestamp || new Date().toISOString(),
    title: options.title || 'Mi Ubicación Actual',
    description: `Precisión: ±${Math.round(location.accuracy || 0)}m`,
    isUserLocation: true
  });
  
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
  const [lastMarkerAdded, setLastMarkerAdded] = useState(null);

  // Message queue
  const [messageQueue, setMessageQueue] = useState([]);
  const messageQueueRef = useRef([]);

  // Memoized styles - recreate only when theme changes
  const styles = useMemo(() => createMapScreenStyles(theme), [theme]);
  
  // Get theme colors from UI_CONFIG
  const themeColors = useMemo(() => {
    const colors = UI_CONFIG.themes[theme]?.colors || UI_CONFIG.themes.light.colors;
    return {
      ...colors,
      ...(primaryColor ? { primary: primaryColor } : {}),
      ...(accentColor ? { accent: accentColor } : {})
    };
  }, [theme, primaryColor, accentColor]);

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
        case 'mapReady':
          console.log('🗺️ MapLibre ready');
          setIsMapReady(true);
          break;
        case 'userLocationMarkerAdded':
          console.log('✅ User location marker added:', data.markerId);
          setLastMarkerAdded({
            id: data.markerId,
            coordinates: data.coordinates,
            timestamp: new Date().toISOString()
          });
          
          if (onLocationUpdate && data.coordinates) {
            onLocationUpdate({
              latitude: data.coordinates.latitude,
              longitude: data.coordinates.longitude,
              accuracy: data.accuracy,
              timestamp: data.timestamp,
              source: 'webview_confirmation'
            });
          }
          break;
        case 'mapCentered':
          console.log('🎯 Map centered on location:', data.coordinates);
          break;
        case 'error':
          console.error('❌ Map error:', data.error);
          if (onError) {
            onError({ type: 'MAP_ERROR', message: data.error });
          }
          break;
        default:
          console.log('❓ Unknown message type:', data.type, data);
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
  // Action handlers
  // ============================================================================

  const handleLocationFound = useCallback((locationData) => {
    console.log('📍 Location found:', locationData);
    if (onLocationUpdate) {
      onLocationUpdate({
        ...locationData,
        source: 'floating_buttons'
      });
    }
  }, [onLocationUpdate]);

  const handleCenterLocation = useCallback(async (locationData = null) => {
    const targetLocation = locationData || currentLocation;

    if (targetLocation && !locationData) {
      console.log('🎯 Centering on existing location');
      centerOnLocation(targetLocation);
      return;
    }

    if (!targetLocation) {
      try {
        console.log('📡 Getting current location...');
        const location = await getCurrentLocation();
        
        if (!location) {
          console.warn('⚠️ No location received');
          return;
        }

        console.log('✅ Location obtained:', {
          lat: location.latitude.toFixed(6),
          lng: location.longitude.toFixed(6),
          accuracy: `±${Math.round(location.accuracy)}m`
        });

        const markerData = createUserLocationMarker(location, {
          title: "Mi Ubicación Actual",
          id: `user-center-${Date.now()}`
        });

        console.log('📍 Sending marker to map...');
        const markerSent = sendMarkerToMap(webViewRef, markerData);

        if (markerSent) {
          await new Promise(resolve => setTimeout(resolve, 300));
          
          console.log('🎯 Centering map on new location...');
          centerOnLocation(location);
          
          await new Promise(resolve => setTimeout(resolve, 800));

          if (onLocationUpdate) {
            onLocationUpdate({
              ...location,
              markerData,
              source: 'map_screen_new_location',
              centered: true
            });
          }

          console.log('✅ Location flow completed successfully');
        } else {
          console.warn('⚠️ Failed to send marker to map');
        }

      } catch (error) {
        console.error('❌ Error getting location:', error);
        if (onError) {
          onError({ 
            type: 'LOCATION_ERROR', 
            message: error.message,
            code: error.code 
          });
        }
      }
    } else if (locationData) {
      console.log('🎯 Centering on provided location data');
      
      if (onLocationUpdate) {
        onLocationUpdate({
          ...locationData,
          source: 'map_screen_provided_location'
        });
      }
    }
  }, [currentLocation, centerOnLocation, getCurrentLocation, onError, onLocationUpdate]);

  const handleFitToPackages = useCallback(() => {
    if (packages && packages.length > 0) {
      console.log(`📦 Fitting map to ${packages.length} packages`);
      fitToPackages();
    } else {
      console.warn('⚠️ No packages to fit');
      setNotification({
        message: 'No hay paquetes para ajustar la vista',
        type: 'warning'
      });
      setTimeout(() => setNotification({ message: null, type: 'info' }), 3000);
    }
  }, [packages, fitToPackages]);

  const handleToggleSettings = useCallback(() => {
    setShowSettings(prev => !prev);
    console.log('⚙️ Settings toggled:', !showSettings);
  }, [showSettings]);

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
        onLocationUpdate({
          ...currentLocation,
          source: 'continuous_tracking'
        });
      }
    }
  }, [currentLocation, updateDriverLocation, onLocationUpdate]);

  useEffect(() => {
    if (isMapReady && packages && packages.length > 0 && loadPackagesOnMap) {
      console.log(`📦 Loading ${packages.length} packages on map`);
      loadPackagesOnMap(packages, currentLocation);
    }
  }, [isMapReady, packages, currentLocation, loadPackagesOnMap]);

  useEffect(() => {
    if (notification.message) {
      const timer = setTimeout(() => {
        setNotification({ message: null, type: 'info' });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // ============================================================================
  // Render
  // ============================================================================

  if (packagesLoading) {
    return <LoadingScreen theme={theme} message="Cargando paquetes..." />;
  }

  if (initializationError) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: themeColors.text, fontSize: 16, marginBottom: 10 }}>
          Error de inicialización
        </Text>
        <Text style={{ color: themeColors.textSecondary, fontSize: 14 }}>
          {initializationError}
        </Text>
      </View>
    );
  }

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]} testID={testID}>
      <StatusBar
        backgroundColor={themeColors.background}
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
          console.log('📱 WebView loaded');
          setIsWebViewLoaded(true);
        }}
        onLoadEnd={() => {
          console.log('✅ WebView load finished');
        }}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('❌ WebView error:', nativeEvent);
          setIsWebViewLoaded(false);
          if (onError) {
            onError({ type: 'MAP_LOAD_ERROR', message: nativeEvent.description });
          }
        }}
      />

      {/* Notification System */}
      {notification.message && (
        <View style={[
          styles.notification,
          notification.type === 'error' && styles.notificationError,
          notification.type === 'warning' && styles.notificationWarning,
          notification.type === 'success' && styles.notificationSuccess
        ]}>
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
          {lastMarkerAdded && (
            <Text style={styles.debugText}>
              Last Marker: {lastMarkerAdded.id.substring(0, 20)}...
            </Text>
          )}
        </View>
      )}
    </Animated.View>
  );
};

export default MapScreen;