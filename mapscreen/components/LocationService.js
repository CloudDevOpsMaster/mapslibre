import { Alert, Platform, Vibration } from 'react-native';
import * as Location from 'expo-location';

export const LOCATION_CONFIG = {
  accuracy: Location.Accuracy.BestForNavigation,
  maximumAge: 5000,
  timeout: 25000,
  distanceInterval: 0,
  timeInterval: 1000,
  enableHighAccuracy: true,
  mayShowUserSettingsDialog: true
};

export const ACCURACY_THRESHOLDS = {
  excellent: 5,
  high: 15,
  good: 50,
  fair: 100,
  poor: 200
};

export class LocationService {
  constructor() {
    this.locationPermission = null;
    this.locationHistory = [];
  }

  async checkLocationPermissions() {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      this.locationPermission = status;

      if (status !== 'granted') {
        console.log('Permisos de ubicación no concedidos:', status);
      }
      return status;
    } catch (error) {
      console.error('Error verificando permisos:', error);
      return null;
    }
  }

  async requestLocationPermissions() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      this.locationPermission = status;

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
  }

  getLocationAccuracyLevel(accuracy) {
    if (accuracy <= ACCURACY_THRESHOLDS.excellent) return 'excellent';
    if (accuracy <= ACCURACY_THRESHOLDS.high) return 'high';
    if (accuracy <= ACCURACY_THRESHOLDS.good) return 'good';
    if (accuracy <= ACCURACY_THRESHOLDS.fair) return 'fair';
    return 'poor';
  }

  getLocationAccuracyInfo(accuracy) {
    const level = this.getLocationAccuracyLevel(accuracy);

    const info = {
      excellent: { icon: '🎯', color: '#10b981', description: 'Excelente', zoom: 19 },
      high: { icon: '📍', color: '#059669', description: 'Muy buena', zoom: 18 },
      good: { icon: '📌', color: '#3b82f6', description: 'Buena', zoom: 16 },
      fair: { icon: '📡', color: '#f59e0b', description: 'Regular', zoom: 14 },
      poor: { icon: '📍', color: '#ef4444', description: 'Baja', zoom: 12 }
    };

    return info[level];
  }

  async getCurrentLocationWithHighPrecision() {
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
  }

  createLocationMarker(location) {
    const accuracyInfo = this.getLocationAccuracyInfo(location.accuracy);

    return {
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
  }

  showLocationError(error) {
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

    return new Promise((resolve) => {
      Alert.alert(
        errorInfo.title,
        fullMessage,
        [
          {
            text: 'Reintentar',
            onPress: () => resolve('retry'),
            style: 'default'
          },
          {
            text: 'Cancelar',
            style: 'cancel',
            onPress: () => resolve('cancel')
          }
        ]
      );
    });
  }
}