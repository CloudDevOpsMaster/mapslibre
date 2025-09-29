import { Alert, Platform } from 'react-native';

export const SYNC_CONFIG = {
  endpoint: 'https://0fhmgyybv3.execute-api.us-east-2.amazonaws.com/saasintel/sync/packages',
  timeout: 20000,
  retries: 2
};

export class SyncService {
  constructor() {
    this.syncedPackages = [];
    this.syncStats = {
      totalPackages: 0,
      lastSync: null,
      syncCount: 0
    };
  }

  async syncPackages(userLocation) {
    const syncData = {
      timestamp: new Date().toISOString(),
      deviceId: `device_${Platform.OS}_${Math.random().toString(36).substr(2, 9)}`,
      location: userLocation ? {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        accuracy: userLocation.accuracy
      } : null,
      requestId: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      filters: {
        geocoding_ready: true,
        date_from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      },
      limit: 100,
      includeMetadata: true
    };

    console.log('Iniciando sincronización con datos:', {
      deviceId: syncData.deviceId,
      hasLocation: !!syncData.location,
      filters: syncData.filters,
      limit: syncData.limit
    });

    const response = await fetch(SYNC_CONFIG.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(syncData),
      timeout: SYNC_CONFIG.timeout
    });

    if (!response.ok) {
      throw new Error(`HTTP_ERROR_${response.status}: ${response.statusText}`);
    }

    const responseDataJson = await response.json();
    const responseData = responseDataJson.data;
    
    console.log('Respuesta del servidor recibida:', {
      success: responseData.success,
      totalPackages: responseData.totalPackages,
      packagesCount: responseData.packages?.length,
      fullResponse: responseData
    });

    if (!responseData.success) {
      throw new Error(`SERVER_ERROR: ${responseData.error?.message || 'Unknown error'}`);
    }

    if (!responseData.packages || !Array.isArray(responseData.packages)) {
      console.error('Estructura de respuesta inesperada:', responseData);
      throw new Error(`INVALID_RESPONSE: Expected packages array, got: ${typeof responseData.packages}`);
    }

    const greenNumbersTotal = responseData.packages.reduce((total, pkg) => {
      return total + (pkg.stamps_summary?.green_numbers?.length || 0);
    }, 0);

    const packagesWithDestinationQuery = responseData.packages.filter(pkg => 
      pkg.location_details?.destination?.query && pkg.location_details.destination.query.trim()
    ).length;

    this.syncedPackages = responseData.packages;
    this.syncStats = {
      totalPackages: responseData.totalPackages || 0,
      lastSync: responseData.timestamp || new Date().toISOString(),
      syncCount: (this.syncStats.syncCount || 0) + 1,
      updatedPackages: responseData.returnedPackages || 0,
      greenNumbersTotal,
      packagesWithDestinationQuery
    };

