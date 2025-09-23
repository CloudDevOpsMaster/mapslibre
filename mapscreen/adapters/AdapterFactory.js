// adapters/AdapterFactory.js - Factory pattern for creating package adapters
import ApiPackageAdapter from './ApiPackageAdapter';
import LocalPackageAdapter from './LocalPackageAdapter';

/**
 * AdapterFactory - Factory class for creating package data adapters
 * Implements the Factory pattern to provide a unified way to create adapters
 * based on configuration or environment
 */
class AdapterFactory {
  static adapterTypes = {
    API: 'api',
    LOCAL: 'local',
    MOCK: 'mock',
    CUSTOM: 'custom'
  };

  /**
   * Create package adapter based on configuration
   * 
   * @param {string} type - Adapter type (api, local, mock, custom)
   * @param {Object} config - Adapter configuration
   * @param {Object} customAdapter - Custom adapter instance for 'custom' type
   * @returns {IPackageAdapter} - Package adapter instance
   * @throws {Error} If adapter type is unknown or configuration is invalid
   */
  static createAdapter(type, config = {}, customAdapter = null) {
    console.log(`AdapterFactory: Creating adapter of type '${type}'`);

    try {
      switch (type) {
        case AdapterFactory.adapterTypes.API:
          return AdapterFactory.createApiAdapter(config);

        case AdapterFactory.adapterTypes.LOCAL:
          return AdapterFactory.createLocalAdapter(config);

        case AdapterFactory.adapterTypes.MOCK:
          return AdapterFactory.createMockAdapter(config);

        case AdapterFactory.adapterTypes.CUSTOM:
          return AdapterFactory.createCustomAdapter(customAdapter, config);

        default:
          throw new Error(`Unknown adapter type: ${type}`);
      }
    } catch (error) {
      console.error(`AdapterFactory: Error creating adapter - ${error.message}`);
      throw error;
    }
  }

  /**
   * Create API adapter with production configuration
   */
  static createApiAdapter(config = {}) {
    const defaultConfig = {
      baseUrl: process.env.REACT_APP_API_URL || 'https://api.delivery.com',
      apiKey: process.env.REACT_APP_API_KEY,
      timeout: 10000,
      retryAttempts: 3,
      enableCaching: true,
      enableRealtime: true,
      maxCacheSize: 100,
      cacheExpiry: 300000, // 5 minutes
      endpoints: {
        packages: '/packages',
        packageDetails: '/packages/{id}',
        updateStatus: '/packages/{id}/status'
      },
      ...config
    };

    // Validate required configuration
    if (!defaultConfig.baseUrl) {
      throw new Error('API base URL is required for API adapter');
    }

    // Validate endpoints configuration
    if (!defaultConfig.endpoints.packages) {
      throw new Error('Packages endpoint is required for API adapter');
    }

    console.log('AdapterFactory: Created API adapter with config:', {
      baseUrl: defaultConfig.baseUrl,
      timeout: defaultConfig.timeout,
      enableCaching: defaultConfig.enableCaching,
      enableRealtime: defaultConfig.enableRealtime
    });

    return new ApiPackageAdapter(defaultConfig);
  }

  /**
   * Create local adapter for development and testing
   */
  static createLocalAdapter(config = {}) {
    const defaultConfig = {
      storageKey: 'delivery_packages',
      enablePersistence: true,
      enableRealtimeSimulation: true,
      simulationInterval: 30000,
      mockDataEnabled: true,
      maxStorageSize: 50,
      autoCleanup: true,
      ...config
    };

    console.log('AdapterFactory: Created local adapter with config:', {
      enablePersistence: defaultConfig.enablePersistence,
      enableRealtimeSimulation: defaultConfig.enableRealtimeSimulation,
      mockDataEnabled: defaultConfig.mockDataEnabled
    });

    return new LocalPackageAdapter(defaultConfig);
  }

  /**
   * Create mock adapter with minimal mock data
   */
  static createMockAdapter(config = {}) {
    const mockConfig = {
      storageKey: 'delivery_packages_mock',
      enablePersistence: false,
      enableRealtimeSimulation: true,
      simulationInterval: 60000, // Slower simulation for mock
      mockDataEnabled: true,
      responseDelay: 500, // Simulate network delay
      errorRate: 0.1, // 10% chance of error for testing
      ...config
    };

    console.log('AdapterFactory: Created mock adapter with config:', {
      simulationInterval: mockConfig.simulationInterval,
      responseDelay: mockConfig.responseDelay,
      errorRate: mockConfig.errorRate
    });

    return new LocalPackageAdapter(mockConfig);
  }

