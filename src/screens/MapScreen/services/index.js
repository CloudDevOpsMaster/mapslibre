// src/screens/MapScreen/services/index.js

import * as Location from 'expo-location';

/**
 * Services Layer for MapScreen
 * 
 * Implements Clean Architecture's Service Layer pattern.
 * Separates external dependencies (APIs, device services) from business logic.
 * 
 * Architecture benefits:
 * - Single Responsibility: Each service handles one domain
 * - Dependency Inversion: Controllers depend on abstractions, not implementations
 * - Testability: Easy to mock services for testing
 * - Maintainability: API changes contained within services
 */

// ================= LOCATION SERVICE =================

/**
 * LocationService - Handles device location and geocoding
 * 
 * Responsibilities:
 * - Get user location with permission handling
 * - Watch location changes for tracking
 * - Geocoding and reverse geocoding
 * - Location accuracy and error handling
 */
export class LocationService {
  constructor() {
    this.watchSubscription = null;
    this.lastKnownLocation = null;
    this.locationCache = new Map();
    this.geocodingCache = new Map();
  }

  /**
   * Request location permissions
   */
  async requestPermissions() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        throw new Error('Location permission denied');
      }
      
      // For background tracking in delivery apps
      const backgroundStatus = await Location.requestBackgroundPermissionsAsync();
      
      return {
        foreground: status === 'granted',
        background: backgroundStatus.status === 'granted'
      };
    } catch (error) {
      console.error('[LocationService] Permission error:', error);
      throw new Error(`Failed to request location permissions: ${error.message}`);
    }
  }

  /**
   * Get current user location
   */
  async getCurrentLocation(accuracy = Location.Accuracy.High) {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        throw new Error('Location permission not granted');
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy,
        timeout: 10000,
        maximumAge: 30000 // Use cached location if less than 30s old
      });

      const result = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        heading: location.coords.heading,
        speed: location.coords.speed,
        timestamp: location.timestamp
      };

      this.lastKnownLocation = result;
      console.log('[LocationService] Current location:', result);
      
      return result;
    } catch (error) {
      console.error('[LocationService] Get location error:', error);
      
      // Return last known location if available
      if (this.lastKnownLocation) {
        console.warn('[LocationService] Using cached location');
        return this.lastKnownLocation;
      }
      
      throw new Error(`Failed to get current location: ${error.message}`);
    }
  }

  /**
   * Start watching location changes for delivery tracking
   */
  async startLocationTracking(callback, options = {}) {
    try {
      const permissions = await this.requestPermissions();
      
      if (!permissions.foreground) {
        throw new Error('Foreground location permission required');
      }

      const defaultOptions = {
        accuracy: Location.Accuracy.High,
        timeInterval: 5000, // 5 seconds
        distanceInterval: 10 // 10 meters
      };

      this.watchSubscription = await Location.watchPositionAsync(
        { ...defaultOptions, ...options },
        (location) => {
          const result = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy,
            heading: location.coords.heading,
            speed: location.coords.speed,
            timestamp: location.timestamp
          };

          this.lastKnownLocation = result;
          callback(result);
        }
      );

      console.log('[LocationService] Location tracking started');
      return this.watchSubscription;
    } catch (error) {
      console.error('[LocationService] Start tracking error:', error);
      throw new Error(`Failed to start location tracking: ${error.message}`);
    }
  }

  /**
   * Stop location tracking
   */
  async stopLocationTracking() {
    if (this.watchSubscription) {
      this.watchSubscription.remove();
      this.watchSubscription = null;
      console.log('[LocationService] Location tracking stopped');
    }
  }

  /**
   * Reverse geocoding - get address from coordinates
   */
  async reverseGeocode(latitude, longitude) {
    const cacheKey = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
    
    if (this.geocodingCache.has(cacheKey)) {
      return this.geocodingCache.get(cacheKey);
    }

    try {
      const results = await Location.reverseGeocodeAsync({
        latitude,
        longitude
      });

      if (results.length > 0) {
        const address = results[0];
        const formatted = {
          formattedAddress: `${address.street || ''} ${address.streetNumber || ''}`.trim(),
          street: address.street,
          streetNumber: address.streetNumber,
          city: address.city,
          region: address.region,
          country: address.country,
          postalCode: address.postalCode,
          district: address.district
        };

        this.geocodingCache.set(cacheKey, formatted);
        return formatted;
      }

      return null;
    } catch (error) {
      console.error('[LocationService] Reverse geocoding error:', error);
      return null;
    }
  }

  /**
   * Forward geocoding - get coordinates from address
   */
  async geocode(address) {
    const cacheKey = address.toLowerCase().trim();
    
    if (this.geocodingCache.has(cacheKey)) {
      return this.geocodingCache.get(cacheKey);
    }

    try {
      const results = await Location.geocodeAsync(address);

      if (results.length > 0) {
        const location = results[0];
        const result = {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy
        };

        this.geocodingCache.set(cacheKey, result);
        return result;
      }

      return null;
    } catch (error) {
      console.error('[LocationService] Geocoding error:', error);
      return null;
    }
  }

  /**
   * Calculate distance between two points (Haversine formula)
   */
  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in kilometers
    
    return Math.round(distance * 1000); // Return in meters
  }

  /**
   * Get last known location without requesting new one
   */
  getLastKnownLocation() {
    return this.lastKnownLocation;
  }

  /**
   * Clear caches
   */
  clearCaches() {
    this.locationCache.clear();
    this.geocodingCache.clear();
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    await this.stopLocationTracking();
    this.clearCaches();
    this.lastKnownLocation = null;
  }

  // Utility methods
  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }
}

