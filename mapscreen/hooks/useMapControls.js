import { useRef, useCallback } from 'react';

const useMapControls = (webViewRef, isMapReady) => {
  const updateDriverLocation = useCallback((coords) => {
    if (webViewRef.current && isMapReady) {
      const message = JSON.stringify({
        type: 'updateDriverLocation',
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy,
        timestamp: coords.timestamp
      });
      
      webViewRef.current.postMessage(message);
    }
  }, [webViewRef, isMapReady]);

  const centerOnLocation = useCallback((coords) => {
    if (webViewRef.current && isMapReady) {
      const message = JSON.stringify({
        type: 'centerOnLocation',
        latitude: coords.latitude,
        longitude: coords.longitude
      });
      
      webViewRef.current.postMessage(message);
    }
  }, [webViewRef, isMapReady]);

  const fitToPackages = useCallback(() => {
    if (webViewRef.current && isMapReady) {
      const message = JSON.stringify({
        type: 'fitToPackages'
      });
      
      webViewRef.current.postMessage(message);
    }
  }, [webViewRef, isMapReady]);

  const loadPackagesOnMap = useCallback((packagesData, currentLocation) => {
    if (webViewRef.current && isMapReady) {
      const message = JSON.stringify({
        type: 'loadPackages',
        packages: packagesData,
        currentLocation: currentLocation
      });
      
      webViewRef.current.postMessage(message);
    }
  }, [webViewRef, isMapReady]);

  return {
    updateDriverLocation,
    centerOnLocation,
    fitToPackages,
    loadPackagesOnMap
  };
};

export default useMapControls;