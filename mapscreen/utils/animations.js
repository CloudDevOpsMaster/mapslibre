import { Animated } from 'react-native';

export const fadeIn = (value, duration = 300) => {
  return Animated.timing(value, {
    toValue: 1,
    duration,
    useNativeDriver: true,
  });
};

export const fadeOut = (value, duration = 300) => {
  return Animated.timing(value, {
    toValue: 0,
    duration,
    useNativeDriver: true,
  });
};

export const slideIn = (value, fromValue, duration = 300) => {
  return Animated.timing(value, {
    toValue: fromValue,
    duration,
    useNativeDriver: true,
  });
};

export const slideOut = (value, toValue, duration = 300) => {
  return Animated.timing(value, {
    toValue: toValue,
    duration,
    useNativeDriver: true,
  });
};

export const pulse = (value, duration = 1000) => {
  return Animated.loop(
    Animated.sequence([
      Animated.timing(value, {
        toValue: 1.1,
        duration: duration / 2,
        useNativeDriver: true,
      }),
      Animated.timing(value, {
        toValue: 1,
        duration: duration / 2,
        useNativeDriver: true,
      }),
    ])
  );
};

export const stagger = (animations, delay = 100) => {
  return Animated.stagger(
    delay,
    animations.map(anim => anim)
  );
};

export const parallel = (animations) => {
  return Animated.parallel(animations);
};

export const sequence = (animations) => {
  return Animated.sequence(animations);
};