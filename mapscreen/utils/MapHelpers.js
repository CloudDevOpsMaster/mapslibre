export const calculateDistance = (lat1, lon1, lat2, lon2) => {
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
};

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
    <title>Delivery Map</title>
    
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
            transition: opacity 0.5s ease;
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
    </style>
</head>
<body>
    <div id="loading" class="loading-screen">
        <div class="loading-spinner"></div>
        <div class="loading-text">Cargando mapa...</div>
    </div>
    
    <div id="map" style="display: none;"></div>

    <script>
        // Map initialization code would go here
        // This is a simplified version for illustration
        let map;
        
        function initMap() {
            try {
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
                    attributionControl: false
                });

                map.on('load', function() {
                    console.log('Map loaded successfully');
                    document.getElementById('loading').style.display = 'none';
                    document.getElementById('map').style.display = 'block';
                    
                    if (window.ReactNativeWebView) {
                        window.ReactNativeWebView.postMessage(JSON.stringify({
                            type: 'mapReady',
                            timestamp: new Date().toISOString()
                        }));
                    }
                });

                map.on('error', function(e) {
                    console.error('Map error:', e);
                    
                    if (window.ReactNativeWebView) {
                        window.ReactNativeWebView.postMessage(JSON.stringify({
                            type: 'error',
                            error: e.error ? e.error.message : 'Unknown map error'
                        }));
                    }
                });

            } catch (error) {
                console.error('Error initializing map:', error);
                
                if (window.ReactNativeWebView) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'error',
                        error: error.message
                    }));
                }
            }
        }

        // Handle messages from React Native
        window.addEventListener('message', function(event) {
            try {
                const data = JSON.parse(event.data);
                
                switch (data.type) {
                    case 'loadPackages':
                        console.log('Loading packages:', data.packages.length);
                        break;
                    case 'updateDriverLocation':
                        console.log('Updating driver location:', data.latitude, data.longitude);
                        break;
                    case 'centerOnLocation':
                        if (map) {
                            map.flyTo({
                                center: [data.longitude, data.latitude],
                                zoom: 15
                            });
                        }
                        break;
                }
            } catch (error) {
                console.error('Error handling message:', error);
            }
        });

        // Initialize map when DOM is loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initMap);
        } else {
            initMap();
        }
    </script>
</body>
</html>
  `;
};