// ================= PACKAGE SERVICE =================

/**
 * PackageService - Handles delivery package operations
 * 
 * Responsibilities:
 * - Fetch packages from API
 * - Update package status and location
 * - Handle delivery tracking
 * - Manage package lifecycle
 */
export class PackageService {
  constructor(apiClient) {
    this.apiClient = apiClient;
    this.packageCache = new Map();
    this.subscriptions = new Map();
  }

  /**
   * Fetch packages for delivery person/route
   */
  async getPackages(filters = {}) {
    try {
      const cacheKey = JSON.stringify(filters);
      
      // Return cached data if recent
      if (this.packageCache.has(cacheKey)) {
        const cached = this.packageCache.get(cacheKey);
        if (Date.now() - cached.timestamp < 300000) { // 5 minutes
          return cached.data;
        }
      }

      const response = await this.apiClient.get('/packages', {
        params: {
          status: filters.status || 'pending,in_transit',
          deliveryPersonId: filters.deliveryPersonId,
          routeId: filters.routeId,
          date: filters.date || new Date().toISOString().split('T')[0],
          ...filters
        }
      });

      const packages = response.data.packages.map(pkg => ({
        id: pkg.id,
        number: pkg.tracking_number,
        recipientName: pkg.recipient_name,
        recipientPhone: pkg.recipient_phone,
        address: {
          street: pkg.delivery_address.street,
          number: pkg.delivery_address.number,
          city: pkg.delivery_address.city,
          postalCode: pkg.delivery_address.postal_code,
          formatted: pkg.delivery_address.formatted
        },
        coordinates: {
          latitude: pkg.delivery_address.latitude,
          longitude: pkg.delivery_address.longitude
        },
        status: pkg.status,
        priority: pkg.priority || 'normal',
        estimatedDelivery: pkg.estimated_delivery,
        specialInstructions: pkg.special_instructions,
        packageType: pkg.package_type,
        weight: pkg.weight,
        dimensions: pkg.dimensions,
        createdAt: pkg.created_at,
        updatedAt: pkg.updated_at
      }));

      // Cache the result
      this.packageCache.set(cacheKey, {
        data: packages,
        timestamp: Date.now()
      });

      console.log(`[PackageService] Fetched ${packages.length} packages`);
      return packages;
    } catch (error) {
      console.error('[PackageService] Fetch packages error:', error);
      throw new Error(`Failed to fetch packages: ${error.message}`);
    }
  }

