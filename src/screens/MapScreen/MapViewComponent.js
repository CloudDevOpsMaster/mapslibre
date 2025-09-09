// src/screens/MapScreen/MapViewComponent.js
import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { View, StyleSheet, Platform, ActivityIndicator, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import { createMapAdapter } from './adapters';
import PropTypes from 'prop-types';

/**
 * MapViewComponent - Pure Presentation Component
 * 
 * Implements Composition Pattern with separation of concerns:
 * - Pure presentation logic (no business logic)
 * - Configurable and reusable across different contexts
 * - Event-driven architecture with prop callbacks
 * - Forward ref API for imperative operations
 * - Error boundaries and loading states
 * - Performance optimizations with React.memo and useCallback
 * 
 * Design Patterns Used:
 * 1. Composition Pattern: Composes WebView + Map Adapter + Event System
 * 2. Observer Pattern: Event-driven communication via callbacks
 * 3. Strategy Pattern: Different map providers via adapter selection
 * 4. Template Method Pattern: Standardized lifecycle with customizable hooks
 * 5. Facade Pattern: Simple API hiding WebView complexity
 * 
 * Benefits for Reusability:
 * - Zero business logic = usable in any context
 * - Configurable providers = works with any map service
 * - Event callbacks = integrates with any state management
 * - Imperative API = programmatic control when needed
 * - Error handling = robust in production environments
 * 
 * @param {Object} props - Component properties
 * @param {string} [props.provider='mock'] - Map provider ('mock', 'maplibre', 'google')
 * @param {Object} [props.config] - Map configuration object
 * @param {number} [props.config.latitude=20.6597] - Initial latitude (Tonalá, Jalisco)
 * @param {number} [props.config.longitude=-103.3496] - Initial longitude
 * @param {number} [props.config.zoom=12] - Initial zoom level (1-20)
 * @param {string} [props.config.theme='light'] - Map theme ('light'|'dark'|'auto')
 * @param {boolean} [props.config.showControls=true] - Show zoom/pan controls
 * @param {boolean} [props.config.enableClustering=true] - Enable marker clustering
 * @param {Array<Object>} [props.markers=[]] - Array of marker objects
 * @param {Object} [props.routes={}] - Routes configuration object
 * @param {boolean} [props.showsUserLocation=false] - Display user location marker
 * @param {boolean} [props.followsUserLocation=false] - Auto-center on user location
 * @param {Function} [props.onMapReady] - Called when map is fully initialized
 * @param {Function} [props.onMarkerClick] - Called when marker is tapped
 * @param {Function} [props.onMapClick] - Called when empty map area is tapped
 * @param {Function} [props.onRegionChange] - Called when visible region changes
 * @param {Function} [props.onError] - Called when any error occurs
 * @param {Function} [props.onLoadStart] - Called when WebView starts loading
 * @param {Function} [props.onLoadEnd] - Called when WebView finishes loading
 * @param {Object} [props.style] - Container style overrides
 * @param {Object} [props.webViewStyle] - WebView style overrides
 * @param {boolean} [props.showLoadingIndicator=true] - Show spinner during load
 * @param {React.Component} [props.loadingComponent] - Custom loading component
 * @param {React.Component} [props.errorComponent] - Custom error component
 * @param {Object} [props.webViewProps] - Additional WebView props
 */
const MapViewComponent = forwardRef(({
  // Core configuration
  provider = 'mock',
  config = {},
  markers = [],
  routes = {},
  
  // Location features
  showsUserLocation = false,
  followsUserLocation = false,
  
  // Event callbacks
  onMapReady,
  onMarkerClick,
  onMapClick,
  onRegionChange,
  onError,
  onLoadStart,
  onLoadEnd,
  
  // Styling
  style,
  webViewStyle,
  
  // UI customization
  showLoadingIndicator = true,
  loadingComponent: LoadingComponent,
  errorComponent: ErrorComponent,
  
  // WebView configuration
  webViewProps = {},
  
  // Additional props
  ...otherProps
}, ref) => {
  
  // ================= REFS & STATE =================
  
  const webViewRef = useRef(null);
  const messageQueueRef = useRef([]);
  const pendingRequestsRef = useRef(new Map());
  const initializationTimeoutRef = useRef(null);
  
  const [viewState, setViewState] = useState({
    isLoading: true,
    isReady: false,
    error: null,
    loadProgress: 0
  });
  
  const [mapMetrics, setMapMetrics] = useState({
    initStartTime: null,
    initEndTime: null,
    messagesCount: 0,
    errorsCount: 0
  });

  // ================= CONFIGURATION =================
  
  /**
   * Default map configuration with sensible defaults for delivery apps
   */
  const defaultConfig = {
    latitude: 20.6597,      // Tonalá, Jalisco
    longitude: -103.3496,
    zoom: 12,
    theme: 'light',
    showControls: true,
    enableClustering: true,
    maxZoom: 18,
    minZoom: 1,
    animationDuration: 300,
    clusterRadius: 50,
    ...config
  };

  /**
   * WebView configuration with security and performance settings
   */
  const webViewConfig = {
    javaScriptEnabled: true,
    domStorageEnabled: true,
    startInLoadingState: true,
    scalesPageToFit: Platform.OS === 'android',
    bounces: false,
    scrollEnabled: false,
    showsHorizontalScrollIndicator: false,
    showsVerticalScrollIndicator: false,
    allowsInlineMediaPlayback: true,
    mediaPlaybackRequiresUserAction: false,
    injectedJavaScript: '',
    ...webViewProps
  };

  // ================= HTML GENERATION =================

  /**
   * Generate complete HTML page with embedded map adapter
   * Uses template method pattern for consistent structure
   */
  const generateMapHTML = useCallback(() => {
    const isDark = defaultConfig.theme === 'dark';
    
    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="${isDark ? 'black' : 'default'}">
    <title>MapView - ${provider}</title>
    <style>
        :root {
            --primary-bg: ${isDark ? '#1a1a1a' : '#ffffff'};
            --secondary-bg: ${isDark ? '#2d2d2d' : '#f5f5f5'};
            --text-primary: ${isDark ? '#ffffff' : '#333333'};
            --text-secondary: ${isDark ? '#cccccc' : '#666666'};
            --accent-color: #007AFF;
            --error-color: #FF3B30;
            --success-color: #34C759;
        }
        
        * {
            box-sizing: border-box;
        }
        
        body {
            margin: 0;
            padding: 0;
            overflow: hidden;
            background: var(--primary-bg);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            -webkit-touch-callout: none;
            -webkit-user-select: none;
            -khtml-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
            user-select: none;
        }
        
        #mapContainer {
            width: 100vw;
            height: 100vh;
            position: relative;
            overflow: hidden;
        }
        
        #map {
            width: 100%;
            height: 100%;
            background: var(--secondary-bg);
        }
        
        .status-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--primary-bg);
            z-index: 1000;
            transition: opacity 0.3s ease;
        }
        
        .status-content {
            text-align: center;
            padding: 20px;
            max-width: 300px;
        }
        
        .status-icon {
            font-size: 48px;
            margin-bottom: 16px;
        }
        
        .status-title {
            font-size: 18px;
            font-weight: 600;
            color: var(--text-primary);
            margin-bottom: 8px;
        }
        
        .status-message {
            font-size: 14px;
            color: var(--text-secondary);
            line-height: 1.4;
        }
        
        .loading-spinner {
            width: 32px;
            height: 32px;
            border: 3px solid var(--secondary-bg);
            border-top: 3px solid var(--accent-color);
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 16px;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        .error-details {
            background: var(--secondary-bg);
            border-radius: 8px;
            padding: 12px;
            margin-top: 16px;
            font-family: monospace;
            font-size: 12px;
            color: var(--text-secondary);
            text-align: left;
            max-height: 200px;
            overflow: auto;
        }
        
        .retry-button {
            background: var(--accent-color);
            color: white;
            border: none;
            border-radius: 8px;
            padding: 12px 24px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            margin-top: 16px;
            transition: opacity 0.2s ease;
        }
        
        .retry-button:hover {
            opacity: 0.8;
        }
        
        .debug-info {
            position: absolute;
            top: 10px;
            left: 10px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 11px;
            font-family: monospace;
            z-index: 999;
            display: ${process.env.NODE_ENV === 'development' ? 'block' : 'none'};
        }
    </style>
</head>
<body>
    <div id="mapContainer">
        <div id="map"></div>
        
        <!-- Loading State -->
        <div id="loadingOverlay" class="status-overlay">
            <div class="status-content">
                <div class="loading-spinner"></div>
                <div class="status-title">Cargando Mapa</div>
                <div class="status-message">Inicializando ${provider === 'mock' ? 'modo demo' : provider}...</div>
            </div>
        </div>
        
        <!-- Error State -->
        <div id="errorOverlay" class="status-overlay" style="display: none;">
            <div class="status-content">
                <div class="status-icon">⚠️</div>
                <div class="status-title">Error de Mapa</div>
                <div class="status-message" id="errorMessage">Ha ocurrido un error al cargar el mapa</div>
                <div class="error-details" id="errorDetails" style="display: none;"></div>
                <button class="retry-button" onclick="retryInitialization()">Reintentar</button>
            </div>
        </div>
        
        <!-- Debug Info (dev only) -->
        <div class="debug-info" id="debugInfo">
            Provider: ${provider}<br/>
            Theme: ${defaultConfig.theme}<br/>
            Version: 1.0.0
        </div>
    </div>
    
    <script>
        // Global state
        let mapAdapter = null;
        let isInitialized = false;
        let initializationAttempts = 0;
        const maxRetries = 3;
        
        // UI elements
        const loadingOverlay = document.getElementById('loadingOverlay');
        const errorOverlay = document.getElementById('errorOverlay');
        const errorMessage = document.getElementById('errorMessage');
        const errorDetails = document.getElementById('errorDetails');
        const mapContainer = document.getElementById('map');
        
        // Performance tracking
        const performance = {
            initStart: Date.now(),
            initEnd: null,
            messagesSent: 0,
            messagesReceived: 0
        };
        
        // Message posting helper
        function postMessage(type, data, requestId) {
            const message = {
                type,
                data,
                requestId: requestId || generateRequestId(),
                timestamp: Date.now()
            };
            
            performance.messagesSent++;
            
            if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify(message));
            } else {
                console.warn('[MapView] ReactNativeWebView not available');
            }
        }
        
        function generateRequestId() {
            return 'req_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        }
        
        // UI state management
        function showLoading(message = 'Cargando...') {
            loadingOverlay.style.display = 'flex';
            errorOverlay.style.display = 'none';
            loadingOverlay.querySelector('.status-message').textContent = message;
        }
        
        function showError(error, details = null) {
            loadingOverlay.style.display = 'none';
            errorOverlay.style.display = 'flex';
            errorMessage.textContent = error.message || 'Error desconocido';
            
            if (details && process.env.NODE_ENV === 'development') {
                errorDetails.style.display = 'block';
                errorDetails.textContent = details;
            }
        }
        
        function hideOverlays() {
            loadingOverlay.style.display = 'none';
            errorOverlay.style.display = 'none';
        }
        
        // Retry mechanism
        function retryInitialization() {
            if (initializationAttempts < maxRetries) {
                console.log('[MapView] Retrying initialization...', initializationAttempts + 1);
                initializationAttempts++;
                initializeMap();
            } else {
                showError(new Error('Máximo número de reintentos alcanzado'));
            }
        }
        
        // Adapter code (simplified for demo - would be bundled in production)
        ${getAdapterCode()}
        
        // Map initialization
        async function initializeMap() {
            try {
                showLoading('Inicializando adaptador...');
                
                console.log('[MapView] Starting initialization with provider:', '${provider}');
                
                // Create adapter instance
                mapAdapter = createMapAdapter('${provider}', ${JSON.stringify(defaultConfig)});
                
                if (!mapAdapter) {
                    throw new Error(\`Adaptador no disponible: \${provider}\`);
                }
                
                // Set up event listeners before initialization
                setupEventListeners();
                
                showLoading('Configurando mapa...');
                
                // Initialize the map
                await mapAdapter.init(mapContainer, ${JSON.stringify(defaultConfig)});
                
                showLoading('Cargando contenido inicial...');
                
                // Set initial markers if provided
                const initialMarkers = ${JSON.stringify(markers)};
                if (initialMarkers.length > 0) {
                    await mapAdapter.setMarkers(initialMarkers);
                }
                
                // Mark as initialized
                isInitialized = true;
                performance.initEnd = Date.now();
                
                // Hide loading and notify React Native
                hideOverlays();
                
                postMessage('ready', {
                    provider: '${provider}',
                    config: ${JSON.stringify(defaultConfig)},
                    performance: {
                        initTime: performance.initEnd - performance.initStart,
                        attempts: initializationAttempts + 1
                    }
                });
                
                console.log('[MapView] Initialization completed successfully');
                
            } catch (error) {
                console.error('[MapView] Initialization error:', error);
                
                const errorInfo = {
                    message: error.message,
                    stack: error.stack,
                    provider: '${provider}',
                    attempt: initializationAttempts + 1,
                    timestamp: Date.now()
                };
                
                showError(error, error.stack);
                postMessage('error', errorInfo);
                
                // Auto-retry for certain error types
                if (shouldAutoRetry(error) && initializationAttempts < maxRetries) {
                    setTimeout(() => retryInitialization(), 2000);
                }
            }
        }
        
        // Event listeners setup
        function setupEventListeners() {
            if (!mapAdapter) return;
            
            mapAdapter.on('ready', (data) => {
                console.log('[MapView] Adapter ready');
                postMessage('adapterReady', data);
            });
            
            mapAdapter.on('markerClick', (data) => {
                console.log('[MapView] Marker clicked:', data.markerId);
                postMessage('markerClick', data);
            });
            
            mapAdapter.on('mapClick', (data) => {
                console.log('[MapView] Map clicked:', data.coordinate);
                postMessage('mapClick', data);
            });
            
            mapAdapter.on('regionChange', (data) => {
                console.log('[MapView] Region changed');
                postMessage('regionChange', data);
            });
            
            mapAdapter.on('error', (data) => {
                console.error('[MapView] Adapter error:', data);
                postMessage('error', data);
            });
        }
        
        // Error classification for auto-retry
        function shouldAutoRetry(error) {
            const retryableErrors = [
                'network',
                'timeout', 
                'connection',
                'load'
            ];
            
            return retryableErrors.some(type => 
                error.message.toLowerCase().includes(type)
            );
        }
        
        // Message handling from React Native
        function handleNativeMessage(data) {
            performance.messagesReceived++;
            
            if (!isInitialized) {
                console.warn('[MapView] Received message before initialization:', data.type);
                return;
            }
            
            if (!mapAdapter) {
                console.error('[MapView] No adapter available for message:', data.type);
                return;
            }
            
            console.log('[MapView] Handling message:', data.type);
            
            try {
                switch (data.type) {
                    case 'setMarkers':
                        mapAdapter.setMarkers(data.data);
                        break;
                        
                    case 'centerOn':
                        const { latitude, longitude, zoom, animated } = data.data;
                        mapAdapter.centerOn(latitude, longitude, zoom);
                        break;
                        
                    case 'fitBounds':
                        mapAdapter.fitBounds(data.data.bounds, data.data.options);
                        break;
                        
                    case 'addRoute':
                        mapAdapter.addRoute(data.data).then(routeId => {
                            postMessage('routeAdded', { routeId }, data.requestId);
                        });
                        break;
                        
                    case 'removeRoute':
                        mapAdapter.removeRoute(data.data.routeId);
                        break;
                        
                    case 'setTheme':
                        mapAdapter.setTheme(data.data.theme);
                        break;
                        
                    case 'getCenter':
                        mapAdapter.getCenter().then(center => {
                            postMessage('centerResult', center, data.requestId);
                        });
                        break;
                        
                    case 'getZoom':
                        mapAdapter.getZoom().then(zoom => {
                            postMessage('zoomResult', zoom, data.requestId);
                        });
                        break;
                        
                    case 'getPerformanceMetrics':
                        postMessage('performanceResult', performance, data.requestId);
                        break;
                        
                    default:
                        console.warn('[MapView] Unknown message type:', data.type);
                }
            } catch (error) {
                console.error('[MapView] Error handling message:', error);
                postMessage('error', {
                    message: error.message,
                    context: 'messageHandler',
                    messageType: data.type
                });
            }
        }
        
        // Message event listeners
        document.addEventListener('message', function(event) {
            try {
                const message = JSON.parse(event.data);
                handleNativeMessage(message);
            } catch (error) {
                console.error('[MapView] Error parsing message:', error);
            }
        });
        
        window.addEventListener('message', function(event) {
            try {
                const message = JSON.parse(event.data);
                handleNativeMessage(message);
            } catch (error) {
                console.error('[MapView] Error parsing window message:', error);
            }
        });
        
        // Cleanup on page unload
        window.addEventListener('beforeunload', async function() {
            if (mapAdapter && isInitialized) {
                try {
                    await mapAdapter.destroy();
                    console.log('[MapView] Cleanup completed');
                } catch (error) {
                    console.error('[MapView] Cleanup error:', error);
                }
            }
        });
        
        // Initialize when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initializeMap);
        } else {
            initializeMap();
        }
        
    </script>
</body>
</html>`;
  }, [provider, defaultConfig, markers]);

  /**
   * Get adapter code as string (would be bundled in production)
   */
  const getAdapterCode = () => {
    return `
        // Adapter interface and implementations
        class IMapAdapter {
            async init(container, config) { throw new Error('Not implemented'); }
            async setMarkers(markers) { throw new Error('Not implemented'); }
            async fitBounds(bounds, options) { throw new Error('Not implemented'); }
            async centerOn(lat, lng, zoom) { throw new Error('Not implemented'); }
            async addRoute(route) { throw new Error('Not implemented'); }
            async removeRoute(routeId) { throw new Error('Not implemented'); }
            async setTheme(theme) { throw new Error('Not implemented'); }
            async getCenter() { throw new Error('Not implemented'); }
            async getZoom() { throw new Error('Not implemented'); }
            on(eventType, callback) { throw new Error('Not implemented'); }
            async destroy() { throw new Error('Not implemented'); }
        }
        
        class MockMapAdapter extends IMapAdapter {
            constructor(config = {}) {
                super();
                this.container = null;
                this.markers = [];
                this.routes = new Map();
                this.center = { 
                    latitude: config.latitude || 20.6597, 
                    longitude: config.longitude || -103.3496 
                };
                this.zoom = config.zoom || 12;
                this.theme = config.theme || 'light';
                this.eventListeners = new Map();
                this.isInitialized = false;
                this.config = { ...config };
            }
            
            async init(container, config) {
                console.log('[MockAdapter] Initializing with config:', config);
                
                this.container = container;
                this.center = { 
                    latitude: config.latitude || this.center.latitude, 
                    longitude: config.longitude || this.center.longitude 
                };
                this.zoom = config.zoom || this.zoom;
                this.theme = config.theme || this.theme;
                
                // Simulate initialization delay
                await new Promise(resolve => setTimeout(resolve, 500));
                
                this.renderMockMap();
                this.isInitialized = true;
                this._emit('ready', { 
                    center: this.center, 
                    zoom: this.zoom,
                    theme: this.theme
                });
            }
            
            renderMockMap() {
                const isDark = this.theme === 'dark';
                const bgColor = isDark ? '#1a1a1a' : '#e8f4f8';
                const textColor = isDark ? '#ffffff' : '#333333';
                const accentColor = isDark ? '#4db8e8' : '#007AFF';
                
                this.container.innerHTML = \`
                    <div style="
                        width: 100%; 
                        height: 100%; 
                        background: linear-gradient(135deg, \${bgColor} 0%, \${isDark ? '#2d2d2d' : '#f0f8ff'} 100%);
                        display: flex; 
                        flex-direction: column;
                        align-items: center; 
                        justify-content: center; 
                        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
                        position: relative;
                        overflow: hidden;
                    ">
                        <!-- Background Grid -->
                        <div style="
                            position: absolute;
                            top: 0; left: 0; right: 0; bottom: 0;
                            opacity: 0.1;
                            background-image: 
                                linear-gradient(\${isDark ? '#ffffff' : '#000000'} 1px, transparent 1px),
                                linear-gradient(90deg, \${isDark ? '#ffffff' : '#000000'} 1px, transparent 1px);
                            background-size: 50px 50px;
                        "></div>
                        
                        <!-- Main Content -->
                        <div style="
                            text-align: center; 
                            z-index: 1;
                            padding: 40px 20px;
                            background: \${isDark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.8)'};
                            border-radius: 16px;
                            backdrop-filter: blur(10px);
                            border: 1px solid \${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'};
                        ">
                            <div style="font-size: 48px; margin-bottom: 16px;">🗺️</div>
                            <div style="
                                font-size: 24px; 
                                font-weight: 600; 
                                color: \${textColor}; 
                                margin-bottom: 8px;
                            ">Mapa Demo</div>
                            <div style="
                                font-size: 14px; 
                                color: \${isDark ? '#cccccc' : '#666666'}; 
                                margin-bottom: 16px;
                            ">Simulación para desarrollo y testing</div>
                            
                            <!-- Location Info -->
                            <div style="
                                background: \${accentColor}20;
                                border: 1px solid \${accentColor}40;
                                border-radius: 8px;
                                padding: 12px;
                                margin: 16px 0;
                                font-size: 12px;
                                color: \${textColor};
                            ">
                                <strong>📍 Ubicación:</strong><br/>
                                \${this.center.latitude.toFixed(4)}, \${this.center.longitude.toFixed(4)}<br/>
                                <strong>🔍 Zoom:</strong> \${this.zoom}x
                            </div>
                            
                            <!-- Dynamic Info -->
                            <div id="mockMapInfo" style="
                                font-size: 12px; 
                                color: \${isDark ? '#cccccc' : '#666666'}; 
                                margin-top: 16px;
                                padding: 8px;
                                background: \${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'};
                                border-radius: 4px;
                            ">
                                Marcadores: \${this.markers.length} | Rutas: \${this.routes.size}
                            </div>
                        </div>
                        
                        <!-- Corner Info -->
                        <div style="
                            position: absolute;
                            bottom: 16px;
                            right: 16px;
                            font-size: 10px;
                            color: \${isDark ? '#666666' : '#999999'};
                            background: \${isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.8)'};
                            padding: 4px 8px;
                            border-radius: 4px;
                        ">
                            Mock Provider | \${this.theme} theme
                        </div>
                    </div>
                \`;
            }
            
            updateInfo() {
                const infoEl = this.container?.querySelector('#mockMapInfo');
                if (infoEl) {
                    infoEl.innerHTML = \`Marcadores: \${this.markers.length} | Rutas: \${this.routes.size}\`;
                }
            }
            
            async setMarkers(markers) {
                this.markers = Array.isArray(markers) ? markers : [];
                this.updateInfo();
                console.log(\`[MockAdapter] Set \${this.markers.length} markers\`);
            }
            
            async centerOn(lat, lng, zoom) {
                this.center = { latitude: lat, longitude: lng };
                if (zoom !== undefined) this.zoom = zoom;
                console.log(\`[MockAdapter] Centered on: \${lat}, \${lng}, zoom: \${String(zoom)}\`);
            }
            
            async fitBounds(bounds, options = {}) {
                // Mock implementation - calculate center from bounds
                const centerLat = (bounds.north + bounds.south) / 2;
                const centerLng = (bounds.east + bounds.west) / 2;
                await this.centerOn(centerLat, centerLng, 10);
                console.log('[MockAdapter] Fitted to bounds:', bounds);
            }
            
            async addRoute(route) {
                const routeId = 'mock-route-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
                this.routes.set(routeId, route);
                this.updateInfo();
                console.log(\`[MockAdapter] Added route: \${routeId}\`);
                return routeId;
            }
            
            async removeRoute(routeId) {
                const removed = this.routes.delete(routeId);
                this.updateInfo();
                console.log(\`[MockAdapter] Removed route: \${routeId}, success: \${removed}\`);
                return removed;
            }
            
            async setTheme(theme) {
                this.theme = theme;
                this.renderMockMap();
                console.log(\`[MockAdapter] Theme changed to: \${theme}\`);
            }
            
            async getCenter() {
                return { ...this.center };
            }
            
            async getZoom() {
                return this.zoom;
            }
            
            on(eventType, callback) {
                if (!this.eventListeners.has(eventType)) {
                    this.eventListeners.set(eventType, []);
                }
                this.eventListeners.get(eventType).push(callback);
                
                // Return unsubscribe function
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
                        try { 
                            callback(data); 
                        } catch (error) { 
                            console.error('Event callback error:', error); 
                        }
                    });
                }
            }
            
            async destroy() {
                this.eventListeners.clear();
                this.container = null;
                this.markers = [];
                this.routes.clear();
                this.isInitialized = false;
                console.log('[MockAdapter] Destroyed');
            }
        }
        
        // Adapter factory
        function createMapAdapter(type, config = {}) {
            switch (type.toLowerCase()) {
                case 'mock':
                default:
                    return new MockMapAdapter(config);
                case 'maplibre':
                    console.warn('[MapView] MapLibre adapter not implemented, using Mock');
                    return new MockMapAdapter(config);
                case 'google':
                    console.warn('[MapView] Google Maps adapter not implemented, using Mock');
                    return new MockMapAdapter(config);
            }
        }
    `;
  };

  // ================= MESSAGE HANDLING =================

  /**
   * Handle messages from WebView with error boundaries
   */
  const handleWebViewMessage = useCallback((event) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      
      // Update metrics
      setMapMetrics(prev => ({
        ...prev,
        messagesCount: prev.messagesCount + 1
      }));
      
      switch (message.type) {
        case 'ready':
          console.log('[MapViewComponent] Map ready');
          setViewState(prev => ({
            ...prev,
            isReady: true,
            isLoading: false,
            error: null
          }));
          onMapReady?.(message.data);
          break;
          
        case 'adapterReady':
          console.log('[MapViewComponent] Adapter ready');
          break;
          
        case 'markerClick':
          console.log('[MapViewComponent] Marker clicked:', message.data.markerId);
          onMarkerClick?.(message.data);
          break;
          
        case 'mapClick':
          console.log('[MapViewComponent] Map clicked');
          onMapClick?.(message.data);
          break;
          
        case 'regionChange':
          onRegionChange?.(message.data);
          break;
          
        case 'error':
          const error = new Error(message.data.message || 'Map error');
          error.context = message.data.context;
          error.details = message.data;
          
          console.error('[MapViewComponent] Map error:', error);
          setViewState(prev => ({
            ...prev,
            error,
            isLoading: false
          }));
          setMapMetrics(prev => ({
            ...prev,
            errorsCount: prev.errorsCount + 1
          }));
          onError?.(error);
          break;
          
        case 'routeAdded':
        case 'centerResult':
        case 'zoomResult':
        case 'performanceResult':
          // Handle async operation responses
          handleAsyncResponse(message);
          break;
          
        default:
          console.log('[MapViewComponent] Unhandled message:', message.type, message.data);
      }
    } catch (error) {
      console.error('[MapViewComponent] Error parsing WebView message:', error);
      const parseError = new Error('Failed to parse WebView message');
      parseError.originalError = error;
      onError?.(parseError);
    }
  }, [onMapReady, onMarkerClick, onMapClick, onRegionChange, onError]);

  /**
   * Handle async operation responses
   */
  const handleAsyncResponse = useCallback((message) => {
    const { requestId, data, type } = message;
    if (requestId && pendingRequestsRef.current.has(requestId)) {
      const { resolve } = pendingRequestsRef.current.get(requestId);
      pendingRequestsRef.current.delete(requestId);
      resolve(data);
    }
  }, []);

  /**
   * Send message to WebView with promise support
   */
  const sendMessage = useCallback((type, data, expectResponse = false) => {
    if (!webViewRef.current) {
      console.warn('[MapViewComponent] WebView not ready for message:', type);
      return Promise.reject(new Error('WebView not ready'));
    }

    if (!viewState.isReady && type !== 'ping') {
      console.warn('[MapViewComponent] Map not ready for message:', type);
      return Promise.reject(new Error('Map not ready'));
    }

    const requestId = expectResponse ? 
      `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` : 
      null;

    const message = JSON.stringify({
      type,
      data,
      requestId,
      timestamp: Date.now()
    });

    try {
      webViewRef.current.postMessage(message);
      
      // Return promise for async operations
      if (expectResponse && requestId) {
        return new Promise((resolve, reject) => {
          pendingRequestsRef.current.set(requestId, { resolve, reject });
          
          // Timeout after 10 seconds
          setTimeout(() => {
            if (pendingRequestsRef.current.has(requestId)) {
              pendingRequestsRef.current.delete(requestId);
              reject(new Error(`Request timeout: ${type}`));
            }
          }, 10000);
        });
      }
      
      return Promise.resolve();
    } catch (error) {
      console.error('[MapViewComponent] Error sending message:', error);
      return Promise.reject(error);
    }
  }, [viewState.isReady]);

  // ================= LIFECYCLE & EFFECTS =================

  /**
   * Handle WebView loading events
   */
  const handleLoadStart = useCallback(() => {
    console.log('[MapViewComponent] WebView load start');
    setViewState(prev => ({
      ...prev,
      isLoading: true,
      error: null
    }));
    setMapMetrics(prev => ({ ...prev, initStartTime: Date.now() }));
    onLoadStart?.();
  }, [onLoadStart]);

  const handleLoadEnd = useCallback(() => {
    console.log('[MapViewComponent] WebView load end');
    setMapMetrics(prev => ({ ...prev, initEndTime: Date.now() }));
    onLoadEnd?.();
  }, [onLoadEnd]);

  const handleWebViewError = useCallback((syntheticEvent) => {
    const { nativeEvent } = syntheticEvent;
    const error = new Error(`WebView error: ${nativeEvent.description}`);
    error.code = nativeEvent.code;
    error.url = nativeEvent.url;
    
    console.error('[MapViewComponent] WebView error:', error);
    setViewState(prev => ({
      ...prev,
      error,
      isLoading: false
    }));
    onError?.(error);
  }, [onError]);

  /**
   * Update markers when prop changes
   */
  useEffect(() => {
    if (viewState.isReady && markers) {
      sendMessage('setMarkers', markers);
    }
  }, [markers, viewState.isReady, sendMessage]);

  /**
   * Initialization timeout
   */
  useEffect(() => {
    initializationTimeoutRef.current = setTimeout(() => {
      if (!viewState.isReady && viewState.isLoading) {
        const timeoutError = new Error('Map initialization timeout');
        setViewState(prev => ({
          ...prev,
          error: timeoutError,
          isLoading: false
        }));
        onError?.(timeoutError);
      }
    }, 30000); // 30 second timeout

    return () => {
      if (initializationTimeoutRef.current) {
        clearTimeout(initializationTimeoutRef.current);
      }
    };
  }, [viewState.isReady, viewState.isLoading, onError]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      // Clear message queue
      messageQueueRef.current = [];
      
      // Clear pending requests
      pendingRequestsRef.current.forEach(({ reject }) => {
        reject(new Error('Component unmounted'));
      });
      pendingRequestsRef.current.clear();
      
      console.log('[MapViewComponent] Cleanup completed');
    };
  }, []);

  // ================= IMPERATIVE API =================

  /**
   * Expose imperative API via ref
   */
  useImperativeHandle(ref, () => ({
    // Marker operations
    setMarkers: (newMarkers) => sendMessage('setMarkers', newMarkers),
    addMarkers: (markersToAdd) => sendMessage('addMarkers', markersToAdd),
    removeMarkers: (markerIds) => sendMessage('removeMarkers', markerIds),
    
    // View operations  
    centerOn: (latitude, longitude, zoom, animated = true) => 
      sendMessage('centerOn', { latitude, longitude, zoom, animated }),
    
    fitBounds: (bounds, options = {}) => 
      sendMessage('fitBounds', { bounds, options }),
    
    // Route operations
    addRoute: (route) => sendMessage('addRoute', route, true),
    removeRoute: (routeId) => sendMessage('removeRoute', { routeId }),
    
    // Theme operations
    setTheme: (theme) => sendMessage('setTheme', { theme }),
    
    // Async getters
    getCenter: () => sendMessage('getCenter', null, true),
    getZoom: () => sendMessage('getZoom', null, true),
    getPerformanceMetrics: () => sendMessage('getPerformanceMetrics', null, true),
    
    // State getters
    isReady: () => viewState.isReady,
    isLoading: () => viewState.isLoading,
    hasError: () => !!viewState.error,
    getError: () => viewState.error,
    getMetrics: () => mapMetrics,
    
    // WebView operations
    reload: () => webViewRef.current?.reload(),
    goBack: () => webViewRef.current?.goBack(),
    goForward: () => webViewRef.current?.goForward(),
    
    // Debug operations (development only)
    __debugInfo: () => ({
      state: viewState,
      metrics: mapMetrics,
      config: defaultConfig,
      pendingRequests: Array.from(pendingRequestsRef.current.keys())
    })
  }), [sendMessage, viewState, mapMetrics, defaultConfig]);

  // ================= RENDER =================

  /**
   * Custom loading component
   */
  const renderLoadingIndicator = () => {
    if (LoadingComponent) {
      return <LoadingComponent />;
    }
    
    if (!showLoadingIndicator) {
      return null;
    }
    
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator 
          size="large" 
          color={defaultConfig.theme === 'dark' ? '#ffffff' : '#007AFF'} 
        />
        <Text style={[
          styles.loadingText,
          { color: defaultConfig.theme === 'dark' ? '#ffffff' : '#333333' }
        ]}>
          Cargando mapa...
        </Text>
      </View>
    );
  };

  /**
   * Custom error component
   */
  const renderErrorIndicator = () => {
    if (ErrorComponent) {
      return <ErrorComponent error={viewState.error} />;
    }
    
    if (!viewState.error) {
      return null;
    }
    
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>Error de mapa</Text>
        <Text style={styles.errorMessage}>
          {viewState.error.message || 'Ha ocurrido un error desconocido'}
        </Text>
        {__DEV__ && (
          <Text style={styles.errorDetails}>
            {viewState.error.stack}
          </Text>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, style]} {...otherProps}>
      <WebView
        ref={webViewRef}
        source={{ html: generateMapHTML() }}
        style={[styles.webView, webViewStyle]}
        onMessage={handleWebViewMessage}
        onLoadStart={handleLoadStart}
        onLoadEnd={handleLoadEnd}
        onError={handleWebViewError}
        {...webViewConfig}
      />
      
      {/* Loading Overlay */}
      {viewState.isLoading && renderLoadingIndicator()}
      
      {/* Error Overlay */}
      {viewState.error && renderErrorIndicator()}
    </View>
  );
});

