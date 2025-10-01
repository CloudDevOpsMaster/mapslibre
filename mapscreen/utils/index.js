// ============================================================================
// FILE: mapscreen/utils/index.js
// PURPOSE: Central export point for all map utilities
// ============================================================================

export {
  calculateDistance,
  checkGeofence,
  calculateBearing,
  getBounds
} from './mapCalculations';

export {
  ACCURACY_LEVELS,
  getAccuracyLevel,
  createUserLocationMarker,
  createDestinationMarker,
  createPackageMarker,
  sendMarkerToMap,
  addDestinationMarkerToMap
} from './markerHelpers';

export {
  generateMapHTML
} from './mapHTMLGenerator';

// Default export for backward compatibility
export { generateMapHTML as default } from './mapHTMLGenerator';
