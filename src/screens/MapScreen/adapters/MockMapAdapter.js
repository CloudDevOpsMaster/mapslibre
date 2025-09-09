import { IMapAdapter } from './IMapAdapter';

export class MockMapAdapter extends IMapAdapter {
  constructor() {
    super();
    this.container = null;
    this.config = null;
    this.markers = [];
    this.routes = new Map();
    this.center = { latitude: 20.6597, longitude: -103.3496 };
    this.zoom = 12;
    this.theme = 'light';
    this.eventListeners = new Map();
    this.isInitialized = false;
    this.routeIdCounter = 0;
  }

  /**
   * Initialize the mock map
   */
  async init(container, config) {
    console.log('[MockMapAdapter] Initializing with config:', config);
    
    this.container = container;
    this.config = config;
    this.center = {
      latitude: config.latitude || 20.6597,
      longitude: config.longitude || -103.3496
    };
    this.zoom = config.zoom || 12;
    this.theme = config.theme || 'light';

    // Simulate loading time
    await new Promise(resolve => setTimeout(resolve, 500));

    // Create mock map HTML
    this.container.innerHTML = `
      <div style="
        width: 100%;
        height: 100%;
        background: ${this.theme === 'dark' ? '#1a1a1a' : '#f0f0f0'};
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: Arial, sans-serif;
        position: relative;
        overflow: hidden;
      ">
        <div style="
          text-align: center;
          color: ${this.theme === 'dark' ? '#ffffff' : '#333333'};
        ">
          <div style="font-size: 24px; margin-bottom: 16px;">🗺️</div>
          <div style="font-size: 16px; margin-bottom: 8px;">Mock Map</div>
          <div style="font-size: 12px; opacity: 0.7;">
            Center: ${this.center.latitude.toFixed(4)}, ${this.center.longitude.toFixed(4)}
          </div>
          <div style="font-size: 12px; opacity: 0.7;">
            Zoom: ${this.zoom} | Theme: ${this.theme}
          </div>
          <div id="mock-markers" style="margin-top: 16px;"></div>
          <div id="mock-routes" style="margin-top: 8px;"></div>
        </div>
      </div>
    `;

    this.isInitialized = true;
    
    // Emit ready event
    this._emit('ready', { center: this.center, zoom: this.zoom });
    
    console.log('[MockMapAdapter] Initialization complete');
  }

  /**
   * Set markers on the mock map
   */
  async setMarkers(markers) {
    console.log('[MockMapAdapter] Setting markers:', markers.length);
    
    this.markers = markers;
    
    if (!this.isInitialized) return;

    const markersContainer = this.container?.querySelector('#mock-markers');
    if (markersContainer) {
      markersContainer.innerHTML = `
        <div style="font-size: 12px; opacity: 0.8;">
          Markers: ${markers.length}
        </div>
        <div style="font-size: 10px; margin-top: 4px;">
          ${markers.map(m => `📍 ${m.title || m.id}`).join(' ')}
        </div>
      `;
    }

    // Simulate marker click handlers
    markers.forEach(marker => {
      setTimeout(() => {
        // Randomly simulate some marker clicks for testing
        if (Math.random() < 0.1) {
          this._emit('markerClick', { marker });
        }
      }, Math.random() * 3000);
    });
  }

  /**
   * Fit map view to bounds
   */
  async fitBounds(bounds, options = {}) {
    console.log('[MockMapAdapter] Fitting bounds:', bounds);
    
    // Calculate center from bounds
    const centerLat = (bounds.north + bounds.south) / 2;
    const centerLng = (bounds.east + bounds.west) / 2;
    
    // Estimate zoom based on bounds size
    const latDelta = bounds.north - bounds.south;
    const lngDelta = bounds.east - bounds.west;
    const maxDelta = Math.max(latDelta, lngDelta);
    const estimatedZoom = Math.max(1, Math.min(18, 10 - Math.log2(maxDelta)));

    await this.centerOn(centerLat, centerLng, estimatedZoom);
  }