  /**
   * Create custom adapter wrapper
   */
  static createCustomAdapter(customAdapter, config = {}) {
    if (!customAdapter) {
      throw new Error('Custom adapter instance is required');
    }

    // Validate that custom adapter implements required interface
    AdapterFactory.validateAdapterInterface(customAdapter);

    // Wrap custom adapter with additional functionality
    const wrappedAdapter = AdapterFactory.wrapCustomAdapter(customAdapter, config);

    console.log('AdapterFactory: Created custom adapter wrapper');
    return wrappedAdapter;
  }

  /**
   * Validate that custom adapter implements required interface
   */
  static validateAdapterInterface(adapter) {
    const requiredMethods = [
      'getPackages',
      'updatePackageStatus',
      'getPackageDetails',
      'subscribe',
      'unsubscribe'
    ];

    const missingMethods = requiredMethods.filter(
      method => typeof adapter[method] !== 'function'
    );

    if (missingMethods.length > 0) {
      throw new Error(
        `Custom adapter must implement the following methods: ${missingMethods.join(', ')}`
      );
    }
  }

  /**
   * Wrap custom adapter with additional functionality
   */
  static wrapCustomAdapter(adapter, config) {
    // Add logging functionality
    const wrappedAdapter = {
      ...adapter,
      
      // Wrap getPackages with logging
      getPackages: async (...args) => {
        console.log('AdapterFactory: Getting packages from custom adapter');
        try {
          const result = await adapter.getPackages(...args);
          console.log('AdapterFactory: Successfully retrieved packages');
          return result;
        } catch (error) {
          console.error('AdapterFactory: Error getting packages from custom adapter:', error);
          throw error;
        }
      },
      
      // Wrap updatePackageStatus with logging
      updatePackageStatus: async (...args) => {
        console.log('AdapterFactory: Updating package status via custom adapter');
        try {
          const result = await adapter.updatePackageStatus(...args);
          console.log('AdapterFactory: Successfully updated package status');
          return result;
        } catch (error) {
          console.error('AdapterFactory: Error updating package status via custom adapter:', error);
          throw error;
        }
      },
      
      // Add additional functionality like retry mechanism if configured
      withRetry: async (operation, maxRetries = config.retryAttempts || 3) => {
        let lastError;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            return await operation();
          } catch (error) {
            lastError = error;
            console.warn(`AdapterFactory: Operation failed (attempt ${attempt}/${maxRetries}):`, error);
            if (attempt < maxRetries) {
              // Exponential backoff
              await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
            }
          }
        }
        throw lastError;
      }
    };

    return wrappedAdapter;
  }

  /**
   * Create adapter based on environment
   */
  static createFromEnvironment(environmentConfig = {}) {
    const env = process.env.NODE_ENV || 'development';
    const adapterType = process.env.REACT_APP_ADAPTER_TYPE;

    console.log(`AdapterFactory: Creating adapter for environment: ${env}`);

    // If adapter type is explicitly set, use it
    if (adapterType) {
      return AdapterFactory.createAdapter(adapterType, environmentConfig);
    }

    // Auto-detect based on environment
    switch (env) {
      case 'production':
        return AdapterFactory.createApiAdapter(environmentConfig);

      case 'test':
        return AdapterFactory.createMockAdapter({
          ...environmentConfig,
          responseDelay: 100, // Faster responses for tests
          errorRate: 0.3 // Higher error rate for testing error handling
        });

      case 'development':
      default:
        return AdapterFactory.createLocalAdapter(environmentConfig);
    }
  }

  /**
   * Health check for adapters
   */
  static async healthCheck(adapter) {
    try {
      console.log('AdapterFactory: Performing health check on adapter');
      
      // Try to get packages as a health check
      const packages = await adapter.getPackages();
      
      console.log('AdapterFactory: Health check passed');
      return {
        status: 'healthy',
        packageCount: packages ? packages.length : 0
      };
    } catch (error) {
      console.error('AdapterFactory: Health check failed:', error);
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  /**
   * Get adapter info for debugging
   */
  static getAdapterInfo(adapter) {
    return {
      type: adapter.constructor.name,
      config: adapter.config || {},
      capabilities: {
        realtime: typeof adapter.subscribe === 'function',
        persistence: typeof adapter.save === 'function',
        caching: typeof adapter.clearCache === 'function'
      }
    };
  }
}

export default AdapterFactory;