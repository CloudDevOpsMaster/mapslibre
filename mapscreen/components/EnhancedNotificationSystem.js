// components/EnhancedNotificationSystem.js - Sistema de notificaciones mejorado
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  PanGestureHandler,
  State,
  Dimensions,
  Platform,
  StatusBar
} from 'react-native';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { UI_CONFIG } from '../config/ui_config';

const { width: screenWidth } = Dimensions.get('window');
const statusBarHeight = Platform.OS === 'ios' ? StatusBar.currentHeight || 44 : StatusBar.currentHeight || 0;

const NOTIFICATION_TYPES = {
  info: {
    icon: 'ℹ️',
    color: UI_CONFIG.colors.primary[500],
    backgroundColor: UI_CONFIG.colors.primary[50],
    borderColor: UI_CONFIG.colors.primary[200],
    textColor: UI_CONFIG.colors.primary[700]
  },
  success: {
    icon: '✅',
    color: UI_CONFIG.colors.success[500],
    backgroundColor: UI_CONFIG.colors.success[50],
    borderColor: UI_CONFIG.colors.success[200],
    textColor: UI_CONFIG.colors.success[700]
  },
  warning: {
    icon: '⚠️',
    color: UI_CONFIG.colors.warning[500],
    backgroundColor: UI_CONFIG.colors.warning[50],
    borderColor: UI_CONFIG.colors.warning[200],
    textColor: UI_CONFIG.colors.warning[700]
  },
  error: {
    icon: '❌',
    color: UI_CONFIG.colors.danger[500],
    backgroundColor: UI_CONFIG.colors.danger[50],
    borderColor: UI_CONFIG.colors.danger[200],
    textColor: UI_CONFIG.colors.danger[700]
  },
  location: {
    icon: '📍',
    color: '#06b6d4',
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    borderColor: 'rgba(6, 182, 212, 0.3)',
    textColor: '#0e7490'
  }
};

