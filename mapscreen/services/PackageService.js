// services/PackageService.js - Service for package management operations
class PackageService {
  constructor(adapter) {
    this.adapter = adapter;
  }

  /**
   * Get all packages with optional filtering
   */
  async getPackages(filters = {}) {
    try {
      const packages = await this.adapter.getPackages(filters);
      return packages;
    } catch (error) {
      console.error('PackageService: Error getting packages:', error);
      throw error;
    }
  }

  /**
   * Update package status
   */
  async updatePackageStatus(id, status) {
    try {
      const updatedPackage = await this.adapter.updatePackageStatus(id, status);
      return updatedPackage;
    } catch (error) {
      console.error('PackageService: Error updating package status:', error);
      throw error;
    }
  }

  /**
   * Get package details by ID
   */
  async getPackageDetails(id) {
    try {
      const packageDetails = await this.adapter.getPackageDetails(id);
      return packageDetails;
    } catch (error) {
      console.error('PackageService: Error getting package details:', error);
      throw error;
    }
  }

  /**
   * Subscribe to package updates
   */
  subscribe(callback) {
    return this.adapter.subscribe(callback);
  }

  /**
   * Filter packages by status
   */
  filterPackagesByStatus(packages, status) {
    if (status === 'all') return packages;
    return packages.filter(pkg => pkg.status === status);
  }

  /**
   * Sort packages by various criteria
   */
  sortPackages(packages, sortBy) {
    let sortedPackages = [...packages];
    
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
      
      default:
        return sortedPackages;
    }
  }

  /**
   * Get delivery statistics
   */
  getDeliveryStats(packages) {
    return {
      total: packages.length,
      pending: packages.filter(p => p.status === 'PENDING').length,
      inTransit: packages.filter(p => p.status === 'IN_TRANSIT').length,
      outForDelivery: packages.filter(p => p.status === 'OUT_FOR_DELIVERY').length,
      delivered: packages.filter(p => p.status === 'DELIVERED').length,
      failed: packages.filter(p => p.status === 'FAILED').length,
    };
  }

  /**
   * Search packages by various criteria
   */
  searchPackages(packages, searchTerm) {
    if (!searchTerm) return packages;
    
    const term = searchTerm.toLowerCase();
    return packages.filter(pkg => 
      pkg.trackingNumber.toLowerCase().includes(term) ||
      pkg.recipientName.toLowerCase().includes(term) ||
      pkg.recipientAddress.toLowerCase().includes(term) ||
      (pkg.tags && pkg.tags.some(tag => tag.toLowerCase().includes(term)))
    );
  }

  /**
   * Get packages that need attention (urgent priority or failed deliveries)
   */
  getPriorityPackages(packages) {
    return packages.filter(pkg => 
      pkg.priority === 'URGENT' || 
      pkg.status === 'FAILED' ||
      (pkg.attempts >= pkg.maxAttempts && pkg.status !== 'DELIVERED')
    );
  }

  /**
   * Get packages near a specific location
   */
  getPackagesNearLocation(packages, location, radius = 1000) {
    return packages.filter(pkg => {
      if (!pkg.latitude || !pkg.longitude) return false;
      
      const distance = this.calculateDistance(
        location.latitude,
        location.longitude,
        pkg.latitude,
        pkg.longitude
      );
      
      return distance <= radius;
    });
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  /**
   * Group packages by status
   */
  groupPackagesByStatus(packages) {
    const grouped = {};
    
    packages.forEach(pkg => {
      if (!grouped[pkg.status]) {
        grouped[pkg.status] = [];
      }
      grouped[pkg.status].push(pkg);
    });
    
    return grouped;
  }

  /**
   * Get packages that are due for delivery soon
   */
  getDuePackages(packages, hoursThreshold = 2) {
    const now = new Date();
    const thresholdTime = new Date(now.getTime() + hoursThreshold * 60 * 60 * 1000);
    
    return packages.filter(pkg => {
      if (!pkg.estimatedDelivery) return false;
      
      const deliveryTime = new Date(pkg.estimatedDelivery);
      return deliveryTime <= thresholdTime && 
             deliveryTime >= now &&
             pkg.status !== 'DELIVERED' &&
             pkg.status !== 'FAILED';
    });
  }

  /**
   * Validate package data
   */
  validatePackage(packageData) {
    const errors = [];
    
    if (!packageData.recipientName) {
      errors.push('Recipient name is required');
    }
    
    if (!packageData.recipientAddress) {
      errors.push('Recipient address is required');
    }
    
    if (!packageData.latitude || !packageData.longitude) {
      errors.push('Delivery coordinates are required');
    }
    
    if (!packageData.status) {
      errors.push('Status is required');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Export packages to CSV format
   */
  exportToCSV(packages) {
    if (packages.length === 0) return '';
    
    const headers = [
      'ID',
      'Tracking Number',
      'Recipient Name',
      'Recipient Address',
      'Status',
      'Priority',
      'Estimated Delivery',
      'Weight (kg)',
      'Package Value'
    ].join(',');
    
    const rows = packages.map(pkg => [
      pkg.id,
      pkg.trackingNumber,
      `"${pkg.recipientName}"`,
      `"${pkg.recipientAddress}"`,
      pkg.status,
      pkg.priority,
      pkg.estimatedDelivery,
      pkg.weight,
      pkg.packageValue
    ].join(','));
    
    return [headers, ...rows].join('\n');
  }
}

export default PackageService;