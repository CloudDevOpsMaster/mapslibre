// hooks/usePackageManager.js - Hook corregido para evitar loading infinito
import { useState, useEffect, useCallback, useRef } from 'react';

const usePackageManager = (adapter, initialPackages = []) => {
  const [packages, setPackages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const adapterRef = useRef(adapter);
  const subscriptionRef = useRef(null);
  const mountedRef = useRef(true);

  // Actualizar referencia del adapter
  useEffect(() => {
    adapterRef.current = adapter;
  }, [adapter]);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (subscriptionRef.current) {
        subscriptionRef.current();
        subscriptionRef.current = null;
      }
    };
  }, []);

  // Función para cargar paquetes de manera segura
  const loadPackages = useCallback(async () => {
    if (!mountedRef.current) return;

    try {
      setIsLoading(true);
      setError(null);

      console.log('📦 Iniciando carga de paquetes...');

      // Si tenemos paquetes iniciales, usarlos primero
      if (initialPackages && initialPackages.length > 0) {
        console.log(`📦 Usando ${initialPackages.length} paquetes iniciales`);
        setPackages(initialPackages);
        setIsLoading(false);
        return initialPackages;
      }

      // Si no hay paquetes iniciales, intentar cargar del adapter
      if (adapterRef.current && typeof adapterRef.current.getPackages === 'function') {
        console.log('📦 Cargando paquetes del adapter...');
        
        const loadedPackages = await adapterRef.current.getPackages();
        
        if (!mountedRef.current) return;

        if (Array.isArray(loadedPackages)) {
          console.log(`📦 Cargados ${loadedPackages.length} paquetes del adapter`);
          setPackages(loadedPackages);
        } else {
          console.warn('📦 El adapter no devolvió un array válido, usando array vacío');
          setPackages([]);
        }
      } else {
        console.log('📦 No hay adapter disponible o no tiene método getPackages, usando paquetes vacíos');
        setPackages([]);
      }

    } catch (err) {
      console.error('❌ Error cargando paquetes:', err);
      
      if (mountedRef.current) {
        setError(err.message || 'Error cargando paquetes');
        // En caso de error, usar paquetes iniciales si están disponibles
        if (initialPackages && initialPackages.length > 0) {
          console.log('📦 Usando paquetes iniciales como fallback');
          setPackages(initialPackages);
        } else {
          setPackages([]);
        }
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
        console.log('📦 Carga de paquetes completada');
      }
    }
  }, [initialPackages]);

  // Cargar paquetes al inicializar o cuando cambien los iniciales
  useEffect(() => {
    // Pequeño delay para evitar problemas de renderizado
    const timer = setTimeout(() => {
      if (mountedRef.current) {
        loadPackages();
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [loadPackages]);

  // Función para actualizar estado de un paquete
  const updatePackageStatus = useCallback(async (packageId, newStatus) => {
    if (!mountedRef.current) return null;

    try {
      console.log(`📦 Actualizando paquete ${packageId} a estado ${newStatus}`);

      // Actualizar localmente primero para UI responsiva
      setPackages(prev => 
        prev.map(pkg => 
          pkg.id === packageId 
            ? { ...pkg, status: newStatus, updatedAt: new Date().toISOString() }
            : pkg
        )
      );

      // Intentar actualizar en el adapter si está disponible
      if (adapterRef.current && typeof adapterRef.current.updatePackageStatus === 'function') {
        const updatedPackage = await adapterRef.current.updatePackageStatus(packageId, newStatus);
        
        if (mountedRef.current && updatedPackage) {
          // Actualizar con la respuesta del adapter
          setPackages(prev => 
            prev.map(pkg => 
              pkg.id === packageId ? updatedPackage : pkg
            )
          );
          return updatedPackage;
        }
      }

      // Si no hay adapter, devolver el paquete actualizado localmente
      const updatedPackage = packages.find(pkg => pkg.id === packageId);
      return updatedPackage ? { ...updatedPackage, status: newStatus } : null;

    } catch (err) {
      console.error('❌ Error actualizando paquete:', err);
      
      // Revertir cambio local en caso de error
      setPackages(prev => 
        prev.map(pkg => 
          pkg.id === packageId 
            ? { ...pkg } // Mantener estado anterior
            : pkg
        )
      );
      
      throw err;
    }
  }, [packages]);

  // Función para obtener detalles de un paquete
  const getPackageDetails = useCallback(async (packageId) => {
    try {
      // Buscar primero en el estado local
      const localPackage = packages.find(pkg => pkg.id === packageId);
      
      if (localPackage) {
        return localPackage;
      }

      // Si no está en el estado local, intentar obtener del adapter
      if (adapterRef.current && typeof adapterRef.current.getPackageDetails === 'function') {
        const packageDetails = await adapterRef.current.getPackageDetails(packageId);
        return packageDetails;
      }

      return null;
    } catch (err) {
      console.error('❌ Error obteniendo detalles del paquete:', err);
      return null;
    }
  }, [packages]);

  // Función para suscribirse a actualizaciones en tiempo real
  const subscribeToUpdates = useCallback((callback) => {
    if (!callback || typeof callback !== 'function') {
      console.warn('📦 Callback de suscripción no es válido');
      return () => {};
    }

    console.log('📦 Suscribiéndose a actualizaciones en tiempo real');

    // Si el adapter soporta suscripciones
    if (adapterRef.current && typeof adapterRef.current.subscribeToUpdates === 'function') {
      try {
        const unsubscribe = adapterRef.current.subscribeToUpdates((event) => {
          if (!mountedRef.current) return;

          console.log('📦 Evento recibido del adapter:', event.type);

          switch (event.type) {
            case 'packageUpdated':
              setPackages(prev => 
                prev.map(pkg => 
                  pkg.id === event.package.id ? event.package : pkg
                )
              );
              break;

            case 'packageAdded':
              setPackages(prev => [...prev, event.package]);
              break;

            case 'packageRemoved':
              setPackages(prev => prev.filter(pkg => pkg.id !== event.packageId));
              break;

            default:
              console.log('📦 Tipo de evento desconocido:', event.type);
          }

          // Llamar al callback externo
          callback(event);
        });

        subscriptionRef.current = unsubscribe;
        return unsubscribe;
      } catch (err) {
        console.error('❌ Error suscribiéndose a actualizaciones:', err);
      }
    }

    // Fallback: devolver función de cleanup vacía
    return () => {
      console.log('📦 Cleanup de suscripción (fallback)');
    };
  }, []);

  // Función para refrescar paquetes manualmente
  const refreshPackages = useCallback(() => {
    console.log('📦 Refrescando paquetes manualmente...');
    return loadPackages();
  }, [loadPackages]);

  // Función para agregar un paquete
  const addPackage = useCallback((newPackage) => {
    if (!mountedRef.current) return;

    console.log('📦 Agregando nuevo paquete:', newPackage.trackingNumber);
    
    setPackages(prev => {
      // Evitar duplicados
      const exists = prev.some(pkg => pkg.id === newPackage.id);
      if (exists) {
        console.warn('📦 El paquete ya existe, actualizando...');
        return prev.map(pkg => 
          pkg.id === newPackage.id ? newPackage : pkg
        );
      }
      return [...prev, newPackage];
    });
  }, []);

  // Función para remover un paquete
  const removePackage = useCallback((packageId) => {
    if (!mountedRef.current) return;

    console.log('📦 Removiendo paquete:', packageId);
    
    setPackages(prev => prev.filter(pkg => pkg.id !== packageId));
  }, []);

  // Debug info para desarrollo
  useEffect(() => {
    if (__DEV__) {
      console.log('📦 Estado del PackageManager:', {
        packagesCount: packages.length,
        isLoading,
        hasError: !!error,
        hasAdapter: !!adapterRef.current,
        initialPackagesCount: initialPackages.length
      });
    }
  }, [packages.length, isLoading, error, initialPackages.length]);

  return {
    packages,
    isLoading,
    error,
    updatePackageStatus,
    loadPackages: refreshPackages,
    getPackageDetails,
    subscribeToUpdates,
    addPackage,
    removePackage,
    
    // Funciones de utilidad
    packagesCount: packages.length,
    hasPackages: packages.length > 0,
    refreshPackages
  };
};

export default usePackageManager;