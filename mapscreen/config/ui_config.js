export const UI_CONFIG = {
  animations: {
    duration: {
      short: 200,
      medium: 400,
      long: 600
    },
    easing: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
    scaleFactors: {
      pressed: 0.95,
      hover: 1.05
    }
  },
  buttons: {
    primary: {
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 24,
      shadow: {
        elevation: 4,
        shadowRadius: 4,
        shadowOpacity: 0.25,
        shadowOffset: { width: 0, height: 2 }
      }
    },
    fab: {
      size: 56,
      miniSize: 40,
      borderRadius: 28,
      margin: 16
    }
  },
  colors: {
    primary: '#3498db',
    primaryDark: '#2980b9',
    accent: '#e74c3c',
    accentDark: '#c0392b',
    text: '#ffffff'
  }
};