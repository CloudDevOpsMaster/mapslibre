# MapScreen Component

A highly reusable, production-ready React Native map component with delivery tracking capabilities, built using modern design patterns and clean architecture principles.

## Architecture Overview

This component follows the **Clean Architecture** pattern with clear separation of concerns:

```
├── MapScreen/
│   ├── index.js                 # Main component (Presentation Layer)
│   ├── components/              # UI Components
│   │   ├── LoadingScreen.js
│   │   ├── NotificationSystem.js
│   │   └── FloatingActionButtons.js
│   ├── hooks/                   # Custom Hooks (Presentation Logic)
│   │   ├── useLocationTracking.js
│   │   ├── usePackageManager.js
│   │   └── useMapControls.js
│   ├── services/                # Business Logic Layer
│   │   ├── LocationService.js
│   │   ├── PackageService.js
│   │   └── NotificationService.js
│   ├── adapters/                # Data Access Layer
│   │   ├── LocalPackageAdapter.js
│   │   ├── ApiPackageAdapter.js
│   │   └── AdapterFactory.js
│   ├── utils/                   # Utilities
│   │   ├── mapHelpers.js
│   │   ├── animations.js
│   │   └── constants.js
│   ├── types/                   # TypeScript definitions
│   │   └── index.js
│   └── README.md               # This file
```

## Design Patterns Used

### 1. Repository Pattern
- **Location**: `services/PackageService.js`
- **Purpose**: Abstract data access logic from business logic
- **Benefits**: Easy to test, swap data sources

### 2. Adapter Pattern
- **Location**: `adapters/`
- **Purpose**: Make different data sources compatible with the same interface
- **Benefits**: Support multiple backends without changing component logic

### 3. Strategy Pattern
- **Location**: `services/LocationService.js`
- **Purpose**: Different location strategies (high accuracy, battery saver, etc.)
- **Benefits**: Runtime algorithm switching

### 4. Observer Pattern
- **Location**: `hooks/useLocationTracking.js`
- **Purpose**: Location updates, package status changes
- **Benefits**: Loose coupling, reactive updates

### 5. Factory Pattern
- **Location**: `adapters/AdapterFactory.js`
- **Purpose**: Create appropriate data adapters
- **Benefits**: Centralized creation logic

## Installation & Setup

```bash
npm install react-native-webview expo-location expo-haptics
# or
yarn add react-native-webview expo-location expo-haptics
```

## Basic Usage

```jsx
import MapScreen from './MapScreen';

function App() {
  return (
    <MapScreen
      dataSource="api"
      apiConfig={{
        baseUrl: "https://api.example.com",
        apiKey: "your-api-key"
      }}
      onPackageUpdate={(pkg) => console.log('Package updated:', pkg)}
      onLocationUpdate={(location) => console.log('Location:', location)}
    />
  );
}
```

## Props API

### Core Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `dataSource` | `'local' \| 'api' \| 'custom'` | `'local'` | Data source type |
| `adapter` | `IPackageAdapter` | `null` | Custom adapter instance |
| `apiConfig` | `ApiConfig` | `{}` | API configuration |
| `theme` | `'light' \| 'dark'` | `'light'` | UI theme |
| `enableRealTimeTracking` | `boolean` | `true` | Enable GPS tracking |
| `enableGeofencing` | `boolean` | `true` | Enable geofence notifications |
| `enableHaptics` | `boolean` | `true` | Enable haptic feedback |

### Event Handlers

| Prop | Type | Description |
|------|------|-------------|
| `onPackageUpdate` | `(package: Package) => void` | Package status changed |
| `onLocationUpdate` | `(location: Location) => void` | Location updated |
| `onRouteCalculated` | `(route: Route) => void` | Route calculation completed |
| `onGeofenceEnter` | `(package: Package) => void` | Entered package geofence |
| `onError` | `(error: Error) => void` | Error occurred |

### Styling Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `customStyles` | `StyleSheet` | `{}` | Custom styles |
| `mapStyle` | `MapStyle` | `'default'` | Map visual style |
| `primaryColor` | `string` | `'#3498db'` | Primary color |
| `accentColor` | `string` | `'#e74c3c'` | Accent color |

## Data Adapters

### Built-in Adapters

#### 1. LocalPackageAdapter
Uses mock/local data for development and testing.

```jsx
<MapScreen dataSource="local" />
```

#### 2. ApiPackageAdapter
Connects to REST API endpoints.

```jsx
<MapScreen 
  dataSource="api"
  apiConfig={{
    baseUrl: "https://api.delivery.com",
    apiKey: "your-api-key",
    endpoints: {
      packages: "/packages",
      updateStatus: "/packages/:id/status"
    }
  }}
/>
```

### Custom Adapters

Implement the `IPackageAdapter` interface:

