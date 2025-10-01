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

  if (!mapRef?.current) {
    console.warn('⚠️ MapRef no disponible');
    return null;
  }

  const enrichedMessage = {
    type: 'addUserLocationMarker',
    marker: markerData,
    timestamp: new Date().toISOString(),
    source: 'map_helpers',
    messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
  };

  try {
    const messageString = JSON.stringify(enrichedMessage);
    
    if (typeof mapRef.current.postMessage === 'function') {
      mapRef.current.postMessage(messageString);
      console.log(`✅ Marcador de destino '${markerData.id}' enviado`);
      return markerData;
    } else {
      console.error('❌ mapRef.current.postMessage no es una función');
      return null;
    }
  } catch (error) {
    console.error('❌ Error enviando marcador de destino:', error);
    return null;
  }
};

export default {
  addDestinationMarkerToMap
};