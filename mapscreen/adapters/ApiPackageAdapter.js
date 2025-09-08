// adapters/ApiPackageAdapter.js - Unified REST API adapter for package data
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * ApiPackageAdapter - Production-ready REST API adapter for package data
 * Implements IPackageAdapter interface with caching, real-time updates, and offline support
 */
class ApiPackageAdapter {
  constructor(config = {}) {
    this.config = {
      baseUrl: 'https://api.delivery.com',
      apiKey: null,
      timeout: 10000,
      retryAttempts: 3,
      retryDelay: 1000,
      enableCaching: true,
      cacheExpiry: 5 * 60 * 1000, // 5 minutes
      enableRealtime: true,
      websocketUrl: null,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      endpoints: {
        packages: '/packages',
        packageDetails: '/packages/:id',
        updateStatus: '/packages/:id/status',
        search: '/packages/search',
        create: '/packages',
        delete: '/packages/:id',
        history: '/packages/:id/history',
        batchStatus: '/packages/batch/status',
        health: '/health'
      },
      ...config
    };
    
    this.cache = new Map();
    this.subscribers = new Set();
    this.websocket = null;
    this.requestQueue = [];
    this.isOnline = true;
    
    // Initialize
    this.setupNetworkMonitoring();
    if (this.config.enableRealtime) {
      this.initializeWebSocket();
    }
  }

  // Core CRUD Operations

  /**
   * Get all packages
   */
  async getPackages() {
    const cacheKey = 'packages_all';
    
    try {
      // Check cache first
      if (this.config.enableCaching) {
        const cached = this.getCachedData(cacheKey);
        if (cached) {
          console.log('ApiAdapter: Returning cached packages');
          return cached;
        }
      }
      
      console.log('ApiAdapter: Fetching packages from API');
      const response = await this.makeRequest('GET', this.config.endpoints.packages);
      const packages = response.data || response;
      
      // Cache the response
      if (this.config.enableCaching) {
        this.setCachedData(cacheKey, packages);
      }
      
      console.log(`ApiAdapter: Fetched ${packages.length} packages`);
      return packages;
      
    } catch (error) {
      console.error('ApiAdapter: Error fetching packages:', error);
      
      // Try to return cached data on error
      if (this.config.enableCaching) {
        const cached = this.getCachedData(cacheKey, true); // Force expired cache
        if (cached) {
          console.log('ApiAdapter: Returning stale cached packages due to error');
          return cached;
        }
      }
      
      throw this.createApiError(error, 'FETCH_PACKAGES_FAILED');
    }
  }

  /**
   * Get package details by ID
   */
  async getPackageDetails(packageId) {
    const cacheKey = `package_${packageId}`;
    
    try {
      if (this.config.enableCaching) {
        const cached = this.getCachedData(cacheKey);
        if (cached) {
          console.log(`ApiAdapter: Returning cached package details for ${packageId}`);
          return cached;
        }
      }
      
      console.log(`ApiAdapter: Fetching package details for ${packageId}`);
      const endpoint = this.config.endpoints.packageDetails.replace(':id', packageId);
      const response = await this.makeRequest('GET', endpoint);
      const packageDetails = response.data || response;
      
      if (this.config.enableCaching) {
        this.setCachedData(cacheKey, packageDetails);
      }
      
      return packageDetails;
      
    } catch (error) {
      console.error(`ApiAdapter: Error fetching package details for ${packageId}:`, error);
      
      if (this.config.enableCaching) {
        const cached = this.getCachedData(cacheKey, true);
        if (cached) {
          console.log(`ApiAdapter: Returning stale cached details for ${packageId}`);
          return cached;
        }
      }
      
      throw this.createApiError(error, 'FETCH_PACKAGE_DETAILS_FAILED');
    }
  }

  /**
   * Update package status
   */
  async updatePackageStatus(packageId, newStatus, additionalData = {}) {
    try {
      console.log(`ApiAdapter: Updating package ${packageId} status to ${newStatus}`);
      
      const endpoint = this.config.endpoints.updateStatus.replace(':id', packageId);
      const payload = {
        status: newStatus,
        timestamp: new Date().toISOString(),
        ...additionalData
      };
      
      const response = await this.makeRequest('PATCH', endpoint, payload);
      const updatedPackage = response.data || response;
      
      // Update cache
      if (this.config.enableCaching) {
        this.setCachedData(`package_${packageId}`, updatedPackage);
        this.invalidateCache('packages_all');
      }
      
      return updatedPackage;
      
    } catch (error) {
      console.error(`ApiAdapter: Error updating package ${packageId} status:`, error);
      
      if (!this.isOnline) {
        // Queue the request for when online
        this.queueRequest({
          type: 'updateStatus',
          packageId,
          newStatus,
          additionalData,
          timestamp: Date.now()
        });
        
        // Return optimistic update
        return {
          id: packageId,
          status: newStatus,
          updatedAt: new Date().toISOString(),
          ...additionalData
        };
      }
      
      throw this.createApiError(error, 'UPDATE_PACKAGE_STATUS_FAILED');
    }
  }