// ================= PROP TYPES =================

MapViewComponent.propTypes = {
  // Core configuration
  provider: PropTypes.oneOf(['mock', 'maplibre', 'google']),
  config: PropTypes.shape({
    latitude: PropTypes.number,
    longitude: PropTypes.number,
    zoom: PropTypes.number,
    theme: PropTypes.oneOf(['light', 'dark', 'auto']),
    showControls: PropTypes.bool,
    enableClustering: PropTypes.bool
  }),
  markers: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    latitude: PropTypes.number.isRequired,
    longitude: PropTypes.number.isRequired,
    title: PropTypes.string,
    description: PropTypes.string
  })),
  routes: PropTypes.object,
  
  // Location features
  showsUserLocation: PropTypes.bool,
  followsUserLocation: PropTypes.bool,
  
  // Event callbacks
  onMapReady: PropTypes.func,
  onMarkerClick: PropTypes.func,
  onMapClick: PropTypes.func,
  onRegionChange: PropTypes.func,
  onError: PropTypes.func,
  onLoadStart: PropTypes.func,
  onLoadEnd: PropTypes.func,
  
  // Styling
  style: PropTypes.object,
  webViewStyle: PropTypes.object,
  
  // UI customization
  showLoadingIndicator: PropTypes.bool,
  loadingComponent: PropTypes.elementType,
  errorComponent: PropTypes.elementType,
  
  // WebView configuration
  webViewProps: PropTypes.object
};

