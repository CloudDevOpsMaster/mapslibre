// hooks/useMapControls.js - Fixed version with improved message queue handling

import { useCallback } from 'react';

const useMapControls = (sendMessageToWebView, isMapReady) => {
  const updateDriverLocation = useCallback((location) => {
    if (!location) {
      console.warn('⚠️ No se puede enviar updateDriverLocation - ubicación no válida');
      return false;
    }
    
    // Verificar condiciones antes de enviar
    if (!sendMessageToWebView) {
      console.warn('⚠️ No se puede enviar updateDriverLocation - sendMessageToWebView no disponible');
      return false;
    }
    
    const message = {
      type: 'updateDriverLocation',
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.accuracy,
      timestamp: location.timestamp || new Date().toISOString(),
      heading: location.heading,
      speed: location.speed
    };
    
    console.log('🚚 Enviando actualización de ubicación del conductor');
    console.log('📍 Datos:', {
      lat: location.latitude.toFixed(6),
      lng: location.longitude.toFixed(6),
      accuracy: location.accuracy ? `±${Math.round(location.accuracy)}m` : 'N/A',
      mapReady: isMapReady
    });
    
    const result = sendMessageToWebView(message);
    
    if (!result) {
      console.log('⏳ Mensaje agregado a cola - será enviado cuando el mapa esté listo');
    } else {
      console.log('✅ Mensaje enviado inmediatamente');
    }
    
    return result;
  }, [sendMessageToWebView, isMapReady]);

  const centerOnLocation = useCallback((location) => {
    if (!location) {
      console.warn('⚠️ No se puede centrar: ubicación no válida');
      return false;
    }
    
    if (!sendMessageToWebView) {
      console.warn('⚠️ No se puede centrar - sendMessageToWebView no disponible');
      return false;
    }
    
    // Determinar zoom basado en precisión si está disponible
    let zoom = 15; // zoom por defecto
    if (location.accuracy) {
      if (location.accuracy <= 10) zoom = 18;
      else if (location.accuracy <= 25) zoom = 17;
      else if (location.accuracy <= 50) zoom = 16;
      else if (location.accuracy <= 100) zoom = 15;
      else zoom = 14;
    }
    
    const message = {
      type: 'centerOnLocation',
      latitude: location.latitude,
      longitude: location.longitude,
      zoom: zoom,
      animate: true,
      duration: 1800,
      easing: 'ease-out'
    };
    
    console.log('🎯 Enviando comando de centrado:', `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`);
    console.log('🔍 Zoom calculado:', zoom, `(precisión: ±${Math.round(location.accuracy || 0)}m)`);
    
    const result = sendMessageToWebView(message);
    
    if (!result) {
      console.log('⏳ Comando de centrado agregado a cola');
    } else {
      console.log('✅ Mapa centrado exitosamente');
    }
    
    return result;
  }, [sendMessageToWebView]);

  const fitToPackages = useCallback((packages = null) => {
    if (!sendMessageToWebView) {
      console.warn('⚠️ No se puede ajustar vista - sendMessageToWebView no disponible');
      return false;
    }
    
    const message = {
      type: 'fitToPackages',
      packages: packages,
      padding: 50
    };
    
    console.log('📦 Enviando comando para ajustar vista a paquetes');
    const result = sendMessageToWebView(message);
    
    if (!result) {
      console.log('⏳ Comando de ajuste agregado a cola');
    } else {
      console.log('✅ Vista ajustada a paquetes');
    }
    
    return result;
  }, [sendMessageToWebView]);

  const loadPackagesOnMap = useCallback((packages, currentLocation = null) => {
    if (!packages || packages.length === 0) {
      console.log('📦 No hay paquetes para cargar en el mapa');
      return false;
    }
    
    if (!sendMessageToWebView) {
      console.warn('⚠️ No se pueden cargar paquetes - sendMessageToWebView no disponible');
      return false;
    }
    
    const message = {
      type: 'loadPackages',
      packages: packages,
      driverLocation: currentLocation
    };
    
    console.log(`📦 Enviando ${packages.length} paquetes al mapa`);
    const result = sendMessageToWebView(message);
    
    if (!result) {
      console.log('⏳ Paquetes agregados a cola de carga');
    } else {
      console.log('✅ Paquetes cargados en el mapa');
    }
    
    return result;
  }, [sendMessageToWebView]);

  const addUserLocationMarker = useCallback((markerData) => {
    if (!markerData) {
      console.warn('⚠️ No se puede agregar marcador: datos no válidos');
      return false;
    }
    
    if (!sendMessageToWebView) {
      console.warn('⚠️ No se puede agregar marcador - sendMessageToWebView no disponible');
      return false;
    }
    
    const message = {
      type: 'addUserLocationMarker',
      marker: markerData
    };
    
    console.log('📍 Enviando marcador de ubicación de usuario');
    console.log('🎯 Datos del marcador:', {
      id: markerData.id,
      lat: markerData.coordinates?.latitude?.toFixed(6),
      lng: markerData.coordinates?.longitude?.toFixed(6),
      accuracy: markerData.accuracy ? `±${Math.round(markerData.accuracy)}m` : 'N/A'
    });
    
    const result = sendMessageToWebView(message);
    
    if (!result) {
      console.log('⏳ Marcador agregado a cola');
    } else {
      console.log('✅ Marcador enviado al mapa');
    }
    
    return result;
  }, [sendMessageToWebView]);

  const clearUserMarkers = useCallback(() => {
    if (!sendMessageToWebView) {
      console.warn('⚠️ No se pueden limpiar marcadores - sendMessageToWebView no disponible');
      return false;
    }
    
    const message = {
      type: 'clearUserMarkers'
    };
    
    console.log('🧹 Enviando comando para limpiar marcadores de usuario');
    const result = sendMessageToWebView(message);
    
    if (!result) {
      console.log('⏳ Comando de limpieza agregado a cola');
    } else {
      console.log('✅ Comando de limpieza enviado');
    }
    
    return result;
  }, [sendMessageToWebView]);

  // Función de diagnóstico para debugging
  const getControlsStatus = useCallback(() => {
    return {
      isMapReady,
      hasSendFunction: !!sendMessageToWebView,
      canSendMessages: isMapReady && !!sendMessageToWebView,
      timestamp: new Date().toISOString()
    };
  }, [isMapReady, sendMessageToWebView]);

  const logControlsStatus = useCallback(() => {
    const status = getControlsStatus();
    console.log('🔧 Estado de controles del mapa:', status);
    return status;
  }, [getControlsStatus]);

  const updateUserLocation = useCallback((markerData) => {
    if (!markerData) {
      console.warn('⚠️ No se puede actualizar marcador: datos no válidos');
      return false;
    }
    
    if (!sendMessageToWebView) {
      console.warn('⚠️ No se puede actualizar marcador - sendMessageToWebView no disponible');
      return false;
    }
    
    const message = {
      type: 'updateUserLocation', // Usamos el nuevo tipo de mensaje
      marker: markerData
    };
    
    console.log('📍 Enviando actualización de marcador de usuario');
    const result = sendMessageToWebView(message);
    
    if (!result) {
      console.log('⏳ Marcador agregado a cola de actualización');
    } else {
      console.log('✅ Comando de actualización enviado');
    }
    
    return result;
  }, [sendMessageToWebView]);
  
  return {
    updateDriverLocation,
    centerOnLocation,
    fitToPackages,
    loadPackagesOnMap,
    addUserLocationMarker,
    clearUserMarkers,
    updateUserLocation,
    // Funciones de utilidad y diagnóstico
    isMapReady,
    canSendMessages: isMapReady && !!sendMessageToWebView,
    getControlsStatus,
    logControlsStatus
  };
};

export default useMapControls;