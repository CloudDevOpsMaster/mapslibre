// ============================================================================
// FILE: mapscreen/utils/markerHelpers.js
// PURPOSE: Marker creation and manipulation utilities
// ============================================================================

/**
 * Accuracy levels configuration for location markers
 */
export const ACCURACY_LEVELS = {
  excellent: { threshold: 5, label: 'Excelente', icon: '🎯', color: '#10b981' },
  high: { threshold: 15, label: 'Muy buena', icon: '📍', color: '#059669' },
  good: { threshold: 50, label: 'Buena', icon: '📌', color: '#3b82f6' },
  fair: { threshold: 100, label: 'Regular', icon: '📡', color: '#f59e0b' },
  poor: { threshold: Infinity, label: 'Baja', icon: '📍', color: '#ef4444' }
};

/**
 * Get accuracy level based on accuracy value
 * @param {number} accuracy - Accuracy in meters
 * @returns {string} Accuracy level key
 */
export const getAccuracyLevel = (accuracy) => {
  for (const [level, config] of Object.entries(ACCURACY_LEVELS)) {
    if (accuracy <= config.threshold) {
      return level;
    }
  }
  return 'poor';
};

/**
 * Create user location marker data
 * @param {Object} location - Location data {latitude, longitude, accuracy, timestamp}
 * @param {Object} options - Additional options {title, description, id}
 * @returns {Object} Marker data ready for map
 */
export const createUserLocationMarker = (location, options = {}) => {
  const { latitude, longitude, accuracy = 999, timestamp } = location;
  const { title, description, id } = options;

  const accuracyLevel = getAccuracyLevel(accuracy);
  const accuracyConfig = ACCURACY_LEVELS[accuracyLevel];

  const markerId = id || `user-location-${Date.now()}`;

  return {
    id: markerId,
    coordinates: { latitude, longitude },
    accuracy,
    timestamp: timestamp || new Date().toISOString(),
    title: title || 'Mi Ubicación Actual',
    description: description || [
      `Precisión: ±${Math.round(accuracy)}m`,
      `Nivel: ${accuracyConfig.label}`,
      `Hora: ${new Date().toLocaleTimeString()}`
    ].join('\n'),
    isUserLocation: true,
    accuracyLevel,
    style: {
      icon: accuracyConfig.icon,
      color: accuracyConfig.color,
      size: 'medium',
      showAccuracyCircle: true,
      accuracyRadius: accuracy
    }
  };
};

/**
 * Create destination marker data
 * @param {Object} destination - Destination data
 * @returns {Object} Marker data ready for map
 */
export const createDestinationMarker = (destination) => {
  if (!destination?.coordinates || !destination.query) {
    console.warn('⚠️ Datos de destino insuficientes');
    return null;
  }

  return {
    id: `destination-${Date.now()}-${destination.tracking || 'unknown'}`,
    coordinates: {
      latitude: destination.coordinates.latitude,
      longitude: destination.coordinates.longitude
    },
    title: `🎯 Destino: ${destination.tracking || 'Sin seguimiento'}`,
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
};

/**
 * Create package marker data
 * @param {Object} packageData - Package information
 * @returns {Object} Marker data ready for map
 */
export const createPackageMarker = (packageData) => {
  if (!packageData?.latitude || !packageData?.longitude) {
    console.warn('⚠️ Coordenadas de paquete inválidas');
    return null;
  }

  const statusIcons = {
    OUT_FOR_DELIVERY: '🚚',
    IN_TRANSIT: '📦',
    PENDING_PICKUP: '⏳',
    DELIVERED: '✅',
    FAILED: '❌'
  };

  const statusColors = {
    OUT_FOR_DELIVERY: '#3b82f6',
    IN_TRANSIT: '#f59e0b',
    PENDING_PICKUP: '#6b7280',
    DELIVERED: '#10b981',
    FAILED: '#ef4444'
  };

  const status = packageData.status || 'PENDING_PICKUP';
  const priority = packageData.priority || 'medium';

  return {
    id: `package-${packageData.id || Date.now()}`,
    coordinates: {
      latitude: packageData.latitude,
      longitude: packageData.longitude
    },
    title: `📦 ${packageData.trackingNumber || 'Paquete'}`,
    description: [
      `Estado: ${status.replace(/_/g, ' ')}`,
      `Prioridad: ${priority.toUpperCase()}`,
      packageData.address || '',
      packageData.estimatedDelivery ? 
        `Entrega: ${new Date(packageData.estimatedDelivery).toLocaleString()}` : ''
    ].filter(Boolean).join('\n'),
    timestamp: new Date().toISOString(),
    isPackage: true,
    trackingNumber: packageData.trackingNumber,
    status,
    priority,
    style: {
      icon: statusIcons[status] || '📦',
      color: statusColors[status] || '#6b7280',
      size: priority === 'high' ? 'large' : 'medium',
      showAccuracyCircle: false
    }
  };
};

/**
 * Send marker to WebView map
 * @param {Object} mapRef - WebView reference
 * @param {Object} markerData - Marker data
 * @returns {boolean} Success status
 */
export const sendMarkerToMap = (mapRef, markerData) => {
  if (!mapRef?.current) {
    console.warn('⚠️ MapRef no disponible');
    return false;
  }

  const enrichedMessage = {
    type: 'addUserLocationMarker',
    marker: markerData,
    timestamp: new Date().toISOString(),
    source: 'marker_helpers',
    messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
  };

  try {
    const messageString = JSON.stringify(enrichedMessage);

    if (typeof mapRef.current.postMessage === 'function') {
      mapRef.current.postMessage(messageString);
      console.log(`✅ Marcador '${markerData.id}' enviado al mapa`);
      return true;
    } else {
      console.error('❌ mapRef.current.postMessage no es una función');
      return false;
    }
  } catch (error) {
    console.error('❌ Error enviando marcador:', error);
    return false;
  }
};

/**
 * Add destination marker to map (backward compatibility)
 * @param {Object} mapRef - WebView reference
 * @param {Object} destination - Destination data
 * @returns {Object|null} Marker data or null
 */
export const addDestinationMarkerToMap = (mapRef, destination) => {
  const markerData = createDestinationMarker(destination);
  
  if (!markerData) {
    return null;
  }

  const success = sendMarkerToMap(mapRef, markerData);
  return success ? markerData : null;
};
