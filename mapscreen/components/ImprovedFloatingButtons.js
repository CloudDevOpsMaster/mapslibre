import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions, TouchableOpacity, Text, Vibration, Alert, Platform } from 'react-native';
import * as Location from 'expo-location';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const ImprovedFloatingButtons = ({
  on_center_location,
  on_fit_to_packages,
  on_toggle_settings,
  mapRef,
  onLocationFound,
  theme = 'light'
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [locationStatus, setLocationStatus] = useState('idle');
  const [userLocation, setUserLocation] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationPermission, setLocationPermission] = useState(null);
  const [locationHistory, setLocationHistory] = useState([]);
  const [currentMarkerId, setCurrentMarkerId] = useState(null);

  // Animaciones
  const [expandAnim] = useState(new Animated.Value(0));
  const [locationPulse] = useState(new Animated.Value(1));
  const [locationRotate] = useState(new Animated.Value(0));
  const [zoomRipple] = useState(new Animated.Value(0));
  const [successScale] = useState(new Animated.Value(1));

  // Referencias para manejo de timeouts
  const locationTimeoutRef = useRef(null);
  const statusTimeoutRef = useRef(null);
  const locationWatchRef = useRef(null);

  // NUEVO: Estado para tracking de mensajes enviados
  const [messageLog, setMessageLog] = useState([]);
  const messageLogRef = useRef([]);

  // Configuración de ubicación optimizada
  const LOCATION_CONFIG = {
    accuracy: Location.Accuracy.BestForNavigation,
    maximumAge: 5000,
    timeout: 25000,
    distanceInterval: 0,
    timeInterval: 1000,
    enableHighAccuracy: true,
    mayShowUserSettingsDialog: true
  };

  const ACCURACY_THRESHOLDS = {
    excellent: 5,
    high: 15,
    good: 50,
    fair: 100,
    poor: 200
  };

  // Verificar permisos al montar el componente
  useEffect(() => {
    checkLocationPermissions();
  }, []);

  // Pulso constante para el botón principal
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

  // Limpiar recursos al desmontar
  useEffect(() => {
    return () => {
      if (locationTimeoutRef.current) clearTimeout(locationTimeoutRef.current);
      if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
      if (locationWatchRef.current) {
        locationWatchRef.current.remove();
      }
    };
  }, []);

  const checkLocationPermissions = async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      setLocationPermission(status);

      if (status !== 'granted') {
        console.log('📍 Permisos de ubicación no concedidos:', status);
      }
    } catch (error) {
      console.error('❌ Error verificando permisos:', error);
    }
  };

  const requestLocationPermissions = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status);

      if (status === 'granted') {
        console.log('✅ Permisos de ubicación concedidos');
        return true;
      } else {
        console.log('❌ Permisos de ubicación denegados:', status);
        return false;
      }
    } catch (error) {
      console.error('❌ Error solicitando permisos:', error);
      return false;
    }
  };

  const toggleMenu = useCallback(() => {
    const toValue = isExpanded ? 0 : 1;
    setIsExpanded(!isExpanded);

    // Haptic feedback
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

  // MEJORADO: Nueva función de envío con logging detallado
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
        console.log(`📤 [${messageId}] Enviando mensaje:`, message.type);
        console.log(`📄 [${messageId}] Payload completo:`, enrichedMessage);
        
        // CRÍTICO: Verificar que mapRef.current existe y tiene postMessage
        if (typeof mapRef.current.postMessage === 'function') {
          mapRef.current.postMessage(messageString);
          logEntry.success = true;
          console.log(`✅ [${messageId}] Mensaje enviado exitosamente`);
        } else {
          logEntry.error = 'postMessage no es una función';
          console.error(`❌ [${messageId}] mapRef.current.postMessage no es una función`);
          console.log(`🔍 [${messageId}] Tipo de mapRef.current:`, typeof mapRef.current);
          console.log(`🔍 [${messageId}] Propiedades disponibles:`, Object.keys(mapRef.current || {}));
        }
        
      } catch (error) {
        logEntry.error = error.message;
        console.error(`❌ [${messageId}] Error enviando mensaje:`, error);
        console.error(`📄 [${messageId}] Stack trace:`, error.stack);
      }
    } else {
      logEntry.error = 'mapRef no disponible';
      console.warn(`⚠️ [${messageId}] MapRef no disponible para enviar mensaje`);
      console.log(`🔍 [${messageId}] Estado mapRef:`, {
        mapRef: !!mapRef,
        mapRefCurrent: !!mapRef?.current,
        type: typeof mapRef?.current
      });
    }

    // Actualizar log de mensajes
    setMessageLog(prev => [logEntry, ...prev.slice(0, 19)]); // Mantener últimos 20
    messageLogRef.current = [logEntry, ...messageLogRef.current.slice(0, 19)];

    return logEntry.success;
  }, [mapRef]);

  const getLocationAccuracyLevel = (accuracy) => {
    if (accuracy <= ACCURACY_THRESHOLDS.excellent) return 'excellent';
    if (accuracy <= ACCURACY_THRESHOLDS.high) return 'high';
    if (accuracy <= ACCURACY_THRESHOLDS.good) return 'good';
    if (accuracy <= ACCURACY_THRESHOLDS.fair) return 'fair';
    return 'poor';
  };

  const getLocationAccuracyInfo = (accuracy) => {
    const level = getLocationAccuracyLevel(accuracy);

    const info = {
      excellent: { icon: '🎯', color: '#10b981', description: 'Excelente', zoom: 19 },
      high: { icon: '📍', color: '#059669', description: 'Muy buena', zoom: 18 },
      good: { icon: '📌', color: '#3b82f6', description: 'Buena', zoom: 16 },
      fair: { icon: '📡', color: '#f59e0b', description: 'Regular', zoom: 14 },
      poor: { icon: '📍', color: '#ef4444', description: 'Baja', zoom: 12 }
    };

    return info[level];
  };

  const getCurrentLocationWithHighPrecision = async () => {
    const readings = [];
    const maxReadings = 3;
    const readingInterval = 2000;

    console.log('🎯 Iniciando secuencia de ubicación de alta precisión...');

    for (let i = 0; i < maxReadings; i++) {
      try {
        console.log(`📡 Lectura ${i + 1}/${maxReadings}...`);

        const location = await Location.getCurrentPositionAsync(LOCATION_CONFIG);

        const reading = {
          ...location.coords,
          timestamp: location.timestamp,
          readingNumber: i + 1,
          accuracy: location.coords.accuracy || 999
        };

        readings.push(reading);
        console.log(`✅ Lectura ${i + 1}: ±${Math.round(reading.accuracy)}m`);

        if (reading.accuracy <= ACCURACY_THRESHOLDS.excellent && i >= 1) {
          console.log('🎯 Precisión excelente obtenida, finalizando temprano');
          break;
        }

        if (i < maxReadings - 1) {
          await new Promise(resolve => setTimeout(resolve, readingInterval));
        }

      } catch (error) {
        console.warn(`⚠️ Error en lectura ${i + 1}:`, error.message);
      }
    }

    if (readings.length === 0) {
      throw new Error('NO_READINGS_OBTAINED');
    }

    const goodReadings = readings.filter(r => r.accuracy < ACCURACY_THRESHOLDS.poor);
    const readingsToProcess = goodReadings.length > 0 ? goodReadings : readings;

    readingsToProcess.sort((a, b) => a.accuracy - b.accuracy);

    const bestReading = readingsToProcess[0];
    console.log(`🏆 Mejor lectura: ±${Math.round(bestReading.accuracy)}m de ${readings.length} intentos`);

    if (goodReadings.length >= 2) {
      const avgLat = goodReadings.reduce((sum, r) => sum + r.latitude, 0) / goodReadings.length;
      const avgLng = goodReadings.reduce((sum, r) => sum + r.longitude, 0) / goodReadings.length;
      const bestAccuracy = Math.min(...goodReadings.map(r => r.accuracy));

      console.log(`📊 Usando promedio de ${goodReadings.length} lecturas buenas`);

      return {
        ...bestReading,
        latitude: avgLat,
        longitude: avgLng,
        accuracy: bestAccuracy,
        isAveraged: true,
        totalReadings: readings.length,
        goodReadings: goodReadings.length,
        method: 'averaged_high_precision'
      };
    }

    return {
      ...bestReading,
      totalReadings: readings.length,
      goodReadings: goodReadings.length,
      method: 'best_single_reading'
    };
  };

  // CORREGIDO: Función mejorada para agregar marcador
  const addLocationMarkerToMap = useCallback((location) => {
    const accuracyInfo = getLocationAccuracyInfo(location.accuracy);

    const markerData = {
      id: `user-location-${Date.now()}`,
      coordinates: {
        latitude: location.latitude,
        longitude: location.longitude
      },
      title: `${accuracyInfo.icon} Mi Ubicación ${location.isAveraged ? '(Promediada)' : ''}`,
      description: [
        `Precisión: ±${Math.round(location.accuracy)}m (${accuracyInfo.description})`,
        location.altitude ? `Altitud: ${Math.round(location.altitude)}m` : null,
        location.speed ? `Velocidad: ${(location.speed * 3.6).toFixed(1)} km/h` : null,
        location.heading !== null ? `Dirección: ${Math.round(location.heading)}°` : null,
        location.isAveraged ? `📊 Promedio de ${location.goodReadings}/${location.totalReadings} lecturas` : null,
        `🕐 ${new Date(location.timestamp).toLocaleTimeString()}`
      ].filter(Boolean).join('\n'),
      accuracy: location.accuracy,
      timestamp: location.timestamp,
      isUserLocation: true,
      method: location.method || 'standard',
      totalReadings: location.totalReadings,
      goodReadings: location.goodReadings,
      isAveraged: location.isAveraged,
      altitude: location.altitude,
      speed: location.speed,
      heading: location.heading,
      style: {
        color: accuracyInfo.color,
        size: location.accuracy <= ACCURACY_THRESHOLDS.high ? 'large' :
          location.accuracy <= ACCURACY_THRESHOLDS.good ? 'medium' : 'small',
        icon: accuracyInfo.icon,
        showAccuracyCircle: true,
        accuracyRadius: location.accuracy,
        zoom: accuracyInfo.zoom
      }
    };

    console.log('🎯 Preparando marcador para envío:', {
      id: markerData.id,
      coordinates: markerData.coordinates,
      accuracy: markerData.accuracy,
      title: markerData.title
    });

    // Enviar al WebView
    const messageSent = sendMessageToWebView({
      type: 'addUserLocationMarker',
      marker: markerData
    });

    console.log(`📤 Resultado envío marcador: ${messageSent ? 'ÉXITO' : 'FALLO'}`);

    // CRÍTICO: Llamar onLocationFound independientemente del envío del mensaje
    if (onLocationFound) {
      console.log('📞 Llamando onLocationFound con datos completos...');
      
      // Preparar datos en el formato esperado por handleLocationFound
      const locationFoundData = {
        // Propiedades principales
        id: markerData.id,
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        timestamp: location.timestamp,
        
        // Propiedades adicionales
        altitude: location.altitude,
        speed: location.speed,
        heading: location.heading,
        title: markerData.title,
        description: markerData.description,
        
        // Formato de coordenadas compatible
        coordinates: {
          latitude: location.latitude,
          longitude: location.longitude
        },
        
        // Para compatibilidad con el código existente
        coordinate: {
          latitude: location.latitude,
          longitude: location.longitude
        },
        
        // Metadatos del marcador
        markerData: markerData,
        method: location.method,
        totalReadings: location.totalReadings,
        goodReadings: location.goodReadings,
        isAveraged: location.isAveraged
      };

      try {
        onLocationFound(locationFoundData);
        console.log('✅ onLocationFound ejecutado correctamente');
      } catch (error) {
        console.error('❌ Error ejecutando onLocationFound:', error);
      }
    } else {
      console.warn('⚠️ onLocationFound no disponible');
    }

    // Guardar en historial local
    setLocationHistory(prev => [
      {
        ...location,
        markerData,
        addedAt: new Date().toISOString(),
        messageSent
      },
      ...prev.slice(0, 9)
    ]);

    console.log('📍 Marcador procesado:', markerData.title);
    return markerData;
  }, [sendMessageToWebView, onLocationFound]);

  const centerMapOnLocation = useCallback((location) => {
    const accuracyInfo = getLocationAccuracyInfo(location.accuracy);

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
      console.log(`🗺️ Centrando mapa: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)} (zoom: ${accuracyInfo.zoom})`);
    } else {
      console.warn('⚠️ Falló el centrado del mapa');
    }

    return messageSent;
  }, [sendMessageToWebView]);

  const handleLocationPress = useCallback(async () => {
    if (isLocating) {
      console.log('⏳ Ya se está obteniendo ubicación...');
      return;
    }

    setIsLocating(true);
    setLocationStatus('checking_permissions');

    // Limpiar timeouts previos
    if (locationTimeoutRef.current) clearTimeout(locationTimeoutRef.current);
    if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);

    // Haptic feedback inicial
    if (Platform.OS === 'ios') {
      Vibration.vibrate([100, 50, 100]);
    } else {
      Vibration.vibrate(100);
    }

    // Timeout de seguridad
    locationTimeoutRef.current = setTimeout(() => {
      setLocationStatus('timeout');
      setIsLocating(false);
      console.warn('⏰ Timeout de ubicación');
      showLocationError(new Error('LOCATION_TIMEOUT'));
    }, 35000);

    try {
      // PASO 1: Verificar y solicitar permisos
      let hasPermission = locationPermission === 'granted';

      if (!hasPermission) {
        setLocationStatus('requesting_permissions');
        hasPermission = await requestLocationPermissions();

        if (!hasPermission) {
          throw new Error('PERMISSION_DENIED');
        }
      }

      // PASO 2: Verificar servicios de ubicación
      setLocationStatus('checking_services');
      const servicesEnabled = await Location.hasServicesEnabledAsync();

      if (!servicesEnabled) {
        throw new Error('LOCATION_SERVICES_DISABLED');
      }

      // PASO 3: Iniciar animaciones de búsqueda
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

      // PASO 4: Obtener ubicación con alta precisión
      const location = await getCurrentLocationWithHighPrecision();

      // Detener animaciones
      rotateAnimation.stop();
      rippleAnimation.stop();
      locationRotate.setValue(0);
      zoomRipple.setValue(0);

      // Limpiar timeout
      if (locationTimeoutRef.current) {
        clearTimeout(locationTimeoutRef.current);
        locationTimeoutRef.current = null;
      }

      // PASO 5: Procesar ubicación obtenida
      setUserLocation(location);
      setLocationStatus('processing');

      console.log('📍 Ubicación obtenida:', {
        lat: location.latitude.toFixed(6),
        lng: location.longitude.toFixed(6),
        accuracy: `±${Math.round(location.accuracy)}m`,
        method: location.method
      });

      // PASO 6: Agregar marcador al mapa
      setLocationStatus('adding_marker');
      const markerData = addLocationMarkerToMap(location);

      // Pausa para procesar
      await new Promise(resolve => setTimeout(resolve, 500));

      // PASO 7: Centrar mapa
      setLocationStatus('centering');
      const centered = centerMapOnLocation(location);

      if (centered) {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }

      // PASO 8: Ejecutar callback si existe  
      if (on_center_location) {
        try {
          console.log('📞 Ejecutando callback on_center_location...');
          await on_center_location(location);
          console.log('✅ Callback on_center_location ejecutado');
        } catch (callbackError) {
          console.warn('⚠️ Error en callback on_center_location:', callbackError);
        }
      }

      // PASO 9: Estado de éxito con animación
      setLocationStatus('success');

      // Animación de éxito
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

      // Haptic feedback de éxito
      if (Platform.OS === 'ios') {
        Vibration.vibrate([200, 100, 200, 100, 200]);
      } else {
        Vibration.vibrate([200, 100, 200]);
      }

      // Volver al estado normal
      statusTimeoutRef.current = setTimeout(() => {
        setLocationStatus('idle');
        setIsLocating(false);
      }, 4000);

    } catch (error) {
      console.error('❌ Error obteniendo ubicación:', error);

      // Limpiar timeouts y animaciones
      if (locationTimeoutRef.current) {
        clearTimeout(locationTimeoutRef.current);
        locationTimeoutRef.current = null;
      }

      locationRotate.setValue(0);
      zoomRipple.setValue(0);

      setLocationStatus('error');
      setIsLocating(false);

      // Haptic feedback de error
      if (Platform.OS === 'ios') {
        Vibration.vibrate([300, 150, 300, 150, 300]);
      } else {
        Vibration.vibrate([300, 200, 300]);
      }

      showLocationError(error);
    }
  }, [
    isLocating, locationPermission, sendMessageToWebView, addLocationMarkerToMap,
    centerMapOnLocation, on_center_location, getCurrentLocationWithHighPrecision
  ]);

  const clearUserMarkers = useCallback(() => {
    const messageSent = sendMessageToWebView({
      type: 'clearUserMarkers'
    });

    if (messageSent) {
      setLocationHistory([]);
      setCurrentMarkerId(null);
      console.log('🗑️ Marcadores de usuario limpiados');
    } else {
      console.warn('⚠️ Falló la limpieza de marcadores');
    }
  }, [sendMessageToWebView]);

  const showLocationError = (error) => {
    let errorInfo = {
      title: '📍 Error de Ubicación',
      message: 'No se pudo obtener tu ubicación.',
      suggestions: ['Verifica tu conexión', 'Intenta nuevamente']
    };

    switch (error.message) {
      case 'LOCATION_SERVICES_DISABLED':
        errorInfo = {
          title: '📡 GPS Desactivado',
          message: 'Los servicios de ubicación están desactivados.',
          suggestions: [
            'Ve a Configuración del dispositivo',
            'Activa "Ubicación" o "GPS"',
            'Reinicia la aplicación'
          ]
        };
        break;

      case 'PERMISSION_DENIED':
        errorInfo = {
          title: '🚫 Permisos Requeridos',
          message: 'Se necesitan permisos de ubicación.',
          suggestions: [
            'Ve a Configuración de la app',
            'Habilita permisos de "Ubicación"',
            'Selecciona "Permitir siempre" o "Solo mientras uses la app"'
          ]
        };
        break;

      case 'NO_READINGS_OBTAINED':
        errorInfo = {
          title: '📡 Sin Señal GPS',
          message: 'No se pudo conectar con el GPS.',
          suggestions: [
            'Sal al exterior si estás en interiores',
            'Espera unos momentos para mejor señal',
            'Verifica que el GPS esté activado'
          ]
        };
        break;

      case 'LOCATION_TIMEOUT':
        errorInfo = {
          title: '⏰ Tiempo Agotado',
          message: 'La búsqueda de ubicación tardó demasiado.',
          suggestions: [
            'Verifica tu conexión a internet',
            'Asegúrate de tener señal GPS',
            'Intenta en un lugar más abierto'
          ]
        };
        break;
    }

    const fullMessage = `${errorInfo.message}\n\n${errorInfo.suggestions.map(s => `• ${s}`).join('\n')}`;

    Alert.alert(
      errorInfo.title,
      fullMessage,
      [
        {
          text: 'Reintentar',
          onPress: () => {
            setTimeout(() => {
              setLocationStatus('idle');
              handleLocationPress();
            }, 1000);
          },
          style: 'default'
        },
        {
          text: 'Cancelar',
          style: 'cancel',
          onPress: () => setLocationStatus('idle')
        }
      ]
    );
  };

  const executeAction = useCallback((action, actionName, icon) => {
    if (Platform.OS === 'ios') {
      Vibration.vibrate([50]);
    } else {
      Vibration.vibrate(50);
    }

    if (action) {
      action();
    }

    toggleMenu();

    console.log(`✅ ${actionName} ejecutado`);
  }, [toggleMenu]);

  // Función para mostrar diagnósticos de mensajes
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

    Alert.alert(
      '🔍 Diagnóstico de Mensajes',
      diagnosticInfo + (recentErrors ? `\n\nErrores recientes:\n${recentErrors}` : ''),
      [{ text: 'OK' }]
    );
  }, [mapRef]);

  // Interpolaciones de animación
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

  const menuRotate = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg']
  });

  const locationSpin = locationRotate.interpolate({
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

  const getStatusMessage = () => {
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
      {/* Backdrop */}
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

      {/* Ripple de búsqueda GPS */}
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

      {/* Speed Dial Container */}
      <View style={styles.speedDialContainer}>

        {/* NUEVO: Botón de Diagnóstico */}
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

        {/* Botón de Limpiar Marcadores */}
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
                  '🗑️ Limpiar Marcadores',
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

        {/* Botón de Configuración */}
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
            onPress={() => executeAction(on_toggle_settings, 'Configuración', '⚙️')}
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

        {/* Botón de Ajustar Vista */}
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
            style={[styles.actionButton, { backgroundColor: '#8b5cf6' }]}
            onPress={() => executeAction(on_fit_to_packages, 'Ajustar Vista', '📦')}
            activeOpacity={0.8}
          >
            <Text style={styles.actionIcon}>📦</Text>
          </TouchableOpacity>

          <Animated.View style={[
            styles.speedDialLabel,
            { opacity: expandAnim, right: 70 }
          ]}>
            <Text style={styles.labelText}>Ajustar Vista</Text>
          </Animated.View>
        </Animated.View>

        {/* Botón Principal - Mi Ubicación */}
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
                '📍 Tracking Continuo',
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

        {/* Botón de Menú */}
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

      {/* Status Bar Mejorada */}
      {locationStatus !== 'idle' && (
        <Animated.View style={[
          styles.statusBar,
          {
            backgroundColor: getLocationButtonStyle().backgroundColor,
            opacity: locationStatus !== 'idle' ? 1 : 0,
          }
        ]}>
          <Text style={styles.statusText}>{getStatusMessage()}</Text>

          {/* Información detallada de ubicación */}
          {userLocation && locationStatus === 'success' && (
            <View style={styles.locationInfo}>
              <Text style={styles.accuracyText}>
                Precisión: ±{Math.round(userLocation.accuracy || 0)}m
                ({getLocationAccuracyInfo(userLocation.accuracy).description})
              </Text>

              {userLocation.altitude && (
                <Text style={styles.detailText}>
                  Altitud: {Math.round(userLocation.altitude)}m
                </Text>
              )}

              {userLocation.isAveraged && (
                <Text style={styles.methodText}>
                  📊 Promedio de {userLocation.goodReadings} lecturas de alta precisión
                </Text>
              )}

              {!userLocation.isAveraged && userLocation.totalReadings > 1 && (
                <Text style={styles.methodText}>
                  🏆 Mejor de {userLocation.totalReadings} lecturas GPS
                </Text>
              )}

              {userLocation.accuracy <= ACCURACY_THRESHOLDS.excellent && (
                <Text style={styles.precisionText}>🎯 ¡Precisión excelente!</Text>
              )}
            </View>
          )}

          {/* Información de historial */}
          {locationHistory.length > 0 && locationStatus === 'idle' && (
            <TouchableOpacity style={styles.historyButton}>
              <Text style={styles.historyText}>
                📍 {locationHistory.length} ubicaciones guardadas
              </Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      )}

      {/* Debug Panel Mejorado */}
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
});

export default ImprovedFloatingButtons;