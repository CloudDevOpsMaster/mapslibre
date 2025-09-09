// src/screens/MapScreen/adapters/IMapAdapter.js
/**
 * Interface definition for map adapters
 * All map implementations must follow this contract
 */

/**
 * @typedef {Object} MapConfig
 * @property {number} latitude - Initial latitude
 * @property {number} longitude - Initial longitude
 * @property {number} zoom - Initial zoom level
 * @property {string} theme - Map theme ('light' | 'dark')
 * @property {Object} [customConfig] - Provider-specific configuration
 */

/**
 * @typedef {Object} MapMarker
 * @property {string} id - Unique identifier
 * @property {number} latitude - Marker latitude
 * @property {number} longitude - Marker longitude
 * @property {string} [title] - Marker title
 * @property {string} [description] - Marker description
 * @property {string} [icon] - Icon type or URL
 * @property {Object} [data] - Additional marker data
 */

/**
 * @typedef {Object} MapBounds
 * @property {number} north - North boundary
 * @property {number} south - South boundary
 * @property {number} east - East boundary
 * @property {number} west - West boundary
 */

/**
 * @typedef {Object} MapRoute
 * @property {Array<{lat: number, lng: number}>} coordinates - Route points
 * @property {string} [color] - Route line color
 * @property {number} [width] - Route line width
 * @property {Object} [metadata] - Route metadata (distance, duration, etc.)
 */

/**
 * Base Map Adapter Interface
 * Every map provider adapter must implement these methods
 */
export class IMapAdapter {
  /**
   * Initialize the map adapter
   * @param {HTMLElement} container - Container element for the map
   * @param {MapConfig} config - Map configuration
   * @returns {Promise<void>}
   */
  async init(container, config) {
    throw new Error('Method "init" must be implemented');
  }

  /**
   * Set markers on the map
   * @param {Array<MapMarker>} markers - Array of markers to display
   * @returns {Promise<void>}
   */
  async setMarkers(markers) {
    throw new Error('Method "setMarkers" must be implemented');
  }

  /**
   * Fit map view to given bounds
   * @param {MapBounds} bounds - Bounds to fit
   * @param {Object} [options] - Fitting options (padding, animation, etc.)
   * @returns {Promise<void>}
   */
  async fitBounds(bounds, options = {}) {
    throw new Error('Method "fitBounds" must be implemented');
  }

  /**
   * Center map on specific coordinates
   * @param {number} latitude - Latitude to center on
   * @param {number} longitude - Longitude to center on
   * @param {number} [zoom] - Optional zoom level
   * @returns {Promise<void>}
   */
  async centerOn(latitude, longitude, zoom) {
    throw new Error('Method "centerOn" must be implemented');
  }

  /**
   * Add a route to the map
   * @param {MapRoute} route - Route to display
   * @returns {Promise<string>} Route ID
   */
  async addRoute(route) {
    throw new Error('Method "addRoute" must be implemented');
  }

  /**
   * Remove a route from the map
   * @param {string} routeId - Route ID to remove
   * @returns {Promise<void>}
   */
  async removeRoute(routeId) {
    throw new Error('Method "removeRoute" must be implemented');
  }

  /**
   * Subscribe to map events
   * @param {string} eventType - Event type ('markerClick', 'mapClick', 'ready', 'error')
   * @param {Function} callback - Event callback
   * @returns {Function} Unsubscribe function
   */
  on(eventType, callback) {
    throw new Error('Method "on" must be implemented');
  }

  /**
   * Update map theme
   * @param {string} theme - New theme ('light' | 'dark')
   * @returns {Promise<void>}
   */
  async setTheme(theme) {
    throw new Error('Method "setTheme" must be implemented');
  }

  /**
   * Get current map center
   * @returns {Promise<{latitude: number, longitude: number}>}
   */
  async getCenter() {
    throw new Error('Method "getCenter" must be implemented');
  }

  /**
   * Get current zoom level
   * @returns {Promise<number>}
   */
  async getZoom() {
    throw new Error('Method "getZoom" must be implemented');
  }

  /**
   * Cleanup and destroy the map instance
   * @returns {Promise<void>}
   */
  async destroy() {
    throw new Error('Method "destroy" must be implemented');
  }
}