  /**
   * Search packages with filters
   */
  async searchPackages(query, filters = {}) {
    try {
      console.log(`ApiAdapter: Searching packages with query: ${query}`);
      
      const params = new URLSearchParams({
        q: query || '',
        ...filters
      });
      
      const endpoint = `${this.config.endpoints.search}?${params.toString()}`;
      const response = await this.makeRequest('GET', endpoint);
      const results = response.data || response;
      
      console.log(`ApiAdapter: Search returned ${results.length} packages`);
      return results;
      
    } catch (error) {
      console.error('ApiAdapter: Error searching packages:', error);
      throw this.createApiError(error, 'SEARCH_PACKAGES_FAILED');
    }
  }

  /**
   * Create new package
   */
  async createPackage(packageData) {
    try {
      console.log('ApiAdapter: Creating new package');
      
      const response = await this.makeRequest('POST', this.config.endpoints.create, packageData);
      const newPackage = response.data || response;
      
      if (this.config.enableCaching) {
        this.setCachedData(`package_${newPackage.id}`, newPackage);
        this.invalidateCache('packages_all');
      }
      
      console.log(`ApiAdapter: Created package ${newPackage.id}`);
      return newPackage;
      
    } catch (error) {
      console.error('ApiAdapter: Error creating package:', error);
      throw this.createApiError(error, 'CREATE_PACKAGE_FAILED');
    }
  }

  /**
   * Delete package
   */
  async deletePackage(packageId) {
    try {
      console.log(`ApiAdapter: Deleting package ${packageId}`);
      
      const endpoint = this.config.endpoints.delete.replace(':id', packageId);
      await this.makeRequest('DELETE', endpoint);
      
      if (this.config.enableCaching) {
        this.invalidateCache(`package_${packageId}`);
        this.invalidateCache('packages_all');
      }
      
      console.log(`ApiAdapter: Deleted package ${packageId}`);
      return true;
      
    } catch (error) {
      console.error(`ApiAdapter: Error deleting package ${packageId}:`, error);
      throw this.createApiError(error, 'DELETE_PACKAGE_FAILED');
    }
  }

  /**
   * Get package history/tracking events
   */
  async getPackageHistory(packageId) {
    const cacheKey = `history_${packageId}`;
    
    try {
      if (this.config.enableCaching) {
        const cached = this.getCachedData(cacheKey, false, 60000); // 1 minute cache
        if (cached) {
          console.log(`ApiAdapter: Returning cached history for ${packageId}`);
          return cached;
        }
      }
      
      console.log(`ApiAdapter: Fetching history for package ${packageId}`);
      const endpoint = this.config.endpoints.history.replace(':id', packageId);
      const response = await this.makeRequest('GET', endpoint);
      const history = response.data || response;
      
      if (this.config.enableCaching) {
        this.setCachedData(cacheKey, history, 60000);
      }
      
      return history;
      
    } catch (error) {
      console.error(`ApiAdapter: Error fetching history for ${packageId}:`, error);
      throw this.createApiError(error, 'FETCH_PACKAGE_HISTORY_FAILED');
    }
  }

