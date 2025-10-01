// ============================================================================
// FILE: mapscreen/utils/mapCalculations.js
// PURPOSE: Pure mathematical and geospatial calculation functions
// ============================================================================

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - First latitude
 * @param {number} lon1 - First longitude
 * @param {number} lat2 - Second latitude
 * @param {number} lon2 - Second longitude
 * @returns {number} Distance in meters
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
};

/**
 * Check if coordinates are within geofence radius
 * @param {Object} currentCoords - Current coordinates {latitude, longitude}
 * @param {Object} targetCoords - Target coordinates {latitude, longitude}
 * @param {number} radius - Radius in meters (default: 100)
 * @returns {Object} {isInside: boolean, distance: number}
 */
export const checkGeofence = (currentCoords, targetCoords, radius = 100) => {
  const distance = calculateDistance(
    currentCoords.latitude,
    currentCoords.longitude,
    targetCoords.latitude,
    targetCoords.longitude
  );

  return {
    isInside: distance <= radius,
    distance: Math.round(distance)
  };
};

/**
 * Calculate bearing between two points
 * @param {number} lat1 - Start latitude
 * @param {number} lon1 - Start longitude
 * @param {number} lat2 - End latitude
 * @param {number} lon2 - End longitude
 * @returns {number} Bearing in degrees (0-360)
 */
export const calculateBearing = (lat1, lon1, lat2, lon2) => {
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);
  const bearing = (θ * 180 / Math.PI + 360) % 360;

  return bearing;
};

/**
 * Get bounds for a set of coordinates
 * @param {Array} coordinates - Array of {latitude, longitude} objects
 * @returns {Object} {minLat, maxLat, minLng, maxLng, center}
 */
export const getBounds = (coordinates) => {
  if (!coordinates || coordinates.length === 0) {
    return null;
  }

  const lats = coordinates.map(c => c.latitude);
  const lngs = coordinates.map(c => c.longitude);

  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  return {
    minLat,
    maxLat,
    minLng,
    maxLng,
    center: {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2
    }
  };
};
