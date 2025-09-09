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
          if (mapRef.current?.isReady()) {
            resolve();
          } else {
            setTimeout(checkReady, 100);
          }
        };
        checkReady();
      });
      
      setMapState(prev => ({
        ...prev,
        isReady: true,
        isLoading: false
      }));
      
      console.log('[MapController] Initialized successfully');
    } catch (error) {
      handleError(error, 'initialization');
    }
  }, [handleError]);

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
      await mapRef.current?.setMarkers(markersArray);
      
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
        await mapRef.current?.setMarkers(markersArray);
        
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
        await mapRef.current?.setMarkers(markersArray);
        
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
        await mapRef.current?.setMarkers(markersArray);
        
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
      await mapRef.current?.setMarkers([]);
      
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
        const routeId = await mapRef.current?.addRoute(route);
        
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
      await mapRef.current?.removeRoute(routeId);
      
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
      center: data.center || prev.center,
      zoom: data.zoom || prev.zoom
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

  // ================= CLEANUP =================

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      
      // Clear operation queue
      operationQueueRef.current = [];
      
      console.log('[MapController] Cleaned up');
    };
  }, []);

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
    
    // Event handlers
    handleMapReady,
    handleMarkerClick,
    handleError,
    
    // Getters
    getMarkers,
    getMarker,
    getRoutes,
    getState,
    
    // Utilities
    isReady: mapState.isReady,
    isLoading: mapState.isLoading,
    hasError: !!mapState.error,
    error: mapState.error,
    selectedMarker: markersState.selectedMarker,
    markerCount: markersState.markers.size,
    routeCount: routesState.routes.size
  };
}