  /**
   * Batch operations for multiple packages
   */
  async batchUpdateStatus(updates) {
    if (!Array.isArray(updates) || updates.length === 0) {
      throw new Error('Updates array is required and must not be empty');
    }

    console.log(`ApiAdapter: Performing batch status update for ${updates.length} packages`);
    
    try {
      const payload = {
        updates: updates.map(update => ({
          packageId: update.packageId,
          status: update.newStatus,
          timestamp: new Date().toISOString(),
          ...update.additionalData
        }))
      };

      const response = await this.makeRequest('PATCH', this.config.endpoints.batchStatus, payload);
      const updatedPackages = response.data || response.packages || [];

      // Update cache for each package
      if (this.config.enableCaching) {
        updatedPackages.forEach(pkg => {
          this.setCachedData(`package_${pkg.id}`, pkg);
        });
        this.invalidateCache('packages_all');
      }

      console.log(`ApiAdapter: Batch update completed for ${updatedPackages.length} packages`);
      return updatedPackages;

    } catch (error) {
      console.error('ApiAdapter: Batch status update failed:', error);
      
      if (!this.isOnline) {
        // Queue individual requests
        updates.forEach(update => {
          this.queueRequest({
            type: 'updateStatus',
            packageId: update.packageId,
            newStatus: update.newStatus,
            additionalData: update.additionalData,
            timestamp: Date.now()
          });
        });
        
        // Return optimistic updates
        return updates.map(update => ({
          id: update.packageId,
          status: update.newStatus,
          updatedAt: new Date().toISOString(),
          ...update.additionalData
        }));
      }
      
      throw this.createApiError(error, 'BATCH_UPDATE_FAILED');
    }
  }

  // Subscription Management

  /**
   * Subscribe to real-time updates
   */
  subscribe(callback) {
    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function');
    }
    
    this.subscribers.add(callback);
    console.log('ApiAdapter: New subscriber added');
    
