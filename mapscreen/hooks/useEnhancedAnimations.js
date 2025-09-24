// hooks/useEnhancedAnimations.js - Hook de animaciones mejorado con el nuevo sistema de diseño
import { useRef, useCallback, useMemo } from 'react';
import { Animated, Easing } from 'react-native';
import { UI_CONFIG } from '../config/ui_config';

export const useEnhancedAnimations = () => {
  const animatedValues = useRef(new Map()).current;
  const runningAnimations = useRef(new Map()).current;

  // Crear o recuperar valor animado
  const getAnimatedValue = useCallback((key, initialValue = 0) => {
    if (!animatedValues.has(key)) {
      animatedValues.set(key, new Animated.Value(initialValue));
    }
    return animatedValues.get(key);
  }, [animatedValues]);

  // Crear valor animado XY
  const getAnimatedValueXY = useCallback((key, initialX = 0, initialY = 0) => {
    if (!animatedValues.has(key)) {
      animatedValues.set(key, new Animated.ValueXY({ x: initialX, y: initialY }));
    }
    return animatedValues.get(key);
  }, [animatedValues]);

  // Función de timing mejorada con configuraciones predefinidas
  const timing = useCallback((key, toValue, config = {}) => {
    const value = getAnimatedValue(key);
    const {
      duration = UI_CONFIG.designTokens.animations.durations.medium,
      easing = Easing.out(Easing.quad),
      delay = 0,
      useNativeDriver = true,
      ...restConfig
    } = config;

    const animation = Animated.timing(value, {
      toValue,
      duration,
      easing,
      delay,
      useNativeDriver,
      ...restConfig
    });

    // Guardar referencia para poder cancelar si es necesario
    runningAnimations.set(key, animation);

    return animation;
  }, [getAnimatedValue, runningAnimations]);

  // Función de spring mejorada con presets
  const spring = useCallback((key, toValue, preset = 'gentle', config = {}) => {
    const value = getAnimatedValue(key);
    const springPresets = UI_CONFIG.designTokens.animations.spring;
    const presetConfig = springPresets[preset] || springPresets.gentle;

    const animation = Animated.spring(value, {
      toValue,
      useNativeDriver: true,
      ...presetConfig,
      ...config
    });

    runningAnimations.set(key, animation);
    return animation;
  }, [getAnimatedValue, runningAnimations]);

  // Animaciones de entrada predefinidas
  const fadeIn = useCallback((key, config = {}) => {
    const value = getAnimatedValue(key, 0);
    return timing(key, 1, {
      duration: UI_CONFIG.designTokens.animations.durations.medium,
      easing: Easing.out(Easing.cubic),
      ...config
    });
  }, [getAnimatedValue, timing]);

  const fadeOut = useCallback((key, config = {}) => {
    return timing(key, 0, {
      duration: UI_CONFIG.designTokens.animations.durations.medium,
      easing: Easing.in(Easing.cubic),
      ...config
    });
  }, [timing]);

  const slideInFromTop = useCallback((key, distance = -100, config = {}) => {
    const value = getAnimatedValue(key, distance);
    return timing(key, 0, {
      duration: UI_CONFIG.designTokens.animations.durations.medium,
      easing: Easing.out(Easing.back(1.1)),
      ...config
    });
  }, [getAnimatedValue, timing]);

  const slideInFromBottom = useCallback((key, distance = 100, config = {}) => {
    const value = getAnimatedValue(key, distance);
    return timing(key, 0, {
      duration: UI_CONFIG.designTokens.animations.durations.medium,
      easing: Easing.out(Easing.back(1.1)),
      ...config
    });
  }, [getAnimatedValue, timing]);

  const slideOutToTop = useCallback((key, distance = -100, config = {}) => {
    return timing(key, distance, {
      duration: UI_CONFIG.designTokens.animations.durations.fast,
      easing: Easing.in(Easing.cubic),
      ...config
    });
  }, [timing]);

  const slideOutToBottom = useCallback((key, distance = 100, config = {}) => {
    return timing(key, distance, {
      duration: UI_CONFIG.designTokens.animations.durations.fast,
      easing: Easing.in(Easing.cubic),
      ...config
    });
  }, [timing]);

  // Animaciones de escala
  const scaleIn = useCallback((key, config = {}) => {
    const value = getAnimatedValue(key, 0);
    return spring(key, 1, 'wobbly', config);
  }, [getAnimatedValue, spring]);

  const scaleOut = useCallback((key, config = {}) => {
    return timing(key, 0, {
      duration: UI_CONFIG.designTokens.animations.durations.fast,
      easing: Easing.in(Easing.cubic),
      ...config
    });
  }, [timing]);

  const pulse = useCallback((key, config = {}) => {
    const {
      minValue = 1,
      maxValue = 1.05,
      duration = UI_CONFIG.designTokens.animations.durations.slow,
      iterations = -1
    } = config;

    const value = getAnimatedValue(key, minValue);

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(value, {
          toValue: maxValue,
          duration: duration / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        }),
        Animated.timing(value, {
          toValue: minValue,
          duration: duration / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        })
      ]),
      { iterations }
    );

    runningAnimations.set(`${key}_pulse`, animation);
    return animation;
  }, [getAnimatedValue, runningAnimations]);

  // Animación de rotación
  const rotate = useCallback((key, config = {}) => {
    const {
      duration = UI_CONFIG.designTokens.animations.durations.slowest,
      iterations = -1,
      clockwise = true
    } = config;

    const value = getAnimatedValue(key, 0);
    const toValue = clockwise ? 1 : -1;

    const animation = Animated.loop(
      Animated.timing(value, {
        toValue,
        duration,
        easing: Easing.linear,
        useNativeDriver: true
      }),
      { iterations }
    );

    runningAnimations.set(`${key}_rotate`, animation);
    return animation;
  }, [getAnimatedValue, runningAnimations]);

  // Animación de shake/vibración
  const shake = useCallback((key, config = {}) => {
    const {
      intensity = 10,
      duration = UI_CONFIG.designTokens.animations.durations.medium,
      iterations = 3
    } = config;

    const value = getAnimatedValue(key, 0);

    const animation = Animated.sequence(
      Array(iterations).fill().map(() => 
        Animated.sequence([
          Animated.timing(value, {
            toValue: intensity,
            duration: duration / (iterations * 4),
            useNativeDriver: true
          }),
          Animated.timing(value, {
            toValue: -intensity,
            duration: duration / (iterations * 2),
            useNativeDriver: true
          }),
          Animated.timing(value, {
            toValue: 0,
            duration: duration / (iterations * 4),
            useNativeDriver: true
          })
        ])
      )
    );

    runningAnimations.set(`${key}_shake`, animation);
    return animation;
  }, [getAnimatedValue, runningAnimations]);

  // Animación stagger para múltiples elementos
  const stagger = useCallback((animations, delay = 100) => {
    return Animated.stagger(delay, animations);
  }, []);

  // Animaciones en paralelo
  const parallel = useCallback((animations) => {
    return Animated.parallel(animations);
  }, []);

  // Animaciones en secuencia
  const sequence = useCallback((animations) => {
    return Animated.sequence(animations);
  }, []);

  // Crear interpolación con configuraciones comunes
  const createInterpolation = useCallback((key, config) => {
    const value = getAnimatedValue(key);
    return value.interpolate(config);
  }, [getAnimatedValue]);

  // Interpolaciones predefinidas comunes
  const createOpacityInterpolation = useCallback((key, inputRange = [0, 1], outputRange = [0, 1]) => {
    return createInterpolation(key, {
      inputRange,
      outputRange,
      extrapolate: 'clamp'
    });
  }, [createInterpolation]);

  const createScaleInterpolation = useCallback((key, inputRange = [0, 1], outputRange = [0, 1]) => {
    return createInterpolation(key, {
      inputRange,
      outputRange,
      extrapolate: 'clamp'
    });
  }, [createInterpolation]);

  const createRotateInterpolation = useCallback((key, inputRange = [0, 1], outputRange = ['0deg', '360deg']) => {
    return createInterpolation(key, {
      inputRange,
      outputRange,
      extrapolate: 'clamp'
    });
  }, [createInterpolation]);

  const createTranslateInterpolation = useCallback((key, inputRange = [0, 1], outputRange = [0, 100]) => {
    return createInterpolation(key, {
      inputRange,
      outputRange,
      extrapolate: 'clamp'
    });
  }, [createInterpolation]);

  // Animaciones compuestas para UX común
  const bounceIn = useCallback((key, config = {}) => {
    const scaleValue = getAnimatedValue(`${key}_scale`, 0);
    const opacityValue = getAnimatedValue(`${key}_opacity`, 0);

    return parallel([
      timing(`${key}_opacity`, 1, {
        duration: UI_CONFIG.designTokens.animations.durations.fast,
        ...config
      }),
      sequence([
        timing(`${key}_scale`, 1.1, {
          duration: UI_CONFIG.designTokens.animations.durations.fast,
          easing: Easing.out(Easing.cubic),
          ...config
        }),
        spring(`${key}_scale`, 1, 'gentle', config)
      ])
    ]);
  }, [getAnimatedValue, timing, parallel, sequence, spring]);

  const slideAndFade = useCallback((key, direction = 'up', config = {}) => {
    const distance = config.distance || 50;
    const initialTranslate = direction === 'up' ? distance : 
                           direction === 'down' ? -distance :
                           direction === 'left' ? distance : -distance;

    const translateKey = direction === 'up' || direction === 'down' ? 
                        `${key}_translateY` : `${key}_translateX`;

    const translateValue = getAnimatedValue(translateKey, initialTranslate);
    const opacityValue = getAnimatedValue(`${key}_opacity`, 0);

    return parallel([
      timing(`${key}_opacity`, 1, {
        duration: UI_CONFIG.designTokens.animations.durations.medium,
        ...config
      }),
      timing(translateKey, 0, {
        duration: UI_CONFIG.designTokens.animations.durations.medium,
        easing: Easing.out(Easing.cubic),
        ...config
      })
    ]);
  }, [getAnimatedValue, timing, parallel]);

  // Funciones de utilidad
  const stopAnimation = useCallback((key) => {
    if (animatedValues.has(key)) {
      animatedValues.get(key).stopAnimation();
    }
    if (runningAnimations.has(key)) {
      runningAnimations.delete(key);
    }
  }, [animatedValues, runningAnimations]);

  const stopAllAnimations = useCallback(() => {
    animatedValues.forEach(value => value.stopAnimation());
    runningAnimations.clear();
  }, [animatedValues, runningAnimations]);

  const resetValue = useCallback((key, value = 0) => {
    if (animatedValues.has(key)) {
      animatedValues.get(key).setValue(value);
    }
  }, [animatedValues]);

  const resetAllValues = useCallback(() => {
    animatedValues.forEach(value => value.setValue(0));
  }, [animatedValues]);

  const getValue = useCallback((key) => {
    const value = animatedValues.get(key);
    if (!value) return null;

    return new Promise(resolve => {
      value.addListener(({ value }) => resolve(value));
    });
  }, [animatedValues]);

  // Configuraciones de animación predefinidas
  const presets = useMemo(() => ({
    // Entrada de elementos
    slideInFromLeft: (key) => slideAndFade(key, 'left'),
    slideInFromRight: (key) => slideAndFade(key, 'right'),
    slideInFromTop: (key) => slideAndFade(key, 'up'),
    slideInFromBottom: (key) => slideAndFade(key, 'down'),

    // Efectos de botones
    buttonPress: (key) => sequence([
      timing(key, 0.95, { duration: 100, useNativeDriver: true }),
      spring(key, 1, 'gentle')
    ]),

    buttonHover: (key) => spring(key, 1.05, 'gentle'),

    // Efectos de tarjetas
    cardHover: (key) => parallel([
      spring(`${key}_scale`, 1.02, 'gentle'),
      timing(`${key}_elevation`, 1, { duration: 200, useNativeDriver: false })
    ]),

    // Efectos de modal
    modalSlideUp: (key) => parallel([
      slideInFromBottom(`${key}_translate`),
      fadeIn(`${key}_opacity`)
    ]),

    modalFadeIn: (key) => parallel([
      fadeIn(`${key}_opacity`),
      scaleIn(`${key}_scale`)
    ]),

    // Efectos de notificación
    notificationSlideDown: (key) => slideInFromTop(key),
    notificationSlideUp: (key) => slideInFromBottom(key),

    // Efectos de loading
    loadingPulse: (key) => pulse(key, { minValue: 0.8, maxValue: 1.2 }),
    loadingRotate: (key) => rotate(key),

    // Efectos de error/éxito
    errorShake: (key) => shake(key, { intensity: 8, iterations: 2 }),
    successBounce: (key) => bounceIn(key)
  }), [
    slideAndFade, sequence, timing, spring, parallel, slideInFromBottom,
    fadeIn, scaleIn, slideInFromTop, pulse, rotate, shake, bounceIn
  ]);

  // Funciones de conveniencia para casos comunes
  const animateIn = useCallback((key, type = 'fade', config = {}) => {
    const animations = {
      fade: () => fadeIn(key, config),
      scale: () => scaleIn(key, config),
      slideUp: () => slideInFromBottom(key, 100, config),
      slideDown: () => slideInFromTop(key, -100, config),
      slideLeft: () => slideAndFade(key, 'left', config),
      slideRight: () => slideAndFade(key, 'right', config),
      bounce: () => bounceIn(key, config)
    };

    return animations[type] ? animations[type]() : fadeIn(key, config);
  }, [fadeIn, scaleIn, slideInFromBottom, slideInFromTop, slideAndFade, bounceIn]);

  const animateOut = useCallback((key, type = 'fade', config = {}) => {
    const animations = {
      fade: () => fadeOut(key, config),
      scale: () => scaleOut(key, config),
      slideUp: () => slideOutToTop(key, -100, config),
      slideDown: () => slideOutToBottom(key, 100, config)
    };

    return animations[type] ? animations[type]() : fadeOut(key, config);
  }, [fadeOut, scaleOut, slideOutToTop, slideOutToBottom]);

  // Hook para limpiar automáticamente al desmontar
  const cleanup = useCallback(() => {
    stopAllAnimations();
    animatedValues.clear();
    runningAnimations.clear();
  }, [stopAllAnimations, animatedValues, runningAnimations]);

  return {
    // Valores básicos
    getAnimatedValue,
    getAnimatedValueXY,
    createInterpolation,

    // Interpolaciones comunes
    createOpacityInterpolation,
    createScaleInterpolation,
    createRotateInterpolation,
    createTranslateInterpolation,

    // Animaciones básicas
    timing,
    spring,

    // Animaciones de entrada/salida
    fadeIn,
    fadeOut,
    slideInFromTop,
    slideInFromBottom,
    slideOutToTop,
    slideOutToBottom,
    scaleIn,
    scaleOut,

    // Animaciones continuas
    pulse,
    rotate,
    shake,

    // Animaciones compuestas
    bounceIn,
    slideAndFade,

    // Combinadores
    parallel,
    sequence,
    stagger,

    // Presets
    presets,

    // Funciones de conveniencia
    animateIn,
    animateOut,

    // Utilidades
    stopAnimation,
    stopAllAnimations,
    resetValue,
    resetAllValues,
    getValue,
    cleanup
  };
};

export default useEnhancedAnimations;