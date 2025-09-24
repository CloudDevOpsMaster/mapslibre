// components/ImprovedFloatingButtons.js
import React, { useState } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import EnhancedFAB from './EnhancedFAB';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const ImprovedFloatingButtons = ({ 
  on_center_location, 
  on_fit_to_packages, 
  on_toggle_settings,
  theme = 'light' 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [slideAnim] = useState(new Animated.Value(0));
  const [rotateAnim] = useState(new Animated.Value(0));

  const toggleExpanded = () => {
    const toValue = isExpanded ? 0 : 1;
    setIsExpanded(!isExpanded);

    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue,
        useNativeDriver: true,
        tension: 120,
        friction: 8,
      }),
      Animated.spring(rotateAnim, {
        toValue,
        useNativeDriver: true,
        tension: 120,
        friction: 8,
      })
    ]).start();
  };

  const slideInterpolate1 = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -70]
  });

  const slideInterpolate2 = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -130]
  });

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '90deg']
  });

  const opacityInterpolate = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1]
  });

  return (
    <View style={styles.container}>
      {/* Overlay para cerrar el menú al tocar fuera */}
      {isExpanded && (
        <Animated.View 
          style={[
            styles.overlay, 
            { opacity: opacityInterpolate }
          ]}
          onTouchEnd={toggleExpanded}
        />
      )}

      {/* Botón de configuración */}
      <Animated.View style={[
        styles.fabContainer,
        {
          transform: [
            { translateY: slideInterpolate2 },
            { scale: slideAnim }
          ],
          opacity: opacityInterpolate
        }
      ]}>
        <EnhancedFAB
          icon="⚙️"
          on_press={() => {
            on_toggle_settings();
            toggleExpanded();
          }}
          variant="mini"
          style={styles.secondaryFab}
          label="Configuración"
          show_label={isExpanded}
        />
      </Animated.View>

      {/* Botón de ajustar vista */}
      <Animated.View style={[
        styles.fabContainer,
        {
          transform: [
            { translateY: slideInterpolate1 },
            { scale: slideAnim }
          ],
          opacity: opacityInterpolate
        }
      ]}>
        <EnhancedFAB
          icon="🔍"
          on_press={() => {
            on_fit_to_packages();
            toggleExpanded();
          }}
          variant="mini"
          style={styles.secondaryFab}
          label="Ajustar vista"
          show_label={isExpanded}
        />
      </Animated.View>

      {/* Botón de menú/expandir */}
      <Animated.View style={[
        styles.menuFabContainer,
        { transform: [{ rotate: rotateInterpolate }] }
      ]}>
        <EnhancedFAB
          icon="⋯"
          on_press={toggleExpanded}
          variant="primary"
          style={styles.menuFab}
          label={isExpanded ? "Cerrar" : "Más opciones"}
          show_label={false}
        />
      </Animated.View>

      {/* Botón principal - Mi ubicación */}
      <View style={styles.mainFabContainer}>
        <EnhancedFAB
          icon="🎯"
          on_press={on_center_location}
          variant="primary"
          style={styles.mainFab}
          label="Mi ubicación"
          show_label={false}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 1000,
  },
  overlay: {
    position: 'absolute',
    top: -screenHeight,
    left: -screenWidth,
    width: screenWidth * 2,
    height: screenHeight * 2,
    backgroundColor: 'transparent',
    zIndex: 999,
  },
  fabContainer: {
    marginBottom: 8,
    alignItems: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
  },
  mainFabContainer: {
    marginBottom: 12,
  },
  menuFabContainer: {
    // Este es el botón que permanece siempre visible
  },
  mainFab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2196F3',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
  },
  menuFab: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FF5722',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  secondaryFab: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4CAF50',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    marginRight: 8,
  },
});

export default ImprovedFloatingButtons;