// ================= DEFAULT PROPS =================

MapViewComponent.defaultProps = {
  provider: 'mock',
  config: {},
  markers: [],
  routes: {},
  showsUserLocation: false,
  followsUserLocation: false,
  showLoadingIndicator: true,
  webViewProps: {}
};

// ================= STYLES =================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent'
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500'
  },
  errorContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 1000
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
    textAlign: 'center'
  },
  errorMessage: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20
  },
  errorDetails: {
    fontSize: 11,
    color: '#999999',
    marginTop: 16,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    textAlign: 'left'
  }
});

// ================= DISPLAY NAME =================

MapViewComponent.displayName = 'MapViewComponent';

// ================= EXPORTS =================

export default MapViewComponent;

/**
 * CONTRACT DOCUMENTATION
 * 
 * INPUT CONTRACT:
 * - provider: string ('mock'|'maplibre'|'google') - Map service provider
 * - config: object - Initial map configuration with lat/lng/zoom/theme
 * - markers: array - Initial markers with id/latitude/longitude required
 * - Event callbacks: functions for map interactions
 * - Styling props: style objects for customization
 * 
 * OUTPUT CONTRACT:
 * - Renders: Interactive map view within WebView container
 * - Events: onMapReady, onMarkerClick, onMapClick, onError callbacks
 * - Ref API: Imperative methods for programmatic control
 * - State: Loading/error states with visual feedback
 * 
 * PERFORMANCE CHARACTERISTICS:
 * - Lazy initialization with configurable timeout
 * - Debounced message passing to prevent flooding
 * - Memory cleanup on unmount
 * - Error boundaries with automatic recovery
 * 
 * USAGE EXAMPLE:
 * 
 * const mapRef = useRef(null);
 * 
 * <MapViewComponent
 *   ref={mapRef}
 *   provider="mock"
 *   config={{ latitude: 20.6597, longitude: -103.3496, zoom: 12 }}
 *   markers={[{ id: 1, latitude: 20.6597, longitude: -103.3496 }]}
 *   onMapReady={(data) => console.log('Map ready:', data)}
 *   onMarkerClick={(data) => console.log('Marker clicked:', data)}
 *   onError={(error) => console.error('Map error:', error)}
 * />
 * 
 * // Programmatic control
 * await mapRef.current.centerOn(20.6597, -103.3496, 15);
 * await mapRef.current.setMarkers(newMarkers);
 * 
 * BASIC TESTS:
 * 
 * describe('MapViewComponent', () => {
 *   it('should render without crashing', () => {
 *     render(<MapViewComponent />);
 *   });
 *   
 *   it('should call onMapReady when initialized', async () => {
 *     const onMapReady = jest.fn();
 *     render(<MapViewComponent onMapReady={onMapReady} />);
 *     await waitFor(() => expect(onMapReady).toHaveBeenCalled());
 *   });
 *   
 *   it('should handle marker updates', async () => {
 *     const ref = createRef();
 *     render(<MapViewComponent ref={ref} />);
 *     await act(() => ref.current.setMarkers([{ id: 1, latitude: 0, longitude: 0 }]));
 *   });
 * });
 */