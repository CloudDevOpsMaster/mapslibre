// adapters/LocalPackageAdapter.js - Adapter for local storage and mock data
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * LocalPackageAdapter - Adapter for handling package data in local storage
 * Implements the IPackageAdapter interface for local/mock data operations
 */
class LocalPackageAdapter {
  constructor(config = {}) {
    this.config = {
      storageKey: 'delivery_packages',
      enablePersistence: true,
      enableRealtimeSimulation: true,
      simulationInterval: 30000,
      mockDataEnabled: true,
      maxStorageSize: 50,
      autoCleanup: true,
      ...config
    };

    this.subscribers = new Set();
    this.simulationIntervalId = null;
    this.isInitialized = false;
    this.packagesData = [];

    console.log('LocalPackageAdapter: Initialized with config', {
      storageKey: this.config.storageKey,
      enablePersistence: this.config.enablePersistence,
      enableRealtimeSimulation: this.config.enableRealtimeSimulation
    });
  }

  /**
   * Initialize the adapter
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      // Load initial data if persistence is enabled
      if (this.config.enablePersistence) {
        await this.loadFromStorage();
      }

      // Set up mock data if enabled and no data exists
      if (this.config.mockDataEnabled && (!this.packagesData || this.packagesData.length === 0)) {
        await this.generateMockData();
      }

      // Start real-time simulation if enabled
      if (this.config.enableRealtimeSimulation) {
        this.startRealtimeSimulation();
      }

      this.isInitialized = true;
      console.log('LocalPackageAdapter: Initialization completed');
    } catch (error) {
      console.error('LocalPackageAdapter: Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Get all packages
   */
  async getPackages(filters = {}) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      let packages = this.packagesData || [];

      // Apply filters if provided
      if (filters.status) {
        packages = packages.filter(pkg => pkg.status === filters.status);
      }

      if (filters.priority) {
        packages = packages.filter(pkg => pkg.priority === filters.priority);
      }

