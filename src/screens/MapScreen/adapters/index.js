// src/screens/MapScreen/adapters/index.js
/**
 * Adapter factory and exports
 */
export { IMapAdapter } from './IMapAdapter';
export { MockMapAdapter } from './MockMapAdapter';

/**
 * Create a map adapter instance
 * @param {string} type - Adapter type ('mock', 'maplibre', 'google')
 * @param {Object} config - Adapter configuration
 * @returns {IMapAdapter} Map adapter instance
 */
export function createMapAdapter(type = 'mock', config = {}) {
  switch (type.toLowerCase()) {
    case 'mock':
      return new MockMapAdapter();
    
    // Future adapters will be added here
    // case 'maplibre':
    //   return new MapLibreAdapter(config);
    // case 'google':
    //   return new GoogleMapAdapter(config);
    
    default:
      console.warn(`Unknown adapter type: ${type}, falling back to mock`);
      return new MockMapAdapter();
  }
}