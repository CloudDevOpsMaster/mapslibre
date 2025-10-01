// mapscreen/components/ImprovedFloatingButtons.js - REFACTORED VERSION
// Uses centralized ui_config.js through styleAdapter
// Reduced from 280+ lines of StyleSheet to ~50 lines

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Text,
  Vibration,
  Alert,
  Platform,
} from 'react-native';
import * as Location from 'expo-location';

// Import with fallbacks
let LocationService, SyncService, addDestinationMarkerToMap, createFloatingButtonStyles, getButtonStateColor, UI_CONFIG;

try {
  LocationService = require('../services/LocationService').LocationService;
} catch (e) {
  console.warn('LocationService not found, using mock');
  LocationService = class MockLocationService {
    locationPermission = 'unknown';
    ACCURACY_THRESHOLDS = { excellent: 5 };
    checkLocationPermissions() {}
    async requestLocationPermissions() { return false; }
    async getCurrentLocationWithHighPrecision() { return null; }
    createLocationMarker(loc) { return {}; }
    getLocationAccuracyInfo(acc) { return { description: 'Unknown' }; }
    async showLocationError(err) { return 'cancel'; }
  };
}

try {
  SyncService = require('../services/SyncService').SyncService;
} catch (e) {
  console.warn('SyncService not found, using mock');
  SyncService = class MockSyncService {
    syncedPackages = [];
    syncStats = { updatedPackages: 0, totalPackages: 0, lastSync: null, syncCount: 0 };
    async syncPackages() { return { packages: [] }; }
    createPackageMarkers() { return []; }
    async showSyncError() {}
    async showSyncStats() { return 'cancel'; }
  };
}

try {
  addDestinationMarkerToMap = require('../utils').addDestinationMarkerToMap;
} catch (e) {
  console.warn('addDestinationMarkerToMap not found, using mock');
  addDestinationMarkerToMap = () => {};
}

try {
  const styleAdapter = require('../utils/styleAdapter');
  createFloatingButtonStyles = styleAdapter.createFloatingButtonStyles;
  getButtonStateColor = styleAdapter.getButtonStateColor;
} catch (e) {
  console.error('styleAdapter not found, using fallback styles');
  // Fallback styles
  createFloatingButtonStyles = () => StyleSheet.create({
    backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.3)', zIndex: 998 },
    backdropTouch: { flex: 1 },
    searchRipple: { position: 'absolute', bottom: 115, right: 58, width: 70, height: 70, borderRadius: 35, borderWidth: 2, zIndex: 999 },
    speedDialContainer: { position: 'absolute', bottom: 30, right: 20, alignItems: 'center', zIndex: 1000 },
    speedDialButton: { position: 'absolute', bottom: 0, alignItems: 'center', flexDirection: 'row', justifyContent: 'flex-end' },
    speedDialLabel: { position: 'absolute', backgroundColor: 'rgba(15, 23, 42, 0.95)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, elevation: 8, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
    labelText: { color: '#f8fafc', fontSize: 14, fontWeight: '600', textAlign: 'center', minWidth: 100 },
    actionButton: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
    actionIcon: { fontSize: 24, textAlign: 'center' },
    mainButtonContainer: { marginBottom: 15 },
    mainButton: { width: 75, height: 75, borderRadius: 37.5, justifyContent: 'center', alignItems: 'center', elevation: 18, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.25)', position: 'relative' },
    mainIcon: { fontSize: 30, textAlign: 'center', zIndex: 2 },
    menuButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#ef4444', justifyContent: 'center', alignItems: 'center', elevation: 12, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.2)' },
    menuButtonExpanded: { backgroundColor: '#dc2626' },
    menuIcon: { fontSize: 22, color: '#fff', fontWeight: 'bold', textAlign: 'center' },
    buttonGlow: { position: 'absolute', width: 75, height: 75, borderRadius: 37.5 },
    pulseRing: { position: 'absolute', width: 75, height: 75, borderRadius: 37.5, borderWidth: 2.5, backgroundColor: 'transparent' },
    statusBar: { position: 'absolute', top: 70, left: 15, right: 15, paddingHorizontal: 20, paddingVertical: 16, borderRadius: 20, elevation: 16, zIndex: 1005, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.15)' },
    statusText: { color: '#fff', fontSize: 15, fontWeight: '600', textAlign: 'center' },
    locationInfo: { marginTop: 10, alignItems: 'center', width: '100%' },
    accuracyText: { color: 'rgba(255,255,255,0.95)', fontSize: 13, fontWeight: '500', textAlign: 'center' },
    detailText: { color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '400', marginTop: 3, textAlign: 'center' },
    methodText: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '400', marginTop: 4, textAlign: 'center', fontStyle: 'italic' },
    debugPanel: { position: 'absolute', top: 200, left: 10, backgroundColor: 'rgba(15, 23, 42, 0.95)', padding: 12, borderRadius: 12, zIndex: 1010, maxWidth: 300, borderWidth: 1, borderColor: 'rgba(148, 163, 184, 0.2)', elevation: 8 },
    debugTitle: { color: '#f8fafc', fontSize: 12, fontWeight: 'bold', marginBottom: 6 },
    debugMessage: { fontSize: 10, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', lineHeight: 14 },
  });
  getButtonStateColor = (state) => ({ bg: '#3b82f6', shadow: '#3b82f6' });
}

try {
  UI_CONFIG = require('../config/ui_config').UI_CONFIG;
} catch (e) {
  console.error('UI_CONFIG not found, using defaults');
  UI_CONFIG = {
    designTokens: {
      animations: {
        durations: { micro: 100, fast: 150, normal: 200, medium: 300, slow: 400, slower: 600 },
        easings: { linear: [0, 0, 1, 1], easeIn: [0.4, 0, 1, 1], easeOut: [0, 0, 0.2, 1], easeInOut: [0.4, 0, 0.2, 1] }
      }
    }
  };
}

