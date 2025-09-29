import { getLocationAccuracyInfo, ACCURACY_THRESHOLDS } from './LocationService';

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

  return { success: logEntry.success, logEntry };
};

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
      zoom: accuracyInfo.zoom
    }
  };

  console.log('Preparando marcador para envío:', {
    id: markerData.id,
    coordinates: markerData.coordinates,
    accuracy: markerData.accuracy,
    title: markerData.title
  });

  const { success: messageSent } = sendMessageToWebView(mapRef, {
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
};

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
    console.log(`Centrando mapa: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)} (zoom: ${accuracyInfo.zoom})`);
  } else {
    console.warn('Falló el centrado del mapa');
  }

  return messageSent;
};

export const sendPackagesToMap = (mapRef, packages) => {
  if (!packages || !Array.isArray(packages)) {
    console.warn('No packages to send to map');
    return;
  }

  const mapMarkers = packages
    .filter(pkg => pkg.route_summary?.geocoding_ready)
    .map(pkg => ({
      id: `package_${pkg.id}`,
      type: 'package',
      title: `📦 ${pkg.tracking_number}`,
      description: [
        `Carrier: ${pkg.carrier}`,
        `Ruta: ${pkg.route_summary?.from} → ${pkg.route_summary?.to}`,
        `Estado: ${pkg.route_summary?.viable ? 'Viable' : 'Revisar'}`,
        `Confianza: ${Math.round((pkg.quality?.address_confidence || 0) * 100)}%`,
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
        color: pkg.route_summary?.viable ? '#10b981' : '#f59e0b',
        size: 'medium',
        icon: pkg.stamps_summary?.green_numbers?.length > 0 ? '💚' : '📦'
      }
    }));

  if (mapMarkers.length > 0) {
    console.log(`Enviando ${mapMarkers.length} marcadores de paquetes al mapa`);
    
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

export const clearUserMarkers = (mapRef, setLocationHistory, setCurrentMarkerId) => {
  const { success: messageSent } = sendMessageToWebView(mapRef, {
    type: 'clearUserMarkers'
  });

  if (messageSent) {
    setLocationHistory([]);
    setCurrentMarkerId(null);
    console.log('Marcadores de usuario limpiados');
  } else {
    console.warn('Falló la limpieza de marcadores');
  }
};