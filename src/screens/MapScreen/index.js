// src/screens/MapScreen/index.js
import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { createMapAdapter } from './adapters';

/**
 * MapScreen Facade Component
 * 
 * Implements Facade Pattern to provide a simple, unified interface for map functionality.
 * Hides complexity of WebView communication and adapter management.
 * 
 * @param {Object} props - Component properties
 * @param {string} [props.provider='mock'] - Map provider ('mock', 'maplibre', 'google')
 * @param {Object} [props.config] - Initial map configuration
 * @param {number} [props.config.latitude=20.6597] - Initial latitude (Tonalá, Jalisco)
 * @param {number} [props.config.longitude=-103.3496] - Initial longitude
 * @param {number} [props.config.zoom=12] - Initial zoom level
 * @param {string} [props.config.theme='light'] - Map theme ('light'|'dark')
 * @param {Array} [props.markers=[]] - Initial markers
 * @param {Object} [props.routes={}] - Initial routes
 * @param {Function} [props.onMarkerClick] - Marker click handler
 * @param {Function} [props.onMapClick] - Map click handler
 * @param {Function} [props.onReady] - Map ready handler
 * @param {Function} [props.onError] - Error handler
 * @param {Object} [props.style] - Container style
 * @param {boolean} [props.showsUserLocation=false] - Show user location
 * @param {boolean} [props.followsUserLocation=false] - Follow user location
 */
const MapScreen = forwardRef(({
  provider = 'mock',
  config = {},
  markers = [],
  routes = {},
  onMarkerClick,
  onMapClick, 
  onReady,
  onError,
  style,
  showsUserLocation = false,
  followsUserLocation = false,
  ...props
}, ref) => {
  // Refs
  const webViewRef = useRef(null);
  const adapterRef = useRef(null);
  const eventUnsubscribersRef = useRef([]);
  
  // State
  const [isMapReady, setIsMapReady] = useState(false);
  const [mapError, setMapError] = useState(null);

  // Default config with Tonalá, Jalisco coordinates
  const defaultConfig = {
    latitude: 20.6597,
    longitude: -103.3496,
    zoom: 12,
    theme: 'light',
    ...config
  };

  /**
   * Generate HTML for WebView with embedded map adapter
   */
  const generateMapHTML = useCallback(() => {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Map</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            overflow: hidden;
            background: ${defaultConfig.theme === 'dark' ? '#1a1a1a' : '#f5f5f5'};
        }
        #map {
            width: 100vw;
            height: 100vh;
        }
        .error-container {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            font-family: Arial, sans-serif;
            color: #666;
            text-align: center;
        }
    </style>
</head>
<body>
    <div id="map"></div>
    
    <script>
        // Import adapter code (this would be bundled in real implementation)
        ${getAdapterCode()}
        
        let mapAdapter;
        let isInitialized = false;
        
        // Initialize map when page loads
        async function initializeMap() {
            try {
                console.log('[MapScreen] Initializing with provider:', '${provider}');
                
                const container = document.getElementById('map');
                mapAdapter = createMapAdapter('${provider}', ${JSON.stringify(defaultConfig)});
                
                // Set up event listeners
                mapAdapter.on('ready', (data) => {
                    console.log('[MapScreen] Map ready');
                    isInitialized = true;
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'ready',
                        data
                    }));
                });
                
                mapAdapter.on('markerClick', (data) => {
                    console.log('[MapScreen] Marker clicked:', data);
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'markerClick',
                        data
                    }));
                });
                
                mapAdapter.on('mapClick', (data) => {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'mapClick',
                        data
                    }));
                });
                
                mapAdapter.on('error', (data) => {
                    console.error('[MapScreen] Map error:', data);
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'error',
                        data
                    }));
                });
                
                // Initialize map
                await mapAdapter.init(container, ${JSON.stringify(defaultConfig)});
                
                // Set initial markers if provided
                if (${JSON.stringify(markers)}.length > 0) {
                    await mapAdapter.setMarkers(${JSON.stringify(markers)});
                }
                
            } catch (error) {
                console.error('[MapScreen] Initialization error:', error);
                document.getElementById('map').innerHTML = 
                    '<div class="error-container"><div>Map initialization failed<br/>' + 
                    error.message + '</div></div>';
                
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'error',
                    data: { message: error.message, stack: error.stack }
                }));
            }
        }
        
        // Handle messages from React Native
        document.addEventListener('message', function(event) {
            handleNativeMessage(event.data);
        });
        
        window.addEventListener('message', function(event) {
            handleNativeMessage(event.data);
        });
        
        async function handleNativeMessage(data) {
            if (!isInitialized || !mapAdapter) {
                console.warn('[MapScreen] Received message before initialization:', data);
                return;
            }
            
            try {
                const message = JSON.parse(data);
                console.log('[MapScreen] Received message:', message.type);
                
                switch (message.type) {
                    case 'setMarkers':
                        await mapAdapter.setMarkers(message.data);
                        break;
                        
                    case 'centerOn':
                        const { latitude, longitude, zoom } = message.data;
                        await mapAdapter.centerOn(latitude, longitude, zoom);
                        break;
                        
                    case 'fitBounds':
                        await mapAdapter.fitBounds(message.data.bounds, message.data.options);
                        break;
                        
                    case 'addRoute':
                        const routeId = await mapAdapter.addRoute(message.data);
                        window.ReactNativeWebView.postMessage(JSON.stringify({
                            type: 'routeAdded',
                            data: { routeId, requestId: message.requestId }
                        }));
                        break;
                        
                    case 'removeRoute':
                        await mapAdapter.removeRoute(message.data.routeId);
                        break;
                        
                    case 'setTheme':
                        await mapAdapter.setTheme(message.data.theme);
                        break;
                        
                    case 'getCenter':
                        const center = await mapAdapter.getCenter();
                        window.ReactNativeWebView.postMessage(JSON.stringify({
                            type: 'centerResult',
                            data: center,
                            requestId: message.requestId
                        }));
                        break;
                        
                    case 'getZoom':
                        const zoom_level = await mapAdapter.getZoom();
                        window.ReactNativeWebView.postMessage(JSON.stringify({
                            type: 'zoomResult',
                            data: zoom_level,
                            requestId: message.requestId
                        }));
                        break;
                        
                    default:
                        console.warn('[MapScreen] Unknown message type:', message.type);
                }
            } catch (error) {
                console.error('[MapScreen] Error handling message:', error);
            }
        }
        
        // Initialize when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initializeMap);
        } else {
            initializeMap();
        }
        
        // Cleanup on unload
        window.addEventListener('beforeunload', async () => {
            if (mapAdapter) {
                await mapAdapter.destroy();
            }
        });
    </script>
