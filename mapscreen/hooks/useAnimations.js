// hooks/useAnimations.js
import { useRef, useCallback } from 'react';
import { Animated, Easing } from 'react-native';
import { UI_CONFIG } from '../config/ui_config';

export const useAnimations = () => {
  const animated_values = useRef(new Map()).current;

  const getAnimatedValue = useCallback((key, initial_value = 0) => {
    if (!animated_values.has(key)) {
      animated_values.set(key, new Animated.Value(initial_value));
    }
    return animated_values.get(key);
  }, [animated_values]);

  const animate = useCallback((key, to_value, config = {}) => {
    const value = getAnimatedValue(key);
    
    return Animated.timing(value, {
      toValue: to_value,
      duration: config.duration || UI_CONFIG.animations.duration.medium,
      easing: config.easing || Easing.inOut(Easing.ease),
      useNativeDriver: true,
      ...config
    });
  }, [getAnimatedValue]);

  const spring = useCallback((key, to_value, config = {}) => {
    const value = getAnimatedValue(key);
    
    return Animated.spring(value, {
      toValue: to_value,
      useNativeDriver: true,
      friction: 7,
      tension: 40,
      ...config
    });
  }, [getAnimatedValue]);

  const sequence = useCallback((animations) => {
    return Animated.sequence(animations);
  }, []);

  const parallel = useCallback((animations) => {
    return Animated.parallel(animations);
  }, []);

  const stagger = useCallback((animations, delay = 100) => {
    return Animated.stagger(delay, animations);
  }, []);

  const loop = useCallback((animation, iterations = -1) => {
    return Animated.loop(animation, { iterations });
  }, []);

  const pulse = useCallback((key, config = {}) => {
    return loop(
      sequence([
        animate(key, 1.1, { duration: 500, ...config }),
        animate(key, 1, { duration: 500, ...config })
      ])
    );
  }, [animate, loop, sequence]);

  const bounce = useCallback((key, config = {}) => {
    return sequence([
      spring(key, 0.9, { ...config }),
      spring(key, 1.1, { ...config }),
      spring(key, 1, { ...config })
    ]);
  }, [spring, sequence]);

  const fadeIn = useCallback((key, config = {}) => {
    return animate(key, 1, { duration: UI_CONFIG.animations.duration.medium, ...config });
  }, [animate]);

  const fadeOut = useCallback((key, config = {}) => {
    return animate(key, 0, { duration: UI_CONFIG.animations.duration.medium, ...config });
  }, [animate]);

  return {
    getAnimatedValue,
    animate,
    spring,
    sequence,
    parallel,
    stagger,
    loop,
    pulse,
    bounce,
    fadeIn,
    fadeOut
  };
};