// ============================================================================
// FILE: mapscreen/utils/mapHTMLGenerator.js
// PURPOSE: Generate MapLibre GL HTML for WebView
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
        
        /* Custom marker styles */
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
            transition: all 0.3s ease;
        }
        
        .custom-marker:hover {
            transform: scale(1.1);
            box-shadow: 0 6px 20px rgba(0,0,0,0.5);
        }
        
        .custom-marker.excellent {
            background-color: #10b981;
            border-color: #ffffff;
            width: 40px;
            height: 40px;
        }
        
        .custom-marker.high {
            background-color: #059669;
            border-color: #ffffff;
            width: 36px;
            height: 36px;
        }
        
        .custom-marker.good {
            background-color: #3b82f6;
            border-color: #ffffff;
            width: 32px;
            height: 32px;
        }
        
        .custom-marker.fair {
            background-color: #f59e0b;
            border-color: #ffffff;
            width: 28px;
            height: 28px;
        }
        
        .custom-marker.poor {
            background-color: #ef4444;
            border-color: #ffffff;
            width: 24px;
            height: 24px;
        }
        
        .marker-entrance {
            animation: markerEntrance 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        
        @keyframes markerEntrance {
            0% { 
                transform: scale(0) rotate(180deg); 
                opacity: 0; 
            }
            100% { 
                transform: scale(1) rotate(0deg); 
                opacity: 1; 
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
    </style>
</head>
<body>
    <div id="loading" class="loading-screen">
        <div class="loading-spinner"></div>
        <div class="loading-text">Inicializando mapa avanzado...</div>
    </div>
    
    <div id="map" style="display: none;"></div>

    <script>
        let map;
        let userLocationMarkers = new Map();
        let messageCount = 0;
        
        // Accuracy configuration
        const ACCURACY_LEVELS = {
            excellent: { threshold: 5, label: 'Excelente' },
            high: { threshold: 15, label: 'Muy buena' },
            good: { threshold: 50, label: 'Buena' },
            fair: { threshold: 100, label: 'Regular' },
            poor: { threshold: Infinity, label: 'Baja' }
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
                            popups: true
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

            } catch (error) {
                console.error('❌ Error crítico inicializando mapa:', error);
                notifyReactNative({
                    type: 'error',
                    error: error.message
                });
            }
        }
        
        function addUserLocationMarker(markerData) {
            try {
                console.log('📍 PROCESANDO MARCADOR:', markerData.id);
                
                const { id, coordinates, title, description, accuracy, style } = markerData;
                
                if (!coordinates || typeof coordinates.latitude !== 'number' || typeof coordinates.longitude !== 'number') {
                    throw new Error('Coordenadas inválidas: ' + JSON.stringify(coordinates));
                }
                
                const accuracyLevel = getAccuracyLevel(accuracy || 999);
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
                
                const marker = new maplibregl.Marker({
                    element: markerElement,
                    anchor: 'center'
                })
                .setLngLat([coordinates.longitude, coordinates.latitude]);
                
                if (title || description) {
                    const popup = new maplibregl.Popup({ 
                        offset: 25,
                        closeButton: true,
                        closeOnClick: false
                    })
                    .setHTML(\`
                        <div style="text-align: center;">
                            <h3 style="margin: 0 0 8px 0; color: #1f2937; font-size: 14px;">
                                \${title || 'Mi Ubicación'}
                            </h3>
                            \${description ? \`
                                <p style="margin: 0; color: #6b7280; font-size: 12px; white-space: pre-line;">
                                    \${description}
                                </p>
                            \` : ''}
                        </div>
                    \`);
                    
                    marker.setPopup(popup);
                }
                
                marker.addTo(map);
                
                userLocationMarkers.set(id, {
                    marker: marker,
                    element: markerElement,
                    coordinates: coordinates,
                    accuracy: accuracy,
                    timestamp: markerData.timestamp || new Date().toISOString()
                });
                
                cleanupOldMarkers();
                
                notifyReactNative({
                    type: 'userLocationMarkerAdded',
                    markerId: id,
                    accuracy: accuracy,
                    precision: accuracyLevel,
                    coordinates: coordinates
                });
                
                console.log('✅ Marcador agregado exitosamente');
                
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
                console.log('🗑️ Todos los marcadores de usuario eliminados');
                
                notifyReactNative({
                    type: 'userMarkersCleared'
                });
                
            } catch (error) {
                console.error('❌ Error limpiando marcadores:', error);
            }
        }
        
        function centerOnLocation(data) {
            try {
                const { latitude, longitude, zoom = 15, animate = true, duration = 1500 } = data;
                
                const options = {
                    center: [longitude, latitude],
                    zoom: zoom
                };
                
                if (animate) {
                    map.flyTo({
                        ...options,
                        duration: duration,
                        essential: true
                    });
                } else {
                    map.jumpTo(options);
                }
                
                setTimeout(() => {
                    notifyReactNative({
                        type: 'mapCentered',
                        coordinates: { latitude, longitude },
                        zoom: zoom
                    });
                }, animate ? duration : 100);
                
            } catch (error) {
                console.error('❌ Error centrando mapa:', error);
                notifyReactNative({
                    type: 'error',
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
                
                switch (data.type) {
                    case 'addUserLocationMarker':
                        if (data.marker) {
                            addUserLocationMarker(data.marker);
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
                            originalPingTime: data.timestamp
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
        
        window.addEventListener('message', handleIncomingMessage);
        document.addEventListener('message', handleIncomingMessage);
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initMap);
        } else {
            initMap();
        }
        
        setTimeout(() => {
            notifyReactNative({
                type: 'webviewAutoTest',
                message: 'WebView inicializado y listo'
            });
        }, 3000);
        
    </script>
</body>
</html>
  `;
};
