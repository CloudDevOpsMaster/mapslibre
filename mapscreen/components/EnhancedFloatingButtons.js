// components/EnhancedFloatingButtons.js - Versión con diseño suavizado
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  View, 
  StyleSheet, 
  Animated, 
  Dimensions, 
  TouchableOpacity, 
  Text, 
  Vibration, 
  Alert, 
  Platform,
  StatusBar
} from 'react-native';
import * as Location from 'expo-location';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { UI_CONFIG } from '../config/ui_config';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const statusBarHeight = Platform.OS === 'ios' ? StatusBar.currentHeight || 44 : StatusBar.currentHeight || 0;

const EnhancedFloatingButtons = ({
  on_center_location,
  on_fit_to_packages,
  on_toggle_settings,
  mapRef,
  onLocationFound,
  theme = 'light'
}) => {
  // Estados principales
  const [isExpanded, setIsExpanded] = useState(false);
  const [locationStatus, setLocationStatus] = useState('idle');
  const [userLocation, setUserLocation] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationPermission, setLocationPermission] = useState(null);
  const [locationHistory, setLocationHistory] = useState([]);
  const [networkStatus, setNetworkStatus] = useState('connected');

  // Obtener tema actual
  const currentTheme = UI_CONFIG.themes[theme];
  const colors = currentTheme.colors;

  // Referencias para animaciones mejoradas y más suaves
  const expandAnim = useRef(new Animated.Value(0)).current;
  const fabScale = useRef(new Animated.Value(1)).current;
  const locationPulse = useRef(new Animated.Value(1)).current;
  const locationRotate = useRef(new Animated.Value(0)).current;
  const rippleScale = useRef(new Animated.Value(0)).current;
  const statusBarOpacity = useRef(new Animated.Value(0)).current;
  const buttonStagger = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0)
  ]).current;

  // Referencias para limpieza
  const locationTimeoutRef = useRef(null);
  const statusTimeoutRef = useRef(null);
  const locationWatchRef = useRef(null);

  // Configuración de ubicación optimizada
  const LOCATION_CONFIG = {
    accuracy: Location.Accuracy.BestForNavigation,
    maximumAge: 3000,
    timeout: 20000,
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

  // COLORES SUAVIZADOS Y MENOS SATURADOS
  const SOFT_COLORS = {
    primary: 'rgba(59, 130, 246, 0.85)',        // Azul suave
    secondary: 'rgba(107, 114, 128, 0.85)',      // Gris neutro
    success: 'rgba(34, 197, 94, 0.85)',         // Verde suave
    warning: 'rgba(249, 115, 22, 0.85)',        // Naranja suave
    danger: 'rgba(239, 68, 68, 0.85)',          // Rojo suave
    neutral: 'rgba(71, 85, 105, 0.85)',         // Gris azulado
    surface: 'rgba(248, 250, 252, 0.95)',       // Superficie suave
    overlay: 'rgba(15, 23, 42, 0.4)',           // Overlay sutil
  };

  // Estados de ubicación con colores suavizados
  const LOCATION_STATES = {
    idle: {
      color: SOFT_COLORS.primary,
      icon: '📍',
      message: null,
      canInteract: true
    },
    checking_permissions: {
      color: SOFT_COLORS.warning,
      icon: '🔒',
      message: 'Verificando permisos de ubicación...',
      canInteract: false
    },
    requesting_permissions: {
      color: SOFT_COLORS.warning,
      icon: '🙋‍♂️',
      message: 'Solicitando permisos de ubicación...',
      canInteract: false
    },
    checking_services: {
      color: SOFT_COLORS.warning,
      icon: '📡',
      message: 'Verificando servicios de ubicación...',
      canInteract: false
    },
    locating: {
      color: SOFT_COLORS.primary,
      icon: '🔄',
      message: 'Obteniendo ubicación de alta precisión...',
      canInteract: false
    },
    processing: {
      color: SOFT_COLORS.secondary,
      icon: '⚙️',
      message: 'Procesando datos de ubicación...',
      canInteract: false
    },
    adding_marker: {
      color: SOFT_COLORS.primary,
      icon: '📌',
      message: 'Agregando marcador al mapa...',
      canInteract: false
    },
    centering: {
      color: SOFT_COLORS.secondary,
      icon: '🎯',
      message: 'Centrando vista del mapa...',
      canInteract: false
    },
    success: {
      color: SOFT_COLORS.success,
      icon: '✅',
      message: '¡Ubicación encontrada con éxito!',
      canInteract: true
    },
    error: {
      color: SOFT_COLORS.danger,
      icon: '⚠️',
      message: 'Error al obtener ubicación',
      canInteract: true
    },
    timeout: {
      color: SOFT_COLORS.warning,
      icon: '⏰',
      message: 'Tiempo agotado para ubicación',
      canInteract: true
    }
  };

  // Configuración de botones del speed dial con colores suavizados
  const SPEED_DIAL_BUTTONS = [
    {
      id: 'packages',
      icon: '📦',
      label: 'Ver Paquetes',
      color: SOFT_COLORS.secondary,
      action: on_fit_to_packages,
      testID: 'speed-dial-packages'
    },
    {
      id: 'settings',
      icon: '⚙️',
      label: 'Configuración',
      color: SOFT_COLORS.neutral,
      action: on_toggle_settings,
      testID: 'speed-dial-settings'
    },
    {
      id: 'history',
      icon: '📊',
      label: `Historial (${locationHistory.length})`,
      color: SOFT_COLORS.primary,
      action: () => showLocationHistory(),
      testID: 'speed-dial-history',
      visible: locationHistory.length > 0
    },
    {
      id: 'clear',
      icon: '🗑️',
      label: `Limpiar (${locationHistory.length})`,
      color: SOFT_COLORS.danger,
      action: () => handleClearMarkers(),
      testID: 'speed-dial-clear',
      visible: locationHistory.length > 0
    }
  ].filter(button => button.visible !== false);

  // Efectos de inicialización
  useEffect(() => {
    checkLocationPermissions();
    startGentleIdleAnimation(); // Animación más suave
    
    return () => {
      clearAllTimeouts();
      stopAllAnimations();
    };
  }, []);

  // Efecto para animación de estado idle más suave
  useEffect(() => {
    if (locationStatus === 'idle') {
      startGentleIdleAnimation();
    } else {
      stopIdleAnimation();
    }
  }, [locationStatus]);

  const clearAllTimeouts = () => {
    [locationTimeoutRef, statusTimeoutRef].forEach(ref => {
      if (ref.current) {
        clearTimeout(ref.current);
        ref.current = null;
      }
    });

    if (locationWatchRef.current) {
      locationWatchRef.current.remove();
      locationWatchRef.current = null;
    }
  };

  const stopAllAnimations = () => {
    [expandAnim, fabScale, locationPulse, locationRotate, rippleScale, statusBarOpacity, ...buttonStagger]
      .forEach(anim => anim.stopAnimation?.());
  };

  // ANIMACIÓN IDLE MÁS SUAVE Y SUTIL
  const startGentleIdleAnimation = () => {
    const gentlePulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(locationPulse, {
          toValue: 1.03, // Menos escala (era 1.08)
          duration: 2500, // Más lenta (era 700ms)
          useNativeDriver: true
        }),
        Animated.timing(locationPulse, {
          toValue: 1,
          duration: 2500, // Más lenta
          useNativeDriver: true
        })
      ])
    );
    gentlePulseAnimation.start();
  };

  const stopIdleAnimation = () => {
    locationPulse.stopAnimation();
    locationPulse.setValue(1);
  };

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
      return status === 'granted';
    } catch (error) {
      console.error('❌ Error solicitando permisos:', error);
      return false;
    }
  };

  const triggerHaptics = useCallback((type = 'light') => {
    if (Platform.OS === 'ios') {
      switch (type) {
        case 'light':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case 'medium':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case 'heavy':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;
        case 'success':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
        case 'error':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          break;
        case 'warning':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          break;
      }
    } else {
      const patterns = {
        light: [50],
        medium: [100],
        heavy: [150],
        success: [100, 50, 100],
        error: [200, 100, 200],
        warning: [100, 100, 100]
      };
      Vibration.vibrate(patterns[type] || patterns.light);
    }
  }, []);

  // ANIMACIÓN MÁS SUAVE PARA SPEED DIAL
  const animateSpeedDial = useCallback((expand) => {
    const toValue = expand ? 1 : 0;
    setIsExpanded(expand);

    // Animación principal más suave
    Animated.spring(expandAnim, {
      toValue,
      useNativeDriver: true,
      tension: 100, // Menos tensión (más suave)
      friction: 8   // Menos fricción (más fluido)
    }).start();

    // Animación stagger más gradual
    const staggerAnimations = buttonStagger.map((anim, index) =>
      Animated.timing(anim, {
        toValue,
        duration: 400, // Más lenta
        delay: expand ? index * 100 : (buttonStagger.length - index - 1) * 60,
        useNativeDriver: true
      })
    );

    Animated.parallel(staggerAnimations).start();

    // Rotación más sutil del FAB principal
    Animated.spring(fabScale, {
      toValue: expand ? 0.95 : 1, // Menos escala
      useNativeDriver: true,
      tension: 120,
      friction: 8
    }).start();
  }, [expandAnim, fabScale, buttonStagger]);

  const toggleSpeedDial = useCallback(() => {
    triggerHaptics(isExpanded ? 'light' : 'medium');
    animateSpeedDial(!isExpanded);
  }, [isExpanded, animateSpeedDial, triggerHaptics]);

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

  const getLocationAccuracyLevel = (accuracy) => {
    if (accuracy <= ACCURACY_THRESHOLDS.excellent) return 'excellent';
    if (accuracy <= ACCURACY_THRESHOLDS.high) return 'high';
    if (accuracy <= ACCURACY_THRESHOLDS.good) return 'good';
    if (accuracy <= ACCURACY_THRESHOLDS.fair) return 'fair';
    return 'poor';
  };

  const getLocationAccuracyInfo = (accuracy) => {
    const level = getLocationAccuracyLevel(accuracy);
    const markerConfig = UI_CONFIG.components.locationMarker.colors[level];
    const sizeConfig = UI_CONFIG.components.locationMarker.sizes[level];

    return {
      level,
      ...markerConfig,
      ...sizeConfig,
      zoom: {
        excellent: 19,
        high: 18,
        good: 16,
        fair: 14,
        poor: 12
      }[level]
    };
  };

  const sendMessageToWebView = useCallback((message) => {
    if (mapRef?.current) {
      const enrichedMessage = {
        ...message,
        timestamp: new Date().toISOString(),
        source: 'enhanced_floating_buttons'
      };

      try {
        const messageString = JSON.stringify(enrichedMessage);
        console.log('📤 Enviando mensaje a WebView:', message.type);
        mapRef.current.postMessage(messageString);
        return true;
      } catch (error) {
        console.error('❌ Error enviando mensaje:', error);
        return false;
      }
    }
    return false;
  }, [mapRef]);

  const addLocationMarkerToMap = useCallback((location) => {
    const accuracyInfo = getLocationAccuracyInfo(location.accuracy);

    const markerData = {
      id: `user-location-${Date.now()}`,
      coordinates: {
        latitude: location.latitude,
        longitude: location.longitude
      },
      title: `🎯 Mi Ubicación ${location.isAveraged ? '(Promediada)' : ''}`,
      description: [
        `Precisión: ±${Math.round(location.accuracy)}m (${accuracyInfo.level})`,
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
      style: {
        color: accuracyInfo.border,
        showAccuracyCircle: true,
        accuracyRadius: location.accuracy,
        zoom: accuracyInfo.zoom
      }
    };

    const messageSent = sendMessageToWebView({
      type: 'addUserLocationMarker',
      marker: markerData
    });

    if (messageSent && onLocationFound) {
      onLocationFound({
        id: markerData.id,
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        timestamp: location.timestamp,
        coordinates: {
          latitude: location.latitude,
          longitude: location.longitude
        },
        markerData: markerData,
        method: location.method,
        totalReadings: location.totalReadings,
        goodReadings: location.goodReadings,
        isAveraged: location.isAveraged
      });
    }

    setLocationHistory(prev => [
      {
        ...location,
        markerData,
        addedAt: new Date().toISOString()
      },
      ...prev.slice(0, 9)
    ]);

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
    }

    return messageSent;
  }, [sendMessageToWebView]);

  const updateLocationStatus = useCallback((status, autoRevert = true, delay = 3000) => {
    setLocationStatus(status);

    // Actualizar barra de estado
    if (LOCATION_STATES[status]?.message) {
      Animated.timing(statusBarOpacity, {
        toValue: 1,
        duration: UI_CONFIG.designTokens.animations.durations.fast,
        useNativeDriver: true
      }).start();
    }

    // Auto revertir a idle si es necesario
    if (autoRevert && ['success', 'error', 'timeout'].includes(status)) {
      statusTimeoutRef.current = setTimeout(() => {
        setLocationStatus('idle');
        setIsLocating(false);
        
        Animated.timing(statusBarOpacity, {
          toValue: 0,
          duration: UI_CONFIG.designTokens.animations.durations.medium,
          useNativeDriver: true
        }).start();
      }, delay);
    }
  }, [statusBarOpacity]);

  const handleLocationPress = useCallback(async () => {
    if (isLocating) return;

    setIsLocating(true);
    triggerHaptics('medium');

    // Configurar timeout de seguridad
    locationTimeoutRef.current = setTimeout(() => {
      updateLocationStatus('timeout');
      triggerHaptics('error');
      showLocationError(new Error('LOCATION_TIMEOUT'));
    }, 30000);

    try {
      // Verificar permisos
      updateLocationStatus('checking_permissions', false);
      let hasPermission = locationPermission === 'granted';

      if (!hasPermission) {
        updateLocationStatus('requesting_permissions', false);
        hasPermission = await requestLocationPermissions();

        if (!hasPermission) {
          throw new Error('PERMISSION_DENIED');
        }
      }

      // Verificar servicios
      updateLocationStatus('checking_services', false);
      const servicesEnabled = await Location.hasServicesEnabledAsync();

      if (!servicesEnabled) {
        throw new Error('LOCATION_SERVICES_DISABLED');
      }

      // Iniciar búsqueda
      updateLocationStatus('locating', false);

      // ANIMACIONES MÁS SUAVES DURANTE LA BÚSQUEDA
      const gentleRotateAnimation = Animated.loop(
        Animated.timing(locationRotate, {
          toValue: 1,
          duration: 3000, // Rotación más lenta (era 1500ms)
          useNativeDriver: true
        })
      );

      const subtleRippleAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(rippleScale, {
            toValue: 1,
            duration: 3000, // Ripple más lento (era 2000ms)
            useNativeDriver: true
          }),
          Animated.timing(rippleScale, {
            toValue: 0,
            duration: 500, // Pausa más larga (era 200ms)
            useNativeDriver: true
          })
        ])
      );

      gentleRotateAnimation.start();
      subtleRippleAnimation.start();

      // Obtener ubicación
      const location = await getCurrentLocationWithHighPrecision();

      // Detener animaciones suavemente
      gentleRotateAnimation.stop();
      subtleRippleAnimation.stop();
      
      // Animación suave de retorno
      Animated.timing(locationRotate, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true
      }).start();
      
      Animated.timing(rippleScale, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true
      }).start();

      // Limpiar timeout
      if (locationTimeoutRef.current) {
        clearTimeout(locationTimeoutRef.current);
        locationTimeoutRef.current = null;
      }

      // Procesar ubicación
      setUserLocation(location);
      updateLocationStatus('processing', false);

      console.log('📍 Ubicación obtenida:', {
        lat: location.latitude.toFixed(6),
        lng: location.longitude.toFixed(6),
        accuracy: `±${Math.round(location.accuracy)}m`,
        method: location.method
      });

      // Agregar marcador
      updateLocationStatus('adding_marker', false);
      addLocationMarkerToMap(location);

      await new Promise(resolve => setTimeout(resolve, 500));

      // Centrar mapa
      updateLocationStatus('centering', false);
      centerMapOnLocation(location);

      await new Promise(resolve => setTimeout(resolve, 1500));

      // Callback externo
      if (on_center_location) {
        try {
          await on_center_location(location);
        } catch (callbackError) {
          console.warn('⚠️ Error en callback:', callbackError);
        }
      }

      // Estado de éxito
      updateLocationStatus('success', true, 4000);
      triggerHaptics('success');

    } catch (error) {
      console.error('❌ Error obteniendo ubicación:', error);

      // Limpiar recursos
      if (locationTimeoutRef.current) {
        clearTimeout(locationTimeoutRef.current);
        locationTimeoutRef.current = null;
      }

      // Reset suave de animaciones
      Animated.timing(locationRotate, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true
      }).start();
      
      Animated.timing(rippleScale, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true
      }).start();

      updateLocationStatus('error', true, 5000);
      triggerHaptics('error');
      showLocationError(error);
    }
  }, [
    isLocating, locationPermission, updateLocationStatus, triggerHaptics,
    addLocationMarkerToMap, centerMapOnLocation, on_center_location
  ]);

  const showLocationError = (error) => {
    const errorConfig = {
      LOCATION_SERVICES_DISABLED: {
        title: '📡 GPS Desactivado',
        message: 'Los servicios de ubicación están desactivados.',
        suggestions: [
          'Ve a Configuración del dispositivo',
          'Activa "Ubicación" o "GPS"',
          'Reinicia la aplicación'
        ]
      },
      PERMISSION_DENIED: {
        title: '🚫 Permisos Requeridos',
        message: 'Se necesitan permisos de ubicación.',
        suggestions: [
          'Ve a Configuración de la app',
          'Habilita permisos de "Ubicación"',
          'Selecciona "Permitir siempre"'
        ]
      },
      NO_READINGS_OBTAINED: {
        title: '📡 Sin Señal GPS',
        message: 'No se pudo conectar con el GPS.',
        suggestions: [
          'Sal al exterior si estás en interiores',
          'Espera unos momentos para mejor señal',
          'Verifica que el GPS esté activado'
        ]
      },
      LOCATION_TIMEOUT: {
        title: '⏰ Tiempo Agotado',
        message: 'La búsqueda de ubicación tardó demasiado.',
        suggestions: [
          'Verifica tu conexión a internet',
          'Asegúrate de tener señal GPS',
          'Intenta en un lugar más abierto'
        ]
      }
    };

    const config = errorConfig[error.message] || {
      title: '📍 Error de Ubicación',
      message: 'No se pudo obtener tu ubicación.',
      suggestions: ['Verifica tu conexión', 'Intenta nuevamente']
    };

    const fullMessage = `${config.message}\n\n${config.suggestions.map(s => `• ${s}`).join('\n')}`;

    Alert.alert(
      config.title,
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
          onPress: () => {
            setLocationStatus('idle');
            setIsLocating(false);
          }
        }
      ]
    );
  };

  const handleClearMarkers = useCallback(() => {
    Alert.alert(
      '🗑️ Limpiar Marcadores',
      '¿Deseas eliminar todos los marcadores del mapa?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpiar',
          onPress: () => {
            sendMessageToWebView({ type: 'clearUserMarkers' });
            setLocationHistory([]);
            triggerHaptics('success');
            
            if (isExpanded) {
              animateSpeedDial(false);
            }
          },
          style: 'destructive'
        }
      ]
    );
  }, [sendMessageToWebView, triggerHaptics, isExpanded, animateSpeedDial]);

  const showLocationHistory = useCallback(() => {
    const historyText = locationHistory
      .slice(0, 5)
      .map((loc, index) => 
        `${index + 1}. ${new Date(loc.addedAt).toLocaleTimeString()} - ±${Math.round(loc.accuracy)}m`
      )
      .join('\n');

    Alert.alert(
      '📊 Historial de Ubicaciones',
      historyText || 'No hay ubicaciones guardadas',
      [{ text: 'OK', style: 'default' }]
    );
  }, [locationHistory]);

  const executeSpeedDialAction = useCallback((action, label) => {
    triggerHaptics('light');
    
    if (action) {
      action();
    }
    
    animateSpeedDial(false);
    console.log(`✅ ${label} ejecutado`);
  }, [triggerHaptics, animateSpeedDial]);

  // Interpolaciones de animación mejoradas y más suaves
  const getButtonTranslate = (index) => expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -(70 + (index * 75))]
  });

  // ROTACIÓN MÁS SUAVE PARA EL MENÚ
  const menuRotate = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '35deg'] // Menos rotación (era 45deg)
  });

  // ROTACIÓN MÁS SUAVE PARA EL BOTÓN DE UBICACIÓN
  const locationSpin = locationRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  // RIPPLE MÁS SUTIL
  const rippleScaleInterpolation = rippleScale.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 2.2] // Menos escala (era 3)
  });

  const rippleOpacity = rippleScale.interpolate({
    inputRange: [0, 0.7, 1], // Cambio en puntos de opacidad
    outputRange: [0.6, 0.3, 0] // Opacidad más sutil (era 0.8, 0.4, 0)
  });

  const currentLocationState = LOCATION_STATES[locationStatus] || LOCATION_STATES.idle;

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* Backdrop mejorado con blur más sutil */}
      {isExpanded && (
        <Animated.View
          style={[
            styles.backdrop,
            {
              opacity: expandAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.7] // Menos opacidad (era 1)
              })
            }
          ]}
        >
          <BlurView
            intensity={15} // Menos blur (era 20)
            style={StyleSheet.absoluteFillObject}
            experimentalBlurMethod="dimezisBlurView"
          />
          <TouchableOpacity
            style={styles.backdropTouch}
            onPress={() => animateSpeedDial(false)}
            activeOpacity={1}
          />
        </Animated.View>
      )}

      {/* Ripple de búsqueda GPS más sutil */}
      {['locating', 'processing'].includes(locationStatus) && (
        <Animated.View
          style={[
            styles.searchRipple,
            {
              transform: [{ scale: rippleScaleInterpolation }],
              opacity: rippleOpacity,
              backgroundColor: currentLocationState.color + '15', // Menos opacidad (era '20')
              borderColor: currentLocationState.color + '30' // Menos opacidad (era '40')
            }
          ]}
        />
      )}

      {/* Speed Dial Container mejorado */}
      <View style={styles.speedDialContainer}>
        {/* Botones del Speed Dial */}
        {SPEED_DIAL_BUTTONS.map((button, index) => (
          <Animated.View
            key={button.id}
            style={[
              styles.speedDialButton,
              {
                transform: [
                  { translateY: getButtonTranslate(index) },
                  { scale: buttonStagger[index] || expandAnim }
                ],
                opacity: buttonStagger[index] || expandAnim,
                zIndex: UI_CONFIG.layout.zIndex.elevated + index
              }
            ]}
          >
            <TouchableOpacity
              style={[
                styles.actionButton,
                { 
                  backgroundColor: button.color,
                  // Sombra más sutil
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.15, // Menos sombra (era elevation.lg)
                  shadowRadius: 6,
                  elevation: 6
                }
              ]}
              onPress={() => executeSpeedDialAction(button.action, button.label)}
              activeOpacity={0.8}
              testID={button.testID}
            >
              <Text style={styles.actionIcon}>{button.icon}</Text>
            </TouchableOpacity>

            <Animated.View
              style={[
                styles.speedDialLabel,
                { 
                  opacity: buttonStagger[index] || expandAnim,
                  backgroundColor: SOFT_COLORS.surface
                }
              ]}
            >
              <Text style={[styles.labelText, { color: colors.text }]}>
                {button.label}
              </Text>
            </Animated.View>
          </Animated.View>
        ))}

        {/* Botón Principal - Mi Ubicación */}
        <Animated.View
          style={[
            styles.mainButtonContainer,
            {
              transform: [
                { 
                  scale: locationStatus === 'success' ? 
                    locationPulse.interpolate({
                      inputRange: [1, 1.2],
                      outputRange: [1, 1.2]
                    }) :
                    locationStatus === 'idle' ? locationPulse : 1
                }
              ],
              zIndex: UI_CONFIG.layout.zIndex.fixed
            }
          ]}
        >
          <TouchableOpacity
            style={[
              styles.mainButton,
              {
                backgroundColor: currentLocationState.color,
                // Sombra más sutil para el botón principal
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2, // Menos sombra (era elevation.fab con 0.25)
                shadowRadius: 8,
                elevation: 8
              }
            ]}
            onPress={handleLocationPress}
            onLongPress={() => {
              Alert.alert(
                '📍 Tracking Continuo',
                '¿Deseas activar el seguimiento continuo de ubicación?',
                [
                  { text: 'Cancelar', style: 'cancel' },
                  { text: 'Activar', onPress: () => console.log('Tracking activado') }
                ]
              );
            }}
            activeOpacity={0.8}
            disabled={!currentLocationState.canInteract}
            testID="main-location-button"
          >
            <Animated.Text
              style={[
                styles.mainIcon,
                ['locating', 'processing'].includes(locationStatus) && {
                  transform: [{ rotate: locationSpin }]
                }
              ]}
            >
              {currentLocationState.icon}
            </Animated.Text>

            {/* Glow effect más sutil */}
            <Animated.View
              style={[
                styles.buttonGlow,
                { backgroundColor: currentLocationState.color + '25' } // Menos opacidad (era '40')
              ]}
            />

            {/* Pulse ring para estados activos más sutil */}
            {['locating', 'processing'].includes(locationStatus) && (
              <Animated.View
                style={[
                  styles.pulseRing,
                  {
                    transform: [{ scale: rippleScale }],
                    opacity: rippleOpacity,
                    borderColor: currentLocationState.color,
                    borderWidth: 2 // Menos grosor (era 3)
                  }
                ]}
              />
            )}
          </TouchableOpacity>
        </Animated.View>

        {/* Botón de Menú */}
        <Animated.View
          style={[
            styles.menuButtonContainer,
            {
              transform: [
                { rotate: menuRotate },
                { scale: fabScale }
              ],
              zIndex: UI_CONFIG.layout.zIndex.elevated
            }
          ]}
        >
          <TouchableOpacity
            style={[
              styles.menuButton,
              {
                backgroundColor: isExpanded ? SOFT_COLORS.danger : SOFT_COLORS.neutral, // Colores más suaves
                // Sombra más sutil
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.12, // Menos sombra (era elevation.md)
                shadowRadius: 4,
                elevation: 4
              }
            ]}
            onPress={toggleSpeedDial}
            activeOpacity={0.8}
            testID="speed-dial-toggle"
          >
            <Text style={styles.menuIcon}>+</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Barra de estado mejorada */}
      {currentLocationState.message && (
        <Animated.View
          style={[
            styles.statusBar,
            {
              backgroundColor: currentLocationState.color,
              opacity: statusBarOpacity,
              top: statusBarHeight + UI_CONFIG.designTokens.spacing.lg,
              // Sombra más sutil
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.12, // Menos sombra (era elevation.xl con 0.16)
              shadowRadius: 12,
              elevation: 10
            }
          ]}
        >
          <View style={styles.statusContent}>
            <Text style={styles.statusIcon}>{currentLocationState.icon}</Text>
            <Text style={styles.statusText}>{currentLocationState.message}</Text>
          </View>

          {/* Información detallada de ubicación */}
          {userLocation && locationStatus === 'success' && (
            <View style={styles.locationInfo}>
              <Text style={styles.accuracyText}>
                Precisión: ±{Math.round(userLocation.accuracy || 0)}m
                ({getLocationAccuracyInfo(userLocation.accuracy).level})
              </Text>

              {userLocation.isAveraged && (
                <Text style={styles.methodText}>
                  📊 Promedio de {userLocation.goodReadings} lecturas de alta precisión
                </Text>
              )}

              {userLocation.accuracy <= ACCURACY_THRESHOLDS.excellent && (
                <Text style={styles.precisionText}>🎯 ¡Precisión excelente!</Text>
              )}
            </View>
          )}
        </Animated.View>
      )}
    </View>
  );
};