      console.log(`LocalPackageAdapter: Retrieved ${packages.length} packages`);
      return packages;
    } catch (error) {
      console.error('LocalPackageAdapter: Error getting packages:', error);
      throw error;
    }
  }

  /**
   * Get package details by ID
   */
  async getPackageDetails(id) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const pkg = (this.packagesData || []).find(p => p.id === id);
      
      if (!pkg) {
        throw new Error(`Package with ID ${id} not found`);
      }

      console.log(`LocalPackageAdapter: Retrieved details for package ${id}`);
      return pkg;
    } catch (error) {
      console.error('LocalPackageAdapter: Error getting package details:', error);
      throw error;
    }
  }

  /**
   * Update package status
   */
  async updatePackageStatus(id, status) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const packageIndex = (this.packagesData || []).findIndex(pkg => pkg.id === id);
      
      if (packageIndex === -1) {
        throw new Error(`Package with ID ${id} not found`);
      }

      // Update package status
      this.packagesData[packageIndex] = {
        ...this.packagesData[packageIndex],
        status,
        updatedAt: new Date().toISOString()
      };

      // Save to storage if persistence is enabled
      if (this.config.enablePersistence) {
        await this.saveToStorage();
      }

      // Notify subscribers
      this.notifySubscribers({
        type: 'packageUpdated',
        package: this.packagesData[packageIndex]
      });

      console.log(`LocalPackageAdapter: Updated package ${id} status to ${status}`);
      return this.packagesData[packageIndex];
    } catch (error) {
      console.error('LocalPackageAdapter: Error updating package status:', error);
      throw error;
    }
  }

  /**
   * Subscribe to package updates
   */
  subscribe(callback) {
    this.subscribers.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Unsubscribe from package updates
   */
  unsubscribe(callback) {
    this.subscribers.delete(callback);
  }

  /**
   * Notify all subscribers of an event
   */
  notifySubscribers(event) {
    this.subscribers.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('LocalPackageAdapter: Error in subscriber callback:', error);
      }
    });
  }

  /**
   * Start real-time simulation of package updates
   */
  startRealtimeSimulation() {
    if (this.simulationIntervalId) {
      clearInterval(this.simulationIntervalId);
    }

    this.simulationIntervalId = setInterval(() => {
      this.simulateRealtimeUpdates();
    }, this.config.simulationInterval);

    console.log('LocalPackageAdapter: Started real-time simulation');
  }

  /**
   * Stop real-time simulation
   */
  stopRealtimeSimulation() {
    if (this.simulationIntervalId) {
      clearInterval(this.simulationIntervalId);
      this.simulationIntervalId = null;
      console.log('LocalPackageAdapter: Stopped real-time simulation');
    }
  }

  /**
   * Simulate real-time package updates
   */
  simulateRealtimeUpdates() {
    if (!this.packagesData || this.packagesData.length === 0) return;

    // Randomly select a package to update
    const randomIndex = Math.floor(Math.random() * this.packagesData.length);
    const packageToUpdate = this.packagesData[randomIndex];
    
    // Only update packages that aren't delivered or failed
    if (['DELIVERED', 'FAILED'].includes(packageToUpdate.status)) return;

    // Simulate status progression
    const statusFlow = {
      'PENDING': 'ASSIGNED',
      'ASSIGNED': 'IN_TRANSIT',
      'IN_TRANSIT': 'OUT_FOR_DELIVERY',
      'OUT_FOR_DELIVERY': Math.random() > 0.2 ? 'DELIVERED' : 'FAILED'
    };

    const newStatus = statusFlow[packageToUpdate.status];
    if (newStatus) {
      this.updatePackageStatus(packageToUpdate.id, newStatus)
        .catch(error => {
          console.error('LocalPackageAdapter: Error in simulation update:', error);
        });
    }
  }

  /**
   * Generate mock data for testing
   */
  async generateMockData() {
    const mockPackages = [
      {
        id: 'PKG001',
        trackingNumber: 'DLV-2024-001',
        recipientName: 'Juan Pérez Rodriguez',
        recipientPhone: '+52 33 1234 5678',
        recipientEmail: 'juan.perez@email.com',
        recipientAddress: 'Av. Chapultepec Norte 123, Zona Centro, Guadalajara, Jalisco 44100',
        latitude: 20.6597,
        longitude: -103.3496,
        status: 'PENDING',
        priority: 'HIGH',
        estimatedDelivery: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        weight: 2.5,
        dimensions: { length: 30, width: 20, height: 15 },
        deliveryInstructions: 'Entregar en recepción del edificio. Solicitar identificación.',
        specialInstructions: 'Paquete frágil - manejar con cuidado',
        attempts: 0,
        maxAttempts: 3,
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        customerNotes: 'Disponible de 9 AM a 6 PM',
        deliveryWindow: '09:00-18:00',
        packageValue: 1200,
        requiresSignature: true,
        containsFragile: true,
        tags: ['fragile', 'signature-required', 'high-value']
      },
      {
        id: 'PKG002',
        trackingNumber: 'DLV-2024-002',
        recipientName: 'María González Vega',
        recipientPhone: '+52 33 2345 6789',
        recipientEmail: 'maria.gonzalez@email.com',
        recipientAddress: 'Av. Vallarta 456, Col. Americana, Guadalajara, Jalisco 44160',
        latitude: 20.6765,
        longitude: -103.3467,
        status: 'IN_TRANSIT',
        priority: 'MEDIUM',
        estimatedDelivery: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
        weight: 1.2,
        dimensions: { length: 25, width: 15, height: 10 },
        deliveryInstructions: 'Llamar al timbre del apartamento 3B',
        attempts: 1,
        maxAttempts: 3,
        createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        customerNotes: 'Puede recibir vecino del 3A',
        deliveryWindow: '14:00-20:00',
        packageValue: 450,
        requiresSignature: false,
        containsFragile: false,
        tags: ['standard-delivery']
      },
      {
        id: 'PKG003',
        trackingNumber: 'DLV-2024-003',
        recipientName: 'Carlos López Mendoza',
        recipientPhone: '+52 33 3456 7890',
        recipientEmail: 'carlos.lopez@email.com',
        recipientAddress: 'Av. México 789, Col. Monraz, Guadalajara, Jalisco 44670',
        latitude: 20.6434,
        longitude: -103.3524,
        status: 'OUT_FOR_DELIVERY',
        priority: 'URGENT',
        estimatedDelivery: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(),
        weight: 5.0,
        dimensions: { length: 40, width: 30, height: 25 },
        deliveryInstructions: 'Entregar únicamente al destinatario con identificación oficial',
        specialInstructions: 'Documento legal importante - verificar identidad',
        attempts: 0,
        maxAttempts: 3,
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        customerNotes: 'Urgente - documentos legales',
        deliveryWindow: '10:00-16:00',
        packageValue: 0,
        requiresSignature: true,
        containsFragile: false,
        tags: ['urgent', 'legal-documents', 'id-verification']
      },
      {
        id: 'PKG004',
        trackingNumber: 'DLV-2024-004',
        recipientName: 'Ana Martínez Silva',
        recipientPhone: '+52 33 4567 8901',
        recipientEmail: 'ana.martinez@email.com',
        recipientAddress: 'Calle Independencia 321, Col. Centro, Guadalajara, Jalisco 44100',
        latitude: 20.6736,
        longitude: -103.3370,
        status: 'DELIVERED',
        priority: 'LOW',
        estimatedDelivery: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        weight: 0.8,
        dimensions: { length: 20, width: 15, height: 5 },
        deliveryInstructions: 'Dejar en portería si no está disponible',
        attempts: 1,
        maxAttempts: 3,
        createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
        deliveredAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        customerNotes: 'Producto de belleza',
        deliveryWindow: '09:00-21:00',
        packageValue: 250,
        requiresSignature: false,
        containsFragile: true,
        tags: ['cosmetics', 'delivered']
      }
    ];

    this.packagesData = mockPackages;

    if (this.config.enablePersistence) {
      await this.saveToStorage();
    }

    console.log('LocalPackageAdapter: Generated mock data with', mockPackages.length, 'packages');
  }

  /**
   * Load packages from local storage
   */
  async loadFromStorage() {
    try {
      const storedData = await AsyncStorage.getItem(this.config.storageKey);
      
      if (storedData) {
        this.packagesData = JSON.parse(storedData);
        console.log('LocalPackageAdapter: Loaded', this.packagesData.length, 'packages from storage');
      } else {
        this.packagesData = [];
        console.log('LocalPackageAdapter: No packages found in storage');
      }
    } catch (error) {
      console.error('LocalPackageAdapter: Error loading from storage:', error);
      this.packagesData = [];
    }
  }

  /**
   * Save packages to local storage
   */
  async saveToStorage() {
    try {
      if (this.config.autoCleanup) {
        await this.cleanupOldPackages();
      }

      await AsyncStorage.setItem(
        this.config.storageKey, 
        JSON.stringify(this.packagesData || [])
      );
      
      console.log('LocalPackageAdapter: Saved', (this.packagesData || []).length, 'packages to storage');
    } catch (error) {
      console.error('LocalPackageAdapter: Error saving to storage:', error);
      throw error;
    }
  }

  /**
   * Clean up old packages to prevent storage bloat
   */
  async cleanupOldPackages() {
    if (!this.packagesData || this.packagesData.length <= this.config.maxStorageSize) {
      return;
    }

    // Sort packages by creation date (oldest first)
    const sortedPackages = [...this.packagesData].sort((a, b) => {
      return new Date(a.createdAt) - new Date(b.createdAt);
    });

    // Remove oldest packages until we're under the limit
    while (sortedPackages.length > this.config.maxStorageSize) {
      sortedPackages.shift();
    }

    this.packagesData = sortedPackages;
    console.log('LocalPackageAdapter: Cleaned up old packages, now', this.packagesData.length, 'packages');
  }

  /**
   * Clear all packages from storage
   */
  async clearStorage() {
    try {
      await AsyncStorage.removeItem(this.config.storageKey);
      this.packagesData = [];
      console.log('LocalPackageAdapter: Cleared storage');
    } catch (error) {
      console.error('LocalPackageAdapter: Error clearing storage:', error);
      throw error;
    }
  }

  /**
   * Add a new package
   */
  async addPackage(newPackage) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Generate ID if not provided
      if (!newPackage.id) {
        newPackage.id = `PKG${Date.now()}`;
      }

      // Set creation timestamp if not provided
      if (!newPackage.createdAt) {
        newPackage.createdAt = new Date().toISOString();
      }

      // Add to packages array
      this.packagesData = [...(this.packagesData || []), newPackage];

      // Save to storage if persistence is enabled
      if (this.config.enablePersistence) {
        await this.saveToStorage();
      }

      // Notify subscribers
      this.notifySubscribers({
        type: 'packageAdded',
        package: newPackage
      });

      console.log('LocalPackageAdapter: Added new package', newPackage.id);
      return newPackage;
    } catch (error) {
      console.error('LocalPackageAdapter: Error adding package:', error);
      throw error;
    }
  }

  /**
   * Remove a package by ID
   */
  async removePackage(id) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const initialLength = this.packagesData.length;
      this.packagesData = (this.packagesData || []).filter(pkg => pkg.id !== id);

      if (this.packagesData.length === initialLength) {
        throw new Error(`Package with ID ${id} not found`);
      }

      // Save to storage if persistence is enabled
      if (this.config.enablePersistence) {
        await this.saveToStorage();
      }

      // Notify subscribers
      this.notifySubscribers({
        type: 'packageRemoved',
        packageId: id
      });

      console.log('LocalPackageAdapter: Removed package', id);
      return true;
    } catch (error) {
      console.error('LocalPackageAdapter: Error removing package:', error);
      throw error;
    }
  }

  /**
   * Clean up resources
   */
  async dispose() {
    this.stopRealtimeSimulation();
    this.subscribers.clear();
    console.log('LocalPackageAdapter: Disposed');
  }
}

export default LocalPackageAdapter;