  /**
   * Get single package details
   */
  async getPackage(packageId) {
    try {
      const response = await this.apiClient.get(`/packages/${packageId}`);
      
      return {
        id: response.data.id,
        number: response.data.tracking_number,
        recipientName: response.data.recipient_name,
        recipientPhone: response.data.recipient_phone,
        address: response.data.delivery_address,
        coordinates: {
          latitude: response.data.delivery_address.latitude,
          longitude: response.data.delivery_address.longitude
        },
        status: response.data.status,
        history: response.data.history || [],
        priority: response.data.priority || 'normal',
        specialInstructions: response.data.special_instructions,
        estimatedDelivery: response.data.estimated_delivery
      };
    } catch (error) {
      console.error('[PackageService] Get package error:', error);
      throw new Error(`Failed to get package: ${error.message}`);
    }
  }

  /**
   * Update package status and location
   */
  async updatePackageStatus(packageId, status, location = null, notes = '') {
    try {
      const updateData = {
        status,
        notes,
        timestamp: new Date().toISOString()
      };

      if (location) {
        updateData.location = {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy
        };
      }

      const response = await this.apiClient.put(`/packages/${packageId}/status`, updateData);

      // Invalidate cache
      this.packageCache.clear();

      console.log(`[PackageService] Updated package ${packageId} status to ${status}`);
      return response.data;
    } catch (error) {
      console.error('[PackageService] Update status error:', error);
      throw new Error(`Failed to update package status: ${error.message}`);
    }
  }

  /**
   * Mark package as delivered with proof
   */
  async deliverPackage(packageId, deliveryData) {
    try {
      const data = {
        status: 'delivered',
        deliveredAt: new Date().toISOString(),
        recipientName: deliveryData.recipientName,
        signature: deliveryData.signature,
        photo: deliveryData.photo,
        notes: deliveryData.notes,
        location: deliveryData.location
      };

      const response = await this.apiClient.post(`/packages/${packageId}/deliver`, data);

      // Invalidate cache
      this.packageCache.clear();

      console.log(`[PackageService] Package ${packageId} delivered successfully`);
      return response.data;
    } catch (error) {
      console.error('[PackageService] Delivery error:', error);
      throw new Error(`Failed to deliver package: ${error.message}`);
    }
  }

  /**
   * Report package delivery issue
   */
  async reportIssue(packageId, issue) {
    try {
      const data = {
        type: issue.type, // 'customer_not_available', 'wrong_address', 'damaged', 'other'
        description: issue.description,
        photos: issue.photos || [],
        location: issue.location,
        timestamp: new Date().toISOString()
      };

      const response = await this.apiClient.post(`/packages/${packageId}/issues`, data);
      
      console.log(`[PackageService] Reported issue for package ${packageId}`);
      return response.data;
    } catch (error) {
      console.error('[PackageService] Report issue error:', error);
      throw new Error(`Failed to report issue: ${error.message}`);
    }
  }

  /**
   * Optimize delivery route
   */
  async optimizeRoute(packages, startLocation) {
    try {
      const data = {
        packages: packages.map(pkg => ({
          id: pkg.id,
          latitude: pkg.coordinates.latitude,
          longitude: pkg.coordinates.longitude,
          priority: pkg.priority,
          estimatedDelivery: pkg.estimatedDelivery
        })),
        startLocation: {
          latitude: startLocation.latitude,
          longitude: startLocation.longitude
        },
        optimization: 'time' // 'time', 'distance', 'fuel'
      };

      const response = await this.apiClient.post('/routes/optimize', data);

      return {
        optimizedOrder: response.data.order,
        totalDistance: response.data.totalDistance,
        totalTime: response.data.totalTime,
        waypoints: response.data.waypoints
      };
    } catch (error) {
      console.error('[PackageService] Route optimization error:', error);
      // Fallback to simple sorting by priority and estimated delivery
      return this.fallbackOptimization(packages);
    }
  }

