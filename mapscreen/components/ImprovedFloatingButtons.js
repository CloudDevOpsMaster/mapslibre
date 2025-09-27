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
  onPackagesSynced, // NUEVO: Callback para manejar paquetes sincronizados
  theme = 'light'
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [locationStatus, setLocationStatus] = useState('idle');
  const [syncStatus, setSyncStatus] = useState('idle');
  const [userLocation, setUserLocation] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [locationPermission, setLocationPermission] = useState(null);
  const [locationHistory, setLocationHistory] = useState([]);
  const [currentMarkerId, setCurrentMarkerId] = useState(null);

  // NUEVO: Estados para manejar los paquetes sincronizados
  const [syncedPackages, setSyncedPackages] = useState([]);
  const [syncStats, setSyncStats] = useState({
    totalPackages: 0,
    lastSync: null,
    syncCount: 0
  });

  // Animaciones
  const [expandAnim] = useState(new Animated.Value(0));
  const [locationPulse] = useState(new Animated.Value(1));
  const [locationRotate] = useState(new Animated.Value(0));
  const [syncRotate] = useState(new Animated.Value(0));
  const [zoomRipple] = useState(new Animated.Value(0));
  const [successScale] = useState(new Animated.Value(1));

  // Referencias para manejo de timeouts
  const locationTimeoutRef = useRef(null);
  const syncTimeoutRef = useRef(null);
  const statusTimeoutRef = useRef(null);
  const locationWatchRef = useRef(null);

  // Estado para tracking de mensajes enviados
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

  // ACTUALIZADO: Configuración del endpoint de sincronización
  const SYNC_CONFIG = {
    endpoint: 'https://0fhmgyybv3.execute-api.us-east-2.amazonaws.com/saasintel/sync/packages',
    timeout: 20000, // Incrementado para manejar queries complejas
    retries: 2
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
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
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
        console.log('Permisos de ubicación no concedidos:', status);
      }
    } catch (error) {
      console.error('Error verificando permisos:', error);
    }
  };

  const requestLocationPermissions = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status);

      if (status === 'granted') {
        console.log('Permisos de ubicación concedidos');
        return true;
      } else {
        console.log('Permisos de ubicación denegados:', status);
        return false;
      }
    } catch (error) {
      console.error('Error solicitando permisos:', error);
      return false;
    }
  };

  // ACTUALIZADO: Función para sincronizar paquetes con el nuevo endpoint
  const syncPackages = useCallback(async () => {
    if (isSyncing) {
      console.log('Ya se está sincronizando...');
      return;
    }

    setIsSyncing(true);
    setSyncStatus('preparing');

    // Limpiar timeout previo
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);

    // Haptic feedback inicial
    if (Platform.OS === 'ios') {
      Vibration.vibrate([100, 50, 100]);
    } else {
      Vibration.vibrate(100);
    }

    // Timeout de seguridad
    syncTimeoutRef.current = setTimeout(() => {
      setSyncStatus('timeout');
      setIsSyncing(false);
      console.warn('Timeout de sincronización');
      showSyncError(new Error('SYNC_TIMEOUT'));
    }, SYNC_CONFIG.timeout);

    try {
      // PASO 1: Iniciar animaciones de sincronización
      setSyncStatus('syncing');

      const rotateAnimation = Animated.loop(
        Animated.timing(syncRotate, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        })
      );

      rotateAnimation.start();

      // PASO 2: Preparar datos para enviar al nuevo endpoint
      const syncData = {
        timestamp: new Date().toISOString(),
        deviceId: `device_${Platform.OS}_${Math.random().toString(36).substr(2, 9)}`,
        location: userLocation ? {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          accuracy: userLocation.accuracy
        } : null,
        requestId: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        filters: {
          // Filtros por defecto - puedes personalizar según necesidades
          geocoding_ready: true, // Solo paquetes listos para geocoding
          // carrier: 'estafeta', // Opcional: filtrar por carrier específico
          // state: 'Jalisco', // Opcional: filtrar por estado
          date_from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() // Últimos 7 días
        },
        limit: 100, // Máximo 100 paquetes por sincronización
        includeMetadata: true // Incluir metadatos completos
      };

      console.log('Iniciando sincronización con datos:', {
        deviceId: syncData.deviceId,
        hasLocation: !!syncData.location,
        filters: syncData.filters,
        limit: syncData.limit
      });

      // PASO 3: Realizar la petición HTTP al endpoint actualizado
      setSyncStatus('requesting');
      
      const response = await fetch(SYNC_CONFIG.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          // Agregar headers de autenticación si es necesario
          // 'Authorization': 'Bearer YOUR_TOKEN_HERE'
        },
        body: JSON.stringify(syncData),
        timeout: SYNC_CONFIG.timeout
      });

      // PASO 4: Verificar respuesta
      if (!response.ok) {
        throw new Error(`HTTP_ERROR_${response.status}: ${response.statusText}`);
      }

      const responseData = await response.json();
      console.log('Respuesta del servidor recibida:', {
        success: responseData.success,
        totalPackages: responseData.data?.totalPackages,
        packagesCount: responseData.data?.packages?.length
      });

      // PASO 5: Validar estructura de respuesta
      if (!responseData.success) {
        throw new Error(`SERVER_ERROR: ${responseData.error?.message || 'Unknown error'}`);
      }

      const syncResponse = responseData.data;
      if (!syncResponse || !Array.isArray(syncResponse.packages)) {
        throw new Error('INVALID_RESPONSE: Missing or invalid packages data');
      }

      // Detener animaciones
      rotateAnimation.stop();
      syncRotate.setValue(0);

      // Limpiar timeout
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = null;
      }

      // PASO 6: Procesar respuesta del servidor
      setSyncStatus('processing');
      
      // Calcular estadísticas adicionales para la UI
      const greenNumbersTotal = syncResponse.packages.reduce((total, pkg) => {
        return total + (pkg.green_numbers?.length || 0);
      }, 0);
      
      const packagesWithDestinationQuery = syncResponse.packages.filter(pkg => 
        pkg.destination_query && pkg.destination_query.trim()
      ).length;
      
      // Actualizar estados con los datos recibidos incluyendo nuevas estadísticas
      setSyncedPackages(syncResponse.packages);
      setSyncStats({
        totalPackages: syncResponse.totalPackages || 0,
        lastSync: syncResponse.lastSync || new Date().toISOString(),
        syncCount: (syncStats.syncCount || 0) + 1,
        updatedPackages: syncResponse.updatedPackages || 0,
        greenNumbersTotal, // Nueva estadística
        packagesWithDestinationQuery // Nueva estadística
      });

      // PASO 7: Procesar paquetes para el mapa si es necesario
      if (syncResponse.packages && syncResponse.packages.length > 0) {
        console.log(`Procesando ${syncResponse.packages.length} paquetes sincronizados`);
        
        // Enviar paquetes al WebView del mapa
        sendPackagesToMap(syncResponse.packages);
        
        // Ejecutar callback si existe
        if (onPackagesSynced) {
          try {
            await onPackagesSynced(syncResponse);
          } catch (callbackError) {
            console.warn('Error en callback onPackagesSynced:', callbackError);
          }
        }
      }

      // Simular procesamiento
      await new Promise(resolve => setTimeout(resolve, 800));

      // PASO 8: Mostrar resultado exitoso
      setSyncStatus('success');

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

      // Mostrar notificación de éxito
      showSyncNotification('success', syncResponse);

      // Volver al estado normal - duración extendida para mostrar más información
      statusTimeoutRef.current = setTimeout(() => {
        setSyncStatus('idle');
        setIsSyncing(false);
      }, 8000); // Aumentado de 5 a 8 segundos para mostrar más información

    } catch (error) {
      console.error('Error sincronizando paquetes:', error);

      // Limpiar timeouts y animaciones
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = null;
      }

      syncRotate.setValue(0);

      setSyncStatus('error');
      setIsSyncing(false);

      // Haptic feedback de error
      if (Platform.OS === 'ios') {
        Vibration.vibrate([300, 150, 300, 150, 300]);
      } else {
        Vibration.vibrate([300, 200, 300]);
      }

      showSyncError(error);
    }
  }, [isSyncing, userLocation, syncStats, onPackagesSynced]);

  // NUEVO: Función para enviar paquetes sincronizados al mapa
  const sendPackagesToMap = useCallback((packages) => {
    if (!packages || !Array.isArray(packages)) {
      console.warn('No packages to send to map');
      return;
    }

    // Convertir paquetes a formato de marcadores para el mapa
    const mapMarkers = packages
      .filter(pkg => pkg.route_summary?.geocoding_ready) // Solo paquetes listos para geocoding
      .map(pkg => ({
        id: `package_${pkg.id}`,
        type: 'package',
        title: `📦 ${pkg.tracking_number}`,
        description: [
          `Carrier: ${pkg.carrier}`,
          `Ruta: ${pkg.route_summary?.from} → ${pkg.route_summary?.to}`,
          `Estado: ${pkg.route_summary?.viable ? 'Viable' : 'Revisar'}`,
          `Confianza: ${Math.round((pkg.quality?.address_confidence || 0) * 100)}%`,
          `Números verdes: ${pkg.green_numbers?.length || 0}`,
          `Query destino: ${pkg.destination_query ? 'Sí' : 'No'}`,
          `Sellos detectados: ${pkg.stamps_summary?.total_stamps || 0}`,
          `Sincronizado: ${new Date().toLocaleTimeString()}`
        ].join('\n'),
        coordinates: {
          // Por ahora usamos coordenadas predeterminadas
          // En el futuro podrías usar las coordenadas reales del paquete
          latitude: 20.676109 + (Math.random() - 0.5) * 0.1,
          longitude: -103.347769 + (Math.random() - 0.5) * 0.1
        },
        packageData: pkg,
        style: {
          color: pkg.route_summary?.viable ? '#10b981' : '#f59e0b',
          size: 'medium',
          icon: pkg.green_numbers?.length > 0 ? '💚' : '📦'
        }
      }));

    if (mapMarkers.length > 0) {
      console.log(`Enviando ${mapMarkers.length} marcadores de paquetes al mapa`);
      
      sendMessageToWebView({
        type: 'addPackageMarkers',
        markers: mapMarkers,
        syncInfo: {
          timestamp: new Date().toISOString(),
          totalPackages: packages.length,
          mappedPackages: mapMarkers.length
        }
      });
    }
  }, []);

  // ACTUALIZADO: Función para mostrar notificación de éxito de sincronización
  const showSyncNotification = (type, data) => {
    let message = '';
    
    if (type === 'success') {
      const packagesCount = data.packages?.length || 0;
      const totalPackages = data.totalPackages || 0;
      const viablePackages = data.packages?.filter(pkg => pkg.route_summary?.viable).length || 0;
      
      // Calcular estadísticas de green_numbers y destination_query
      let greenNumbersCount = 0;
      let packagesWithDestinationQuery = 0;
      
      if (data.packages && Array.isArray(data.packages)) {
        data.packages.forEach(pkg => {
          // Contar green_numbers
          if (pkg.green_numbers && Array.isArray(pkg.green_numbers)) {
            greenNumbersCount += pkg.green_numbers.length;
          }
          
          // Contar paquetes con destination_query
          if (pkg.destination_query && pkg.destination_query.trim()) {
            packagesWithDestinationQuery++;
          }
        });
      }
      
      message = `¡Sincronización CartaPorte exitosa!\nPaquetes obtenidos: ${packagesCount} de ${totalPackages}\nRutas viables: ${viablePackages}`;
      
      // Mostrar información de green_numbers
      if (greenNumbersCount > 0) {
        message += `\nNúmeros verdes detectados: ${greenNumbersCount}`;
      }
      
      // Mostrar información de destination_query
      if (packagesWithDestinationQuery > 0) {
        message += `\nPaquetes con queries destino: ${packagesWithDestinationQuery}`;
      }
      
      if (data.lastSync) {
        const syncTime = new Date(data.lastSync).toLocaleTimeString();
        message += `\nÚltima sincronización: ${syncTime}`;
      }

      // Mostrar estadísticas adicionales si están disponibles
      if (data.metadata?.results) {
        const results = data.metadata.results;
        if (results.more_available) {
          message += `\n(${results.total_in_database - results.returned_in_sync} paquetes adicionales disponibles)`;
        }
      }
    }

    console.log('Mostrando notificación de sincronización:', message);
  };

  // ACTUALIZADO: Función para mostrar errores de sincronización
  const showSyncError = (error) => {
    let errorInfo = {
      title: 'Error de Sincronización',
      message: 'No se pudo sincronizar los paquetes.',
      suggestions: ['Verifica tu conexión a internet', 'Intenta nuevamente']
    };

    if (error.message.startsWith('HTTP_ERROR_')) {
      const statusCode = error.message.match(/HTTP_ERROR_(\d+)/)?.[1];
      
      switch (statusCode) {
        case '401':
          errorInfo = {
            title: 'Error de Autenticación',
            message: 'Sesión expirada o credenciales inválidas.',
            suggestions: [
              'Inicia sesión nuevamente',
              'Verifica tu token de acceso',
              'Contacta al administrador'
            ]
          };
          break;
        case '404':
          errorInfo = {
            title: 'Servicio No Disponible',
            message: 'El servicio de sincronización no está disponible.',
            suggestions: [
              'El servidor puede estar en mantenimiento',
              'Contacta al soporte técnico'
            ]
          };
          break;
        case '500':
          errorInfo = {
            title: 'Error del Servidor',
            message: 'Error interno del servidor.',
            suggestions: [
              'Intenta más tarde',
              'El problema es temporal',
              'Reporta el error si persiste'
            ]
          };
          break;
      }
    } else if (error.message === 'SYNC_TIMEOUT') {
      errorInfo = {
        title: 'Tiempo Agotado',
        message: 'La sincronización tardó demasiado.',
        suggestions: [
          'Verifica tu conexión a internet',
          'El servidor puede estar lento',
          'Intenta nuevamente'
        ]
      };
    } else if (error.message.startsWith('SERVER_ERROR:')) {
      errorInfo = {
        title: 'Error del Servidor',
        message: error.message.replace('SERVER_ERROR: ', ''),
        suggestions: [
          'El servidor reportó un error',
          'Intenta más tarde',
          'Contacta al soporte si persiste'
        ]
      };
    } else if (error.message === 'INVALID_RESPONSE') {
      errorInfo = {
        title: 'Respuesta Inválida',
        message: 'El servidor devolvió datos incorrectos.',
        suggestions: [
          'Error en el formato de respuesta',
          'Intenta nuevamente',
          'Reporta este error'
        ]
      };
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
              setSyncStatus('idle');
              syncPackages();
            }, 1000);
          },
          style: 'default'
        },
        {
          text: 'Cancelar',
          style: 'cancel',
          onPress: () => setSyncStatus('idle')
        }
      ]
    );
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

  // Función de envío con logging detallado
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

    // Actualizar log de mensajes
    setMessageLog(prev => [logEntry, ...prev.slice(0, 19)]);
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

    console.log('Iniciando secuencia de ubicación de alta precisión...');

    for (let i = 0; i < maxReadings; i++) {
      try {
        console.log(`Lectura ${i + 1}/${maxReadings}...`);

        const location = await Location.getCurrentPositionAsync(LOCATION_CONFIG);

        const reading = {
          ...location.coords,
          timestamp: location.timestamp,
          readingNumber: i + 1,
          accuracy: location.coords.accuracy || 999
        };

        readings.push(reading);
        console.log(`Lectura ${i + 1}: ±${Math.round(reading.accuracy)}m`);

        if (reading.accuracy <= ACCURACY_THRESHOLDS.excellent && i >= 1) {
          console.log('Precisión excelente obtenida, finalizando temprano');
          break;
        }

        if (i < maxReadings - 1) {
          await new Promise(resolve => setTimeout(resolve, readingInterval));
        }

      } catch (error) {
        console.warn(`Error en lectura ${i + 1}:`, error.message);
      }
    }

    if (readings.length === 0) {
      throw new Error('NO_READINGS_OBTAINED');
    }

    const goodReadings = readings.filter(r => r.accuracy < ACCURACY_THRESHOLDS.poor);
    const readingsToProcess = goodReadings.length > 0 ? goodReadings : readings;

    readingsToProcess.sort((a, b) => a.accuracy - b.accuracy);

    const bestReading = readingsToProcess[0];
    console.log(`Mejor lectura: ±${Math.round(bestReading.accuracy)}m de ${readings.length} intentos`);

    if (goodReadings.length >= 2) {
      const avgLat = goodReadings.reduce((sum, r) => sum + r.latitude, 0) / goodReadings.length;
      const avgLng = goodReadings.reduce((sum, r) => sum + r.longitude, 0) / goodReadings.length;
      const bestAccuracy = Math.min(...goodReadings.map(r => r.accuracy));

      console.log(`Usando promedio de ${goodReadings.length} lecturas buenas`);

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
        location.isAveraged ? `Promedio de ${location.goodReadings}/${location.totalReadings} lecturas` : null,
        `${new Date(location.timestamp).toLocaleTimeString()}`
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

    console.log('Preparando marcador para envío:', {
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
      console.log(`Centrando mapa: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)} (zoom: ${accuracyInfo.zoom})`);
    } else {
      console.warn('Falló el centrado del mapa');
    }

    return messageSent;
  }, [sendMessageToWebView]);

  const handleLocationPress = useCallback(async () => {
    if (isLocating) {
      console.log('Ya se está obteniendo ubicación...');
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
      console.warn('Timeout de ubicación');
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

      console.log('Ubicación obtenida:', {
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
          console.log('Ejecutando callback on_center_location...');
          await on_center_location(location);
          console.log('Callback on_center_location ejecutado');
        } catch (callbackError) {
          console.warn('Error en callback on_center_location:', callbackError);
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
      console.error('Error obteniendo ubicación:', error);

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
      console.log('Marcadores de usuario limpiados');
    } else {
      console.warn('Falló la limpieza de marcadores');
    }
  }, [sendMessageToWebView]);

  const showLocationError = (error) => {
    let errorInfo = {
      title: 'Error de Ubicación',
      message: 'No se pudo obtener tu ubicación.',
      suggestions: ['Verifica tu conexión', 'Intenta nuevamente']
    };

    switch (error.message) {
      case 'LOCATION_SERVICES_DISABLED':
        errorInfo = {
          title: 'GPS Desactivado',
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
          title: 'Permisos Requeridos',
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
          title: 'Sin Señal GPS',
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
          title: 'Tiempo Agotado',
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

    console.log(`${actionName} ejecutado`);
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

    // NUEVO: Incluir información de sincronización en el diagnóstico
    const syncDiagnostic = [
      `\nESTADO DE SINCRONIZACIÓN:`,
      `Paquetes sincronizados: ${syncedPackages.length}`,
      `Total en servidor: ${syncStats.totalPackages}`,
      `Última sincronización: ${syncStats.lastSync ? new Date(syncStats.lastSync).toLocaleTimeString() : 'Nunca'}`,
      `Sincronizaciones realizadas: ${syncStats.syncCount}`
    ].join('\n');

    Alert.alert(
      'Diagnóstico Completo',
      diagnosticInfo + (recentErrors ? `\n\nErrores recientes:\n${recentErrors}` : '') + syncDiagnostic,
      [{ text: 'OK' }]
    );
  }, [mapRef, syncedPackages, syncStats]);

  // NUEVO: Función para mostrar estadísticas de sincronización
  const showSyncStats = useCallback(() => {
    if (syncedPackages.length === 0) {
      Alert.alert('Sin Sincronización', 'No se han sincronizado paquetes aún.\n\nToca el botón de sincronizar para obtener paquetes del servidor CartaPorte.');
      return;
    }

    const viablePackages = syncedPackages.filter(pkg => pkg.route_summary?.viable).length;
    const geocodingReady = syncedPackages.filter(pkg => pkg.route_summary?.geocoding_ready).length;
    const greenNumbersTotal = syncStats.greenNumbersTotal || 0;
    const packagesWithDestinationQuery = syncStats.packagesWithDestinationQuery || 0;
    
    const carrierStats = syncedPackages.reduce((acc, pkg) => {
      acc[pkg.carrier] = (acc[pkg.carrier] || 0) + 1;
      return acc;
    }, {});

    const statsMessage = [
      `ESTADÍSTICAS DE SINCRONIZACIÓN CARTAPORTE:`,
      ``,
      `Paquetes sincronizados: ${syncedPackages.length}`,
      `Total en servidor: ${syncStats.totalPackages}`,
      `Rutas viables: ${viablePackages}`,
      `Listos para geocoding: ${geocodingReady}`,
      `Números verdes detectados: ${greenNumbersTotal}`,
      `Con queries destino: ${packagesWithDestinationQuery}`,
      ``,
      `CARRIERS:`,
      ...Object.entries(carrierStats).map(([carrier, count]) => `• ${carrier}: ${count}`),
      ``,
      `Última sincronización: ${syncStats.lastSync ? new Date(syncStats.lastSync).toLocaleString() : 'Nunca'}`,
      `Sincronizaciones totales: ${syncStats.syncCount}`
    ].join('\n');

    Alert.alert('Estadísticas CartaPorte Sync', statsMessage, [
      { text: 'Cerrar', style: 'cancel' },
      { text: 'Sincronizar Ahora', onPress: syncPackages }
    ]);
  }, [syncedPackages, syncStats, syncPackages]);

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

  // Estilos para el botón de sincronización
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
      checking_permissions: '🔐',
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

  // Iconos para sincronización
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
    // Priorizar mensaje de sincronización si está activa
    if (syncStatus !== 'idle') {
      const syncMessages = {
        preparing: '📋 Preparando sincronización...',
        syncing: '🔄 Sincronizando con el servidor...',
        requesting: '📡 Consultando base de datos CartaPorte...',
        processing: '⚙️ Procesando paquetes recibidos...',
        success: `✅ ¡${syncStats.updatedPackages || 0} paquetes CartaPorte sincronizados!${syncStats.greenNumbersTotal ? ` • ${syncStats.greenNumbersTotal} números verdes` : ''}${syncStats.packagesWithDestinationQuery ? ` • ${syncStats.packagesWithDestinationQuery} con queries destino` : ''}`,
        error: '❌ Error durante la sincronización',
        timeout: '⏰ Tiempo agotado para sincronización'
      };
      
      return syncMessages[syncStatus] || null;
    }

    // Mensajes de ubicación
    const messages = {
      checking_permissions: '🔐 Verificando permisos de ubicación...',
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

        {/* NUEVO: Botón de Estadísticas de Sync */}
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
              Stats ({syncedPackages.length})
            </Text>
          </Animated.View>
        </Animated.View>

        {/* Botón de Diagnóstico */}
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

        {/* Botón de Sincronizar Paquetes CartaPorte */}
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

      {/* Status Bar Mejorada - Información de sincronización y ubicación */}
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

          {/* Información detallada de sincronización exitosa */}
          {syncStatus === 'success' && syncStats.totalPackages > 0 && (
            <View style={styles.locationInfo}>
              <Text style={styles.accuracyText}>
                Total en servidor: {syncStats.totalPackages} paquetes CartaPorte
              </Text>
              <Text style={styles.detailText}>
                Obtenidos: {syncStats.updatedPackages} | Viables: {syncedPackages.filter(pkg => pkg.route_summary?.viable).length}
              </Text>
              {syncStats.greenNumbersTotal > 0 && (
                <Text style={styles.detailText}>
                  Números verdes detectados: {syncStats.greenNumbersTotal}
                </Text>
              )}
              {syncStats.packagesWithDestinationQuery > 0 && (
                <Text style={styles.detailText}>
                  Con queries destino: {syncStats.packagesWithDestinationQuery}
                </Text>
              )}
              <Text style={styles.precisionText}>
                {new Date(syncStats.lastSync).toLocaleTimeString()} - Sincronización CartaPorte completa
              </Text>
            </View>
          )}

          {/* Información detallada de ubicación */}
          {userLocation && locationStatus === 'success' && syncStatus === 'idle' && (
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
                  Promedio de {userLocation.goodReadings} lecturas de alta precisión
                </Text>
              )}

              {!userLocation.isAveraged && userLocation.totalReadings > 1 && (
                <Text style={styles.methodText}>
                  Mejor de {userLocation.totalReadings} lecturas GPS
                </Text>
              )}

              {userLocation.accuracy <= ACCURACY_THRESHOLDS.excellent && (
                <Text style={styles.precisionText}>Precisión excelente!</Text>
              )}
            </View>
          )}

          {/* Información de historial */}
          {locationHistory.length > 0 && locationStatus === 'idle' && syncStatus === 'idle' && (
            <TouchableOpacity style={styles.historyButton}>
              <Text style={styles.historyText}>
                {locationHistory.length} ubicaciones guardadas
              </Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      )}

      {/* Debug Panel Mejorado con información de sync */}
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
          
          {/* Información de sincronización en debug */}
          {(syncStatus !== 'idle' || isSyncing || syncedPackages.length > 0) && (
            <View style={styles.debugSyncInfo}>
              <Text style={styles.debugSyncTitle}>Estado CartaPorte Sync:</Text>
              <Text style={[styles.debugMessage, { color: '#06b6d4' }]}>
                🔄 {syncStatus} {isSyncing ? '(activo)' : '(inactivo)'}
              </Text>
              {syncedPackages.length > 0 && (
                <Text style={[styles.debugMessage, { color: '#10b981' }]}>
                  📦 {syncedPackages.length} paquetes en memoria
                </Text>
              )}
              {syncStats.lastSync && (
                <Text style={[styles.debugMessage, { color: '#f59e0b' }]}>
                  ⏰ Última sync: {new Date(syncStats.lastSync).toLocaleTimeString()}
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