// ESTILOS ACTUALIZADOS CON COLORES MÁS SUAVES
const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: UI_CONFIG.layout.zIndex.fixed,
  },

  backdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: UI_CONFIG.layout.zIndex.overlay - 1,
  },

  backdropTouch: {
    flex: 1,
  },

  searchRipple: {
    position: 'absolute',
    bottom: 110,
    right: 53,
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1.5, // Menos grosor (era 2)
    zIndex: UI_CONFIG.layout.zIndex.elevated - 1,
  },

  speedDialContainer: {
    position: 'absolute',
    bottom: UI_CONFIG.designTokens.spacing.xl,
    right: UI_CONFIG.designTokens.spacing.xl,
    alignItems: 'center',
    zIndex: UI_CONFIG.layout.zIndex.fixed,
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
    right: 75,
    paddingHorizontal: UI_CONFIG.designTokens.spacing.md,
    paddingVertical: UI_CONFIG.designTokens.spacing.sm,
    borderRadius: UI_CONFIG.designTokens.borderRadius.xl,
    // Sombra más sutil para labels
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    minWidth: 120,
  },

  labelText: {
    fontSize: UI_CONFIG.designTokens.typography.sizes.footnote,
    fontWeight: UI_CONFIG.designTokens.typography.weights.semibold,
    textAlign: 'center',
  },

  actionButton: {
    width: UI_CONFIG.components.fab.variants.regular.width,
    height: UI_CONFIG.components.fab.variants.regular.height,
    borderRadius: UI_CONFIG.components.fab.variants.regular.width / 2,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5, // Menos grosor (era 2)
    borderColor: 'rgba(255,255,255,0.15)', // Menos opacidad (era 0.2)
  },

  actionIcon: {
    fontSize: 22,
    textAlign: 'center',
  },

  mainButtonContainer: {
    marginBottom: UI_CONFIG.designTokens.spacing.lg,
  },

  mainButton: {
    width: UI_CONFIG.components.fab.variants.large.width,
    height: UI_CONFIG.components.fab.variants.large.height,
    borderRadius: UI_CONFIG.components.fab.variants.large.width / 2,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2, // Menos grosor (era 3)
    borderColor: 'rgba(255,255,255,0.2)', // Menos opacidad (era 0.3)
    position: 'relative',
  },

  mainIcon: {
    fontSize: 28,
    textAlign: 'center',
    zIndex: 2,
  },

  buttonGlow: {
    position: 'absolute',
    width: UI_CONFIG.components.fab.variants.large.width,
    height: UI_CONFIG.components.fab.variants.large.height,
    borderRadius: UI_CONFIG.components.fab.variants.large.width / 2,
  },

  pulseRing: {
    position: 'absolute',
    width: UI_CONFIG.components.fab.variants.large.width,
    height: UI_CONFIG.components.fab.variants.large.height,
    borderRadius: UI_CONFIG.components.fab.variants.large.width / 2,
    backgroundColor: 'transparent',
  },

  menuButtonContainer: {},

  menuButton: {
    width: UI_CONFIG.components.fab.variants.small.width + 8,
    height: UI_CONFIG.components.fab.variants.small.height + 8,
    borderRadius: (UI_CONFIG.components.fab.variants.small.width + 8) / 2,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5, // Menos grosor (era 2)
    borderColor: 'rgba(255,255,255,0.2)', // Menos opacidad (era 0.3)
  },

  menuIcon: {
    fontSize: 20,
    color: '#fff',
    fontWeight: UI_CONFIG.designTokens.typography.weights.bold,
    textAlign: 'center',
  },

  statusBar: {
    position: 'absolute',
    left: UI_CONFIG.designTokens.spacing.lg,
    right: UI_CONFIG.designTokens.spacing.lg,
    paddingHorizontal: UI_CONFIG.designTokens.spacing.lg,
    paddingVertical: UI_CONFIG.designTokens.spacing.md,
    borderRadius: UI_CONFIG.designTokens.borderRadius.xl,
    zIndex: UI_CONFIG.layout.zIndex.modal,
  },

  statusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  statusIcon: {
    fontSize: 18,
    marginRight: UI_CONFIG.designTokens.spacing.sm,
  },

  statusText: {
    color: '#fff',
    fontSize: UI_CONFIG.designTokens.typography.sizes.callout,
    fontWeight: UI_CONFIG.designTokens.typography.weights.semibold,
    textAlign: 'center',
    lineHeight: UI_CONFIG.designTokens.typography.lineHeights.normal * UI_CONFIG.designTokens.typography.sizes.callout,
    flex: 1,
  },

  locationInfo: {
    marginTop: UI_CONFIG.designTokens.spacing.sm,
    alignItems: 'center',
  },

  accuracyText: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: UI_CONFIG.designTokens.typography.sizes.footnote,
    fontWeight: UI_CONFIG.designTokens.typography.weights.medium,
    textAlign: 'center',
  },

  methodText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: UI_CONFIG.designTokens.typography.sizes.caption,
    fontWeight: UI_CONFIG.designTokens.typography.weights.regular,
    marginTop: UI_CONFIG.designTokens.spacing.xs,
    textAlign: 'center',
    fontStyle: 'italic',
  },

  precisionText: {
    color: '#fff',
    fontSize: UI_CONFIG.designTokens.typography.sizes.footnote,
    fontWeight: UI_CONFIG.designTokens.typography.weights.bold,
    marginTop: UI_CONFIG.designTokens.spacing.xs,
    textAlign: 'center',
  },
});

export default EnhancedFloatingButtons;