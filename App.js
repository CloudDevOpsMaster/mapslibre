// App.js - React Native Integration
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
  ActivityIndicator,
  Platform
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';

// Import our MapScreen components
import MapScreen from './src/screens/MapScreen';
import { useMapController } from './src/screens/MapScreen/useMapController';
import { ServiceFactory } from './src/screens/MapScreen/services';

// Additional screens for delivery app
// import LoginScreen from './src/screens/LoginScreen';
// import PackageListScreen from './src/screens/PackageListScreen';
// import DeliveryScreen from './src/screens/DeliveryScreen';
// import ProfileScreen from './src/screens/ProfileScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

/**
 * MapTrackingScreen - Main delivery tracking screen
 * Integrates MapScreen with complete delivery functionality
 */
function MapTrackingScreen({ navigation, route }) {
  const [deliveryPersonId] = useState('delivery_001'); // In real app, get from auth
  const [packages, setPackages] = useState([]);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize MapController with production configuration
  const mapController = useMapController({
    provider:'mock', // Use mock in development
    initialConfig: {
      latitude: 20.6597,  // Tonalá, Jalisco
      longitude: -103.3496,
      zoom: 12,
      theme: 'light'
    },
    enableLocationTracking: true,
    enablePersistence: true,
    serviceConfig: {}
  });

  /**
   * Load packages on screen focus
   */
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (mapController.isReady) {
        loadPackagesForDelivery();
      }
    });

    return unsubscribe;
  }, [navigation, mapController.isReady]);

  /**
   * Load packages from service
   */
  const loadPackagesForDelivery = async () => {
    try {
      setIsLoading(true);
      
      // Load today's packages for the delivery person
      const loadedPackages = await mapController.loadPackages({
        deliveryPersonId,
        status: 'pending,in_transit',
        date: new Date().toISOString().split('T')[0]
      });

      setPackages(loadedPackages || []);

      // Auto-fit map to show all packages
      if (loadedPackages && loadedPackages.length > 0) {
        await mapController.fitToContent(50);
      }

    } catch (error) {
      console.error('Error loading packages:', error);
      Alert.alert(
        'Error',
        'No se pudieron cargar los paquetes. Verifique su conexión.',
        [{ text: 'Reintentar', onPress: loadPackagesForDelivery }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle marker selection
   */
  const handleMarkerSelect = (markerData) => {
    const packageData = markerData.marker.data;
    setSelectedPackage(packageData);
    
    // Navigate to package details
    navigation.navigate('PackageDetails', { 
      package: packageData,
      onStatusUpdate: handlePackageStatusUpdate
    });
  };

  /**
   * Handle package status updates
   */
  const handlePackageStatusUpdate = async (packageId, newStatus, data = {}) => {
    try {
      // Get current location for the update
      const location = await mapController.services.location.getCurrentLocation();
      
      await mapController.services.package.updatePackageStatus(
        packageId,
        newStatus,
        location,
        data.notes || ''
      );

      // Update local state
      setPackages(prev => prev.map(pkg => 
        pkg.id === packageId 
          ? { ...pkg, status: newStatus, ...data }
          : pkg
      ));

      // Remove from map if delivered
      if (newStatus === 'delivered') {
        await mapController.removeMarker(packageId);
        
        // Send success notification
        const packageData = packages.find(p => p.id === packageId);
        if (packageData) {
          await mapController.services.notification.sendCustomerNotification(
            packageId,
            'delivered',
            {
              packageNumber: packageData.number,
              recipientName: packageData.recipientName
            }
          );
        }
      }

      Alert.alert('Éxito', 'Estado del paquete actualizado correctamente');
    } catch (error) {
      console.error('Error updating package status:', error);
      Alert.alert('Error', 'No se pudo actualizar el estado del paquete');
    }
  };

  /**
   * Handle location permission request
   */
  const requestLocationPermission = async () => {
    try {
      const permissions = await mapController.services.location.requestPermissions();
      
      if (permissions.foreground) {
        await mapController.startLocationTracking();
      } else {
        Alert.alert(
          'Permisos Requeridos',
          'Se requieren permisos de ubicación para el seguimiento de entregas.',
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Configuración', onPress: () => Location.requestForegroundPermissionsAsync() }
          ]
        );
      }
    } catch (error) {
      console.error('Location permission error:', error);
    }
  };

  /**
   * Initialize when map is ready
   */
  useEffect(() => {
    if (mapController.isReady && !mapController.locationState.isTracking) {
      requestLocationPermission();
      loadPackagesForDelivery();
    }
  }, [mapController.isReady]);

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#2196F3" barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Entregas del Día</Text>
        <View style={styles.headerStats}>
          <Text style={styles.headerStatsText}>
            {packages.filter(p => p.status === 'delivered').length} / {packages.length}
          </Text>
          <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
        </View>
      </View>

      {/* Map Container */}
      <View style={styles.mapContainer}>
        <MapScreen
          ref={mapController.mapRef}
          provider={mapController.config?.provider || 'mock'}
          config={mapController.defaultMapConfig}
          markers={mapController.getMarkers()}
          onReady={mapController.handleMapReady}
          onMarkerClick={handleMarkerSelect}
          showsUserLocation={true}
          followsUserLocation={false}
          style={styles.map}
        />

        {/* Loading overlay */}
        {(isLoading || mapController.isLoading) && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#2196F3" />
            <Text style={styles.loadingText}>Cargando entregas...</Text>
          </View>
        )}

        {/* Error overlay */}
        {mapController.hasError && (
          <View style={styles.errorOverlay}>
            <Ionicons name="alert-circle" size={48} color="#f44336" />
            <Text style={styles.errorText}>
              {mapController.error?.message || 'Error en el mapa'}
            </Text>
          </View>
        )}

        {/* Location tracking indicator */}
        {mapController.locationState.isTracking && (
          <View style={styles.trackingIndicator}>
            <View style={styles.trackingDot} />
            <Text style={styles.trackingText}>Seguimiento activo</Text>
          </View>
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <View style={styles.actionButton}>
          <Ionicons name="refresh" size={24} color="#2196F3" />
          <Text style={styles.actionText}>Actualizar</Text>
        </View>
        
        <View style={styles.actionButton}>
          <Ionicons name="location" size={24} color="#4CAF50" />
          <Text style={styles.actionText}>Mi Ubicación</Text>
        </View>
        
        <View style={styles.actionButton}>
          <Ionicons name="list" size={24} color="#FF9800" />
          <Text style={styles.actionText}>Lista</Text>
        </View>
      </View>
    </View>
  );
}

/**
 * Package Details Screen
 */
function PackageDetailsScreen({ route, navigation }) {
  const { package: packageData, onStatusUpdate } = route.params;
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStatusUpdate = async (newStatus, notes = '') => {
    setIsUpdating(true);
    try {
      await onStatusUpdate(packageData.id, newStatus, { notes });
      navigation.goBack();
    } catch (error) {
      console.error('Status update error:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.packageDetails}>
        <Text style={styles.packageNumber}>#{packageData.number}</Text>
        <Text style={styles.packageRecipient}>{packageData.recipientName}</Text>
        <Text style={styles.packageAddress}>{packageData.address.formatted}</Text>
        
        <View style={styles.packageActions}>
          <TouchableOpacity 
            style={[styles.actionBtn, styles.deliverBtn]}
            onPress={() => handleStatusUpdate('delivered', 'Entregado exitosamente')}
            disabled={isUpdating}
          >
            <Text style={styles.actionBtnText}>Marcar como Entregado</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionBtn, styles.issueBtn]}
            onPress={() => navigation.navigate('ReportIssue', { package: packageData })}
            disabled={isUpdating}
          >
            <Text style={styles.actionBtnText}>Reportar Problema</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

/**
 * Main Tab Navigator
 */
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Mapa') {
            iconName = focused ? 'map' : 'map-outline';
          } else if (route.name === 'Paquetes') {
            iconName = focused ? 'list' : 'list-outline';
          } else if (route.name === 'Perfil') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#2196F3',
        tabBarInactiveTintColor: 'gray',
        headerShown: false
      })}
    >
      <Tab.Screen name="Mapa" component={MapTrackingScreen} />
      <Tab.Screen name="Paquetes" component={PackageListScreen} />
      <Tab.Screen name="Perfil" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