  /**
   * Subscribe to package updates via WebSocket/SSE
   */
  subscribeToPackageUpdates(packageId, callback) {
    // Implementation would depend on your real-time system
    // This is a mock implementation
    const subscription = {
      id: packageId,
      callback,
      unsubscribe: () => {
        this.subscriptions.delete(packageId);
      }
    };

    this.subscriptions.set(packageId, subscription);
    return subscription;
  }

  /**
   * Clear package cache
   */
  clearCache() {
    this.packageCache.clear();
  }

  /**
   * Fallback route optimization (client-side)
   */
  fallbackOptimization(packages) {
    const sorted = [...packages].sort((a, b) => {
      // Sort by priority first, then by estimated delivery time
      const priorityOrder = { 'high': 0, 'normal': 1, 'low': 2 };
      
      if (a.priority !== b.priority) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      
      return new Date(a.estimatedDelivery) - new Date(b.estimatedDelivery);
    });

    return {
      optimizedOrder: sorted.map(pkg => pkg.id),
      totalDistance: 0,
      totalTime: 0,
      waypoints: []
    };
  }
}

// ================= NOTIFICATION SERVICE =================

/**
 * NotificationService - Handles push notifications and alerts
 * 
 * Responsibilities:
 * - Send delivery notifications to customers
 * - Handle delivery person alerts
 * - Manage notification preferences
 * - Track notification delivery status
 */
export class NotificationService {
  constructor(apiClient, pushNotificationClient) {
    this.apiClient = apiClient;
    this.pushClient = pushNotificationClient;
    this.notificationQueue = [];
    this.retryAttempts = new Map();
  }

  /**
   * Send delivery notification to customer
   */
  async sendCustomerNotification(packageId, type, data = {}) {
    try {
      const notificationData = {
        packageId,
        type, // 'out_for_delivery', 'delivery_attempt', 'delivered', 'delayed'
        recipientPhone: data.recipientPhone,
        recipientEmail: data.recipientEmail,
        message: this.generateMessage(type, data),
        estimatedArrival: data.estimatedArrival,
        trackingUrl: `${data.baseUrl}/track/${packageId}`
      };

      const response = await this.apiClient.post('/notifications/customer', notificationData);
      
      console.log(`[NotificationService] Customer notification sent: ${type} for package ${packageId}`);
      return response.data;
    } catch (error) {
      console.error('[NotificationService] Customer notification error:', error);
      
      // Queue for retry
      this.queueNotification('customer', packageId, type, data);
      throw new Error(`Failed to send customer notification: ${error.message}`);
    }
  }

  /**
   * Send alert to delivery person
   */
  async sendDeliveryPersonAlert(deliveryPersonId, type, data = {}) {
    try {
      const alertData = {
        deliveryPersonId,
        type, // 'new_package', 'route_updated', 'urgent_delivery', 'system_message'
        title: this.generateAlertTitle(type),
        message: this.generateAlertMessage(type, data),
        priority: data.priority || 'normal',
        actionRequired: data.actionRequired || false,
        data: data.payload || {}
      };

      // Try push notification first
      if (this.pushClient) {
        try {
          await this.pushClient.sendNotification(deliveryPersonId, alertData);
        } catch (pushError) {
          console.warn('[NotificationService] Push notification failed, using API fallback');
        }
      }

      const response = await this.apiClient.post('/notifications/delivery-person', alertData);
      
      console.log(`[NotificationService] Delivery person alert sent: ${type}`);
      return response.data;
    } catch (error) {
      console.error('[NotificationService] Delivery person alert error:', error);
      
      this.queueNotification('delivery_person', deliveryPersonId, type, data);
      throw new Error(`Failed to send delivery person alert: ${error.message}`);
    }
  }

