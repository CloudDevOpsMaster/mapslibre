// components/enhanced_fab.js
import React from 'react';
import { View, Animated, StyleSheet, Text } from 'react-native';
import EnhancedButton from './EnhancedButton';
import { useAnimations } from '../hooks/useAnimations';
import { UI_CONFIG } from '../config/ui_config';

const EnhancedFAB = ({ 
  icon, 
  on_press, 
  position = 'bottom-right',
  variant = 'primary',
  animated = true,
  style,
  label,
  show_label = false
}) => {
  const { getAnimatedValue, pulse } = useAnimations();
  const pulse_value = getAnimatedValue('fab_pulse', 1);

  React.useEffect(() => {
    if (animated) {
      pulse('fab_pulse').start();
    }
  }, [animated, pulse]);

  const get_position_style = () => {
    const positions = {
      'bottom-right': { bottom: UI_CONFIG.buttons.fab.margin, right: UI_CONFIG.buttons.fab.margin },
      'bottom-left': { bottom: UI_CONFIG.buttons.fab.margin, left: UI_CONFIG.buttons.fab.margin },
      'top-right': { top: UI_CONFIG.buttons.fab.margin, right: UI_CONFIG.buttons.fab.margin },
      'top-left': { top: UI_CONFIG.buttons.fab.margin, left: UI_CONFIG.buttons.fab.margin },
    };

    return positions[position] || positions['bottom-right'];
  };

  return (
    <View style={[styles.container, get_position_style(), style]}>
      <Animated.View style={{ 
        transform: [{ scale: pulse_value }],
        flexDirection: 'row',
        alignItems: 'center'
      }}>
        {show_label && label && (
          <View style={[
            styles.label_container,
            position.includes('right') ? { marginRight: 8 } : { marginLeft: 8 }
          ]}>
            <Text style={styles.label_text}>{label}</Text>
          </View>
        )}
        <EnhancedButton
          on_press={on_press}
          variant={variant}
          style={[
            styles.fab,
            variant === 'mini' && styles.mini_fab
          ]}
          icon={icon}
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 1000,
    flexDirection: 'row',
    alignItems: 'center',
  },
  fab: {
    width: UI_CONFIG.buttons.fab.size,
    height: UI_CONFIG.buttons.fab.size,
    borderRadius: UI_CONFIG.buttons.fab.borderRadius,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mini_fab: {
    width: UI_CONFIG.buttons.fab.miniSize,
    height: UI_CONFIG.buttons.fab.miniSize,
  },
  label_container: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  label_text: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
});

export default EnhancedFAB;