/**
 * Root Stack Navigator
 */
function RootStack() {
  return (
    <Stack.Navigator initialRouteName="Main">
      <Stack.Screen 
        name="Main" 
        component={MainTabs} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="PackageDetails" 
        component={PackageDetailsScreen}
        options={{
          title: 'Detalles del Paquete',
          headerStyle: { backgroundColor: '#2196F3' },
          headerTintColor: '#fff'
        }}
      />
    </Stack.Navigator>
  );
}

/**
 * Main App Component with Navigation and Context
 */
export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [initialState, setInitialState] = useState();

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize services
        const serviceFactory = new ServiceFactory({
          apiBaseUrl: __DEV__ 
            ? 'http://localhost:3000/api' 
            : 'https://api.delivery-app.com',
          apiKey: process.env.EXPO_PUBLIC_DELIVERY_API_KEY
        });

        // Request initial permissions
        await Location.requestForegroundPermissionsAsync();
        
        console.log('App initialized successfully');
      } catch (error) {
        console.error('App initialization error:', error);
      } finally {
        setIsReady(true);
      }
    };

    initializeApp();
  }, []);

  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Inicializando aplicación...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer initialState={initialState}>
      <StatusBar backgroundColor="#2196F3" barStyle="light-content" />
      <RootStack />
    </NavigationContainer>
  );
}

