// ============================================================================
// FILE: mapscreen/utils/mapHTMLGenerator.js
// PURPOSE: Generate MapLibre GL HTML for WebView with improved centering flow
// REFACTORED: Enhanced marker feedback and centering confirmation
// ============================================================================

/**
 * Generate complete MapLibre GL HTML for WebView
 * @param {Object} currentLocation - Current location {latitude, longitude}
 * @param {string} theme - Theme name ('light' or 'dark')
 * @returns {string} Complete HTML string
 */
export const generateMapHTML = (currentLocation, theme = 'light') => {
  const defaultLat = currentLocation?.latitude || 20.6597;
  const defaultLng = currentLocation?.longitude || -103.3496;

  const themeStyles = theme === 'dark'
    ? 'filter: brightness(0.8) contrast(1.2) hue-rotate(180deg) invert(1)'
    : 'none';

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no, maximum-scale=1.0, minimum-scale=1.0">
    <title>Delivery Map - Enhanced Location Tracking</title>
    
    <!-- MapLibre GL JS -->
    <script src="https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.js"></script>
    <link href="https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.css" rel="stylesheet" />
    
    <style>
        * { 
            box-sizing: border-box; 
            margin: 0; 
            padding: 0; 
        }
        
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            overflow: hidden;
            background: #1a1a1a;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }
        
        #map { 
            width: 100vw; 
            height: 100vh;
            ${themeStyles}
        }
        
        .loading-screen {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 9999;
            transition: all 0.5s ease;
        }
        
        .loading-spinner {
            width: 60px;
            height: 60px;
            border: 4px solid rgba(255, 255, 255, 0.3);
            border-top: 4px solid #ffffff;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 20px;
        }
        
        .loading-text {
            color: white;
            font-size: 18px;
            font-weight: 600;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        /* Custom marker styles - ENHANCED */
        .custom-marker {
            background-color: #3b82f6;
            border: 3px solid #ffffff;
            border-radius: 50%;
            box-shadow: 0 4px 12px rgba(0,0,0,0.4);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            font-weight: bold;
            color: white;
            transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            position: relative;
        }
        
        .custom-marker:hover {
            transform: scale(1.15);
            box-shadow: 0 6px 20px rgba(0,0,0,0.5);
        }
        
        .custom-marker.excellent {
            background-color: #10b981;
            border-color: #ffffff;
            width: 50px;
            height: 50px;
            font-size: 24px;
        }
        
        .custom-marker.high {
            background-color: #059669;
            border-color: #ffffff;
            width: 46px;
            height: 46px;
            font-size: 22px;
        }
        
        .custom-marker.good {
            background-color: #3b82f6;
            border-color: #ffffff;
            width: 50px;
            height: 50px;
            font-size: 20px;
        }
        
        .custom-marker.fair {
            background-color: #f59e0b;
            border-color: #ffffff;
            width: 38px;
            height: 38px;
            font-size: 18px;
        }
        
        .custom-marker.poor {
            background-color: #ef4444;
            border-color: #ffffff;
            width: 34px;
            height: 34px;
            font-size: 16px;
        }
        
        /* IMPROVED: Smoother marker entrance animation */
        .marker-entrance {
            animation: markerEntrance 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        
        @keyframes markerEntrance {
            0% { 
                transform: scale(0) translateY(-30px); 
                opacity: 0; 
            }
            50% {
                transform: scale(1.1) translateY(-5px);
            }
            100% { 
                transform: scale(1) translateY(0); 
                opacity: 1; 
            }
        }
        
        /* NEW: Pulse effect for active marker */
        .marker-pulse {
            animation: markerPulse 2s ease-in-out infinite;
        }
        
        @keyframes markerPulse {
            0%, 100% { 
                box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
                transform: scale(1);
            }
            50% { 
                box-shadow: 0 6px 20px rgba(59, 130, 246, 0.6);
                transform: scale(1.05);
            }
        }
        
        /* NEW: Accuracy ring around marker */
        .accuracy-ring {
            position: absolute;
            border-radius: 50%;
            border: 2px solid rgba(59, 130, 246, 0.3);
            pointer-events: none;
            animation: accuracyPulse 3s ease-in-out infinite;
        }
        
        @keyframes accuracyPulse {
            0%, 100% {
                transform: scale(1);
                opacity: 0.3;
            }
            50% {
                transform: scale(1.3);
                opacity: 0.1;
            }
        }
        
        .maplibre-popup-content {
            padding: 16px;
            border-radius: 12px;
            font-family: inherit;
            box-shadow: 0 8px 25px rgba(0,0,0,0.2);
            max-width: 280px;
            min-width: 200px;
            background: #fff;
            border: none;
        }
        
        .maplibre-popup-tip {
            border-top-color: #fff;
        }
        
        /* NEW: Centering indicator */
        .centering-indicator {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 60px;
            height: 60px;
            border: 4px solid rgba(59, 130, 246, 0.3);
            border-top-color: #3b82f6;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            z-index: 1000;
            pointer-events: none;
            display: none;
        }
        
        .centering-indicator.active {
            display: block;
        }
    </style>
</head>
<body>
    <div id="loading" class="loading-screen">
        <div class="loading-spinner"></div>
        <div class="loading-text">Inicializando mapa avanzado...</div>
    </div>
    
    <div id="map" style="display: none;"></div>
    <div id="centering-indicator" class="centering-indicator"></div>

    <script>
        let map;
        let userLocationMarkers = new Map();
        let messageCount = 0;
        let lastAddedMarkerId = null;
        let centeringInProgress = false;
        
        // Accuracy configuration
        const ACCURACY_LEVELS = {
            excellent: { threshold: 5, label: 'Excelente', color: '#10b981' },
            high: { threshold: 15, label: 'Muy buena', color: '#059669' },
            good: { threshold: 50, label: 'Buena', color: '#3b82f6' },
            fair: { threshold: 100, label: 'Regular', color: '#f59e0b' },
            poor: { threshold: Infinity, label: 'Baja', color: '#ef4444' }
        };
        
        function getAccuracyLevel(accuracy) {
            for (const [level, config] of Object.entries(ACCURACY_LEVELS)) {
                if (accuracy <= config.threshold) {
                    return level;
                }
            }
            return 'poor';
        }
        
        function initMap() {
            try {
                console.log('🗺️ Inicializando mapa...');
                
                map = new maplibregl.Map({
                    container: 'map',
                    style: {
                        version: 8,
                        sources: {
                            'osm-tiles': {
                                type: 'raster',
                                tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
                                tileSize: 256,
                                attribution: '© OpenStreetMap contributors'
                            }
                        },
                        layers: [{
                            id: 'osm-tiles-layer',
                            type: 'raster',
                            source: 'osm-tiles'
                        }]
                    },
                    center: [${defaultLng}, ${defaultLat}],
                    zoom: 12,
                    attributionControl: false,
                    logoPosition: 'bottom-left'
                });

                map.on('load', function() {
                    console.log('✅ Mapa cargado exitosamente');
                    
                    const loadingEl = document.getElementById('loading');
                    loadingEl.style.opacity = '0';
                    setTimeout(() => {
                        loadingEl.style.display = 'none';
                        document.getElementById('map').style.display = 'block';
                    }, 500);
                    
                    notifyReactNative({
                        type: 'mapReady',
                        capabilities: {
                            userLocationTracking: true,
                            customMarkers: true,
                            popups: true,
                            smoothCentering: true
                        }
                    });
                });

                map.on('error', function(e) {
                    console.error('❌ Error del mapa:', e);
                    notifyReactNative({
                        type: 'error',
                        error: e.error ? e.error.message : 'Error desconocido del mapa'
                    });
                });

                // NEW: Listen for move end to confirm centering completed
                map.on('moveend', function() {
                    if (centeringInProgress) {
                        centeringInProgress = false;
                        const indicator = document.getElementById('centering-indicator');
                        if (indicator) {
                            indicator.classList.remove('active');
                        }
                        console.log('✅ Centrado completado');
                    }
                });

            } catch (error) {
                console.error('❌ Error crítico inicializando mapa:', error);
                notifyReactNative({
                    type: 'error',
                    error: error.message
                });
            }
        }
        
        /**
         * REFACTORED: Enhanced marker addition with better feedback
         */
        function addUserLocationMarker(markerData) {
            try {
                console.log('📍 PROCESANDO MARCADOR:', markerData.id);
                
                const { id, coordinates, title, description, accuracy, timestamp } = markerData;
                
                if (!coordinates || typeof coordinates.latitude !== 'number' || typeof coordinates.longitude !== 'number') {
                    throw new Error('Coordenadas inválidas: ' + JSON.stringify(coordinates));
                }
                
                const accuracyLevel = getAccuracyLevel(accuracy || 999);
                const accuracyConfig = ACCURACY_LEVELS[accuracyLevel];
                
                // Create marker element
                const markerElement = document.createElement('div');
                markerElement.className = \`custom-marker \${accuracyLevel} marker-entrance\`;
                
                const icon = {
                    excellent: '🎯',
                    high: '📍',
                    good: '📌',
                    fair: '📡',
                    poor: '📍'
                }[accuracyLevel];
                
                markerElement.innerHTML = icon;
                markerElement.setAttribute('data-marker-id', id);
                markerElement.setAttribute('data-accuracy', accuracy || 999);
                
                // NEW: Add accuracy ring for visual feedback
                if (accuracy && accuracy <= 50) {
                    const ring = document.createElement('div');
                    ring.className = 'accuracy-ring';
                    ring.style.width = '70px';
                    ring.style.height = '70px';
                    ring.style.top = '50%';
                    ring.style.left = '50%';
                    ring.style.transform = 'translate(-50%, -50%)';
                    ring.style.borderColor = accuracyConfig.color + '40';
                    markerElement.appendChild(ring);
                }
                
                const marker = new maplibregl.Marker({
                    element: markerElement,
                    anchor: 'center'
                })
                .setLngLat([coordinates.longitude, coordinates.latitude]);
                
                // Enhanced popup with more info
                if (title || description) {
                    const accuracyText = accuracy 
                        ? \`±\${Math.round(accuracy)}m - \${accuracyConfig.label}\`
                        : 'Precisión desconocida';
                    
                    const timeText = timestamp 
                        ? new Date(timestamp).toLocaleTimeString('es-MX', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })
                        : '';
                    
                    const popup = new maplibregl.Popup({ 
                        offset: 25,
                        closeButton: true,
                        closeOnClick: false
                    })
                    .setHTML(\`
                        <div style="text-align: center;">
                            <h3 style="margin: 0 0 8px 0; color: #1f2937; font-size: 14px; font-weight: 600;">
                                \${title || 'Mi Ubicación'}
                            </h3>
                            <p style="margin: 0 0 6px 0; color: #6b7280; font-size: 11px;">
                                <strong style="color: \${accuracyConfig.color};">\${accuracyText}</strong>
                            </p>
                            \${description ? \`
                                <p style="margin: 0 0 6px 0; color: #6b7280; font-size: 12px; white-space: pre-line;">
                                    \${description}
                                </p>
                            \` : ''}
                            \${timeText ? \`
                                <p style="margin: 0; color: #9ca3af; font-size: 10px;">
                                    📅 \${timeText}
                                </p>
                            \` : ''}
                        </div>
                    \`);
                    
                    marker.setPopup(popup);
                }
                
                marker.addTo(map);
                
                // Store marker with metadata
                userLocationMarkers.set(id, {
                    marker: marker,
                    element: markerElement,
                    coordinates: coordinates,
                    accuracy: accuracy,
                    accuracyLevel: accuracyLevel,
                    timestamp: timestamp || new Date().toISOString(),
                    addedAt: Date.now()
                });
                
                lastAddedMarkerId = id;
                
                // NEW: Add pulse effect to newest marker
                setTimeout(() => {
                    markerElement.classList.add('marker-pulse');
                    
                    // Remove pulse after a few seconds
                    setTimeout(() => {
                        markerElement.classList.remove('marker-pulse');
                    }, 5000);
                }, 800);
                
                cleanupOldMarkers();
                
                // IMPROVED: Send detailed confirmation to React Native
                notifyReactNative({
                    type: 'userLocationMarkerAdded',
                    markerId: id,
                    accuracy: accuracy,
                    precision: accuracyLevel,
                    coordinates: coordinates,
                    timestamp: timestamp,
                    totalMarkers: userLocationMarkers.size
                });
                
                console.log('✅ Marcador agregado exitosamente:', {
                    id,
                    accuracy: accuracy ? \`±\${Math.round(accuracy)}m\` : 'N/A',
                    level: accuracyLevel,
                    total: userLocationMarkers.size
                });
                
            } catch (error) {
                console.error('❌ Error agregando marcador:', error);
                notifyReactNative({
                    type: 'userLocationMarkerError',
                    error: error.message,
                    markerId: markerData.id || 'unknown'
                });
            }
        }
        
        function cleanupOldMarkers() {
            const maxMarkers = 5;
            
            if (userLocationMarkers.size > maxMarkers) {
                const markersArray = Array.from(userLocationMarkers.entries())
                    .sort((a, b) => new Date(b[1].timestamp) - new Date(a[1].timestamp));
                
                const toRemove = markersArray.slice(maxMarkers);
                
                toRemove.forEach(([markerId, markerData]) => {
                    try {
                        markerData.marker.remove();
                        userLocationMarkers.delete(markerId);
                        console.log(\`🗑️ Marcador antiguo removido: \${markerId}\`);
                    } catch (error) {
                        console.warn('⚠️ Error removiendo marcador antiguo:', error);
                    }
                });
            }
        }
        
        function clearAllUserMarkers() {
            try {
                userLocationMarkers.forEach((markerData, markerId) => {
                    try {
                        markerData.marker.remove();
                    } catch (error) {
                        console.warn(\`⚠️ Error removiendo marcador \${markerId}:\`, error);
                    }
                });
                
                userLocationMarkers.clear();
                lastAddedMarkerId = null;
                console.log('🗑️ Todos los marcadores de usuario eliminados');
                
                notifyReactNative({
                    type: 'userMarkersCleared'
                });
                
            } catch (error) {
                console.error('❌ Error limpiando marcadores:', error);
            }
        }
        
        /**
         * REFACTORED: Improved centering with visual feedback and easing
         */
        function centerOnLocation(data) {
            try {
                const { 
                    latitude, 
                    longitude, 
                    zoom = 16, 
                    animate = true, 
                    duration = 1500,
                    easing = 'ease-out'
                } = data;
                
                console.log(\`🎯 Centrando mapa en: \${latitude.toFixed(6)}, \${longitude.toFixed(6)}\`);
                
                // Show centering indicator
                const indicator = document.getElementById('centering-indicator');
                if (indicator && animate) {
                    indicator.classList.add('active');
                    centeringInProgress = true;
                }
                
                const options = {
                    center: [longitude, latitude],
                    zoom: zoom,
                    padding: { top: 50, bottom: 50, left: 50, right: 50 }
                };
                
                if (animate) {
                    // Use flyTo for smooth animation with easing
                    const easingFunction = easing === 'ease-out' 
                        ? (t) => t * (2 - t) // Quadratic ease-out
                        : (t) => t; // Linear
                    
                    map.flyTo({
                        ...options,
                        duration: duration,
                        essential: true,
                        easing: easingFunction
                    });
                    
                    // Notify after animation completes
                    setTimeout(() => {
                        notifyReactNative({
                            type: 'mapCentered',
                            coordinates: { latitude, longitude },
                            zoom: zoom,
                            animated: true
                        });
                        console.log('✅ Centrado completado con animación');
                    }, duration + 100);
                    
                } else {
                    map.jumpTo(options);
                    
                    notifyReactNative({
                        type: 'mapCentered',
                        coordinates: { latitude, longitude },
                        zoom: zoom,
                        animated: false
                    });
                    console.log('✅ Centrado instantáneo completado');
                }
                
            } catch (error) {
                console.error('❌ Error centrando mapa:', error);
                centeringInProgress = false;
                const indicator = document.getElementById('centering-indicator');
                if (indicator) {
                    indicator.classList.remove('active');
                }
                notifyReactNative({
                    type: 'centeringError',
                    error: error.message
                });
            }
        }
        
        function notifyReactNative(data) {
            if (window.ReactNativeWebView) {
                const message = {
                    ...data,
                    timestamp: new Date().toISOString(),
                    source: 'webview_map'
                };
                
                try {
                    window.ReactNativeWebView.postMessage(JSON.stringify(message));
                } catch (error) {
                    console.error('❌ Error enviando mensaje a RN:', error);
                }
            }
        }
        
        function handleIncomingMessage(event) {
            messageCount++;
            const msgId = \`[\${messageCount}]\`;
            
            try {
                const data = JSON.parse(event.data);
                console.log(\`📨 \${msgId} Mensaje recibido:\`, data.type);
                
                switch (data.type) {
                    case 'addUserLocationMarker':
                        if (data.marker) {
                            addUserLocationMarker(data.marker);
                        } else {
                            console.warn('⚠️ Mensaje sin datos de marcador');
                        }
                        break;
                        
                    case 'centerOnLocation':
                        centerOnLocation(data);
                        break;
                        
                    case 'clearUserMarkers':
                        clearAllUserMarkers();
                        break;
                        
                    case 'testConnection':
                        notifyReactNative({
                            type: 'connectionTestResponse',
                            message: 'WebView conectado correctamente',
                            originalPingTime: data.timestamp,
                            markers: userLocationMarkers.size,
                            lastMarkerId: lastAddedMarkerId
                        });
                        break;
                        
                    default:
                        console.log(\`❓ Tipo de mensaje desconocido:\`, data.type);
                }
                
            } catch (error) {
                console.error(\`❌ \${msgId} Error procesando mensaje:\`, error);
                notifyReactNative({
                    type: 'messageProcessingError',
                    error: error.message,
                    originalMessage: event.data
                });
            }
        }
        
        // Event listeners
        window.addEventListener('message', handleIncomingMessage);
        document.addEventListener('message', handleIncomingMessage);
        
        // Initialize map
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initMap);
        } else {
            initMap();
        }
        
        // Auto-test connection after initialization
        setTimeout(() => {
            notifyReactNative({
                type: 'webviewAutoTest',
                message: 'WebView inicializado y listo',
                mapReady: map ? true : false,
                markersSupported: true
            });
        }, 3000);
        
    </script>
</body>
</html>
  `;
};