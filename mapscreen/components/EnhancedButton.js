// components/enhanced_button.js
import React from 'react';
import { TouchableOpacity, Animated, Text, StyleSheet, View } from 'react-native';
import { useAnimations } from '../hooks/useAnimations';
import { UI_CONFIG } from '../config/ui_config';

const EnhancedButton = ({ 
  children, 
  on_press, 
  style, 
  text_style,
  icon,
  icon_position = 'left',
  variant = 'primary',
  animated = true,
  ...props 
}) => {
  const { getAnimatedValue, spring } = useAnimations();
  const scale_value = getAnimatedValue('button_scale', 1);

  const handle_press_in = () => {
    if (animated) {
      spring('button_scale', UI_CONFIG.animations.scaleFactors.pressed).start();
    }
  };

  const handle_press_out = () => {
    if (animated) {
      spring('button_scale', 1).start();
    }
  };

  const get_button_style = () => {
    const base_style = {
      borderRadius: UI_CONFIG.buttons[variant]?.borderRadius || UI_CONFIG.buttons.primary.borderRadius,
      paddingVertical: UI_CONFIG.buttons[variant]?.paddingVertical || UI_CONFIG.buttons.primary.paddingVertical,
      paddingHorizontal: UI_CONFIG.buttons[variant]?.paddingHorizontal || UI_CONFIG.buttons.primary.paddingHorizontal,
      backgroundColor: UI_CONFIG.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: icon_position === 'right' ? 'row-reverse' : 'row',
      transform: [{ scale: scale_value }],
      ...UI_CONFIG.buttons.primary.shadow,
    };

    return [base_style, style];
  };

  return (
    <Animated.View style={get_button_style()}>
      <TouchableOpacity
        onPress={on_press}
        onPressIn={handle_press_in}
        onPressOut={handle_press_out}
        activeOpacity={0.8}
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}
        {...props}
      >
        {icon && (
          <View style={icon_position === 'right' ? styles.iconRight : styles.iconLeft}>
            <Text style={styles.iconText}>{icon}</Text>
          </View>
        )}
        {children && (
          <Text style={[styles.text, text_style]}>
            {children}
          </Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  text: {
    color: UI_CONFIG.colors.text,
    fontWeight: 'bold',
    fontSize: 16,
  },
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
  iconText: {
    fontSize: 20,
  },
});

export default EnhancedButton;