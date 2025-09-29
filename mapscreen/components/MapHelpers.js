import { getLocationAccuracyInfo, ACCURACY_THRESHOLDS } from './LocationService';

/**
 * Envía un mensaje enriquecido al WebView del mapa
 * @param {Object} mapRef - Referencia al componente WebView
 * @param {Object} message - Mensaje a enviar
 * @returns {Object} - { success: boolean, logEntry: Object }
 */
export const sendMessageToWebView = (mapRef, message) => {
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
      source: 'map_helpers',
      messageId
    };

    try {
      const messageString = JSON.stringify(enrichedMessage);
      console.log(`📤 Enviando mensaje: ${message.type}`);

      if (typeof mapRef.current.postMessage === 'function') {
        mapRef.current.postMessage(messageString);
        logEntry.success = true;
        console.log(`✅ Mensaje enviado exitosamente`);
      } else {
        logEntry.error = 'postMessage no es una función';
        console.error(`❌ mapRef.current.postMessage no es una función`);
      }

    } catch (error) {
      logEntry.error = error.message;
      console.error(`❌ Error enviando mensaje:`, error);
    }
  } else {
    logEntry.error = 'mapRef no disponible';
    console.warn(`⚠️ MapRef no disponible para enviar mensaje`);
  }

  return { success: logEntry.success, logEntry };
};

/**
 * Agrega un marcador de ubicación del usuario al mapa
 * @param {Object} mapRef - Referencia al WebView
 * @param {Object} location - Datos de ubicación
 * @param {Function} onLocationFound - Callback cuando se encuentra ubicación
 * @param {Function} setLocationHistory - Setter para historial de ubicaciones
 * @returns {Object} - Datos del marcador creado
 */
export const addLocationMarkerToMap = (mapRef, location, onLocationFound, setLocationHistory) => {
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
      zoom: accuracyInfo.zoom,
      // Estilos modernos adicionales
      borderColor: 'rgba(255, 255, 255, 0.8)',
      borderWidth: 2,
      shadowColor: accuracyInfo.color,
      shadowOpacity: 0.4,
      shadowRadius: 8,
      elevation: 6
    }
  };

  console.log('📍 Preparando marcador para envío:', {
    id: markerData.id,
    coordinates: markerData.coordinates,
    accuracy: markerData.accuracy,
    title: markerData.title
  });

  const { success: messageSent } = sendMessageToWebView(mapRef, {
    type: 'addUserLocationMarker',
    marker: markerData
  });

  console.log(`${messageSent ? '✅ ÉXITO' : '❌ FALLO'} - Resultado envío marcador`);

  if (onLocationFound) {
    console.log('🔔 Llamando onLocationFound con datos completos...');

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
      console.log('✅ onLocationFound ejecutado correctamente');
    } catch (error) {
      console.error('❌ Error ejecutando onLocationFound:', error);
    }
  } else {
    console.warn('⚠️ onLocationFound no disponible');
  }

  if (setLocationHistory) {
    setLocationHistory(prev => [
      {
        ...location,
        markerData,
        addedAt: new Date().toISOString(),
        messageSent
      },
      ...prev.slice(0, 9)
    ]);
  }

  console.log('✅ Marcador procesado:', markerData.title);
  return markerData;
};

/**
 * Centra el mapa en una ubicación específica
 * @param {Object} mapRef - Referencia al WebView
 * @param {Object} location - Datos de ubicación
 * @returns {boolean} - true si el mensaje se envió exitosamente
 */
export const centerMapOnLocation = (mapRef, location) => {
  const accuracyInfo = getLocationAccuracyInfo(location.accuracy);

  const { success: messageSent } = sendMessageToWebView(mapRef, {
    type: 'centerOnLocation',
    latitude: location.latitude,
    longitude: location.longitude,
    zoom: accuracyInfo.zoom,
    animate: true,
    duration: 1800,
    easing: 'ease-out'
  });

  if (messageSent) {
    console.log(`🎯 Centrando mapa: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)} (zoom: ${accuracyInfo.zoom})`);
  } else {
    console.warn('⚠️ Falló el centrado del mapa');
  }

  return messageSent;
};

/**
 * Agrega un marcador de destino al mapa con estilo diferenciado
 * @param {Object} mapRef - Referencia al WebView
 * @param {Object} destination - Datos del destino
 * @returns {Object|null} - Datos del marcador o null si falla
 */