    return responseData;
  }

  createPackageMarkers(packages) {
    if (!packages || !Array.isArray(packages)) {
      console.warn('No packages to send to map');
      return [];
    }

    return packages
      .filter(pkg => pkg.route_summary?.geocoding_ready)
      .map(pkg => ({
        id: `package_${pkg.id}`,
        type: 'package',
        title: `📦 ${pkg.tracking_number}`,
        description: [
          `Carrier: ${pkg.carrier}`,
          `Ruta: ${pkg.route_summary?.from} → ${pkg.route_summary?.to}`,
          `Estado: ${pkg.route_summary?.viable ? 'Viable' : 'Revisar'}`,
          `Confianza: ${Math.round((pkg.quality?.address_confidence || 0) * 100)}%`,
          `Números verdes: ${pkg.stamps_summary?.green_numbers?.length || 0}`,
          `Query destino: ${pkg.location_details?.destination?.query ? 'Sí' : 'No'}`,
          `Sellos detectados: ${pkg.stamps_summary?.total_stamps || 0}`,
          `Sincronizado: ${new Date().toLocaleTimeString()}`
        ].join('\n'),
        coordinates: {
          latitude: 20.676109 + (Math.random() - 0.5) * 0.1,
          longitude: -103.347769 + (Math.random() - 0.5) * 0.1
        },
        packageData: pkg,
        style: {
          color: pkg.route_summary?.viable ? '#10b981' : '#f59e0b',
          size: 'medium',
          icon: pkg.stamps_summary?.green_numbers?.length > 0 ? '💚' : '📦'
        }
      }));
  }

  showSyncNotification(type, data) {
    let alertTitle = '';
    let alertMessage = '';

    if (type === 'success') {
      const packagesCount = data.packages?.length || 0;
      const totalPackages = data.totalPackages || 0;
      const viablePackages = data.packages?.filter(pkg => pkg.route_summary?.viable).length || 0;

      let greenNumbers = [];
      let destinationQueries = [];

      if (data.packages && Array.isArray(data.packages)) {
        data.packages.forEach(pkg => {
          if (pkg.stamps_summary?.green_numbers && Array.isArray(pkg.stamps_summary.green_numbers)) {
            pkg.stamps_summary.green_numbers.forEach(greenNum => {
              greenNumbers.push({
                number: greenNum.number,
                tracking: pkg.tracking_number
              });
            });
          }

          if (pkg.location_details?.destination?.query && pkg.location_details.destination.query.trim()) {
            destinationQueries.push({
              query: pkg.location_details.destination.query,
              tracking: pkg.tracking_number
            });
          }
        });
      }

      alertTitle = '¡Sincronización CartaPorte exitosa!';
      alertMessage = `Paquetes obtenidos: ${packagesCount} de ${totalPackages}\nRutas viables: ${viablePackages}`;

      if (greenNumbers.length > 0) {
        alertMessage += `\n\nNúmeros verdes detectados: ${greenNumbers.length}`;
        const firstGreenNumbers = greenNumbers.slice(0, 3);
        firstGreenNumbers.forEach(green => {
          alertMessage += `\n• ${green.number} (${green.tracking})`;
        });
        if (greenNumbers.length > 3) {
          alertMessage += `\n• ... y ${greenNumbers.length - 3} más`;
        }
      }

      if (destinationQueries.length > 0) {
        alertMessage += `\n\nQueries destino encontrados: ${destinationQueries.length}`;
        const firstQueries = destinationQueries.slice(0, 2);
        firstQueries.forEach(dest => {
          alertMessage += `\n• ${dest.query} (${dest.tracking})`;
        });
        if (destinationQueries.length > 2) {
          alertMessage += `\n• ... y ${destinationQueries.length - 2} más`;
        }
      }

      if (data.timestamp) {
        const syncTime = new Date(data.timestamp).toLocaleTimeString();
        alertMessage += `\n\nÚltima sincronización: ${syncTime}`;
      }

      if (data.metadata?.sync_info) {
        const syncInfo = data.metadata.sync_info;
        if (syncInfo.completion_ratio < 1) {
          alertMessage += `\n(${Math.round((1 - syncInfo.completion_ratio) * 100)}% paquetes adicionales disponibles)`;
        }
      }

      Alert.alert(alertTitle, alertMessage, [{ text: 'OK' }]);
    }

    console.log('Mostrando notificación de sincronización:', alertMessage);
  }

  showSyncError(error, onRetry) {
    let errorInfo = {
      title: 'Error de Sincronización',
      message: 'No se pudo sincronizar los paquetes.',
      suggestions: ['Verifica tu conexión a internet', 'Intenta nuevamente']
    };

    if (error.message.startsWith('HTTP_ERROR_')) {
      const statusCode = error.message.match(/HTTP_ERROR_(\d+)/)?.[1];

      switch (statusCode) {
        case '401':
          errorInfo = {
            title: 'Error de Autenticación',
            message: 'Sesión expirada o credenciales inválidas.',
            suggestions: [
              'Inicia sesión nuevamente',
              'Verifica tu token de acceso',
              'Contacta al administrador'
            ]
          };
          break;
        case '404':
          errorInfo = {
            title: 'Servicio No Disponible',
            message: 'El servicio de sincronización no está disponible.',
            suggestions: [
              'El servidor puede estar en mantenimiento',
              'Contacta al soporte técnico'
            ]
          };
          break;
        case '500':
          errorInfo = {
            title: 'Error del Servidor',
            message: 'Error interno del servidor.',
            suggestions: [
              'Intenta más tarde',
              'El problema es temporal',
              'Reporta el error si persiste'
            ]
          };
          break;
      }
    } else if (error.message === 'SYNC_TIMEOUT') {
      errorInfo = {
        title: 'Tiempo Agotado',
        message: 'La sincronización tardó demasiado.',
        suggestions: [
          'Verifica tu conexión a internet',
          'El servidor puede estar lento',
          'Intenta nuevamente'
        ]
      };
    } else if (error.message.startsWith('SERVER_ERROR:')) {
      errorInfo = {
        title: 'Error del Servidor',
        message: error.message.replace('SERVER_ERROR: ', ''),
        suggestions: [
          'El servidor reportó un error',
          'Intenta más tarde',
          'Contacta al soporte si persiste'
        ]
      };
    } else if (error.message === 'INVALID_RESPONSE') {
      errorInfo = {
        title: 'Respuesta Inválida',
        message: 'El servidor devolvió datos incorrectos.',
        suggestions: [
          'Error en el formato de respuesta',
          'Intenta nuevamente',
          'Reporta este error'
        ]
      };
    }

    const fullMessage = `${errorInfo.message}\n\n${errorInfo.suggestions.map(s => `• ${s}`).join('\n')}`;

    return new Promise((resolve) => {
      Alert.alert(
        errorInfo.title,
        fullMessage,
        [
          {
            text: 'Reintentar',
            onPress: () => {
              if (onRetry) {
                setTimeout(onRetry, 1000);
              }
              resolve('retry');
            },
            style: 'default'
          },
          {
            text: 'Cancelar',
            style: 'cancel',
            onPress: () => resolve('cancel')
          }
        ]
      );
    });
  }

  showSyncStats() {
    if (this.syncedPackages.length === 0) {
      Alert.alert('Sin Sincronización', 'No se han sincronizado paquetes aún.\n\nToca el botón de sincronizar para obtener paquetes del servidor CartaPorte.');
      return;
    }

    const viablePackages = this.syncedPackages.filter(pkg => pkg.route_summary?.viable).length;
    const geocodingReady = this.syncedPackages.filter(pkg => pkg.route_summary?.geocoding_ready).length;
    const greenNumbersTotal = this.syncStats.greenNumbersTotal || 0;
    const packagesWithDestinationQuery = this.syncStats.packagesWithDestinationQuery || 0;

    const carrierStats = this.syncedPackages.reduce((acc, pkg) => {
      acc[pkg.carrier] = (acc[pkg.carrier] || 0) + 1;
      return acc;
    }, {});

    const statsMessage = [
      `ESTADÍSTICAS DE SINCRONIZACIÓN CARTAPORTE:`,
      ``,
      `Paquetes sincronizados: ${this.syncedPackages.length}`,
      `Total en servidor: ${this.syncStats.totalPackages}`,
      `Rutas viables: ${viablePackages}`,
      `Listos para geocoding: ${geocodingReady}`,
      `Números verdes detectados: ${greenNumbersTotal}`,
      `Con queries destino: ${packagesWithDestinationQuery}`,
      ``,
      `CARRIERS:`,
      ...Object.entries(carrierStats).map(([carrier, count]) => `• ${carrier}: ${count}`),
      ``,
      `Última sincronización: ${this.syncStats.lastSync ? new Date(this.syncStats.lastSync).toLocaleString() : 'Nunca'}`,
      `Sincronizaciones totales: ${this.syncStats.syncCount}`
    ].join('\n');

    return new Promise((resolve) => {
      Alert.alert('Estadísticas CartaPorte Sync', statsMessage, [
        { text: 'Cerrar', style: 'cancel', onPress: () => resolve('close') },
        { text: 'Sincronizar Ahora', onPress: () => resolve('sync') }
      ]);
    });
  }
}