  /**
   * Send location-based proximity notification
   */
  async sendProximityNotification(packageId, distance, estimatedArrival) {
    try {
      const data = {
        packageId,
        distance, // in meters
        estimatedArrival: estimatedArrival.toISOString(),
        message: `Su paquete llegará en aproximadamente ${Math.ceil(estimatedArrival / 60)} minutos (${distance}m de distancia)`
      };

      return await this.sendCustomerNotification(packageId, 'proximity', data);
    } catch (error) {
      console.error('[NotificationService] Proximity notification error:', error);
      throw error;
    }
  }

  /**
   * Send bulk notifications (route updates, etc.)
   */
  async sendBulkNotifications(notifications) {
    const results = [];
    const batchSize = 10;

    for (let i = 0; i < notifications.length; i += batchSize) {
      const batch = notifications.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (notification) => {
        try {
          let result;
          
          if (notification.target === 'customer') {
            result = await this.sendCustomerNotification(
              notification.packageId,
              notification.type,
              notification.data
            );
          } else if (notification.target === 'delivery_person') {
            result = await this.sendDeliveryPersonAlert(
              notification.deliveryPersonId,
              notification.type,
              notification.data
            );
          }
          
          return { success: true, notification, result };
        } catch (error) {
          return { success: false, notification, error: error.message };
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);
      results.push(...batchResults.map(r => r.value || { success: false, error: r.reason }));
      
      // Brief delay between batches to avoid rate limiting
      if (i + batchSize < notifications.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`[NotificationService] Bulk notifications: ${successCount}/${notifications.length} successful`);
    
    return results;
  }

  /**
   * Queue failed notification for retry
   */
  queueNotification(target, id, type, data) {
    const notification = {
      target,
      id,
      type,
      data,
      attempts: 0,
      queuedAt: Date.now()
    };

    this.notificationQueue.push(notification);
  }

  /**
   * Process retry queue
   */
  async processRetryQueue() {
    const now = Date.now();
    const retryableNotifications = this.notificationQueue.filter(
      n => n.attempts < 3 && now - n.queuedAt > (1000 * Math.pow(2, n.attempts))
    );

    for (const notification of retryableNotifications) {
      try {
        notification.attempts++;
        
        if (notification.target === 'customer') {
          await this.sendCustomerNotification(notification.id, notification.type, notification.data);
        } else if (notification.target === 'delivery_person') {
          await this.sendDeliveryPersonAlert(notification.id, notification.type, notification.data);
        }
        
        // Remove from queue on success
        const index = this.notificationQueue.indexOf(notification);
        if (index > -1) {
          this.notificationQueue.splice(index, 1);
        }
      } catch (error) {
        console.error(`[NotificationService] Retry failed for notification:`, error);
        
        // Remove from queue if max attempts reached
        if (notification.attempts >= 3) {
          const index = this.notificationQueue.indexOf(notification);
          if (index > -1) {
            this.notificationQueue.splice(index, 1);
          }
        }
      }
    }
  }

  /**
   * Generate customer notification messages
   */
  generateMessage(type, data) {
    const messages = {
      out_for_delivery: `¡Su paquete #${data.packageNumber} está en camino! Llegada estimada: ${data.estimatedArrival}`,
      delivery_attempt: `Intentamos entregar su paquete #${data.packageNumber} pero no encontramos a nadie. Reintentaremos pronto.`,
      delivered: `¡Su paquete #${data.packageNumber} ha sido entregado exitosamente!`,
      delayed: `Su paquete #${data.packageNumber} se ha retrasado. Nueva estimación: ${data.newEstimatedArrival}`,
      proximity: data.message || `Su paquete está cerca. Llegada en ${data.estimatedMinutes} minutos.`
    };

    return messages[type] || `Actualización de paquete #${data.packageNumber}`;
  }

  /**
   * Generate delivery person alert titles
   */
  generateAlertTitle(type) {
    const titles = {
      new_package: 'Nuevo Paquete Asignado',
      route_updated: 'Ruta Actualizada',
      urgent_delivery: 'Entrega Urgente',
      system_message: 'Mensaje del Sistema'
    };

    return titles[type] || 'Notificación';
  }

  /**
   * Generate delivery person alert messages
   */
  generateAlertMessage(type, data) {
    const messages = {
      new_package: `Se le ha asignado un nuevo paquete: #${data.packageNumber}`,
      route_updated: `Su ruta ha sido optimizada. ${data.packageCount} paquetes en total.`,
      urgent_delivery: `Entrega urgente requerida para el paquete #${data.packageNumber}`,
      system_message: data.message || 'Tiene un mensaje del sistema.'
    };

    return messages[type] || 'Notificación del sistema';
  }

  /**
   * Clean up old queued notifications
   */
  cleanupQueue() {
    const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
    this.notificationQueue = this.notificationQueue.filter(n => n.queuedAt > cutoff);
  }
}

// ================= SERVICE FACTORY =================

/**
 * ServiceFactory - Creates and manages service instances
 * Implements Factory Pattern for service instantiation
 */
export class ServiceFactory {
  constructor(config = {}) {
    this.config = {
      apiBaseUrl: config.apiBaseUrl || 'https://api.delivery-app.com',
      apiKey: config.apiKey,
      pushNotificationConfig: config.pushNotificationConfig,
      ...config
    };
    
    this.services = new Map();
  }

  /**
   * Create or get LocationService instance
   */
  getLocationService() {
    if (!this.services.has('location')) {
      this.services.set('location', new LocationService());
    }
    return this.services.get('location');
  }

  /**
   * Create or get PackageService instance
   */
  getPackageService() {
    if (!this.services.has('package')) {
      const apiClient = this.createApiClient();
      this.services.set('package', new PackageService(apiClient));
    }
    return this.services.get('package');
  }

  /**
   * Create or get NotificationService instance
   */
  getNotificationService() {
    if (!this.services.has('notification')) {
      const apiClient = this.createApiClient();
      const pushClient = this.createPushClient();
      this.services.set('notification', new NotificationService(apiClient, pushClient));
    }
    return this.services.get('notification');
  }

  /**
   * Create API client (mock implementation)
   */
  createApiClient() {
    // In real implementation, this would be axios or fetch wrapper
    return {
      get: async (url, config) => {
        console.log(`[API] GET ${this.config.apiBaseUrl}${url}`, config);
        // Mock implementation
        return { data: { packages: [], message: 'success' } };
      },
      
      post: async (url, data, config) => {
        console.log(`[API] POST ${this.config.apiBaseUrl}${url}`, data);
        return { data: { success: true, id: Date.now().toString() } };
      },
      
      put: async (url, data, config) => {
        console.log(`[API] PUT ${this.config.apiBaseUrl}${url}`, data);
        return { data: { success: true } };
      },
      
      delete: async (url, config) => {
        console.log(`[API] DELETE ${this.config.apiBaseUrl}${url}`);
        return { data: { success: true } };
      }
    };
  }

  /**
   * Create push notification client (mock implementation)
   */
  createPushClient() {
    // Mock implementation
    return {
      sendNotification: async (userId, data) => {
        console.log(`[Push] Notification sent to ${userId}:`, data);
        return { success: true, messageId: Date.now().toString() };
      }
    };
  }

  /**
   * Cleanup all services
   */
  async cleanup() {
    for (const [name, service] of this.services) {
      if (service.cleanup && typeof service.cleanup === 'function') {
        try {
          await service.cleanup();
        } catch (error) {
          console.error(`[ServiceFactory] Error cleaning up ${name} service:`, error);
        }
      }
    }
    
    this.services.clear();
  }
}

// ================= EXPORTS =================

export default {
  LocationService,
  PackageService,  
  NotificationService,
  ServiceFactory
};