    return () => {
      this.subscribers.delete(callback);
      console.log('ApiAdapter: Subscriber removed');
    };
  }

  /**
   * Unsubscribe from updates
   */
  unsubscribe(callback) {
    this.subscribers.delete(callback);
    console.log('ApiAdapter: Subscriber removed via unsubscribe');
  }

  // Configuration Management

  /**
   * Get adapter configuration
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * Update adapter configuration
   */
  updateConfig(newConfig) {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...newConfig };
    
    // Reinitialize WebSocket if configuration changed
    if (oldConfig.websocketUrl !== this.config.websocketUrl || 
        oldConfig.enableRealtime !== this.config.enableRealtime) {
      this.closeWebSocket();
      if (this.config.enableRealtime) {
        this.initializeWebSocket();
      }
    }
  }

  /**
   * Health check endpoint
   */
  async healthCheck() {
    try {
      console.log('ApiAdapter: Performing health check');
      
      const response = await this.makeRequest('GET', this.config.endpoints.health);
      const isHealthy = response.status === 'ok' || response.healthy === true;
      
      console.log('ApiAdapter: Health check result:', isHealthy);
      return {
        healthy: isHealthy,
        timestamp: new Date().toISOString(),
        response
      };
      
    } catch (error) {
      console.error('ApiAdapter: Health check failed:', error);
      return {
        healthy: false,
        timestamp: new Date().toISOString(),
        error: error.message
      };
    }
  }

  // Utility and Status Methods

  /**
   * Get adapter status information
   */
  getStatus() {
    return {
      isOnline: this.isOnline,
      websocketConnected: this.websocket?.readyState === WebSocket.OPEN,
      cacheSize: this.cache.size,
      queueSize: this.requestQueue.length,
      subscriberCount: this.subscribers.size,
      config: {
        baseUrl: this.config.baseUrl,
        enableCaching: this.config.enableCaching,
        enableRealtime: this.config.enableRealtime,
        cacheExpiry: this.config.cacheExpiry,
        timeout: this.config.timeout,
        retryAttempts: this.config.retryAttempts
      }
    };
  }

  /**
   * Clear expired cache entries
   */
  clearExpiredCache() {
    const now = Date.now();
    let clearedCount = 0;
    
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > value.expiry) {
        this.cache.delete(key);
        clearedCount++;
      }
    }
    
    if (clearedCount > 0) {
      console.log(`ApiAdapter: Cleared ${clearedCount} expired cache entries`);
    }
    
    return clearedCount;
  }

  /**
   * Export cache data (for debugging/backup)
   */
  exportCache() {
    const cacheData = {};
    
    for (const [key, value] of this.cache.entries()) {
      cacheData[key] = {
        data: value.data,
        timestamp: value.timestamp,
        expiry: value.expiry,
        isExpired: Date.now() - value.timestamp > value.expiry
      };
    }
    
    return {
      timestamp: new Date().toISOString(),
      totalEntries: this.cache.size,
      cache: cacheData
    };
  }

  /**
   * Import cache data (for testing/restore)
   */
  importCache(cacheData) {
    if (!cacheData || typeof cacheData !== 'object') {
      throw new Error('Invalid cache data provided');
    }
    
    let importedCount = 0;
    const now = Date.now();
    
    for (const [key, entry] of Object.entries(cacheData.cache || {})) {
      // Only import non-expired entries
      if (entry && !entry.isExpired && (now - entry.timestamp) < entry.expiry) {
        this.cache.set(key, {
          data: entry.data,
          timestamp: entry.timestamp,
          expiry: entry.expiry
        });
        importedCount++;
      }
    }
    
    console.log(`ApiAdapter: Imported ${importedCount} cache entries`);
    return importedCount;
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    this.closeWebSocket();
    this.subscribers.clear();
    this.cache.clear();
    this.requestQueue = [];
    
    // Clear any pending timeouts/intervals
    if (this.networkCheckInterval) {
      clearInterval(this.networkCheckInterval);
    }
  }

  // Private Implementation Methods

  /**
   * Make HTTP request with retry logic
   */
  async makeRequest(method, endpoint, data = null) {
    const url = `${this.config.baseUrl}${endpoint}`;
    
    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const headers = { ...this.config.headers };
        
        if (this.config.apiKey) {
          headers['Authorization'] = `Bearer ${this.config.apiKey}`;
        }
        
        const fetchOptions = {
          method,
          headers,
          timeout: this.config.timeout
        };
        
        if (data && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
          fetchOptions.body = JSON.stringify(data);
        }
        
        const response = await this.fetchWithTimeout(url, fetchOptions);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const responseData = await response.json();
        return responseData;
        
      } catch (error) {
        console.error(`ApiAdapter: Request attempt ${attempt}/${this.config.retryAttempts} failed:`, error);
        
        if (attempt === this.config.retryAttempts) {
          throw error;
        }
        
        // Wait before retry with exponential backoff
        await this.delay(this.config.retryDelay * attempt);
      }
    }
  }

  /**
   * Fetch with timeout
   */
  async fetchWithTimeout(url, options) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeout);
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Get cached data with expiry check
   */
  getCachedData(key, allowExpired = false, customExpiry = null) {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    const expiry = customExpiry || this.config.cacheExpiry;
    const isExpired = Date.now() - cached.timestamp > expiry;
    
    if (isExpired && !allowExpired) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  /**
   * Set cached data with timestamp
   */
  setCachedData(key, data, customExpiry = null) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiry: customExpiry || this.config.cacheExpiry
    });
    
    // Cleanup old cache entries periodically
    if (this.cache.size > 1000) {
      const now = Date.now();
      for (const [k, v] of this.cache.entries()) {
        if (now - v.timestamp > v.expiry) {
          this.cache.delete(k);
        }
      }
    }
  }

  /**
   * Invalidate cache entry or all cache
   */
  invalidateCache(key) {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Initialize WebSocket connection for real-time updates
   */
  initializeWebSocket() {
    try {
      const wsUrl = this.config.websocketUrl || 
                   `${this.config.baseUrl.replace('http', 'ws')}/ws`;
      
      console.log('ApiAdapter: Initializing WebSocket connection');
      this.websocket = new WebSocket(wsUrl);
      
      this.websocket.onopen = () => {
        console.log('ApiAdapter: WebSocket connected');
        
        // Send authentication if API key is available
        if (this.config.apiKey) {
          this.websocket.send(JSON.stringify({
            type: 'auth',
            token: this.config.apiKey
          }));
        }
      };
      
      this.websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleWebSocketMessage(data);
        } catch (error) {
          console.error('ApiAdapter: Error parsing WebSocket message:', error);
        }
      };
      
      this.websocket.onerror = (error) => {
        console.error('ApiAdapter: WebSocket error:', error);
      };
      
      this.websocket.onclose = () => {
        console.log('ApiAdapter: WebSocket disconnected');
        
        // Attempt to reconnect after 5 seconds if enabled
        if (this.config.enableRealtime) {
          setTimeout(() => {
            this.initializeWebSocket();
          }, 5000);
        }
      };
      
    } catch (error) {
      console.error('ApiAdapter: Error initializing WebSocket:', error);
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  handleWebSocketMessage(data) {
    console.log('ApiAdapter: Received WebSocket message:', data.type);
    
    switch (data.type) {
      case 'packageUpdate':
        this.invalidateCache(`package_${data.packageId}`);
        this.invalidateCache('packages_all');
        this.notifySubscribers({
          type: 'PACKAGE_UPDATED',
          package: data.package
        });
        break;
        
      case 'statusChange':
        this.invalidateCache(`package_${data.packageId}`);
        this.invalidateCache('packages_all');
        this.notifySubscribers({
          type: 'PACKAGE_STATUS_CHANGED',
          packageId: data.packageId,
          oldStatus: data.oldStatus,
          newStatus: data.newStatus,
          package: data.package
        });
        break;
        
      case 'packageCreated':
        this.invalidateCache('packages_all');
        this.notifySubscribers({
          type: 'PACKAGE_CREATED',
          package: data.package
        });
        break;
        
      case 'packageDeleted':
        this.invalidateCache(`package_${data.packageId}`);
        this.invalidateCache('packages_all');
        this.notifySubscribers({
          type: 'PACKAGE_DELETED',
          packageId: data.packageId
        });
        break;
        
      default:
        console.log('ApiAdapter: Unknown WebSocket message type:', data.type);
    }
  }

  /**
   * Close WebSocket connection
   */
  closeWebSocket() {
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
  }

  /**
   * Setup network monitoring for offline support
   */
  setupNetworkMonitoring() {
    // Basic network status monitoring
    this.isOnline = navigator.onLine !== false;
    
    // Process queued requests periodically when online
    this.networkCheckInterval = setInterval(() => {
      if (this.isOnline && this.requestQueue.length > 0) {
        this.processRequestQueue();
      }
    }, 5000);
  }

  /**
   * Queue request for offline processing
   */
  queueRequest(request) {
    this.requestQueue.push({
      ...request,
      timestamp: Date.now(),
      retryCount: 0
    });
    
    // Limit queue size to prevent memory issues
    if (this.requestQueue.length > 100) {
      this.requestQueue = this.requestQueue.slice(-50);
    }
  }

  /**
   * Process queued requests when connection is restored
   */
  async processRequestQueue() {
    const requests = [...this.requestQueue];
    this.requestQueue = [];
    
    for (const request of requests) {
      try {
        switch (request.type) {
          case 'updateStatus':
            await this.updatePackageStatus(
              request.packageId,
              request.newStatus,
              request.additionalData
            );
            break;
            
          case 'create':
            await this.createPackage(request.packageData);
            break;
            
          case 'delete':
            await this.deletePackage(request.packageId);
            break;
            
          default:
            console.warn('ApiAdapter: Unknown queued request type:', request.type);
        }
        
        console.log(`ApiAdapter: Processed queued request ${request.type}`);
        
      } catch (error) {
        console.error(`ApiAdapter: Failed to process queued request ${request.type}:`, error);
        
        // Re-queue failed requests if not too old (1 hour max)
        const maxAge = 60 * 60 * 1000; // 1 hour
        if (Date.now() - request.timestamp < maxAge && request.retryCount < 3) {
          this.requestQueue.push({
            ...request,
            retryCount: (request.retryCount || 0) + 1
          });
        }
      }
    }
  }

  /**
   * Notify all subscribers of updates
   */
  notifySubscribers(update) {
    console.log(`ApiAdapter: Notifying ${this.subscribers.size} subscribers of update:`, update.type);
    
    this.subscribers.forEach(callback => {
      try {
        callback(update);
      } catch (error) {
        console.error('ApiAdapter: Error in subscriber callback:', error);
      }
    });
  }

  /**
   * Create API error with additional context
   */
  createApiError(originalError, errorType) {
    const error = new Error(originalError.message || 'Unknown API error');
    error.type = errorType;
    error.originalError = originalError;
    error.timestamp = new Date().toISOString();
    error.isOnline = this.isOnline;
    
    // Add HTTP status if available
    if (originalError.status) {
      error.status = originalError.status;
    }
    
    // Add localized error messages
    const errorMessages = {
      'FETCH_PACKAGES_FAILED': 'Error al cargar paquetes',
      'FETCH_PACKAGE_DETAILS_FAILED': 'Error al cargar detalles del paquete',
      'UPDATE_PACKAGE_STATUS_FAILED': 'Error al actualizar estado del paquete',
      'CREATE_PACKAGE_FAILED': 'Error al crear paquete',
      'DELETE_PACKAGE_FAILED': 'Error al eliminar paquete',
      'SEARCH_PACKAGES_FAILED': 'Error en la búsqueda de paquetes',
      'FETCH_PACKAGE_HISTORY_FAILED': 'Error al cargar historial del paquete',
      'BATCH_UPDATE_FAILED': 'Error en la actualización por lotes'
    };
    
    error.retryable = !['CREATE_PACKAGE_FAILED', 'DELETE_PACKAGE_FAILED'].includes(errorType);
    error.userMessage = errorMessages[errorType] || 'Error en el servicio';
    
    return error;
  }

  /**
   * Delay utility for retry logic
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default ApiPackageAdapter;