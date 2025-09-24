// adapters/AdapterFactory.js - Factory corregido para adaptadores
import LocalPackageAdapter from './LocalPackageAdapter';

class AdapterFactory {
  static createAdapter(type, config = {}) {
    console.log(`AdapterFactory: Creating adapter of type '${type}'`);
    
    switch (type.toLowerCase()) {
      case 'local':
        const localConfig = {
          enablePersistence: true,
          enableRealtimeSimulation: true,
          mockDataEnabled: true,
          ...config
        };
        
        console.log('AdapterFactory: Created local adapter with config:', localConfig);
        return new LocalPackageAdapter(localConfig);
        
      case 'api':
        // Implementar adaptador API cuando sea necesario
        console.warn('AdapterFactory: API adapter not implemented yet, falling back to local');
        return new LocalPackageAdapter({
          enablePersistence: false,
          enableRealtimeSimulation: false,
          mockDataEnabled: false,
          ...config
        });
        
      case 'firebase':
        // Implementar adaptador Firebase cuando sea necesario
        console.warn('AdapterFactory: Firebase adapter not implemented yet, falling back to local');
        return new LocalPackageAdapter(config);
        
      default:
        console.warn(`AdapterFactory: Unknown adapter type '${type}', using local adapter`);
        return new LocalPackageAdapter(config);
    }
  }

  static getSupportedTypes() {
    return ['local', 'api', 'firebase'];
  }

  static validateConfig(type, config) {
    const errors = [];
    
    switch (type.toLowerCase()) {
      case 'local':
        // Validaciones específicas para adaptador local
        if (config.storageKey && typeof config.storageKey !== 'string') {
          errors.push('storageKey debe ser una cadena');
        }
        break;
        
      case 'api':
        // Validaciones para adaptador API
        if (!config.baseURL) {
          errors.push('baseURL es requerido para el adaptador API');
        }
        if (config.timeout && (typeof config.timeout !== 'number' || config.timeout < 0)) {
          errors.push('timeout debe ser un número positivo');
        }
        break;
        
      case 'firebase':
        // Validaciones para Firebase
        if (!config.projectId) {
          errors.push('projectId es requerido para Firebase');
        }
        break;
    }
    
    return errors;
  }
}

export default AdapterFactory;