/**
 * Placeholder screens for complete navigation
 */
function PackageListScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.placeholder}>
        <Ionicons name="list" size={64} color="#ccc" />
        <Text style={styles.placeholderText}>Lista de Paquetes</Text>
        <Text style={styles.placeholderSubtext}>Próximamente disponible</Text>
      </View>
    </SafeAreaView>
  );
}

function ProfileScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.placeholder}>
        <Ionicons name="person" size={64} color="#ccc" />
        <Text style={styles.placeholderText}>Perfil del Repartidor</Text>
        <Text style={styles.placeholderSubtext}>Configuración y estadísticas</Text>
      </View>
    </SafeAreaView>
  );
}

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  
  // Loading states
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5'
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    textAlign: 'center'
  },
  
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 12 : 12
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff'
  },
  headerStats: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  headerStatsText: {
    fontSize: 16,
    color: '#fff',
    marginRight: 8
  },
  
  // Map
  mapContainer: {
    flex: 1,
    position: 'relative'
  },
  map: {
    flex: 1
  },
  
  // Error overlay
  errorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000
  },
  errorText: {
    fontSize: 16,
    color: '#f44336',
    marginTop: 16,
    textAlign: 'center',
    paddingHorizontal: 32
  },
  
  // Location tracking
  trackingIndicator: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 100
  },
  trackingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
    marginRight: 8
  },
  trackingText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500'
  },
  
  // Quick actions
  quickActions: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0'
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8
  },
  actionText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4
  },
  
  // Package details
  packageDetails: {
    flex: 1,
    padding: 16
  },
  packageNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 8
  },
  packageRecipient: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4
  },
  packageAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24
  },
  packageActions: {
    gap: 16
  },
  actionBtn: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center'
  },
  deliverBtn: {
    backgroundColor: '#4CAF50'
  },
  issueBtn: {
    backgroundColor: '#FF9800'
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  
  // Placeholder screens
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32
  },
  placeholderText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
    textAlign: 'center'
  },
  placeholderSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center'
  }
});