export const addDestinationMarkerToMap = (mapRef, destination) => {
  if (!destination?.coordinates || !destination.query) {
    console.warn('⚠️ Datos de destino insuficientes');
    return null;
  }

  const markerData = {
    id: `destination-${Date.now()}-${destination.tracking}`,
    coordinates: {
      latitude: destination.coordinates.latitude,
      longitude: destination.coordinates.longitude
    },
    title: `🎯 Destino: ${destination.tracking}`,
    description: [
      destination.query,
      `Lat: ${destination.coordinates.latitude.toFixed(6)}`,
      `Lng: ${destination.coordinates.longitude.toFixed(6)}`,
      `Sincronizado: ${new Date().toLocaleTimeString()}`
    ].join('\n'),
    timestamp: new Date().toISOString(),
    isDestination: true,
    trackingNumber: destination.tracking,
    style: {
      color: '#f59e0b',
      size: 'large',
      icon: '🎯',
      showAccuracyCircle: false,
      // Estilos modernos para destinos
      borderColor: 'rgba(245, 158, 11, 0.9)',
      borderWidth: 2.5,
      shadowColor: '#f59e0b',
      shadowOpacity: 0.5,
      shadowRadius: 10,
      elevation: 8,
      pulseAnimation: true,
      glowEffect: true
    }
  };

  console.log('🎯 Preparando marcador de destino:', markerData.id);

  const { success: messageSent } = sendMessageToWebView(mapRef, {
    type: 'addUserLocationMarker',
    marker: markerData
  });

  if (messageSent) {
    console.log(`✅ Marcador de destino '${markerData.id}' enviado`);
  } else {
    console.warn(`⚠️ Falló envío del marcador de destino`);
  }

  return messageSent ? markerData : null;
};

/**
 * Envía marcadores de paquetes al mapa
 * @param {Object} mapRef - Referencia al WebView
 * @param {Array} packages - Array de paquetes
 */
export const sendPackagesToMap = (mapRef, packages) => {
  if (!packages || !Array.isArray(packages)) {
    console.warn('⚠️ No packages to send to map');
    return;
  }

  const mapMarkers = packages
    .filter(pkg => pkg.route_summary?.geocoding_ready)
    .map(pkg => {
      const isViable = pkg.route_summary?.viable;
      const hasGreenNumbers = pkg.stamps_summary?.green_numbers?.length > 0;
      const confidence = pkg.quality?.address_confidence || 0;

      // Determinar color basado en múltiples factores
      let markerColor = '#94a3b8'; // gris por defecto
      if (isViable && confidence > 0.8) {
        markerColor = '#10b981'; // verde para viable y alta confianza
      } else if (isViable) {
        markerColor = '#22d3ee'; // cyan para viable
      } else if (confidence > 0.6) {
        markerColor = '#f59e0b'; // ámbar para revisar con confianza media
      } else {
        markerColor = '#ef4444'; // rojo para baja confianza
      }

      return {
        id: `package_${pkg.id}`,
        type: 'package',
        title: `📦 ${pkg.tracking_number}`,
        description: [
          `Carrier: ${pkg.carrier}`,
          `Ruta: ${pkg.route_summary?.from} → ${pkg.route_summary?.to}`,
          `Estado: ${isViable ? 'Viable' : 'Revisar'}`,
          `Confianza: ${Math.round(confidence * 100)}%`,
          `Números verdes: ${pkg.stamps_summary?.green_numbers?.length || 0}`,
          `Query destino: ${pkg.location_details?.destination?.query ? 'Sí' : 'No'}`,
          `Sellos detectados: ${pkg.stamps_summary?.total_stamps || 0}`,
          `Sincronizado: ${new Date().toLocaleTimeString()}`
        ].join('\n'),
        coordinates: {
          latitude: 20.676109 + (Math.random() - 0.5) * 0.1,
          longitude: -103.347769 + (Math.random() - 0.5) * 0.1
        },
        packageData: pkg,
        style: {
          color: markerColor,
          size: confidence > 0.8 ? 'large' : 'medium',
          icon: hasGreenNumbers ? '💚' : '📦',
          // Estilos modernos para paquetes
          borderColor: `${markerColor}cc`,
          borderWidth: 2,
          shadowColor: markerColor,
          shadowOpacity: 0.4,
          shadowRadius: 6,
          elevation: 5,
          opacity: confidence > 0.7 ? 1 : 0.8
        }
      };
    });

  if (mapMarkers.length > 0) {
    console.log(`📦 Enviando ${mapMarkers.length} marcadores de paquetes al mapa`);

    sendMessageToWebView(mapRef, {
      type: 'addPackageMarkers',
      markers: mapMarkers,
      syncInfo: {
        timestamp: new Date().toISOString(),
        totalPackages: packages.length,
        mappedPackages: mapMarkers.length
      }
    });
  }
};

/**
 * Limpia todos los marcadores de usuario del mapa
 * @param {Object} mapRef - Referencia al WebView
 * @param {Function} setLocationHistory - Setter para historial
 * @param {Function} setCurrentMarkerId - Setter para ID del marcador actual
 */
export const clearUserMarkers = (mapRef, setLocationHistory, setCurrentMarkerId) => {
  const { success: messageSent } = sendMessageToWebView(mapRef, {
    type: 'clearUserMarkers'
  });

  if (messageSent) {
    if (setLocationHistory) setLocationHistory([]);
    if (setCurrentMarkerId) setCurrentMarkerId(null);
    console.log('🗑️ Marcadores de usuario limpiados');
  } else {
    console.warn('⚠️ Falló la limpieza de marcadores');
  }
};

