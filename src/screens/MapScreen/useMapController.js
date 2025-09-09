// src/screens/MapScreen/useMapController.js
import { useRef, useState, useCallback, useEffect } from 'react';

/**
 * useMapController - Business Logic Hook
 * 
 * Implements Controller Pattern to manage map state and operations.
 * Separates business logic from presentation layer for better testability and reusability.
 * 
 * Features:
 * - Marker management with CRUD operations
 * - Route management and optimization
 * - Location tracking and user positioning
 * - Error handling and recovery
 * - Performance optimization with debouncing
 * - State persistence and restoration
 * - Search and geocoding functionality
 * - Theme management
 * - Clustering support
 * - Batch operations
 * 
 * @param {Object} config - Controller configuration
 * @param {string} [config.provider='mock'] - Map provider
 * @param {Object} [config.initialConfig] - Initial map configuration
 * @param {boolean} [config.enableLocationTracking=false] - Enable location tracking
 * @param {boolean} [config.enablePersistence=true] - Enable state persistence
 * @param {number} [config.debounceMs=300] - Debounce delay for operations
 * @returns {Object} Controller state and methods
 */
export function useMapController({
  provider = 'mock',
  initialConfig = {},
  enableLocationTracking = false,
  enablePersistence = true,
  debounceMs = 300
} = {}) {
  
  // Refs for stable references
  const mapRef = useRef(null);
  const debounceTimeoutRef = useRef(null);
  const operationQueueRef = useRef([]);
  const lastKnownLocationRef = useRef(null);
  const locationWatchIdRef = useRef(null);
  
  // Core state management
  const [mapState, setMapState] = useState({
    isReady: false,
    isLoading: true,
    error: null,
    center: {
      latitude: initialConfig.latitude || 20.6597, // Tonalá, Jalisco
      longitude: initialConfig.longitude || -103.3496
    },
    zoom: initialConfig.zoom || 12,
    theme: initialConfig.theme || 'light'
  });
  
  // Markers state with CRUD operations
  const [markersState, setMarkersState] = useState({
    markers: new Map(), // Use Map for O(1) lookups
    selectedMarker: null,
    hoveredMarker: null,
    clusters: [],
    bounds: null
  });
  
  // Routes state management
  const [routesState, setRoutesState] = useState({
    routes: new Map(),
    activeRoute: null,
    routeOptimization: 'fastest', // 'fastest' | 'shortest' | 'eco'
    isCalculating: false
  });
  
  // Location tracking state
  const [locationState, setLocationState] = useState({
    userLocation: null,
    accuracy: null,
    heading: null,
    isTracking: enableLocationTracking,
    hasPermission: null
  });
  
  // Performance and analytics state
  const [performanceState, setPerformanceState] = useState({
    operationsCount: 0,
    lastOperationTime: null,
    averageResponseTime: 0,
    errorCount: 0
  });

  /**
   * Default map configuration with sensible defaults for delivery apps
   */
  const defaultMapConfig = {
    latitude: 20.6597,
    longitude: -103.3496,
    zoom: 12,
    theme: 'light',
    maxZoom: 18,
    minZoom: 1,
    enableClustering: true,
    clusterRadius: 50,
    showUserLocation: enableLocationTracking,
    followUserLocation: false,
    ...initialConfig
  };

  /**
   * Debounced operation executor to prevent excessive API calls
   */
  const executeDebounced = useCallback((operation, delay = debounceMs) => {
    return new Promise((resolve, reject) => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      
      debounceTimeoutRef.current = setTimeout(async () => {
        try {
          const startTime = Date.now();
          const result = await operation();
          const duration = Date.now() - startTime;
          
          // Update performance metrics
          setPerformanceState(prev => ({
            ...prev,
            operationsCount: prev.operationsCount + 1,
            lastOperationTime: startTime,
            averageResponseTime: (prev.averageResponseTime + duration) / 2
          }));
          
          resolve(result);
        } catch (error) {
          setPerformanceState(prev => ({
            ...prev,
            errorCount: prev.errorCount + 1
          }));
          reject(error);
        }
      }, delay);
    });
  }, [debounceMs]);

  /**
   * Error handler with automatic recovery
   */
  const handleError = useCallback((error, context = 'unknown') => {
    console.error(`[MapController] Error in ${context}:`, error);
    
    setMapState(prev => ({
      ...prev,
      error: {
        message: error.message,
        context,
        timestamp: Date.now(),
        recoverable: !error.message.includes('permission')
      }
    }));
    
    // Attempt automatic recovery for certain errors
    if (error.message.includes('network') || error.message.includes('timeout')) {
      setTimeout(() => {
        setMapState(prev => ({ ...prev, error: null }));
      }, 5000);
    }
  }, []);

  // ================= CORE MAP OPERATIONS =================

  /**
   * Initialize map controller
   */
  const initialize = useCallback(async () => {
    try {
      setMapState(prev => ({ ...prev, isLoading: true, error: null }));
      
      if (!mapRef.current) {
        throw new Error('Map reference not available');
      }
      
      // Wait for map to be ready
      await new Promise(resolve => {
        const checkReady = () => {
          if (mapRef.current?.isReady && mapRef.current.isReady()) {
            resolve();
          } else {
            setTimeout(checkReady, 100);
          }
        };
        checkReady();
      });
      
      // Restore persisted state if enabled
      if (enablePersistence) {
        await restoreState();
      }
      
      setMapState(prev => ({
        ...prev,
        isReady: true,
        isLoading: false
      }));
      
      console.log('[MapController] Initialized successfully');
    } catch (error) {
      handleError(error, 'initialization');
    }
  }, [handleError, enablePersistence]);

  /**
   * Update map center with animation
   */
  const centerOn = useCallback(async (latitude, longitude, zoom, animated = true) => {
    return executeDebounced(async () => {
      if (!mapRef.current) throw new Error('Map not ready');
      
      await mapRef.current.centerOn(latitude, longitude, zoom);
      
      setMapState(prev => ({
        ...prev,
        center: { latitude, longitude },
        zoom: zoom || prev.zoom
      }));
      
      console.log(`[MapController] Centered on: ${latitude}, ${longitude}`);
    });
  }, [executeDebounced]);

  /**
   * Fit map to show all markers/routes
   */
  const fitToContent = useCallback(async (padding = 50) => {
    return executeDebounced(async () => {
      if (!mapRef.current) throw new Error('Map not ready');
      
      const allMarkers = Array.from(markersState.markers.values());
      const allRoutes = Array.from(routesState.routes.values());
      
      if (allMarkers.length === 0 && allRoutes.length === 0) {
        console.warn('[MapController] No content to fit');
        return;
      }
      
      // Calculate bounds from markers and routes
      let bounds = calculateContentBounds(allMarkers, allRoutes);
      
      await mapRef.current.fitBounds(bounds, { padding });
      
      setMarkersState(prev => ({ ...prev, bounds }));
      console.log('[MapController] Fitted to content bounds');
    });
  }, [executeDebounced, markersState.markers, routesState.routes]);

  // ================= MARKER MANAGEMENT =================

  /**
   * Add single marker with validation
   */
  const addMarker = useCallback(async (marker) => {
    // Validate marker data
    if (!marker.id || typeof marker.latitude !== 'number' || typeof marker.longitude !== 'number') {
      throw new Error('Invalid marker data: id, latitude, and longitude are required');
    }
    
    return executeDebounced(async () => {
      const newMarkers = new Map(markersState.markers);
      newMarkers.set(marker.id, {
        ...marker,
        addedAt: Date.now(),
        status: 'active'
      });
      
      const markersArray = Array.from(newMarkers.values());
      await mapRef.current?.setMarkers?.(markersArray);
      
      setMarkersState(prev => ({
        ...prev,
        markers: newMarkers
      }));
      
      console.log(`[MapController] Added marker: ${marker.id}`);
      return marker.id;
    });
  }, [executeDebounced, markersState.markers]);

  /**
   * Add multiple markers efficiently
   */
  const addMarkers = useCallback(async (markers) => {
    if (!Array.isArray(markers)) {
      throw new Error('Markers must be an array');
    }
    
    return executeDebounced(async () => {
      const newMarkers = new Map(markersState.markers);
      const validMarkers = [];
      
      markers.forEach(marker => {
        if (marker.id && typeof marker.latitude === 'number' && typeof marker.longitude === 'number') {
          newMarkers.set(marker.id, {
            ...marker,
            addedAt: Date.now(),
            status: 'active'
          });
          validMarkers.push(marker);
        } else {
          console.warn('[MapController] Skipped invalid marker:', marker);
        }
      });
      
      if (validMarkers.length > 0) {
        const markersArray = Array.from(newMarkers.values());
        await mapRef.current?.setMarkers?.(markersArray);
        
        setMarkersState(prev => ({
          ...prev,
          markers: newMarkers
        }));
        
        console.log(`[MapController] Added ${validMarkers.length} markers`);
      }
      
      return validMarkers.map(m => m.id);
    });
  }, [executeDebounced, markersState.markers]);

  /**
   * Remove marker by ID
   */
  const removeMarker = useCallback(async (markerId) => {
    return executeDebounced(async () => {
      const newMarkers = new Map(markersState.markers);
      const removed = newMarkers.delete(markerId);
      
      if (removed) {
        const markersArray = Array.from(newMarkers.values());
        await mapRef.current?.setMarkers?.(markersArray);
        
        setMarkersState(prev => ({
          ...prev,
          markers: newMarkers,
          selectedMarker: prev.selectedMarker?.id === markerId ? null : prev.selectedMarker
        }));
        
        console.log(`[MapController] Removed marker: ${markerId}`);
      }
      
      return removed;
    });
  }, [executeDebounced, markersState.markers, markersState.selectedMarker]);

  /**
   * Update marker properties
   */
  const updateMarker = useCallback(async (markerId, updates) => {
    return executeDebounced(async () => {
      const newMarkers = new Map(markersState.markers);
      const existing = newMarkers.get(markerId);
      
      if (existing) {
        const updated = {
          ...existing,
          ...updates,
          id: markerId, // Prevent ID changes
          updatedAt: Date.now()
        };
        
        newMarkers.set(markerId, updated);
        
        const markersArray = Array.from(newMarkers.values());
        await mapRef.current?.setMarkers?.(markersArray);
        
        setMarkersState(prev => ({
          ...prev,
          markers: newMarkers
        }));
        
        console.log(`[MapController] Updated marker: ${markerId}`);
        return updated;
      }
      
      throw new Error(`Marker not found: ${markerId}`);
    });
  }, [executeDebounced, markersState.markers]);

  /**
   * Clear all markers
   */
  const clearMarkers = useCallback(async () => {
    return executeDebounced(async () => {
      await mapRef.current?.setMarkers?.([]);
      
      setMarkersState(prev => ({
        ...prev,
        markers: new Map(),
        selectedMarker: null,
        hoveredMarker: null,
        clusters: []
      }));
      
      console.log('[MapController] Cleared all markers');
    });
  }, [executeDebounced]);

  // ================= ROUTE MANAGEMENT =================

  /**
   * Add route with optimization
   */
  const addRoute = useCallback(async (route) => {
    if (!route.coordinates || !Array.isArray(route.coordinates)) {
      throw new Error('Route must have coordinates array');
    }
    
    setRoutesState(prev => ({ ...prev, isCalculating: true }));
    
    try {
      return await executeDebounced(async () => {
        const routeId = await mapRef.current?.addRoute?.(route) || `route_${Date.now()}`;
        
        if (routeId) {
          const newRoutes = new Map(routesState.routes);
          newRoutes.set(routeId, {
            ...route,
            id: routeId,
            addedAt: Date.now(),
            status: 'active'
          });
          
          setRoutesState(prev => ({
            ...prev,
            routes: newRoutes,
            isCalculating: false
          }));
          
          console.log(`[MapController] Added route: ${routeId}`);
          return routeId;
        }
        
        throw new Error('Failed to add route');
      });
    } catch (error) {
      setRoutesState(prev => ({ ...prev, isCalculating: false }));
      throw error;
    }
  }, [executeDebounced, routesState.routes]);

  /**
   * Remove route by ID
   */
  const removeRoute = useCallback(async (routeId) => {
    return executeDebounced(async () => {
      await mapRef.current?.removeRoute?.(routeId);
      
      const newRoutes = new Map(routesState.routes);
      const removed = newRoutes.delete(routeId);
      
      setRoutesState(prev => ({
        ...prev,
        routes: newRoutes,
        activeRoute: prev.activeRoute === routeId ? null : prev.activeRoute
      }));
      
      console.log(`[MapController] Removed route: ${routeId}`);
      return removed;
    });
  }, [executeDebounced, routesState.routes, routesState.activeRoute]);

  // ================= LOCATION TRACKING =================

  /**
   * Start location tracking
   */
  const startLocationTracking = useCallback(async () => {
    try {
      if (!navigator.geolocation) {
        throw new Error('Geolocation not supported');
      }

      // Check permissions first
      if (navigator.permissions) {
        const permission = await navigator.permissions.query({ name: 'geolocation' });
        setLocationState(prev => ({ 
          ...prev, 
          hasPermission: permission.state === 'granted'
        }));
      }

      setLocationState(prev => ({ ...prev, isTracking: true }));

      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            heading: position.coords.heading,
            timestamp: Date.now()
          };

          lastKnownLocationRef.current = location;
          
          setLocationState(prev => ({
            ...prev,
            userLocation: location,
            accuracy: position.coords.accuracy,
            heading: position.coords.heading,
            hasPermission: true
          }));

          console.log('[MapController] Location updated:', location);
        },
        (error) => {
          handleError(error, 'location_tracking');
          setLocationState(prev => ({ 
            ...prev, 
            isTracking: false,
            hasPermission: false
          }));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );

      locationWatchIdRef.current = watchId;
      return watchId;
    } catch (error) {
      handleError(error, 'start_location_tracking');
      throw error;
    }
  }, [handleError]);

  /**
   * Stop location tracking
   */
  const stopLocationTracking = useCallback(() => {
    if (locationWatchIdRef.current && navigator.geolocation) {
      navigator.geolocation.clearWatch(locationWatchIdRef.current);
      locationWatchIdRef.current = null;
    }
    
    setLocationState(prev => ({ ...prev, isTracking: false }));
    console.log('[MapController] Location tracking stopped');
  }, []);

  /**
   * Get current user location (one-time)
   */
  const getCurrentLocation = useCallback(async () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: Date.now()
          };
          
          lastKnownLocationRef.current = location;
          
          setLocationState(prev => ({
            ...prev,
            userLocation: location,
            accuracy: position.coords.accuracy,
            hasPermission: true
          }));
          
          resolve(location);
        },
        (error) => {
          handleError(error, 'get_current_location');
          setLocationState(prev => ({ ...prev, hasPermission: false }));
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      );
    });
  }, [handleError]);

  // ================= PERSISTENCE =================

  /**
   * Save state to localStorage
   */
  const saveState = useCallback(() => {
    if (!enablePersistence) return;
    
    try {
      const stateToSave = {
        center: mapState.center,
        zoom: mapState.zoom,
        theme: mapState.theme,
        markers: Array.from(markersState.markers.values()),
        routes: Array.from(routesState.routes.values()),
        timestamp: Date.now()
      };
      
      localStorage.setItem('mapController_state', JSON.stringify(stateToSave));
      console.log('[MapController] State saved to localStorage');
    } catch (error) {
      console.warn('[MapController] Failed to save state:', error);
    }
  }, [enablePersistence, mapState, markersState.markers, routesState.routes]);

  /**
   * Restore state from localStorage
   */
  const restoreState = useCallback(async () => {
    if (!enablePersistence) return;
    
    try {
      const savedState = localStorage.getItem('mapController_state');
      if (!savedState) return;
      
      const parsed = JSON.parse(savedState);
      
      // Check if state is not too old (24 hours)
      const maxAge = 24 * 60 * 60 * 1000;
      if (Date.now() - parsed.timestamp > maxAge) {
        localStorage.removeItem('mapController_state');
        return;
      }
      
      // Restore map state
      if (parsed.center) {
        setMapState(prev => ({
          ...prev,
          center: parsed.center,
          zoom: parsed.zoom || prev.zoom,
          theme: parsed.theme || prev.theme
        }));
      }
      
      // Restore markers
      if (parsed.markers && parsed.markers.length > 0) {
        const markersMap = new Map();
        parsed.markers.forEach(marker => {
          markersMap.set(marker.id, marker);
        });
        
        setMarkersState(prev => ({
          ...prev,
          markers: markersMap
        }));
      }
      
      // Restore routes
      if (parsed.routes && parsed.routes.length > 0) {
        const routesMap = new Map();
        parsed.routes.forEach(route => {
          routesMap.set(route.id, route);
        });
        
        setRoutesState(prev => ({
          ...prev,
          routes: routesMap
        }));
      }
      
      console.log('[MapController] State restored from localStorage');
    } catch (error) {
      console.warn('[MapController] Failed to restore state:', error);
      localStorage.removeItem('mapController_state');
    }
  }, [enablePersistence]);

  // ================= SEARCH AND GEOCODING =================

  /**
   * Search for places/addresses
   */
  const searchPlaces = useCallback(async (query, options = {}) => {
    return executeDebounced(async () => {
      if (!mapRef.current?.searchPlaces) {
        // Fallback to mock search
        return mockPlaceSearch(query);
      }
      
      const results = await mapRef.current.searchPlaces(query, {
        limit: options.limit || 10,
        bounds: options.bounds,
        types: options.types || ['address', 'poi']
      });
      
      console.log(`[MapController] Found ${results.length} places for: ${query}`);
      return results;
    });
  }, [executeDebounced]);

  /**
   * Reverse geocoding - get address from coordinates
   */
  const reverseGeocode = useCallback(async (latitude, longitude) => {
    return executeDebounced(async () => {
      if (!mapRef.current?.reverseGeocode) {
        // Fallback to mock reverse geocoding
        return mockReverseGeocode(latitude, longitude);
      }
      
      const result = await mapRef.current.reverseGeocode(latitude, longitude);
      console.log(`[MapController] Reverse geocoded: ${latitude}, ${longitude}`);
      return result;
    });
  }, [executeDebounced]);

  /**
   * Mock place search for testing
   */
  const mockPlaceSearch = async (query) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return [
      {
        id: 'place_1',
        name: `${query} - Resultado 1`,
        address: 'Calle Ejemplo 123, Guadalajara, Jalisco',
        latitude: 20.6597 + (Math.random() - 0.5) * 0.1,
        longitude: -103.3496 + (Math.random() - 0.5) * 0.1,
        type: 'address'
      },
      {
        id: 'place_2',
        name: `${query} - Resultado 2`,
        address: 'Avenida Ejemplo 456, Guadalajara, Jalisco',
        latitude: 20.6597 + (Math.random() - 0.5) * 0.1,
        longitude: -103.3496 + (Math.random() - 0.5) * 0.1,
        type: 'poi'
      }
    ];
  };

  /**
   * Mock reverse geocoding
   */
  const mockReverseGeocode = async (latitude, longitude) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    return {
      address: 'Calle Generada 789, Guadalajara, Jalisco, México',
      city: 'Guadalajara',
      state: 'Jalisco',
      country: 'México',
      postalCode: '44100',
      coordinates: { latitude, longitude }
    };
  };

  // ================= CLUSTERING =================

  /**
   * Update marker clustering
   */
  const updateClustering = useCallback(async (enable = true, options = {}) => {
    return executeDebounced(async () => {
      if (!mapRef.current?.updateClustering) return;
      
      await mapRef.current.updateClustering(enable, {
        radius: options.radius || 50,
        maxZoom: options.maxZoom || 15,
        minPoints: options.minPoints || 2,
        ...options
      });
      
      console.log(`[MapController] Clustering ${enable ? 'enabled' : 'disabled'}`);
    });
  }, [executeDebounced]);

  // ================= THEME MANAGEMENT =================

  /**
   * Change map theme
   */
  const setTheme = useCallback(async (theme) => {
    return executeDebounced(async () => {
      if (mapRef.current?.setTheme) {
        await mapRef.current.setTheme(theme);
      }
      
      setMapState(prev => ({ ...prev, theme }));
      console.log(`[MapController] Theme changed to: ${theme}`);
    });
  }, [executeDebounced]);

  // ================= BATCH OPERATIONS =================

  /**
   * Batch multiple operations for better performance
   */
  const batchOperations = useCallback(async (operations) => {
    setMapState(prev => ({ ...prev, isLoading: true }));
    
    try {
      const results = [];
      
      for (const operation of operations) {
        const result = await operation();
        results.push(result);
      }
      
      setMapState(prev => ({ ...prev, isLoading: false }));
      console.log(`[MapController] Completed ${operations.length} batch operations`);
      
      return results;
    } catch (error) {
      setMapState(prev => ({ ...prev, isLoading: false }));
      handleError(error, 'batch_operations');
      throw error;
    }
  }, [handleError]);

  // ================= EVENT HANDLERS =================

  /**
   * Handle marker selection
   */
  const selectMarker = useCallback((markerId) => {
    const marker = markersState.markers.get(markerId);
    if (marker) {
      setMarkersState(prev => ({ ...prev, selectedMarker: marker }));
      console.log(`[MapController] Selected marker: ${markerId}`);
    }
  }, [markersState.markers]);

  /**
   * Handle map ready event
   */
  const handleMapReady = useCallback((data) => {
    setMapState(prev => ({
      ...prev,
      isReady: true,
      isLoading: false,
      error: null,
      center: data?.center || prev.center,
      zoom: data?.zoom || prev.zoom
    }));
    
    console.log('[MapController] Map ready');
  }, []);

  /**
   * Handle marker click with selection
   */
  const handleMarkerClick = useCallback((data) => {
    if (data.marker) {
      selectMarker(data.marker.id);
    }
  }, [selectMarker]);

  // ================= UTILITY FUNCTIONS =================

  /**
   * Calculate bounds from markers and routes
   */
  const calculateContentBounds = (markers, routes) => {
    let minLat = Infinity, maxLat = -Infinity;
    let minLng = Infinity, maxLng = -Infinity;
    
    // Include marker positions
    markers.forEach(marker => {
      minLat = Math.min(minLat, marker.latitude);
      maxLat = Math.max(maxLat, marker.latitude);
      minLng = Math.min(minLng, marker.longitude);
      maxLng = Math.max(maxLng, marker.longitude);
    });
    
    // Include route coordinates
    routes.forEach(route => {
      route.coordinates.forEach(coord => {
        minLat = Math.min(minLat, coord.lat);
        maxLat = Math.max(maxLat, coord.lat);
        minLng = Math.min(minLng, coord.lng);
        maxLng = Math.max(maxLng, coord.lng);
      });
    });
    
    return {
      north: maxLat,
      south: minLat,
      east: maxLng,
      west: minLng
    };
  };

  /**
   * Get current markers as array
   */
  const getMarkers = useCallback(() => {
    return Array.from(markersState.markers.values());
  }, [markersState.markers]);

  /**
   * Get marker by ID
   */
  const getMarker = useCallback((markerId) => {
    return markersState.markers.get(markerId) || null;
  }, [markersState.markers]);

  /**
   * Get current routes as array
   */
  const getRoutes = useCallback(() => {
    return Array.from(routesState.routes.values());
  }, [routesState.routes]);

  /**
   * Get current state summary
   */
  const getState = useCallback(() => ({
    map: mapState,
    markers: {
      ...markersState,
      count: markersState.markers.size
    },
    routes: {
      ...routesState,
      count: routesState.routes.size
    },
    location: locationState,
    performance: performanceState
  }), [mapState, markersState, routesState, locationState, performanceState]);

  // ================= AUTO-SAVE EFFECT =================

  /**
   * Auto-save state when it changes
   */
  useEffect(() => {
    if (enablePersistence && mapState.isReady) {
      const timeoutId = setTimeout(saveState, 1000); // Debounce saves
      return () => clearTimeout(timeoutId);
    }
  }, [mapState, markersState.markers, routesState.routes, saveState, enablePersistence]);

  // ================= CLEANUP =================

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      
      if (locationWatchIdRef.current) {
        stopLocationTracking();
      }
      
      // Clear operation queue
      operationQueueRef.current = [];
      
      console.log('[MapController] Cleaned up');
    };
  }, [stopLocationTracking]);

  // ================= RETURN API =================

  return {
    // Refs
    mapRef,
    
    // State
    mapState,
    markersState,
    routesState,
    locationState,
    performanceState,
    
    // Configuration
    defaultMapConfig,
    
    // Core operations
    initialize,
    centerOn,
    fitToContent,
    
    // Marker management
    addMarker,
    addMarkers,
    removeMarker,
    updateMarker,
    clearMarkers,
    selectMarker,
    
    // Route management
    addRoute,
    removeRoute,
    
    // Location tracking
    startLocationTracking,
    stopLocationTracking,
    getCurrentLocation,
    userLocation: locationState.userLocation,
    isTracking: locationState.isTracking,
    
    // Persistence
    saveState,
    restoreState,
    
    // Search and geocoding
    searchPlaces,
    reverseGeocode,
    
    // Clustering
    updateClustering,
    
    // Theme
    setTheme,
    currentTheme: mapState.theme,
    
    // Batch operations
    batchOperations,
    
    // Event handlers
    handleMapReady,
    handleMarkerClick,
    handleError,
    
    // Getters
    getMarkers,
    getMarker,
    getRoutes,
    getState,
    
    // Utilities and computed values
    isReady: mapState.isReady,
    isLoading: mapState.isLoading,
    hasError: !!mapState.error,
    error: mapState.error,
    selectedMarker: markersState.selectedMarker,
    markerCount: markersState.markers.size,
    routeCount: routesState.routes.size,
    hasLocationPermission: locationState.hasPermission,
    operationsCount: performanceState.operationsCount,
    averageResponseTime: performanceState.averageResponseTime,
    errorCount: performanceState.errorCount,
    
    // Center and zoom shortcuts
    center: mapState.center,
    zoom: mapState.zoom,
    
    // Bounds information
    bounds: markersState.bounds,
    
    // Active route info
    activeRoute: routesState.activeRoute,
    isCalculatingRoute: routesState.isCalculating,
    
    // Location accuracy
    locationAccuracy: locationState.accuracy,
    locationHeading: locationState.heading,
    lastKnownLocation: lastKnownLocationRef.current
  };
}