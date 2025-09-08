// components/FloatingActionButtons.js
import React from 'react';
import { View } from 'react-native';
import EnhancedFAB from './EnhancedFAB';

const FloatingActionButtons = ({ 
  on_center_location, 
  on_fit_to_packages, 
  on_toggle_settings,
  theme = 'light' 
}) => {
  return (
    <View>
      <EnhancedFAB
        icon="🎯"
        on_press={on_center_location}
        position="bottom-right"
        variant="primary"
        label="Centrar en mi ubicación"
        show_label={true}
      />
      
      <EnhancedFAB
        icon="🔍"
        on_press={on_fit_to_packages}
        position="bottom-right"
        variant="mini"
        style={{ bottom: 80 }}
        label="Ajustar vista a paquetes"
        show_label={true}
      />
      
      <EnhancedFAB
        icon="⚙️"
        on_press={on_toggle_settings}
        position="bottom-right"
        variant="mini"
        style={{ bottom: 140 }}
        label="Configuración"
        show_label={true}
      />
    </View>
  );
};

export default FloatingActionButtons;