const EnhancedNotificationSystem = ({
  message,
  type = 'info',
  duration = 4000,
  onHide,
  theme = 'light',
  position = 'top',
  enableHaptics = true,
  enableGestures = true,
  showProgress = true,
  customIcon,
  actionButton
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);
  
  // Referencias para animaciones
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.9)).current;
  const progress = useRef(new Animated.Value(0)).current;
  const panX = useRef(new Animated.Value(0)).current;
  
  // Referencias para timers y control
  const hideTimer = useRef(null);
  const progressTimer = useRef(null);
  const gestureEnabled = useRef(true);

  // Obtener configuración del tema
  const currentTheme = UI_CONFIG.themes[theme];
  const notificationConfig = NOTIFICATION_TYPES[type] || NOTIFICATION_TYPES.info;

  // Efecto para mostrar/ocultar notificación
  useEffect(() => {
    if (message) {
      showNotification();
    } else {
      hideNotification();
    }

    return () => {
      clearTimers();
    };
  }, [message]);

  const clearTimers = () => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
    if (progressTimer.current) {
      clearTimeout(progressTimer.current);
      progressTimer.current = null;
    }
  };

  const triggerHaptic = useCallback((hapticType) => {
    if (!enableHaptics || Platform.OS !== 'ios') return;

    switch (hapticType) {
      case 'show':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case 'dismiss':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case 'error':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;
      case 'success':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case 'warning':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
    }
  }, [enableHaptics]);

  const showNotification = useCallback(() => {
    if (isVisible) return;

    setIsVisible(true);
    setIsDismissing(false);
    gestureEnabled.current = true;

    // Trigger haptic basado en el tipo
    if (type === 'error') triggerHaptic('error');
    else if (type === 'success') triggerHaptic('success');
    else if (type === 'warning') triggerHaptic('warning');
    else triggerHaptic('show');

    // Resetear valores
    translateY.setValue(position === 'top' ? -100 : 100);
    opacity.setValue(0);
    scale.setValue(0.9);
    progress.setValue(0);
    panX.setValue(0);

    // Animación de entrada con spring suave
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        ...UI_CONFIG.designTokens.animations.spring.gentle
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: UI_CONFIG.designTokens.animations.durations.fast,
        useNativeDriver: true
      }),
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        ...UI_CONFIG.designTokens.animations.spring.gentle
      })
    ]).start();

    // Animación de progreso si está habilitada
    if (showProgress && duration > 0) {
      progress.setValue(0);
      Animated.timing(progress, {
        toValue: 1,
        duration: duration,
        useNativeDriver: false // El progress bar no puede usar native driver
      }).start();
    }

    // Auto hide
    if (duration > 0) {
      hideTimer.current = setTimeout(() => {
        hideNotification();
      }, duration);
    }
  }, [isVisible, type, duration, position, showProgress, triggerHaptic]);

  const hideNotification = useCallback(() => {
    if (isDismissing || !isVisible) return;

    setIsDismissing(true);
    gestureEnabled.current = false;
    clearTimers();

    triggerHaptic('dismiss');

    // Animación de salida
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: position === 'top' ? -100 : 100,
        duration: UI_CONFIG.designTokens.animations.durations.medium,
        useNativeDriver: true
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: UI_CONFIG.designTokens.animations.durations.medium,
        useNativeDriver: true
      }),
      Animated.timing(scale, {
        toValue: 0.9,
        duration: UI_CONFIG.designTokens.animations.durations.medium,
        useNativeDriver: true
      })
    ]).start(() => {
      setIsVisible(false);
      setIsDismissing(false);
      if (onHide) onHide();
    });
  }, [isDismissing, isVisible, position, onHide, triggerHaptic]);

  const handlePanGesture = useCallback((event) => {
    if (!enableGestures || !gestureEnabled.current) return;

    const { translationX, velocityX, state } = event.nativeEvent;

    if (state === State.ACTIVE) {
      // Permitir arrastrar solo horizontalmente
      panX.setValue(translationX);

      // Reducir opacidad basada en la distancia
      const opacity_value = Math.max(0.3, 1 - Math.abs(translationX) / screenWidth);
      opacity.setValue(opacity_value);
    }

    if (state === State.END) {
      const shouldDismiss = Math.abs(translationX) > screenWidth * 0.3 || Math.abs(velocityX) > 500;

      if (shouldDismiss) {
        // Animar hacia fuera en la dirección del swipe
        const toValue = translationX > 0 ? screenWidth : -screenWidth;
        
        Animated.parallel([
          Animated.timing(panX, {
            toValue,
            duration: UI_CONFIG.designTokens.animations.durations.fast,
            useNativeDriver: true
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: UI_CONFIG.designTokens.animations.durations.fast,
            useNativeDriver: true
          })
        ]).start(() => {
          hideNotification();
        });
      } else {
        // Volver a la posición original
        Animated.parallel([
          Animated.spring(panX, {
            toValue: 0,
            useNativeDriver: true,
            ...UI_CONFIG.designTokens.animations.spring.gentle
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: UI_CONFIG.designTokens.animations.durations.fast,
            useNativeDriver: true
          })
        ]).start();
      }
    }
  }, [enableGestures, hideNotification]);

  if (!isVisible) return null;

  const containerStyle = [
    styles.container,
    position === 'top' ? styles.positionTop : styles.positionBottom,
    {
      backgroundColor: notificationConfig.backgroundColor,
      borderColor: notificationConfig.borderColor,
      borderLeftColor: notificationConfig.color,
      transform: [
        { translateY },
        { translateX: panX },
        { scale }
      ],
      opacity
    }
  ];

  const progressBarStyle = {
    backgroundColor: notificationConfig.color,
    width: progress.interpolate({
      inputRange: [0, 1],
      outputRange: ['0%', '100%']
    })
  };

  return (
    <Animated.View style={containerStyle}>
      <PanGestureHandler
        onGestureEvent={handlePanGesture}
        onHandlerStateChange={handlePanGesture}
        enabled={enableGestures}
      >
        <Animated.View style={styles.content}>
          {/* Blur background para iOS */}
          {Platform.OS === 'ios' && (
            <BlurView
              intensity={80}
              style={StyleSheet.absoluteFillObject}
              experimentalBlurMethod="dimezisBlurView"
            />
          )}

          {/* Icon */}
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>
              {customIcon || notificationConfig.icon}
            </Text>
          </View>

          {/* Content */}
          <View style={styles.messageContainer}>
            <Text 
              style={[
                styles.message, 
                { color: notificationConfig.textColor }
              ]}
              numberOfLines={3}
            >
              {message}
            </Text>

            {actionButton && (
              <View style={styles.actionContainer}>
                {actionButton}
              </View>
            )}
          </View>

          {/* Dismiss indicator */}
          <View style={styles.dismissIndicator}>
            <View style={[
              styles.dismissLine,
              { backgroundColor: notificationConfig.color }
            ]} />
            <View style={[
              styles.dismissLine,
              { backgroundColor: notificationConfig.color }
            ]} />
          </View>

          {/* Progress bar */}
          {showProgress && duration > 0 && (
            <View style={styles.progressContainer}>
              <Animated.View 
                style={[styles.progressBar, progressBarStyle]} 
              />
            </View>
          )}
        </Animated.View>
      </PanGestureHandler>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: UI_CONFIG.designTokens.spacing.md,
    right: UI_CONFIG.designTokens.spacing.md,
    borderRadius: UI_CONFIG.designTokens.borderRadius.lg,
    borderLeftWidth: 4,
    borderWidth: 1,
    overflow: 'hidden',
    ...UI_CONFIG.designTokens.elevation.lg,
    zIndex: UI_CONFIG.layout.zIndex.notification,
  },

  positionTop: {
    top: statusBarHeight + UI_CONFIG.designTokens.spacing.md,
  },

  positionBottom: {
    bottom: UI_CONFIG.designTokens.spacing.xl,
  },

  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: UI_CONFIG.designTokens.spacing.lg,
    paddingVertical: UI_CONFIG.designTokens.spacing.md,
    minHeight: 64,
  },

  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: UI_CONFIG.designTokens.spacing.md,
  },

  icon: {
    fontSize: 20,
    lineHeight: 24,
  },

  messageContainer: {
    flex: 1,
    justifyContent: 'center',
  },

  message: {
    fontSize: UI_CONFIG.designTokens.typography.sizes.callout,
    fontWeight: UI_CONFIG.designTokens.typography.weights.medium,
    lineHeight: UI_CONFIG.designTokens.typography.lineHeights.normal * UI_CONFIG.designTokens.typography.sizes.callout,
  },

  actionContainer: {
    marginTop: UI_CONFIG.designTokens.spacing.sm,
  },

  dismissIndicator: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 20,
    marginLeft: UI_CONFIG.designTokens.spacing.sm,
  },

  dismissLine: {
    width: 3,
    height: 12,
    borderRadius: 2,
    marginVertical: 1,
    opacity: 0.6,
  },

  progressContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },

  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
});

export default EnhancedNotificationSystem;