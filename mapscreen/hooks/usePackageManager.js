// hooks/usePackageManager.js - Custom hook for managing package data
import { useState, useEffect, useCallback } from 'react';

/**
 * usePackageManager - Custom hook for managing package data from an adapter
 * @param {Object} adapter - The adapter instance to use for data operations
 * @param {Array} initialPackages - Initial packages array
 * @returns {Object} - Package management functions and state
 */
const usePackageManager = (adapter, initialPackages = []) => {
  const [packages, setPackages] = useState(initialPackages);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Load packages from the adapter
   */
  const loadPackages = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const packageData = await adapter.getPackages();
      setPackages(packageData);
      return packageData;
    } catch (err) {
      setError(err.message);
      console.error('Error loading packages:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [adapter]);

  /**
   * Update package status
   */
  const updatePackageStatus = useCallback(async (packageId, newStatus) => {
    try {
      setError(null);
      const updatedPackage = await adapter.updatePackageStatus(packageId, newStatus);
      
      setPackages(prevPackages => 
        prevPackages.map(pkg => 
          pkg.id === packageId 
            ? { ...pkg, status: newStatus, updatedAt: new Date().toISOString() }
            : pkg
        )
      );
      
      return updatedPackage;
    } catch (err) {
      setError(err.message);
      console.error('Error updating package status:', err);
      throw err;
    }
  }, [adapter]);

  /**
   * Get package details by ID
   */
  const getPackageDetails = useCallback(async (packageId) => {
    try {
      setError(null);
      return await adapter.getPackageDetails(packageId);
    } catch (err) {
      setError(err.message);
      console.error('Error getting package details:', err);
      throw err;
    }
  }, [adapter]);

  /**
   * Subscribe to package updates
   */
  const subscribeToUpdates = useCallback((callback) => {
    return adapter.subscribe(callback);
  }, [adapter]);

  /**
   * Add a new package
   */
  const addPackage = useCallback(async (newPackage) => {
    try {
      setError(null);
      const addedPackage = await adapter.addPackage(newPackage);
      setPackages(prev => [...prev, addedPackage]);
      return addedPackage;
    } catch (err) {
      setError(err.message);
      console.error('Error adding package:', err);
      throw err;
    }
  }, [adapter]);

  /**
   * Remove a package by ID
   */
  const removePackage = useCallback(async (packageId) => {
    try {
      setError(null);
      await adapter.removePackage(packageId);
      setPackages(prev => prev.filter(pkg => pkg.id !== packageId));
      return true;
    } catch (err) {
      setError(err.message);
      console.error('Error removing package:', err);
      throw err;
    }
  }, [adapter]);

  /**
   * Filter packages by status
   */
  const filterPackagesByStatus = useCallback((status) => {
    if (status === 'all') return packages;
    return packages.filter(pkg => pkg.status === status);
  }, [packages]);

  /**
   * Sort packages by various criteria
   */
  const sortPackages = useCallback((sortBy) => {
    const sortedPackages = [...packages];
    
    switch (sortBy) {
      case 'priority': {
        const priorityOrder = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
        return sortedPackages.sort((a, b) => 
          priorityOrder[a.priority] - priorityOrder[b.priority]
        );
      }
      
      case 'distance': {
        // This would require current location to calculate distances
        return sortedPackages;
      }
      
      case 'deliveryTime': {
        return sortedPackages.sort((a, b) => 
          new Date(a.estimatedDelivery) - new Date(b.estimatedDelivery)
        );
      }
      
      case 'createdAt': {
        return sortedPackages.sort((a, b) => 
          new Date(a.createdAt) - new Date(b.createdAt)
        );
      }
      
      default:
        return sortedPackages;
    }
  }, [packages]);

  /**
   * Get delivery statistics
   */
  const getDeliveryStats = useCallback(() => {
    return {
      total: packages.length,
      pending: packages.filter(p => p.status === 'PENDING').length,
      inTransit: packages.filter(p => p.status === 'IN_TRANSIT').length,
      outForDelivery: packages.filter(p => p.status === 'OUT_FOR_DELIVERY').length,
      delivered: packages.filter(p => p.status === 'DELIVERED').length,
      failed: packages.filter(p => p.status === 'FAILED').length,
    };
  }, [packages]);

  /**
   * Refresh packages data
   */
  const refreshPackages = useCallback(async () => {
    return await loadPackages();
  }, [loadPackages]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Load packages on initial render
  useEffect(() => {
    if (adapter) {
      loadPackages();
    }
  }, [adapter, loadPackages]);

  return {
    // State
    packages,
    isLoading,
    error,
    
    // Actions
    loadPackages,
    updatePackageStatus,
    getPackageDetails,
    subscribeToUpdates,
    addPackage,
    removePackage,
    filterPackagesByStatus,
    sortPackages,
    getDeliveryStats,
    refreshPackages,
    clearError,
  };
};

export default usePackageManager;