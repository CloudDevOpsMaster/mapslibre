// hooks/useAnimations.js - Fallback animations hook
import { useRef } from 'react';
import { Animated } from 'react-native';

export const useAnimations = () => {
  const animatedValues = useRef(new Map()).current;

  const getAnimatedValue = (key, initialValue = 0) => {
    if (!animatedValues.has(key)) {
      animatedValues.set(key, new Animated.Value(initialValue));
    }
    return animatedValues.get(key);
  };

  const fadeIn = (key, options = {}) => {
    const animatedValue = getAnimatedValue(key, 0);
    
    return Animated.timing(animatedValue, {
      toValue: 1,
      duration: options.duration || 300,
      useNativeDriver: true,
      ...options
    });
  };

  const fadeOut = (key, options = {}) => {
    const animatedValue = getAnimatedValue(key, 1);
    
    return Animated.timing(animatedValue, {
      toValue: 0,
      duration: options.duration || 300,
      useNativeDriver: true,
      ...options
    });
  };

  const spring = (key, toValue, options = {}) => {
    const animatedValue = getAnimatedValue(key, 0);
    
    return Animated.spring(animatedValue, {
      toValue,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
      ...options
    });
  };

  const pulse = (key, options = {}) => {
    const animatedValue = getAnimatedValue(key, 1);
    
    return Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1.05,
          duration: options.duration || 1000,
          useNativeDriver: true
        }),
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: options.duration || 1000,
          useNativeDriver: true
        })
      ])
    );
  };

  return {
    getAnimatedValue,
    fadeIn,
    fadeOut,
    spring,
    pulse
  };
};