  /**
   * Center map on coordinates
   */
  async centerOn(latitude, longitude, zoom) {
    console.log('[MockMapAdapter] Centering on:', latitude, longitude, zoom);
    
    this.center = { latitude, longitude };
    if (zoom !== undefined) {
      this.zoom = zoom;
    }

    // Update display
    if (this.isInitialized && this.container) {
      const centerDisplay = this.container.querySelector('div[style*="Center:"]');
      if (centerDisplay) {
        centerDisplay.textContent = `Center: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
      }
      
      const zoomDisplay = this.container.querySelector('div[style*="Zoom:"]');
      if (zoomDisplay) {
        zoomDisplay.textContent = `Zoom: ${this.zoom} | Theme: ${this.theme}`;
      }
    }

    // Simulate animation time
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  /**
   * Add route to the map
   */
  async addRoute(route) {
    const routeId = `route_${++this.routeIdCounter}`;
    console.log('[MockMapAdapter] Adding route:', routeId);
    
    this.routes.set(routeId, route);

    if (this.isInitialized && this.container) {
      const routesContainer = this.container.querySelector('#mock-routes');
      if (routesContainer) {
        routesContainer.innerHTML = `
          <div style="font-size: 12px; opacity: 0.8; margin-top: 8px;">
            Routes: ${this.routes.size}
          </div>
          <div style="font-size: 10px;">
            ${Array.from(this.routes.keys()).map(id => `🛣️ ${id}`).join(' ')}
          </div>
        `;
      }
    }

    return routeId;
  }

  /**
   * Remove route from the map
   */
  async removeRoute(routeId) {
    console.log('[MockMapAdapter] Removing route:', routeId);
    
    const removed = this.routes.delete(routeId);
    
    if (this.isInitialized && this.container) {
      const routesContainer = this.container.querySelector('#mock-routes');
      if (routesContainer && this.routes.size === 0) {
        routesContainer.innerHTML = '';
      } else if (routesContainer) {
        routesContainer.innerHTML = `
          <div style="font-size: 12px; opacity: 0.8; margin-top: 8px;">
            Routes: ${this.routes.size}
          </div>
          <div style="font-size: 10px;">
            ${Array.from(this.routes.keys()).map(id => `🛣️ ${id}`).join(' ')}
          </div>
        `;
      }
    }

    return removed;
  }

  /**
   * Subscribe to events
   */
  on(eventType, callback) {
    console.log('[MockMapAdapter] Subscribing to event:', eventType);
    
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    
    this.eventListeners.get(eventType).push(callback);

    // Return unsubscribe function
    return () => {
      const listeners = this.eventListeners.get(eventType);
      if (listeners) {
        const index = listeners.indexOf(callback);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
    };
  }

  /**
   * Set map theme
   */
  async setTheme(theme) {
    console.log('[MockMapAdapter] Setting theme:', theme);
    
    this.theme = theme;
    
    if (this.isInitialized) {
      // Re-initialize to apply new theme
      await this.init(this.container, { ...this.config, theme });
      await this.setMarkers(this.markers);
    }
  }

  /**
   * Get current center
   */
  async getCenter() {
    return { ...this.center };
  }

  /**
   * Get current zoom
   */
  async getZoom() {
    return this.zoom;
  }

  /**
   * Cleanup
   */
  async destroy() {
    console.log('[MockMapAdapter] Destroying');
    
    this.eventListeners.clear();
    this.markers = [];
    this.routes.clear();
    
    if (this.container) {
      this.container.innerHTML = '';
    }
    
    this.isInitialized = false;
  }

  /**
   * Internal method to emit events
   * @private
   */
  _emit(eventType, data) {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('[MockMapAdapter] Error in event callback:', error);
        }
      });
    }
  }
}