</body>
</html>`;
  }, [provider, defaultConfig, markers]);

  /**
   * Get adapter code as string (in real implementation, this would be bundled)
   */
  const getAdapterCode = () => {
    // This is a simplified version - in real implementation, you'd bundle the adapter code
    return `
        // Simplified adapter code for demo
        class IMapAdapter {
            async init(container, config) { throw new Error('Not implemented'); }
            async setMarkers(markers) { throw new Error('Not implemented'); }
            async fitBounds(bounds, options) { throw new Error('Not implemented'); }
            async centerOn(lat, lng, zoom) { throw new Error('Not implemented'); }
            async addRoute(route) { throw new Error('Not implemented'); }
            async removeRoute(routeId) { throw new Error('Not implemented'); }
            on(eventType, callback) { throw new Error('Not implemented'); }
            async setTheme(theme) { throw new Error('Not implemented'); }
            async getCenter() { throw new Error('Not implemented'); }
            async getZoom() { throw new Error('Not implemented'); }
            async destroy() { throw new Error('Not implemented'); }
        }
        
        class MockMapAdapter extends IMapAdapter {
            constructor() {
                super();
                this.container = null;
                this.markers = [];
                this.center = { latitude: 20.6597, longitude: -103.3496 };
                this.zoom = 12;
                this.theme = 'light';
                this.eventListeners = new Map();
                this.isInitialized = false;
            }
            
            async init(container, config) {
                this.container = container;
                this.center = { latitude: config.latitude || 20.6597, longitude: config.longitude || -103.3496 };
                this.zoom = config.zoom || 12;
                this.theme = config.theme || 'light';
                
                container.innerHTML = \`
                    <div style="width: 100%; height: 100%; background: \${this.theme === 'dark' ? '#1a1a1a' : '#f0f0f0'};
                         display: flex; align-items: center; justify-content: center; font-family: Arial, sans-serif;">
                        <div style="text-align: center; color: \${this.theme === 'dark' ? '#ffffff' : '#333333'};">
                            <div style="font-size: 24px; margin-bottom: 16px;">🗺️</div>
                            <div style="font-size: 16px; margin-bottom: 8px;">Mock Map</div>
                            <div style="font-size: 12px; opacity: 0.7;">
                                Center: \${this.center.latitude.toFixed(4)}, \${this.center.longitude.toFixed(4)}
                            </div>
                            <div id="mock-info" style="font-size: 12px; margin-top: 8px;"></div>
                        </div>
                    </div>
                \`;
                
                this.isInitialized = true;
                this._emit('ready', { center: this.center, zoom: this.zoom });
            }
            
            async setMarkers(markers) {
                this.markers = markers;
                const info = this.container?.querySelector('#mock-info');
                if (info) {
                    info.innerHTML = \`Markers: \${markers.length}\`;
                }
            }
            
            async centerOn(lat, lng, zoom) {
                this.center = { latitude: lat, longitude: lng };
                if (zoom !== undefined) this.zoom = zoom;
            }
            
            async fitBounds(bounds) { /* Mock implementation */ }
            async addRoute(route) { return 'mock-route-' + Date.now(); }
            async removeRoute(routeId) { return true; }
            async setTheme(theme) { this.theme = theme; }
            async getCenter() { return { ...this.center }; }
            async getZoom() { return this.zoom; }
            async destroy() { this.eventListeners.clear(); }
            
            on(eventType, callback) {
                if (!this.eventListeners.has(eventType)) {
                    this.eventListeners.set(eventType, []);
                }
                this.eventListeners.get(eventType).push(callback);
                return () => {
                    const listeners = this.eventListeners.get(eventType);
                    if (listeners) {
                        const index = listeners.indexOf(callback);
                        if (index > -1) listeners.splice(index, 1);
                    }
                };
            }
            
            _emit(eventType, data) {
                const listeners = this.eventListeners.get(eventType);
                if (listeners) {
                    listeners.forEach(callback => {
                        try { callback(data); }
                        catch (error) { console.error('Event callback error:', error); }
                    });
                }
            }
        }
        
        function createMapAdapter(type) {
            switch (type.toLowerCase()) {
                case 'mock':
                default:
                    return new MockMapAdapter();
            }
        }
    `;
  };

  /**
   * Handle messages from WebView
   */
  const handleWebViewMessage = useCallback((event) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      
      switch (message.type) {
        case 'ready':
          setIsMapReady(true);
          setMapError(null);
          onReady?.(message.data);
          break;
          
        case 'markerClick':
          onMarkerClick?.(message.data);
          break;
          
        case 'mapClick':
          onMapClick?.(message.data);
          break;
          
        case 'error':
          const error = new Error(message.data.message);
          setMapError(error);
          onError?.(error);
          break;
          
        default:
          console.log('[MapScreen] Unhandled message:', message.type);
      }
    } catch (error) {
      console.error('[MapScreen] Error parsing WebView message:', error);
      onError?.(error);
    }
  }, [onReady, onMarkerClick, onMapClick, onError]);

  /**
   * Send message to WebView
   */
  const sendMessage = useCallback((type, data, requestId) => {
    if (!webViewRef.current) {
      console.warn('[MapScreen] WebView not ready for message:', type);
      return Promise.reject(new Error('WebView not ready'));
    }

    const message = JSON.stringify({
      type,
      data,
      requestId: requestId || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    });

    webViewRef.current.postMessage(message);
    
    // For operations that return values, we'd need to implement a promise-based system
    return Promise.resolve();
  }, []);

  /**
   * Public API methods (exposed via ref)
   */
  useImperativeHandle(ref, () => ({
    // Marker operations
    setMarkers: (newMarkers) => sendMessage('setMarkers', newMarkers),
    
    // View operations  
    centerOn: (latitude, longitude, zoom) => 
      sendMessage('centerOn', { latitude, longitude, zoom }),
    
    fitBounds: (bounds, options = {}) => 
      sendMessage('fitBounds', { bounds, options }),
    
    // Route operations
    addRoute: (route) => sendMessage('addRoute', route),
    removeRoute: (routeId) => sendMessage('removeRoute', { routeId }),
    
    // Theme operations
    setTheme: (theme) => sendMessage('setTheme', { theme }),
    
    // Getters (these would need promise-based implementation in real version)
    getCenter: () => sendMessage('getCenter'),
    getZoom: () => sendMessage('getZoom'),
    
    // State
    isReady: () => isMapReady,
    hasError: () => !!mapError,
    getError: () => mapError
  }), [sendMessage, isMapReady, mapError]);

  /**
   * Update markers when prop changes
   */
  useEffect(() => {
    if (isMapReady && markers) {
      sendMessage('setMarkers', markers);
    }
  }, [markers, isMapReady, sendMessage]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      eventUnsubscribersRef.current.forEach(unsub => unsub());
      eventUnsubscribersRef.current = [];
    };
  }, []);

  return (
    <View style={[styles.container, style]} {...props}>
      <WebView
        ref={webViewRef}
        source={{ html: generateMapHTML() }}
        style={styles.webView}
        onMessage={handleWebViewMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        scalesPageToFit={Platform.OS === 'android'}
        bounces={false}
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          const error = new Error(`WebView error: ${nativeEvent.description}`);
          setMapError(error);
          onError?.(error);
        }}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent'
  }
});

MapScreen.displayName = 'MapScreen';

export default MapScreen;

// Export additional utilities for advanced usage
export { createMapAdapter } from './adapters';
export * from './adapters/IMapAdapter';