import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions, TouchableOpacity, Text, Vibration, Alert, Platform } from 'react-native';
import * as Location from 'expo-location';
import { LocationService } from './LocationService';
import { SyncService } from './SyncService';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const ImprovedFloatingButtons = ({
  on_center_location,
  on_fit_to_packages,
  on_toggle_settings,
  mapRef,
  onLocationFound,
  onPackagesSynced,
  theme = 'light'
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [locationStatus, setLocationStatus] = useState('idle');
  const [syncStatus, setSyncStatus] = useState('idle');
  const [userLocation, setUserLocation] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [locationHistory, setLocationHistory] = useState([]);

  const [expandAnim] = useState(new Animated.Value(0));
  const [locationPulse] = useState(new Animated.Value(1));
  const [locationRotate] = useState(new Animated.Value(0));
  const [syncRotate] = useState(new Animated.Value(0));
  const [zoomRipple] = useState(new Animated.Value(0));
  const [successScale] = useState(new Animated.Value(1));

  const locationTimeoutRef = useRef(null);
  const syncTimeoutRef = useRef(null);
  const statusTimeoutRef = useRef(null);

  const [messageLog, setMessageLog] = useState([]);
  const messageLogRef = useRef([]);

  const locationService = useRef(new LocationService()).current;
  const syncService = useRef(new SyncService()).current;

  useEffect(() => {
    locationService.checkLocationPermissions();
  }, []);

  useEffect(() => {
    if (locationStatus === 'idle') {
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(locationPulse, {
            toValue: 1.08,
            duration: 2500,
            useNativeDriver: true,
          }),
          Animated.timing(locationPulse, {
            toValue: 1,
            duration: 2500,
            useNativeDriver: true,
          })
        ])
      );
      pulseAnimation.start();

      return () => pulseAnimation.stop();
    }
  }, [locationStatus]);

  useEffect(() => {
    return () => {
      if (locationTimeoutRef.current) clearTimeout(locationTimeoutRef.current);
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
      if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
    };
  }, []);

  const sendMessageToWebView = useCallback((message) => {
    const timestamp = Date.now();
    const messageId = `msg_${timestamp}_${Math.random().toString(36).substr(2, 5)}`;
    
    const logEntry = {
      id: messageId,
      type: message.type,
      timestamp,
      success: false,
      error: null,
      payload: message
    };

    if (mapRef?.current) {
      const enrichedMessage = {
        ...message,
        timestamp: new Date().toISOString(),
        source: 'floating_buttons',
        messageId
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

    setMessageLog(prev => [logEntry, ...prev.slice(0, 19)]);
    messageLogRef.current = [logEntry, ...messageLogRef.current.slice(0, 19)];

    return logEntry.success;
  }, [mapRef]);

  const addLocationMarkerToMap = useCallback((location) => {
    const markerData = locationService.createLocationMarker(location);

    console.log('Preparando marcador para envío:', {
      id: markerData.id,
      coordinates: markerData.coordinates,
      accuracy: markerData.accuracy,
      title: markerData.title
    });

    const messageSent = sendMessageToWebView({
      type: 'addUserLocationMarker',
      marker: markerData
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
          longitude: location.longitude
        },
        coordinate: {
          latitude: location.latitude,
          longitude: location.longitude
        },
        markerData: markerData,
        method: location.method,
        totalReadings: location.totalReadings,
        goodReadings: location.goodReadings,
        isAveraged: location.isAveraged
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

    setLocationHistory(prev => [
      {
        ...location,
        markerData,
        addedAt: new Date().toISOString(),
        messageSent
      },
      ...prev.slice(0, 9)
    ]);

    console.log('Marcador procesado:', markerData.title);
    return markerData;
  }, [sendMessageToWebView, onLocationFound, locationService]);

  const centerMapOnLocation = useCallback((location) => {
    const accuracyInfo = locationService.getLocationAccuracyInfo(location.accuracy);

    const messageSent = sendMessageToWebView({
      type: 'centerOnLocation',
      latitude: location.latitude,
      longitude: location.longitude,
      zoom: accuracyInfo.zoom,
      animate: true,
      duration: 1800,
      easing: 'ease-out'
    });

    if (messageSent) {
      console.log(`Centrando mapa: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)} (zoom: ${accuracyInfo.zoom})`);
    } else {
      console.warn('Falló el centrado del mapa');
    }

    return messageSent;
  }, [sendMessageToWebView, locationService]);

  const syncPackages = useCallback(async () => {
    if (isSyncing) {
      console.log('Ya se está sincronizando...');
      return;
    }

    setIsSyncing(true);
    setSyncStatus('preparing');

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
          duration: 1500,
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
              mappedPackages: mapMarkers.length
            }
          });
        }
        
        if (onPackagesSynced) {
          try {
            await onPackagesSynced(responseData);
          } catch (callbackError) {
            console.warn('Error en callback onPackagesSynced:', callbackError);
          }
        }
      }

      await new Promise(resolve => setTimeout(resolve, 800));

      setSyncStatus('success');

      Animated.sequence([
        Animated.timing(successScale, {
          toValue: 1.2,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(successScale, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start();

      if (Platform.OS === 'ios') {
        Vibration.vibrate([200, 100, 200, 100, 200]);
      } else {
        Vibration.vibrate([200, 100, 200]);
      }

      syncService.showSyncNotification('success', responseData);

      statusTimeoutRef.current = setTimeout(() => {
        setSyncStatus('idle');
        setIsSyncing(false);
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
  }, [isSyncing, userLocation, onPackagesSynced, sendMessageToWebView, syncService]);

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

      const rotateAnimation = Animated.loop(
        Animated.timing(locationRotate, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        })
      );

      const rippleAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(zoomRipple, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(zoomRipple, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          })
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
        method: location.method
      });

      setLocationStatus('adding_marker');
      const markerData = addLocationMarkerToMap(location);

      await new Promise(resolve => setTimeout(resolve, 500));

      setLocationStatus('centering');
      const centered = centerMapOnLocation(location);

      if (centered) {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }

      if (on_center_location) {
        try {
          console.log('Ejecutando callback on_center_location...');
          await on_center_location(location);
          console.log('Callback on_center_location ejecutado');
        } catch (callbackError) {
          console.warn('Error en callback on_center_location:', callbackError);
        }
      }

      setLocationStatus('success');

      Animated.sequence([
        Animated.timing(successScale, {
          toValue: 1.2,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(successScale, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        })
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
  }, [
    isLocating, sendMessageToWebView, addLocationMarkerToMap,
    centerMapOnLocation, on_center_location, locationService
  ]);

  const clearUserMarkers = useCallback(() => {
    const messageSent = sendMessageToWebView({
      type: 'clearUserMarkers'
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
      tension: 150,
      friction: 8,
    }).start();
  }, [isExpanded, expandAnim]);

  const executeAction = useCallback((action, actionName) => {
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
  }, [toggleMenu]);

  const showMessageDiagnostics = useCallback(() => {
    const recentMessages = messageLogRef.current.slice(0, 10);
    const successCount = recentMessages.filter(m => m.success).length;
    const errorCount = recentMessages.filter(m => !m.success).length;
    
    const diagnosticInfo = [
      `Mensajes recientes: ${recentMessages.length}`,
      `Exitosos: ${successCount}`,
      `Fallidos: ${errorCount}`,
      `Estado mapRef: ${!!mapRef?.current ? 'OK' : 'FALLO'}`,
      `postMessage disponible: ${typeof mapRef?.current?.postMessage === 'function' ? 'SÍ' : 'NO'}`
    ].join('\n');

    const recentErrors = recentMessages
      .filter(m => !m.success)
      .slice(0, 3)
      .map(m => `• ${m.type}: ${m.error}`)
      .join('\n');

    const syncDiagnostic = [
      `\nESTADO DE SINCRONIZACIÓN:`,
      `Paquetes sincronizados: ${syncService.syncedPackages.length}`,
      `Total en servidor: ${syncService.syncStats.totalPackages}`,
      `Última sincronización: ${syncService.syncStats.lastSync ? new Date(syncService.syncStats.lastSync).toLocaleTimeString() : 'Nunca'}`,
      `Sincronizaciones realizadas: ${syncService.syncStats.syncCount}`
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

  const button1Translate = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -85]
  });

  const button2Translate = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -160]
  });

  const button3Translate = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -235]
  });

  const button4Translate = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -310]
  });

  const button5Translate = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -385]
  });

  const menuRotate = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg']
  });

  const locationSpin = locationRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  const syncSpin = syncRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  const rippleScale = zoomRipple.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 3]
  });

  const rippleOpacity = zoomRipple.interpolate({
    inputRange: [0, 0.6, 1],
    outputRange: [0.8, 0.4, 0]
  });

  const getLocationButtonStyle = () => {
    const styles = {
      checking_permissions: { backgroundColor: '#8b5cf6', shadowColor: '#8b5cf6' },
      requesting_permissions: { backgroundColor: '#8b5cf6', shadowColor: '#8b5cf6' },
      checking_services: { backgroundColor: '#f59e0b', shadowColor: '#f59e0b' },
      locating: { backgroundColor: '#06b6d4', shadowColor: '#06b6d4' },
      processing: { backgroundColor: '#8b5cf6', shadowColor: '#8b5cf6' },
      adding_marker: { backgroundColor: '#06b6d4', shadowColor: '#06b6d4' },
      centering: { backgroundColor: '#8b5cf6', shadowColor: '#8b5cf6' },
      success: { backgroundColor: '#10b981', shadowColor: '#10b981' },
      error: { backgroundColor: '#ef4444', shadowColor: '#ef4444' },
      timeout: { backgroundColor: '#f59e0b', shadowColor: '#f59e0b' },
      idle: { backgroundColor: '#3b82f6', shadowColor: '#3b82f6' }
    };

    return styles[locationStatus] || styles.idle;
  };

  const getSyncButtonStyle = () => {
    const styles = {
      preparing: { backgroundColor: '#8b5cf6', shadowColor: '#8b5cf6' },
      syncing: { backgroundColor: '#06b6d4', shadowColor: '#06b6d4' },
      requesting: { backgroundColor: '#f59e0b', shadowColor: '#f59e0b' },
      processing: { backgroundColor: '#8b5cf6', shadowColor: '#8b5cf6' },
      success: { backgroundColor: '#10b981', shadowColor: '#10b981' },
      error: { backgroundColor: '#ef4444', shadowColor: '#ef4444' },
      timeout: { backgroundColor: '#f59e0b', shadowColor: '#f59e0b' },
      idle: { backgroundColor: '#8b5cf6', shadowColor: '#8b5cf6' }
    };

    return styles[syncStatus] || styles.idle;
  };

  const getLocationIcon = () => {
    const icons = {
      checking_permissions: '🔒',
      requesting_permissions: '🙋‍♂️',
      checking_services: '📡',
      locating: '🔄',
      processing: '⚙️',
      adding_marker: '📌',
      centering: '🎯',
      success: '✅',
      error: '⚠️',
      timeout: '⏰',
      idle: '🎯'
    };

    return icons[locationStatus] || icons.idle;
  };

  const getSyncIcon = () => {
    const icons = {
      preparing: '📋',
      syncing: '🔄',
      requesting: '📡',
      processing: '⚙️',
      success: '✅',
      error: '❌',
      timeout: '⏰',
      idle: '🔄'
    };

    return icons[syncStatus] || icons.idle;
  };

  const getStatusMessage = () => {
    if (syncStatus !== 'idle') {
      const syncMessages = {
        preparing: '📋 Preparando sincronización...',
        syncing: '🔄 Sincronizando con el servidor...',
        requesting: '📡 Consultando base de datos CartaPorte...',
        processing: '⚙️ Procesando paquetes recibidos...',
        success: `✅ ¡${syncService.syncStats.updatedPackages || 0} paquetes CartaPorte sincronizados!${syncService.syncStats.greenNumbersTotal ? ` • ${syncService.syncStats.greenNumbersTotal} números verdes` : ''}${syncService.syncStats.packagesWithDestinationQuery ? ` • ${syncService.syncStats.packagesWithDestinationQuery} con queries destino` : ''}`,
        error: '❌ Error durante la sincronización',
        timeout: '⏰ Tiempo agotado para sincronización'
      };
      
      return syncMessages[syncStatus] || null;
    }

    const messages = {
      checking_permissions: '🔒 Verificando permisos de ubicación...',
      requesting_permissions: '🙋‍♂️ Solicitando permisos de ubicación...',
      checking_services: '📡 Verificando servicios de ubicación...',
      locating: '🔄 Obteniendo ubicación de alta precisión...',
      processing: '⚙️ Procesando datos de ubicación...',
      adding_marker: '📌 Agregando marcador al mapa...',
      centering: '🎯 Centrando vista del mapa...',
      success: '✅ ¡Ubicación encontrada con éxito!',
      error: '❌ Error al obtener ubicación',
      timeout: '⏰ Tiempo agotado para ubicación'
    };

    return messages[locationStatus] || null;
  };

  return (
    <>
      {isExpanded && (
        <Animated.View
          style={[
            styles.backdrop,
            {
              opacity: expandAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.4]
              })
            }
          ]}
        >
          <TouchableOpacity
            style={styles.backdropTouch}
            onPress={toggleMenu}
            activeOpacity={1}
          />
        </Animated.View>
      )}

      {['locating', 'processing'].includes(locationStatus) && (
        <Animated.View
          style={[
            styles.searchRipple,
            {
              transform: [{ scale: rippleScale }],
              opacity: rippleOpacity,
              backgroundColor: getLocationButtonStyle().backgroundColor + '30',
              borderColor: getLocationButtonStyle().backgroundColor + '60'
            }
          ]}
        />
      )}

      <View style={styles.speedDialContainer}>

        <Animated.View style={[
          styles.speedDialButton,
          {
            transform: [
              { translateY: button5Translate },
              { scale: expandAnim }
            ],
            opacity: expandAnim,
            zIndex: 1007
          }
        ]}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#10b981' }]}
            onPress={() => {
              showSyncStats();
              toggleMenu();
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.actionIcon}>📊</Text>
          </TouchableOpacity>

          <Animated.View style={[
            styles.speedDialLabel,
            { opacity: expandAnim, right: 70 }
          ]}>
            <Text style={styles.labelText}>
              Stats ({syncService.syncedPackages.length})
            </Text>
          </Animated.View>
        </Animated.View>

        {__DEV__ && (
          <Animated.View style={[
            styles.speedDialButton,
            {
              transform: [
                { translateY: button4Translate },
                { scale: expandAnim }
              ],
              opacity: expandAnim,
              zIndex: 1006
            }
          ]}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#6366f1' }]}
              onPress={() => {
                showMessageDiagnostics();
                toggleMenu();
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.actionIcon}>🔍</Text>
            </TouchableOpacity>

            <Animated.View style={[
              styles.speedDialLabel,
              { opacity: expandAnim, right: 70 }
            ]}>
              <Text style={styles.labelText}>Diagnóstico</Text>
            </Animated.View>
          </Animated.View>
        )}

        {locationHistory.length > 0 && (
          <Animated.View style={[
            styles.speedDialButton,
            {
              transform: [
                { translateY: button3Translate },
                { scale: expandAnim }
              ],
              opacity: expandAnim,
              zIndex: 1005
            }
          ]}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#ef4444' }]}
              onPress={() => {
                Alert.alert(
                  'Limpiar Marcadores',
                  '¿Deseas eliminar todos los marcadores del mapa?',
                  [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                      text: 'Limpiar',
                      onPress: () => {
                        clearUserMarkers();
                        toggleMenu();
                      },
                      style: 'destructive'
                    }
                  ]
                );
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.actionIcon}>🗑️</Text>
            </TouchableOpacity>

            <Animated.View style={[
              styles.speedDialLabel,
              { opacity: expandAnim, right: 70 }
            ]}>
              <Text style={styles.labelText}>Limpiar ({locationHistory.length})</Text>
            </Animated.View>
          </Animated.View>
        )}

        <Animated.View style={[
          styles.speedDialButton,
          {
            transform: [
              { translateY: button2Translate },
              { scale: expandAnim }
            ],
            opacity: expandAnim,
            zIndex: 1004
          }
        ]}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#f59e0b' }]}
            onPress={() => executeAction(on_toggle_settings, 'Configuración')}
            activeOpacity={0.8}
          >
            <Text style={styles.actionIcon}>⚙️</Text>
          </TouchableOpacity>

          <Animated.View style={[
            styles.speedDialLabel,
            { opacity: expandAnim, right: 70 }
          ]}>
            <Text style={styles.labelText}>Configuración</Text>
          </Animated.View>
        </Animated.View>

        <Animated.View style={[
          styles.speedDialButton,
          {
            transform: [
              { translateY: button1Translate },
              { scale: expandAnim }
            ],
            opacity: expandAnim,
            zIndex: 1003
          }
        ]}>
          <TouchableOpacity
            style={[
              styles.actionButton, 
              getSyncButtonStyle(),
              syncStatus === 'success' && { transform: [{ scale: successScale }] }
            ]}
            onPress={() => {
              syncPackages();
              toggleMenu();
            }}
            activeOpacity={0.8}
            disabled={isSyncing}
          >
            <Animated.Text style={[
              styles.actionIcon,
              ['syncing', 'requesting', 'processing'].includes(syncStatus) && {
                transform: [{ rotate: syncSpin }]
              }
            ]}>
              {getSyncIcon()}
            </Animated.Text>
          </TouchableOpacity>

          <Animated.View style={[
            styles.speedDialLabel,
            { opacity: expandAnim, right: 70 }
          ]}>
            <Text style={styles.labelText}>
              {isSyncing ? 'Sincronizando...' : 'Sync CartaPorte'}
            </Text>
          </Animated.View>
        </Animated.View>

        <Animated.View style={[
          styles.mainButtonContainer,
          {
            transform: [{
              scale: locationStatus === 'success' ? successScale :
                locationStatus === 'idle' ? locationPulse : 1
            }],
            zIndex: 1001
          }
        ]}>
          <TouchableOpacity
            style={[
              styles.mainButton,
              getLocationButtonStyle()
            ]}
            onPress={handleLocationPress}
            onLongPress={() => {
              Alert.alert(
                'Tracking Continuo',
                '¿Deseas activar el seguimiento continuo de ubicación?',
                [
                  { text: 'Cancelar', style: 'cancel' },
                  {
                    text: 'Activar',
                    onPress: () => console.log('TODO: Implementar tracking continuo')
                  }
                ]
              );
            }}
            activeOpacity={0.8}
            disabled={isLocating}
          >
            <Animated.Text style={[
              styles.mainIcon,
              ['locating', 'processing'].includes(locationStatus) && {
                transform: [{ rotate: locationSpin }]
              }
            ]}>
              {getLocationIcon()}
            </Animated.Text>

            <View style={[
              styles.buttonGlow,
              { backgroundColor: getLocationButtonStyle().backgroundColor + '40' }
            ]} />

            {['locating', 'processing'].includes(locationStatus) && (
              <Animated.View style={[
                styles.pulseRing,
                {
                  transform: [{ scale: zoomRipple }],
                  opacity: rippleOpacity,
                  borderColor: getLocationButtonStyle().backgroundColor
                }
              ]} />
            )}
          </TouchableOpacity>
        </Animated.View>

        <Animated.View style={[
          styles.menuButtonContainer,
          {
            transform: [{ rotate: menuRotate }],
            zIndex: 1002
          }
        ]}>
          <TouchableOpacity
            style={[
              styles.menuButton,
              isExpanded && styles.menuButtonExpanded
            ]}
            onPress={toggleMenu}
            activeOpacity={0.8}
          >
            <Text style={styles.menuIcon}>+</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {(locationStatus !== 'idle' || syncStatus !== 'idle') && (
        <Animated.View style={[
          styles.statusBar,
          {
            backgroundColor: syncStatus !== 'idle' ? 
              getSyncButtonStyle().backgroundColor : 
              getLocationButtonStyle().backgroundColor,
            opacity: (locationStatus !== 'idle' || syncStatus !== 'idle') ? 1 : 0,
          }
        ]}>
          <Text style={styles.statusText}>{getStatusMessage()}</Text>

          {syncStatus === 'success' && syncService.syncStats.totalPackages > 0 && (
            <View style={styles.locationInfo}>
              <Text style={styles.accuracyText}>
                Total en servidor: {syncService.syncStats.totalPackages} paquetes CartaPorte
              </Text>
              <Text style={styles.detailText}>
                Obtenidos: {syncService.syncStats.updatedPackages} | Viables: {syncService.syncedPackages.filter(pkg => pkg.route_summary?.viable).length}
              </Text>
              {syncService.syncStats.greenNumbersTotal > 0 && (
                <Text style={styles.detailText}>
                  Números verdes detectados: {syncService.syncStats.greenNumbersTotal}
                </Text>
              )}
              {syncService.syncStats.packagesWithDestinationQuery > 0 && (
                <Text style={styles.detailText}>
                  Con queries destino: {syncService.syncStats.packagesWithDestinationQuery}
                </Text>
              )}
              <Text style={styles.precisionText}>
                {new Date(syncService.syncStats.lastSync).toLocaleTimeString()} - Sincronización CartaPorte completa
              </Text>
            </View>
          )}

          {userLocation && locationStatus === 'success' && syncStatus === 'idle' && (
            <View style={styles.locationInfo}>
              <Text style={styles.accuracyText}>
                Precisión: ±{Math.round(userLocation.accuracy || 0)}m
                ({locationService.getLocationAccuracyInfo(userLocation.accuracy).description})
              </Text>

              {userLocation.altitude && (
                <Text style={styles.detailText}>
                  Altitud: {Math.round(userLocation.altitude)}m
                </Text>
              )}

              {userLocation.isAveraged && (
                <Text style={styles.methodText}>
                  Promedio de {userLocation.goodReadings} lecturas de alta precisión
                </Text>
              )}

              {!userLocation.isAveraged && userLocation.totalReadings > 1 && (
                <Text style={styles.methodText}>
                  Mejor de {userLocation.totalReadings} lecturas GPS
                </Text>
              )}

              {userLocation.accuracy <= locationService.ACCURACY_THRESHOLDS?.excellent && (
                <Text style={styles.precisionText}>Precisión excelente!</Text>
              )}
            </View>
          )}

          {locationHistory.length > 0 && locationStatus === 'idle' && syncStatus === 'idle' && (
            <TouchableOpacity style={styles.historyButton}>
              <Text style={styles.historyText}>
                {locationHistory.length} ubicaciones guardadas
              </Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      )}

      {__DEV__ && messageLog.length > 0 && (
        <View style={styles.debugPanel}>
          <Text style={styles.debugTitle}>Log de Mensajes</Text>
          {messageLog.slice(0, 3).map((log, index) => (
            <Text key={log.id} style={[
              styles.debugMessage,
              { color: log.success ? '#10b981' : '#ef4444' }
            ]}>
              {log.success ? '✅' : '❌'} {log.type} - {new Date(log.timestamp).toLocaleTimeString()}
            </Text>
          ))}
          
          {(syncStatus !== 'idle' || isSyncing || syncService.syncedPackages.length > 0) && (
            <View style={styles.debugSyncInfo}>
              <Text style={styles.debugSyncTitle}>Estado CartaPorte Sync:</Text>
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

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
    zIndex: 998,
  },
  backdropTouch: {
    flex: 1,
  },
  searchRipple: {
    position: 'absolute',
    bottom: 115,
    right: 58,
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 3,
    zIndex: 999,
  },
  speedDialContainer: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    alignItems: 'center',
    zIndex: 1000,
  },
  speedDialButton: {
    position: 'absolute',
    bottom: 0,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  speedDialLabel: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.9)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 22,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  labelText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    minWidth: 100,
  },
  actionButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  actionIcon: {
    fontSize: 24,
    textAlign: 'center',
  },
  mainButtonContainer: {
    marginBottom: 15,
  },
  mainButton: {
    width: 75,
    height: 75,
    borderRadius: 37.5,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 15,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.3)',
    position: 'relative',
  },
  mainIcon: {
    fontSize: 30,
    textAlign: 'center',
    zIndex: 2,
  },
  menuButtonContainer: {},
  menuButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  menuButtonExpanded: {
    backgroundColor: '#dc2626',
  },
  menuIcon: {
    fontSize: 22,
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  buttonGlow: {
    position: 'absolute',
    width: 75,
    height: 75,
    borderRadius: 37.5,
  },
  pulseRing: {
    position: 'absolute',
    width: 75,
    height: 75,
    borderRadius: 37.5,
    borderWidth: 3,
    backgroundColor: 'transparent',
  },
  statusBar: {
    position: 'absolute',
    top: 70,
    left: 15,
    right: 15,
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 25,
    elevation: 12,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    zIndex: 1005,
    alignItems: 'center',
  },
  statusText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18,
  },
  locationInfo: {
    marginTop: 8,
    alignItems: 'center',
  },
  accuracyText: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  detailText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    fontWeight: '400',
    marginTop: 2,
    textAlign: 'center',
  },
  methodText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    fontWeight: '400',
    marginTop: 3,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  precisionText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 3,
    textAlign: 'center',
  },
  historyButton: {
    marginTop: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 15,
  },
  historyText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 11,
    textAlign: 'center',
  },
  debugPanel: {
    position: 'absolute',
    top: 200,
    left: 10,
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 10,
    borderRadius: 6,
    zIndex: 1010,
    maxWidth: 300,
  },
  debugTitle: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  debugMessage: {
    fontSize: 10,
    fontFamily: 'monospace',
    lineHeight: 12,
  },
  debugSyncInfo: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  debugSyncTitle: {
    color: '#06b6d4',
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 3,
  },
});

export default ImprovedFloatingButtons;