```jsx
class CustomAdapter {
  async getPackages() {
    // Your implementation
    return packages;
  }

  async updatePackageStatus(id, status) {
    // Your implementation
    return updatedPackage;
  }

  async getPackageDetails(id) {
    // Your implementation
    return package;
  }

  // Subscribe to real-time updates
  subscribe(callback) {
    // Your implementation
    return unsubscribe;
  }
}

// Usage
const customAdapter = new CustomAdapter();

<MapScreen 
  dataSource="custom"
  adapter={customAdapter}
/>
```

## Location Service Configuration

```jsx
<MapScreen
  locationConfig={{
    accuracy: 'high', // 'low' | 'medium' | 'high' | 'best'
    updateInterval: 10000, // milliseconds
    distanceFilter: 5, // meters
    enableBackground: true
  }}
/>
```

## Theming

### Built-in Themes

```jsx
// Light theme (default)
<MapScreen theme="light" />

// Dark theme
<MapScreen theme="dark" />
```

### Custom Theme

```jsx
const customTheme = {
  background: '#1a1a1a',
  surface: '#2d3748',
  primary: '#4299e1',
  accent: '#f56565',
  text: '#f7fafc',
  textSecondary: '#a0aec0'
};

<MapScreen 
  theme="custom"
  customTheme={customTheme}
/>
```

## Advanced Features

### Geofencing

```jsx
<MapScreen
  enableGeofencing={true}
  geofenceConfig={{
    radius: 100, // meters
    dwellTime: 30000, // milliseconds
    enableNotifications: true
  }}
  onGeofenceEnter={(package) => {
    console.log('Entered delivery zone:', package.id);
  }}
/>
```

### Custom Map Styles

```jsx
<MapScreen
  mapStyle={{
    style: 'mapbox://styles/username/style-id',
    accessToken: 'your-mapbox-token'
  }}
/>
```

### Performance Optimization

```jsx
<MapScreen
  performanceMode="high" // 'low' | 'medium' | 'high'
  maxPackagesVisible={50}
  enableClustering={true}
  clusterRadius={50}
/>
```

## Error Handling

The component provides comprehensive error handling:

```jsx
<MapScreen
  onError={(error) => {
    console.error('MapScreen error:', error);
    
    switch (error.type) {
      case 'LOCATION_PERMISSION_DENIED':
        // Handle permission error
        break;
      case 'NETWORK_ERROR':
        // Handle network error
        break;
      case 'MAP_LOAD_ERROR':
        // Handle map loading error
        break;
    }
  }}
/>
```

## Testing

### Unit Tests

```jsx
import { render, fireEvent } from '@testing-library/react-native';
import MapScreen from './MapScreen';
import MockAdapter from './adapters/MockAdapter';

test('renders package markers', async () => {
  const mockAdapter = new MockAdapter();
  
  const { findByTestId } = render(
    <MapScreen 
      adapter={mockAdapter}
      testID="map-screen"
    />
  );
  
  const mapView = await findByTestId('map-screen');
  expect(mapView).toBeTruthy();
});
```

### Integration Tests

```jsx
test('updates package status', async () => {
  const onPackageUpdate = jest.fn();
  
  const { getByTestId } = render(
    <MapScreen onPackageUpdate={onPackageUpdate} />
  );
  
  // Simulate package status update
  fireEvent.press(getByTestId('update-status-button'));
  
  expect(onPackageUpdate).toHaveBeenCalled();
});
```

## Performance Guidelines

1. **Package Limits**: Display max 100 packages simultaneously
2. **Update Frequency**: Location updates every 10 seconds minimum
3. **Memory Management**: Use React.memo for child components
4. **Image Optimization**: Compress marker icons
5. **Network Efficiency**: Batch API requests

## Platform-Specific Notes

### iOS
- Requires `NSLocationWhenInUseUsageDescription` in Info.plist
- WebView may need additional time to initialize
- Haptic feedback requires iOS 10+

### Android
- Requires `ACCESS_FINE_LOCATION` permission
- Background location needs `ACCESS_BACKGROUND_LOCATION`
- WebView hardware acceleration recommended

## Migration Guide

### From v1.x to v2.x

1. Update prop names:
```jsx
// Old
<MapScreen initialPackages={packages} />

// New
<MapScreen dataSource="local" packages={packages} />
```

2. Replace custom data handling with adapters:
```jsx
// Old
<MapScreen onDataFetch={customFetch} />

// New
<MapScreen adapter={new CustomAdapter()} />
```

## Troubleshooting

### Common Issues

**1. Map not loading**
- Check network connectivity
- Verify WebView permissions
- Enable JavaScript in WebView

**2. Location not updating**
- Check location permissions
- Verify GPS is enabled
- Check location accuracy settings

**3. Package markers not showing**
- Verify package data format
- Check adapter implementation
- Debug WebView console logs

**4. Performance issues**
- Reduce package count
- Enable clustering
- Use performance mode

## Contributing

1. Follow the existing architecture patterns
2. Add tests for new features
3. Update documentation
4. Follow React Native best practices

## License

MIT License - see LICENSE file for details.