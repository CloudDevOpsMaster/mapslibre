import { useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { Alert, Platform, Linking } from 'react-native';

const useLocationTracking = (config = {}) => {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState('unknown');
  const locationSubscription = useRef(null);

  const defaultConfig = {
    accuracy: Location.Accuracy.Balanced,
    updateInterval: 10000,
    distanceFilter: 5,
    enableBackground: false,
    ...config
  };

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setPermissionStatus(status);

      if (status !== 'granted') {
        if (Platform.OS === 'ios') {
          Alert.alert(
            'Permisos de Ubicación Requeridos',
            'Para mostrar tu ubicación en el mapa y calcular rutas, necesitamos acceso a tu ubicación. Puedes habilitarlo en Configuración > Privacidad > Servicios de Ubicación.',
            [
              { 
                text: 'Configuración', 
                onPress: () => Linking.openURL('app-settings:')
              },
              { text: 'Continuar sin GPS', style: 'cancel' }
            ]
          );
        }
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error requesting location permission:', error);
      return false;
    }
  };

  const getCurrentLocation = async () => {
    try {
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) return null;

      const location = await Location.getCurrentPositionAsync({
        accuracy: defaultConfig.accuracy,
        maximumAge: 30000,
        timeout: 15000
      });

      const coords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        timestamp: location.timestamp,
      };

      setCurrentLocation(coords);
      return coords;
    } catch (error) {
      console.error('Error getting current location:', error);
      return null;
    }
  };

  const startLocationTracking = async (onLocationUpdate) => {
    try {
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) return;

      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }

      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: defaultConfig.accuracy,
          timeInterval: defaultConfig.updateInterval,
          distanceInterval: defaultConfig.distanceFilter,
        },
        (location) => {
          const coords = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy,
            timestamp: location.timestamp,
          };
          
          setCurrentLocation(coords);
          onLocationUpdate && onLocationUpdate(coords);
        }
      );

      setIsTracking(true);
    } catch (error) {
      console.error('Error starting location tracking:', error);
    }
  };

  const stopLocationTracking = () => {
    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
    }
    setIsTracking(false);
  };

  useEffect(() => {
    return () => {
      stopLocationTracking();
    };
  }, []);

  return {
    currentLocation,
    isTracking,
    permissionStatus,
    getCurrentLocation,
    startLocationTracking,
    stopLocationTracking,
    requestLocationPermission
  };
};

export default useLocationTracking;