// utils/constants.js - Constantes y temas para la aplicación
export const PACKAGE_STATUS = {
  PENDING: 'PENDING',
  ASSIGNED: 'ASSIGNED',
  IN_TRANSIT: 'IN_TRANSIT',
  OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
  DELIVERED: 'DELIVERED',
  FAILED: 'FAILED',
  RETURNED: 'RETURNED'
};

export const PRIORITY_LEVELS = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  URGENT: 'URGENT'
};

export const LOCATION_CONFIG = {
  ACCURACY: {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    BEST: 'best'
  },
  UPDATE_INTERVAL: 10000, // 10 seconds
  DISTANCE_FILTER: 5, // meters
};

export const GEOFENCE_RADIUS = 100; // meters
export const ANIMATION_DURATION = 600;
export const HAPTIC_FEEDBACK_ENABLED = true;

export const THEMES = {
  light: {
    background: '#ffffff',
    surface: '#f8f9fa',
    primary: '#3498db',
    accent: '#e74c3c',
    text: '#2c3e50',
    textSecondary: '#7f8c8d',
    overlay: 'rgba(255, 255, 255, 0.95)',
    shadow: 'rgba(0, 0, 0, 0.15)',
    success: '#27ae60',
    warning: '#f39c12',
    error: '#e74c3c',
    info: '#3498db',
    border: '#e0e0e0',
    card: '#ffffff',
    notification: '#e74c3c'
  },
  dark: {
    background: '#1a1a1a',
    surface: '#2d3748',
    primary: '#4299e1',
    accent: '#f56565',
    text: '#f7fafc',
    textSecondary: '#a0aec0',
    overlay: 'rgba(45, 55, 72, 0.95)',
    shadow: 'rgba(0, 0, 0, 0.3)',
    success: '#38a169',
    warning: '#ed8936',
    error: '#f56565',
    info: '#4299e1',
    border: '#4a5568',
    card: '#2d3748',
    notification: '#f56565'
  }
};

export const MAP_STYLES = {
  DEFAULT: 'default',
  SATELLITE: 'satellite',
  DARK: 'dark',
  LIGHT: 'light',
  STREET: 'street'
};

export const ERROR_TYPES = {
  LOCATION_PERMISSION_DENIED: 'LOCATION_PERMISSION_DENIED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  MAP_LOAD_ERROR: 'MAP_LOAD_ERROR',
  ADAPTER_ERROR: 'ADAPTER_ERROR',
  GEOLOCATION_ERROR: 'GEOLOCATION_ERROR',
  PACKAGE_LOAD_ERROR: 'PACKAGE_LOAD_ERROR'
};

export const PERFORMANCE_MODES = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high'
};

export const ADAPTER_TYPES = {
  API: 'api',
  LOCAL: 'local',
  MOCK: 'mock',
  CUSTOM: 'custom'
};

export const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info'
};

export const DEFAULT_CONFIG = {
  API: {
    BASE_URL: 'https://api.delivery.com',
    TIMEOUT: 10000,
    RETRY_ATTEMPTS: 3,
    CACHE_ENABLED: true,
    REALTIME_ENABLED: true
  },
  LOCAL: {
    STORAGE_KEY: 'delivery_packages',
    PERSISTENCE_ENABLED: true,
    REALTIME_SIMULATION: true,
    SIMULATION_INTERVAL: 30000
  },
  MAP: {
    DEFAULT_ZOOM: 12,
    MAX_ZOOM: 18,
    MIN_ZOOM: 8,
    DEFAULT_CENTER: {
      latitude: 20.6597, // Guadalajara, México
      longitude: -103.3496
    }
  },
  PACKAGE: {
    MAX_VISIBLE: 50,
    CLUSTERING_ENABLED: true,
    CLUSTER_RADIUS: 50,
    GEOFEENCE_RADIUS: 100
  }
};

export const ICONS = {
  PACKAGE: '📦',
  LOCATION: '📍',
  DELIVERED: '✅',
  PENDING: '⏳',
  IN_TRANSIT: '🚚',
  OUT_FOR_DELIVERY: '🛵',
  FAILED: '❌',
  RETURNED: '↩️',
  CENTER: '🎯',
  ZOOM: '🔍',
  SETTINGS: '⚙️',
  NOTIFICATION: '🔔',
  REFRESH: '🔄',
  FILTER: ' filter',
  SORT: ' sort'
};

export const MOCK_PACKAGES = [
  {
    id: 'PKG001',
    trackingNumber: 'DLV-2024-001',
    recipientName: 'Juan Pérez Rodriguez',
    recipientPhone: '+52 33 1234 5678',
    recipientEmail: 'juan.perez@email.com',
    recipientAddress: 'Av. Chapultepec Norte 123, Zona Centro, Guadalajara, Jalisco 44100',
    latitude: 20.6597,
    longitude: -103.3496,
    status: PACKAGE_STATUS.PENDING,
    priority: PRIORITY_LEVELS.HIGH,
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
    status: PACKAGE_STATUS.IN_TRANSIT,
    priority: PRIORITY_LEVELS.MEDIUM,
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
  }
];

// Alias para compatibilidad con versiones anteriores
export const themes = THEMES;

export default {
  PACKAGE_STATUS,
  PRIORITY_LEVELS,
  LOCATION_CONFIG,
  GEOFENCE_RADIUS,
  ANIMATION_DURATION,
  HAPTIC_FEEDBACK_ENABLED,
  THEMES,
  themes, // Alias
  MAP_STYLES,
  ERROR_TYPES,
  PERFORMANCE_MODES,
  ADAPTER_TYPES,
  NOTIFICATION_TYPES,
  DEFAULT_CONFIG,
  ICONS,
  MOCK_PACKAGES
};