const ImprovedFloatingButtons = ({
  on_center_location,
  on_toggle_settings,
  mapRef,
  onLocationFound,
  onPackagesSynced,
  theme = 'light',
}) => {
  // ============================================================================
  // STATE
  // ============================================================================
  const [isExpanded, setIsExpanded] = useState(false);
  const [locationStatus, setLocationStatus] = useState('idle');
  const [syncStatus, setSyncStatus] = useState('idle');
  const [userLocation, setUserLocation] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [locationHistory, setLocationHistory] = useState([]);
  const [syncDetailedInfo, setSyncDetailedInfo] = useState(null);
  const [messageLog, setMessageLog] = useState([]);

  // ============================================================================
  // ANIMATIONS - Using design tokens from UI_CONFIG
  // ============================================================================
  const { durations, easings } = UI_CONFIG.designTokens.animations;
  
  const [expandAnim] = useState(new Animated.Value(0));
  const [locationPulse] = useState(new Animated.Value(1));
  const [locationRotate] = useState(new Animated.Value(0));
  const [syncRotate] = useState(new Animated.Value(0));
  const [zoomRipple] = useState(new Animated.Value(0));
  const [successScale] = useState(new Animated.Value(1));

  // ============================================================================
  // REFS
  // ============================================================================
  const locationTimeoutRef = useRef(null);
  const syncTimeoutRef = useRef(null);
  const statusTimeoutRef = useRef(null);
  const messageLogRef = useRef([]);

  const locationService = useRef(new LocationService()).current;
  const syncService = useRef(new SyncService()).current;

  // ============================================================================
  // MEMOIZED STYLES - Recreate only when theme changes
  // ============================================================================
  const styles = useMemo(() => createFloatingButtonStyles(theme), [theme]);

  // ============================================================================
  // DYNAMIC COLOR GETTERS
  // ============================================================================
  const getLocationButtonStyle = useCallback(() => {
    return getButtonStateColor(locationStatus, 'location', theme);
  }, [locationStatus, theme]);

  const getSyncButtonStyle = useCallback(() => {
    return getButtonStateColor(syncStatus, 'sync', theme);
  }, [syncStatus, theme]);

  // ============================================================================
  // ICON GETTERS - Extracted to separate functions
  // ============================================================================
  const getLocationIcon = useCallback(() => {
    const icons = {
      checking_permissions: '🔒',
      requesting_permissions: '🙋‍♂️',
      checking_services: '📡',
      locating: '🔄',
      processing: '⚙️',
      adding_marker: '📍',
      centering: '🎯',
      success: '✅',
      error: '⚠️',
      timeout: '⏰',
      idle: '📍',
    };
    return icons[locationStatus] || icons.idle;
  }, [locationStatus]);

  const getSyncIcon = useCallback(() => {
    const icons = {
      preparing: '📋',
      syncing: '🔄',
      requesting: '📡',
      processing: '⚙️',
      success: '✅',
      error: '❌',
      timeout: '⏰',
      idle: '🔄',
    };
    return icons[syncStatus] || icons.idle;
  }, [syncStatus]);

  // ============================================================================
  // LIFECYCLE & EFFECTS
  // ============================================================================
  useEffect(() => {
    locationService.checkLocationPermissions();
  }, []);

  useEffect(() => {
    if (locationStatus === 'idle') {
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(locationPulse, {
            toValue: 1.05,
            duration: durations.slower,
            useNativeDriver: true,
          }),
          Animated.timing(locationPulse, {
            toValue: 1,
            duration: durations.slower,
            useNativeDriver: true,
          }),
        ])
      );
      pulseAnimation.start();
      return () => pulseAnimation.stop();
    }
  }, [locationStatus, locationPulse, durations]);

  useEffect(() => {
    return () => {
      if (locationTimeoutRef.current) clearTimeout(locationTimeoutRef.current);
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
      if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
    };
  }, []);

  // ============================================================================
  // MESSAGE HANDLING
  // ============================================================================
  const sendMessageToWebView = useCallback(
    (message) => {
      const timestamp = Date.now();
      const messageId = `msg_${timestamp}_${Math.random().toString(36).substr(2, 5)}`;

      const logEntry = {
        id: messageId,
        type: message.type,
        timestamp,
        success: false,
        error: null,
        payload: message,
      };

      if (mapRef?.current) {
        const enrichedMessage = {
          ...message,
          timestamp: new Date().toISOString(),
          source: 'floating_buttons',
          messageId,
        };

        try {
          const messageString = JSON.stringify(enrichedMessage);
          console.log(`Enviando mensaje:`, message.type);

          if (typeof mapRef.current.postMessage === 'function') {
            mapRef.current.postMessage(messageString);
            logEntry.success = true;
            console.log(`Mensaje enviado exitosamente`);
          } else {
            logEntry.error = 'postMessage no es una función';
            console.error(`mapRef.current.postMessage no es una función`);
          }
        } catch (error) {
          logEntry.error = error.message;
          console.error(`Error enviando mensaje:`, error);
        }
      } else {
        logEntry.error = 'mapRef no disponible';
        console.warn(`MapRef no disponible para enviar mensaje`);
      }

      setMessageLog((prev) => [logEntry, ...prev.slice(0, 19)]);
      messageLogRef.current = [logEntry, ...messageLogRef.current.slice(0, 19)];

      return logEntry.success;
    },
    [mapRef]
  );

  // ============================================================================
  // LOCATION MARKER HANDLING
  // ============================================================================
  const addLocationMarkerToMap = useCallback(
    (location) => {
      const markerData = locationService.createLocationMarker(location);

      console.log('Preparando marcador para envío:', {
        id: markerData.id,
        coordinates: markerData.coordinates,
        accuracy: markerData.accuracy,
        title: markerData.title,
      });

      const messageSent = sendMessageToWebView({
        type: 'addUserLocationMarker',
        marker: {
          ...markerData,
          isDestination: true,
          icon: 'destination',
          color: '#f59e0b',
        },
      });

      console.log(`Resultado envío marcador: ${messageSent ? 'ÉXITO' : 'FALLO'}`);

      if (onLocationFound) {
        console.log('Llamando onLocationFound con datos completos...');

        const locationFoundData = {
          id: markerData.id,
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
          timestamp: location.timestamp,
          altitude: location.altitude,
          speed: location.speed,
          heading: location.heading,
          title: markerData.title,
          description: markerData.description,
          coordinates: {
            latitude: location.latitude,
            longitude: location.longitude,
          },
          coordinate: {
            latitude: location.latitude,
            longitude: location.longitude,
          },
          markerData: markerData,
          method: location.method,
          totalReadings: location.totalReadings,
          goodReadings: location.goodReadings,
          isAveraged: location.isAveraged,
        };

        try {
          onLocationFound(locationFoundData);
          console.log('onLocationFound ejecutado correctamente');
        } catch (error) {
          console.error('Error ejecutando onLocationFound:', error);
        }
      } else {
        console.warn('onLocationFound no disponible');
      }

      setLocationHistory((prev) => [
        {
          ...location,
          markerData,
          addedAt: new Date().toISOString(),
          messageSent,
        },
        ...prev.slice(0, 9),
      ]);

      console.log('Marcador procesado:', markerData.title);
      return markerData;
    },
    [sendMessageToWebView, onLocationFound, locationService]
  );

  // ============================================================================
  // MAP CENTERING
  // ============================================================================
  const centerMapOnLocation = useCallback(
    (location) => {
      const accuracyInfo = locationService.getLocationAccuracyInfo(location.accuracy);
      
      let zoomLevel = 16;
      if (location.accuracy <= 5) {
        zoomLevel = 18;
      } else if (location.accuracy <= 15) {
        zoomLevel = 17;
      } else if (location.accuracy <= 50) {
        zoomLevel = 16;
      } else if (location.accuracy <= 100) {
        zoomLevel = 15;
      } else {
        zoomLevel = 14;
      }

      const messageSent = sendMessageToWebView({
        type: 'centerOnLocation',
        latitude: location.latitude,
        longitude: location.longitude,
        zoom: zoomLevel,
        animate: true,
        duration: durations.slow, // Using design token
        easing: 'ease-out',
      });

      if (messageSent) {
        console.log(
          `Centrando mapa: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)} (zoom: ${zoomLevel}, precisión: ±${Math.round(location.accuracy)}m)`
        );
      } else {
        console.warn('Falló el centrado del mapa');
      }

      return messageSent;
    },
    [sendMessageToWebView, locationService, durations]
  );

  // ============================================================================
  // SYNC DESTINATION CENTERING
  // ============================================================================
  const centerOnSyncedDestination = useCallback(
    (destination) => {
      const coordinates = destination?.coordinates;

      if (!coordinates || typeof coordinates.latitude !== 'number' || typeof coordinates.longitude !== 'number') {
        console.warn('Coordenadas de destino inválidas.');
        Alert.alert('Error', 'No hay coordenadas válidas para este destino.');
        return;
      }

      console.log(`Acción destino: ${coordinates.latitude}, ${coordinates.longitude}`);

      if (Platform.OS === 'ios') {
        Vibration.vibrate(50);
      } else {
        Vibration.vibrate(50);
      }

      sendMessageToWebView({
        type: 'centerOnLocation',
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        zoom: 16,
        animate: true,
        duration: durations.slow,
        easing: 'ease-out',
      });

      setTimeout(() => {
        addDestinationMarkerToMap(mapRef, destination);
      }, 800);
    },
    [sendMessageToWebView, mapRef, durations]
  );

  // ============================================================================
  // PACKAGE SYNC
  // ============================================================================
  const syncPackages = useCallback(async () => {
    if (isSyncing) {
      console.log('Ya se está sincronizando...');
      return;
    }

    setIsSyncing(true);
    setSyncStatus('preparing');
    setSyncDetailedInfo(null);

    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);

    if (Platform.OS === 'ios') {
      Vibration.vibrate([100, 50, 100]);
    } else {
      Vibration.vibrate(100);
    }

    syncTimeoutRef.current = setTimeout(() => {
      setSyncStatus('timeout');
      setIsSyncing(false);
      console.warn('Timeout de sincronización');
      syncService.showSyncError(new Error('SYNC_TIMEOUT'), () => {
        setSyncStatus('idle');
        syncPackages();
      });
    }, 20000);

    try {
      setSyncStatus('syncing');

      const rotateAnimation = Animated.loop(
        Animated.timing(syncRotate, {
          toValue: 1,
          duration: durations.slow,
          useNativeDriver: true,
        })
      );

      rotateAnimation.start();
      setSyncStatus('requesting');

      const responseData = await syncService.syncPackages(userLocation);

      rotateAnimation.stop();
      syncRotate.setValue(0);

      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = null;
      }

      setSyncStatus('processing');

      if (responseData.packages && responseData.packages.length > 0) {
        console.log(`Procesando ${responseData.packages.length} paquetes sincronizados`);

        const mapMarkers = syncService.createPackageMarkers(responseData.packages);

        if (mapMarkers.length > 0) {
          console.log(`Enviando ${mapMarkers.length} marcadores de paquetes al mapa`);

          sendMessageToWebView({
            type: 'addPackageMarkers',
            markers: mapMarkers,
            syncInfo: {
              timestamp: new Date().toISOString(),
              totalPackages: responseData.packages.length,
              mappedPackages: mapMarkers.length,
            },
          });
        }

        let greenNumbers = [];
        let destinationQueries = [];
        let destinationCoordinates = [];

        responseData.packages.forEach((pkg) => {
          if (pkg.stamps_summary?.green_numbers && Array.isArray(pkg.stamps_summary.green_numbers)) {
            pkg.stamps_summary.green_numbers.forEach((greenNum) => {
              greenNumbers.push({
                number: greenNum.number,
                tracking: pkg.tracking_number,
              });
            });
          }

          if (pkg.location_details?.destination?.query && pkg.location_details.destination.query.trim()) {
            const destInfo = {
              query: pkg.location_details.destination.query,
              tracking: pkg.tracking_number,
            };

            if (pkg.location_details.destination.coordinates) {
              destInfo.coordinates = {
                latitude: pkg.location_details.destination.coordinates.latitude,
                longitude: pkg.location_details.destination.coordinates.longitude,
              };
            }

            destinationQueries.push(destInfo);
          }

          if (pkg.location_details?.destination?.coordinates) {
            destinationCoordinates.push({
              tracking: pkg.tracking_number,
              coordinates: pkg.location_details.destination.coordinates,
              query: pkg.location_details.destination.query || 'Sin descripción',
            });
          }
        });

        setSyncDetailedInfo({
          packagesCount: responseData.packages.length,
          totalPackages: responseData.totalPackages || 0,
          viablePackages: responseData.packages.filter((pkg) => pkg.route_summary?.viable).length,
          greenNumbers: greenNumbers,
          destinationQueries: destinationQueries,
          destinationCoordinates: destinationCoordinates,
          timestamp: responseData.timestamp || new Date().toISOString(),
        });

        if (onPackagesSynced) {
          try {
            await onPackagesSynced(responseData);
          } catch (callbackError) {
            console.warn('Error en callback onPackagesSynced:', callbackError);
          }
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 800));

      setSyncStatus('success');

      Animated.sequence([
        Animated.timing(successScale, {
          toValue: 1.2,
          duration: durations.normal,
          useNativeDriver: true,
        }),
        Animated.timing(successScale, {
          toValue: 1,
          duration: durations.normal,
          useNativeDriver: true,
        }),
      ]).start();

      if (Platform.OS === 'ios') {
        Vibration.vibrate([200, 100, 200, 100, 200]);
      } else {
        Vibration.vibrate([200, 100, 200]);
      }

      statusTimeoutRef.current = setTimeout(() => {
        setSyncStatus('idle');
        setIsSyncing(false);
        setSyncDetailedInfo(null);
      }, 8000);
    } catch (error) {
      console.error('Error sincronizando paquetes:', error);

      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = null;
      }

      syncRotate.setValue(0);

      setSyncStatus('error');
      setIsSyncing(false);
      setSyncDetailedInfo(null);

      if (Platform.OS === 'ios') {
        Vibration.vibrate([300, 150, 300, 150, 300]);
      } else {
        Vibration.vibrate([300, 200, 300]);
      }

      syncService.showSyncError(error, () => {
        setSyncStatus('idle');
        syncPackages();
      });
    }
  }, [isSyncing, userLocation, onPackagesSynced, sendMessageToWebView, syncService, syncRotate, successScale, durations]);

  // ============================================================================
  // LOCATION PRESS HANDLER - Enhanced with design tokens
  // ============================================================================
  const handleLocationPress = useCallback(async () => {
    if (isLocating) {
      console.log('Ya se está obteniendo ubicación...');
      return;
    }

    setIsLocating(true);
    setLocationStatus('checking_permissions');

    if (locationTimeoutRef.current) clearTimeout(locationTimeoutRef.current);
    if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);

    if (Platform.OS === 'ios') {
      Vibration.vibrate([100, 50, 100]);
    } else {
      Vibration.vibrate(100);
    }

    locationTimeoutRef.current = setTimeout(() => {
      setLocationStatus('timeout');
      setIsLocating(false);
      console.warn('Timeout de ubicación');
      locationService.showLocationError(new Error('LOCATION_TIMEOUT')).then((result) => {
        if (result === 'retry') {
          setLocationStatus('idle');
          handleLocationPress();
        } else {
          setLocationStatus('idle');
        }
      });
    }, 35000);

    let rotateAnimation = null;
    let rippleAnimation = null;

    try {
      let hasPermission = locationService.locationPermission === 'granted';

      if (!hasPermission) {
        setLocationStatus('requesting_permissions');
        hasPermission = await locationService.requestLocationPermissions();

        if (!hasPermission) {
          throw new Error('PERMISSION_DENIED');
        }
      }

      setLocationStatus('checking_services');
      const servicesEnabled = await Location.hasServicesEnabledAsync();

      if (!servicesEnabled) {
        throw new Error('LOCATION_SERVICES_DISABLED');
      }

      setLocationStatus('locating');

      rotateAnimation = Animated.loop(
        Animated.timing(locationRotate, {
          toValue: 1,
          duration: durations.slow,
          useNativeDriver: true,
        })
      );

      rippleAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(zoomRipple, {
            toValue: 1,
            duration: durations.slower,
            useNativeDriver: true,
          }),
          Animated.timing(zoomRipple, {
            toValue: 0,
            duration: durations.normal,
            useNativeDriver: true,
          }),
        ])
      );

      rotateAnimation.start();
      rippleAnimation.start();

      const location = await locationService.getCurrentLocationWithHighPrecision();

      rotateAnimation.stop();
      rippleAnimation.stop();
      locationRotate.setValue(0);
      zoomRipple.setValue(0);

      if (locationTimeoutRef.current) {
        clearTimeout(locationTimeoutRef.current);
        locationTimeoutRef.current = null;
      }

      setUserLocation(location);
      setLocationStatus('processing');

      console.log('Ubicación obtenida:', {
        lat: location.latitude.toFixed(6),
        lng: location.longitude.toFixed(6),
        accuracy: `±${Math.round(location.accuracy)}m`,
        method: location.method,
      });

      await new Promise((resolve) => setTimeout(resolve, 300));

      setLocationStatus('adding_marker');
      console.log('Agregando marcador al mapa...');
      const markerData = addLocationMarkerToMap(location);

      await new Promise((resolve) => setTimeout(resolve, 400));

      setLocationStatus('centering');
      console.log('Centrando mapa en ubicación...');
      const centered = centerMapOnLocation(location);

      if (centered) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      if (on_center_location) {
        try {
          console.log('Notificando al componente padre (sin centrar de nuevo)...');
          await on_center_location({
            ...location,
            markerData,
            source: 'floating_buttons',
            alreadyCentered: true,
          });
          console.log('Callback on_center_location ejecutado');
        } catch (callbackError) {
          console.warn('Error en callback on_center_location:', callbackError);
        }
      }

      setLocationStatus('success');

      Animated.sequence([
        Animated.timing(successScale, {
          toValue: 1.2,
          duration: durations.normal,
          useNativeDriver: true,
        }),
        Animated.timing(successScale, {
          toValue: 1,
          duration: durations.normal,
          useNativeDriver: true,
        }),
      ]).start();

      if (Platform.OS === 'ios') {
        Vibration.vibrate([200, 100, 200, 100, 200]);
      } else {
        Vibration.vibrate([200, 100, 200]);
      }

      statusTimeoutRef.current = setTimeout(() => {
        setLocationStatus('idle');
        setIsLocating(false);
      }, 4000);

    } catch (error) {
      console.error('Error obteniendo ubicación:', error);

      if (locationTimeoutRef.current) {
        clearTimeout(locationTimeoutRef.current);
        locationTimeoutRef.current = null;
      }

      locationRotate.setValue(0);
      zoomRipple.setValue(0);

      setLocationStatus('error');
      setIsLocating(false);

      if (Platform.OS === 'ios') {
        Vibration.vibrate([300, 150, 300, 150, 300]);
      } else {
        Vibration.vibrate([300, 200, 300]);
      }

      locationService.showLocationError(error).then((result) => {
        if (result === 'retry') {
          setLocationStatus('idle');
          handleLocationPress();
        } else {
          setLocationStatus('idle');
        }
      });
    }
  }, [isLocating, addLocationMarkerToMap, centerMapOnLocation, on_center_location, locationService, locationRotate, zoomRipple, successScale, durations]);

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================
  const clearUserMarkers = useCallback(() => {
    const messageSent = sendMessageToWebView({
      type: 'clearUserMarkers',
    });

    if (messageSent) {
      setLocationHistory([]);
      console.log('Marcadores de usuario limpiados');
    } else {
      console.warn('Falló la limpieza de marcadores');
    }
  }, [sendMessageToWebView]);

  const toggleMenu = useCallback(() => {
    const toValue = isExpanded ? 0 : 1;
    setIsExpanded(!isExpanded);

    if (Platform.OS === 'ios') {
      Vibration.vibrate(isExpanded ? [30] : [50, 30]);
    } else {
      Vibration.vibrate(isExpanded ? 30 : 50);
    }

    Animated.spring(expandAnim, {
      toValue,
      useNativeDriver: true,
      tension: 120,
      friction: 10,
    }).start();
  }, [isExpanded, expandAnim]);

  const executeAction = useCallback(
    (action, actionName) => {
      if (Platform.OS === 'ios') {
        Vibration.vibrate([50]);
      } else {
        Vibration.vibrate(50);
      }

      if (action) {
        action();
      }

      toggleMenu();
      console.log(`${actionName} ejecutado`);
    },
    [toggleMenu]
  );

  const showMessageDiagnostics = useCallback(() => {
    const recentMessages = messageLogRef.current.slice(0, 10);
    const successCount = recentMessages.filter((m) => m.success).length;
    const errorCount = recentMessages.filter((m) => !m.success).length;

    const diagnosticInfo = [
      `Mensajes recientes: ${recentMessages.length}`,
      `Exitosos: ${successCount}`,
      `Fallidos: ${errorCount}`,
      `Estado mapRef: ${!!mapRef?.current ? 'OK' : 'FALLO'}`,
      `postMessage disponible: ${typeof mapRef?.current?.postMessage === 'function' ? 'Sí' : 'NO'}`,
    ].join('\n');

    const recentErrors = recentMessages
      .filter((m) => !m.success)
      .slice(0, 3)
      .map((m) => `• ${m.type}: ${m.error}`)
      .join('\n');

    const syncDiagnostic = [
      `\nESTADO DE SINCRONIZACIÓN:`,
      `Paquetes sincronizados: ${syncService.syncedPackages.length}`,
      `Total en servidor: ${syncService.syncStats.totalPackages}`,
      `Última sincronización: ${
        syncService.syncStats.lastSync ? new Date(syncService.syncStats.lastSync).toLocaleTimeString() : 'Nunca'
      }`,
      `Sincronizaciones realizadas: ${syncService.syncStats.syncCount}`,
    ].join('\n');

    Alert.alert(
      'Diagnóstico Completo',
      diagnosticInfo + (recentErrors ? `\n\nErrores recientes:\n${recentErrors}` : '') + syncDiagnostic,
      [{ text: 'OK' }]
    );
  }, [mapRef, syncService]);

  const showSyncStats = useCallback(async () => {
    const result = await syncService.showSyncStats();
    if (result === 'sync') {
      syncPackages();
    }
  }, [syncService, syncPackages]);

  // ============================================================================
  // ANIMATED INTERPOLATIONS
  // ============================================================================
  const button1Translate = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -85],
  });

  const button2Translate = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -160],
  });

  const button3Translate = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -235],
  });

  const button4Translate = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -310],
  });

  const button5Translate = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -385],
  });

  const menuRotate = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  const locationSpin = locationRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const syncSpin = syncRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const rippleScale = zoomRipple.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 2.5],
  });

  const rippleOpacity = zoomRipple.interpolate({
    inputRange: [0, 0.7, 1],
    outputRange: [0.6, 0.3, 0],
  });

  // ============================================================================
  // STATUS MESSAGE
  // ============================================================================
  const getStatusMessage = () => {
    if (syncStatus !== 'idle') {
      const syncMessages = {
        preparing: '📋 Preparando sincronización...',
        syncing: '🔄 Sincronizando con el servidor...',
        requesting: '📡 Consultando base de datos CartaPorte...',
        processing: '⚙️ Procesando paquetes recibidos...',
        success: `✅ ¡${syncService.syncStats.updatedPackages || 0} paquetes CartaPorte sincronizados!${
          syncService.syncStats.greenNumbersTotal ? ` • ${syncService.syncStats.greenNumbersTotal} números verdes` : ''
        }${
          syncService.syncStats.packagesWithDestinationQuery
            ? ` • ${syncService.syncStats.packagesWithDestinationQuery} con queries destino`
            : ''
        }`,
        error: '❌ Error durante la sincronización',
        timeout: '⏰ Tiempo agotado para sincronización',
      };
      return syncMessages[syncStatus] || null;
    }

    const messages = {
      checking_permissions: '🔒 Verificando permisos de ubicación...',
      requesting_permissions: '🙋‍♂️ Solicitando permisos de ubicación...',
      checking_services: '📡 Verificando servicios GPS...',
      locating: '📡 Obteniendo coordenadas de alta precisión...',
      processing: '⚙️ Procesando datos de ubicación...',
      adding_marker: '📍 Agregando marcador en el mapa...',
      centering: '🎯 Centrando mapa en tu ubicación...',
      success: '✅ ¡Ubicación fijada en el mapa!',
      error: '❌ Error al obtener ubicación',
      timeout: '⏰ Tiempo agotado para ubicación',
    };
    return messages[locationStatus] || null;
  };

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <>
      {/* Backdrop */}
      {isExpanded && (
        <Animated.View
          style={[
            styles.backdrop,
            {
              opacity: expandAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.3],
              }),
            },
          ]}>
          <TouchableOpacity style={styles.backdropTouch} onPress={toggleMenu} activeOpacity={1} />
        </Animated.View>
      )}

      {/* Ripple effect for location search */}
      {['locating', 'processing', 'adding_marker'].includes(locationStatus) && (
        <Animated.View
          style={[
            styles.searchRipple,
            {
              transform: [{ scale: rippleScale }],
              opacity: rippleOpacity,
              backgroundColor: getLocationButtonStyle().bg + '25',
              borderColor: getLocationButtonStyle().bg + '50',
            },
          ]}
        />
      )}

      <View style={styles.speedDialContainer}>
        {/* Button 5 - Stats */}
        <Animated.View
          style={[
            styles.speedDialButton,
            {
              transform: [{ translateY: button5Translate }, { scale: expandAnim }],
              opacity: expandAnim,
              zIndex: 1007,
            },
          ]}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#10b981', shadowColor: '#10b981' }]}
            onPress={() => {
              showSyncStats();
              toggleMenu();
            }}
            activeOpacity={0.8}>
            <Text style={styles.actionIcon}>📊</Text>
          </TouchableOpacity>

          <Animated.View style={[styles.speedDialLabel, { opacity: expandAnim, right: 70 }]}>
            <Text style={styles.labelText}>Stats ({syncService.syncedPackages.length})</Text>
          </Animated.View>
        </Animated.View>

        {/* Button 4 - Diagnostics (Dev only) */}
        {__DEV__ && (
          <Animated.View
            style={[
              styles.speedDialButton,
              {
                transform: [{ translateY: button4Translate }, { scale: expandAnim }],
                opacity: expandAnim,
                zIndex: 1006,
              },
            ]}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#6366f1', shadowColor: '#6366f1' }]}
              onPress={() => {
                showMessageDiagnostics();
                toggleMenu();
              }}
              activeOpacity={0.8}>
              <Text style={styles.actionIcon}>🔍</Text>
            </TouchableOpacity>

            <Animated.View style={[styles.speedDialLabel, { opacity: expandAnim, right: 70 }]}>
              <Text style={styles.labelText}>Diagnóstico</Text>
            </Animated.View>
          </Animated.View>
        )}

        {/* Button 3 - Clear markers */}
        {locationHistory.length > 0 && (
          <Animated.View
            style={[
              styles.speedDialButton,
              {
                transform: [{ translateY: button3Translate }, { scale: expandAnim }],
                opacity: expandAnim,
                zIndex: 1005,
              },
            ]}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#ef4444', shadowColor: '#ef4444' }]}
              onPress={() => {
                Alert.alert('Limpiar Marcadores', '¿Deseas eliminar todos los marcadores del mapa?', [
                  { text: 'Cancelar', style: 'cancel' },
                  {
                    text: 'Limpiar',
                    onPress: () => {
                      clearUserMarkers();
                      toggleMenu();
                    },
                    style: 'destructive',
                  },
                ]);
              }}
              activeOpacity={0.8}>
              <Text style={styles.actionIcon}>🗑️</Text>
            </TouchableOpacity>

            <Animated.View style={[styles.speedDialLabel, { opacity: expandAnim, right: 70 }]}>
              <Text style={styles.labelText}>Limpiar ({locationHistory.length})</Text>
            </Animated.View>
          </Animated.View>
        )}

        {/* Button 2 - Settings */}
        <Animated.View
          style={[
            styles.speedDialButton,
            {
              transform: [{ translateY: button2Translate }, { scale: expandAnim }],
              opacity: expandAnim,
              zIndex: 1004,
            },
          ]}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#f59e0b', shadowColor: '#f59e0b' }]}
            onPress={() => executeAction(on_toggle_settings, 'Configuración')}
            activeOpacity={0.8}>
            <Text style={styles.actionIcon}>⚙️</Text>
          </TouchableOpacity>

          <Animated.View style={[styles.speedDialLabel, { opacity: expandAnim, right: 70 }]}>
            <Text style={styles.labelText}>Configuración</Text>
          </Animated.View>
        </Animated.View>

        {/* Button 1 - Sync */}
        <Animated.View
          style={[
            styles.speedDialButton,
            {
              transform: [{ translateY: button1Translate }, { scale: expandAnim }],
              opacity: expandAnim,
              zIndex: 1003,
            },
          ]}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              { 
                backgroundColor: getSyncButtonStyle().bg, 
                shadowColor: getSyncButtonStyle().shadow 
              },
              syncStatus === 'success' && {
                transform: [{ scale: successScale }],
              },
            ]}
            onPress={() => {
              syncPackages();
              toggleMenu();
            }}
            activeOpacity={0.8}
            disabled={isSyncing}>
            <Animated.Text
              style={[
                styles.actionIcon,
                ['syncing', 'requesting', 'processing'].includes(syncStatus) && {
                  transform: [{ rotate: syncSpin }],
                },
              ]}>
              {getSyncIcon()}
            </Animated.Text>
          </TouchableOpacity>

          <Animated.View style={[styles.speedDialLabel, { opacity: expandAnim, right: 70 }]}>
            <Text style={styles.labelText}>{isSyncing ? 'Sincronizando...' : 'Sync CartaPorte'}</Text>
          </Animated.View>
        </Animated.View>

        {/* Main Button - Location */}
        <Animated.View
          style={[
            styles.mainButtonContainer,
            {
              transform: [
                {
                  scale:
                    locationStatus === 'success'
                      ? successScale
                      : locationStatus === 'idle'
                      ? locationPulse
                      : 1,
                },
              ],
              zIndex: 1001,
            },
          ]}>
          <TouchableOpacity
            style={[
              styles.mainButton, 
              { 
                backgroundColor: getLocationButtonStyle().bg,
                shadowColor: getLocationButtonStyle().shadow 
              }
            ]}
            onPress={handleLocationPress}
            onLongPress={() => {
              Alert.alert('Tracking Continuo', '¿Deseas activar el seguimiento continuo de ubicación?', [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: 'Activar',
                  onPress: () => console.log('TODO: Implementar tracking continuo'),
                },
              ]);
            }}
            activeOpacity={0.8}
            disabled={isLocating}>
            <Animated.Text
              style={[
                styles.mainIcon,
                ['locating', 'processing', 'adding_marker'].includes(locationStatus) && {
                  transform: [{ rotate: locationSpin }],
                },
              ]}>
              {getLocationIcon()}
            </Animated.Text>

            <View
              style={[
                styles.buttonGlow,
                {
                  backgroundColor: getLocationButtonStyle().bg + '20',
                },
              ]}
            />

            {['locating', 'processing', 'adding_marker'].includes(locationStatus) && (
              <Animated.View
                style={[
                  styles.pulseRing,
                  {
                    transform: [{ scale: zoomRipple }],
                    opacity: rippleOpacity,
                    borderColor: getLocationButtonStyle().bg,
                  },
                ]}
              />
            )}
          </TouchableOpacity>
        </Animated.View>

        {/* Menu Toggle Button */}
        <Animated.View
          style={[
            styles.menuButtonContainer,
            {
              transform: [{ rotate: menuRotate }],
              zIndex: 1002,
            },
          ]}>
          <TouchableOpacity
            style={[styles.menuButton, isExpanded && styles.menuButtonExpanded]}
            onPress={toggleMenu}
            activeOpacity={0.8}>
            <Text style={styles.menuIcon}>+</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Status Bar */}
      {(locationStatus !== 'idle' || syncStatus !== 'idle') && (
        <Animated.View
          style={[
            styles.statusBar,
            {
              backgroundColor:
                syncStatus !== 'idle'
                  ? getSyncButtonStyle().bg + 'f0'
                  : getLocationButtonStyle().bg + 'f0',
              opacity: locationStatus !== 'idle' || syncStatus !== 'idle' ? 1 : 0,
            },
          ]}>
          <Text style={styles.statusText}>{getStatusMessage()}</Text>

          {syncStatus === 'success' && syncDetailedInfo && (
            <View style={styles.locationInfo}>
              <Text style={styles.accuracyText}>
                Paquetes obtenidos: {syncDetailedInfo.packagesCount} de {syncDetailedInfo.totalPackages}
              </Text>
              <Text style={styles.detailText}>Rutas viables: {syncDetailedInfo.viablePackages}</Text>

              {syncDetailedInfo.greenNumbers && syncDetailedInfo.greenNumbers.length > 0 && (
                <>
                  <Text style={styles.methodText}>Números verdes detectados: {syncDetailedInfo.greenNumbers.length}</Text>
                  {syncDetailedInfo.greenNumbers.slice(0, 3).map((green, idx) => (
                    <Text key={idx} style={styles.detailText}>
                      • {green.number} ({green.tracking})
                    </Text>
                  ))}
                  {syncDetailedInfo.greenNumbers.length > 3 && (
                    <Text style={styles.detailText}>• ... y {syncDetailedInfo.greenNumbers.length - 3} más</Text>
                  )}
                </>
              )}

              {syncDetailedInfo.destinationQueries && syncDetailedInfo.destinationQueries.length > 0 && (
                <>
                  <Text style={styles.methodText}>
                    Queries destino encontrados: {syncDetailedInfo.destinationQueries.length}
                  </Text>
                  {syncDetailedInfo.destinationQueries.slice(0, 2).map((dest, idx) => (
                    <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.detailText} numberOfLines={2}>
                          • {dest.query} ({dest.tracking})
                        </Text>
                        {dest.coordinates && (
                          <Text style={[styles.methodText, { fontSize: 10, marginTop: 2 }]}>
                            📍 {dest.coordinates.latitude.toFixed(6)}, {dest.coordinates.longitude.toFixed(6)}
                          </Text>
                        )}
                      </View>
                      {dest.coordinates && (
                        <TouchableOpacity
                          style={{
                            padding: 8,
                            backgroundColor: 'rgba(255, 255, 255, 0.2)',
                            borderRadius: 16,
                            marginLeft: 8,
                          }}
                          onPress={() => centerOnSyncedDestination(dest)}
                          activeOpacity={0.7}>
                          <Text style={{ fontSize: 16 }}>📌</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                  {syncDetailedInfo.destinationQueries.length > 2 && (
                    <Text style={styles.detailText}>
                      • ... y {syncDetailedInfo.destinationQueries.length - 2} más
                    </Text>
                  )}
                </>
              )}

              <Text style={[styles.methodText, { marginTop: 8 }]}>
                Última sincronización: {new Date(syncDetailedInfo.timestamp).toLocaleTimeString()}
              </Text>
            </View>
          )}

          {userLocation && locationStatus === 'success' && syncStatus === 'idle' && (
            <View style={styles.locationInfo}>
              <Text style={styles.accuracyText}>
                Precisión: ±{Math.round(userLocation.accuracy || 0)}m (
                {locationService.getLocationAccuracyInfo(userLocation.accuracy).description})
              </Text>

              {userLocation.altitude && (
                <Text style={styles.detailText}>Altitud: {Math.round(userLocation.altitude)}m</Text>
              )}

              {userLocation.isAveraged && (
                <Text style={styles.methodText}>
                  Promedio de {userLocation.goodReadings} lecturas de alta precisión
                </Text>
              )}

              {!userLocation.isAveraged && userLocation.totalReadings > 1 && (
                <Text style={styles.methodText}>Mejor de {userLocation.totalReadings} lecturas GPS</Text>
              )}

              {userLocation.accuracy <= locationService.ACCURACY_THRESHOLDS?.excellent && (
                <Text style={[styles.accuracyText, { fontWeight: '700', marginTop: 4 }]}>¡Precisión excelente!</Text>
              )}
            </View>
          )}

          {locationHistory.length > 0 && locationStatus === 'idle' && syncStatus === 'idle' && (
            <TouchableOpacity style={{ marginTop: 8, padding: 6 }}>
              <Text style={[styles.detailText, { textAlign: 'center' }]}>
                {locationHistory.length} ubicaciones guardadas
              </Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      )}

      {/* Debug Panel */}
      {__DEV__ && messageLog.length > 0 && (
        <View style={styles.debugPanel}>
          <Text style={styles.debugTitle}>Log de Mensajes</Text>
          {messageLog.slice(0, 3).map((log) => (
            <Text
              key={log.id}
              style={[styles.debugMessage, { color: log.success ? '#10b981' : '#ef4444' }]}>
              {log.success ? '✅' : '❌'} {log.type} - {new Date(log.timestamp).toLocaleTimeString()}
            </Text>
          ))}

          {(syncStatus !== 'idle' || isSyncing || syncService.syncedPackages.length > 0) && (
            <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(148, 163, 184, 0.3)' }}>
              <Text style={[styles.debugTitle, { color: '#22d3ee', marginBottom: 4 }]}>
                Estado CartaPorte Sync:
              </Text>
              <Text style={[styles.debugMessage, { color: '#06b6d4' }]}>
                🔄 {syncStatus} {isSyncing ? '(activo)' : '(inactivo)'}
              </Text>
              {syncService.syncedPackages.length > 0 && (
                <Text style={[styles.debugMessage, { color: '#10b981' }]}>
                  📦 {syncService.syncedPackages.length} paquetes en memoria
                </Text>
              )}
              {syncService.syncStats.lastSync && (
                <Text style={[styles.debugMessage, { color: '#f59e0b' }]}>
                  ⏰ Última sync: {new Date(syncService.syncStats.lastSync).toLocaleTimeString()}
                </Text>
              )}
            </View>
          )}
        </View>
      )}
    </>
  );
};

export default ImprovedFloatingButtons;