/**
 * Actualiza la ubicación del conductor en el mapa
 * @param {Object} mapRef - Referencia al WebView
 * @param {Object} location - Nueva ubicación
 */
export const updateDriverLocation = (mapRef, location) => {
  if (!location) {
    console.warn('⚠️ No se proporcionó ubicación para actualizar');
    return false;
  }

  const { success: messageSent } = sendMessageToWebView(mapRef, {
    type: 'updateDriverLocation',
    location: {
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.accuracy,
      heading: location.heading,
      speed: location.speed,
      timestamp: location.timestamp || new Date().toISOString()
    }
  });

  if (messageSent) {
    console.log(`🚗 Ubicación del conductor actualizada: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`);
  }

  return messageSent;
};

/**
 * Ajusta el zoom del mapa para mostrar todos los paquetes
 * @param {Object} mapRef - Referencia al WebView
 * @param {Array} packages - Array de paquetes
 */
export const fitMapToPackages = (mapRef, packages) => {
  if (!packages || packages.length === 0) {
    console.warn('⚠️ No hay paquetes para ajustar el zoom');
    return false;
  }

  const { success: messageSent } = sendMessageToWebView(mapRef, {
    type: 'fitToPackages',
    packageCount: packages.length,
    animate: true,
    padding: 50
  });

  if (messageSent) {
    console.log(`🗺️ Mapa ajustado para mostrar ${packages.length} paquetes`);
  }

  return messageSent;
};

/**
 * Establece el estilo del mapa
 * @param {Object} mapRef - Referencia al WebView
 * @param {string} style - Estilo del mapa ('default', 'dark', 'satellite', etc.)
 */
export const setMapStyle = (mapRef, style = 'default') => {
  const { success: messageSent } = sendMessageToWebView(mapRef, {
    type: 'setMapStyle',
    style: style
  });

  if (messageSent) {
    console.log(`🎨 Estilo del mapa cambiado a: ${style}`);
  }

  return messageSent;
};

/**
 * Muestra una ruta entre dos puntos en el mapa
 * @param {Object} mapRef - Referencia al WebView
 * @param {Object} origin - Punto de origen
 * @param {Object} destination - Punto de destino
 * @param {Object} options - Opciones adicionales para la ruta
 */
export const showRoute = (mapRef, origin, destination, options = {}) => {
  if (!origin || !destination) {
    console.warn('⚠️ Se requieren origen y destino para mostrar la ruta');
    return false;
  }

  const { success: messageSent } = sendMessageToWebView(mapRef, {
    type: 'showRoute',
    origin: {
      latitude: origin.latitude,
      longitude: origin.longitude
    },
    destination: {
      latitude: destination.latitude,
      longitude: destination.longitude
    },
    options: {
      color: options.color || '#3b82f6',
      width: options.width || 4,
      animate: options.animate !== false,
      fitBounds: options.fitBounds !== false,
      ...options
    }
  });

  if (messageSent) {
    console.log(`🛣️ Ruta mostrada desde [${origin.latitude}, ${origin.longitude}] hasta [${destination.latitude}, ${destination.longitude}]`);
  }

  return messageSent;
};

/**
 * Limpia todas las rutas del mapa
 * @param {Object} mapRef - Referencia al WebView
 */
export const clearRoutes = (mapRef) => {
  const { success: messageSent } = sendMessageToWebView(mapRef, {
    type: 'clearRoutes'
  });

  if (messageSent) {
    console.log('🗑️ Rutas limpiadas del mapa');
  }

  return messageSent;
};

/**
 * Agrega un círculo de geofence alrededor de un punto
 * @param {Object} mapRef - Referencia al WebView
 * @param {Object} center - Centro del círculo
 * @param {number} radius - Radio en metros
 * @param {Object} style - Estilos del círculo
 */
export const addGeofenceCircle = (mapRef, center, radius = 100, style = {}) => {
  const { success: messageSent } = sendMessageToWebView(mapRef, {
    type: 'addGeofenceCircle',
    center: {
      latitude: center.latitude,
      longitude: center.longitude
    },
    radius: radius,
    style: {
      fillColor: style.fillColor || 'rgba(59, 130, 246, 0.2)',
      strokeColor: style.strokeColor || '#3b82f6',
      strokeWidth: style.strokeWidth || 2,
      ...style
    }
  });

  if (messageSent) {
    console.log(`⭕ Círculo de geofence agregado: radio ${radius}m`);
  }

  return messageSent;
};

// Exportar todas las funciones como default también
export default {
  sendMessageToWebView,
  addLocationMarkerToMap,
  centerMapOnLocation,
  addDestinationMarkerToMap,
  sendPackagesToMap,
  clearUserMarkers,
  updateDriverLocation,
  fitMapToPackages,
  setMapStyle,
  showRoute,
  clearRoutes,
  addGeofenceCircle
};