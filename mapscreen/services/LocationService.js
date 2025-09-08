import * as Location from 'expo-location';

class LocationService {
  constructor(config = {}) {
    this.config = {
      accuracy: Location.Accuracy.Balanced,
      updateInterval: 10000,
      distanceFilter: 5,
      enableBackground: false,
      ...config
    };
    this.subscription = null;
  }

  async requestPermissions() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status;
  }

  async getCurrentLocation() {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: this.config.accuracy,
        maximumAge: 30000,
        timeout: 15000
      });
      
      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        timestamp: location.timestamp,
      };
    } catch (error) {
      console.error('Error getting current location:', error);
      throw error;
    }
  }

  watchPosition(callback) {
    this.subscription = Location.watchPositionAsync(
      {
        accuracy: this.config.accuracy,
        timeInterval: this.config.updateInterval,
        distanceInterval: this.config.distanceFilter,
      },
      callback
    );
    return this.subscription;
  }

  stopWatching() {
    if (this.subscription) {
      this.subscription.remove();
      this.subscription = null;
    }
  }

  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
  }
}

export default LocationService;