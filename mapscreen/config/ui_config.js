// config/ui_config.js - Advanced UI/UX Design System with Modern Enhancements

// Enhanced Design Tokens with Golden Ratio and Modular Scale
export const DESIGN_TOKENS = {
  // Spatial System - Based on 8pt grid with Golden Ratio progression
  spacing: {
    xs: 4,      // 0.25rem
    sm: 8,      // 0.5rem  
    md: 12,     // 0.75rem
    lg: 16,     // 1rem
    xl: 24,     // 1.5rem (golden ratio)
    xxl: 32,    // 2rem
    xxxl: 48,   // 3rem
    mega: 64,   // 4rem
    ultra: 96,  // 6rem
    super: 128, // 8rem
    extreme: 192 // 12rem
  },

  // Typography System - Fluid scale with improved readability
  typography: {
    fontFamilies: {
      system: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", "SF Pro Display", sans-serif',
      mono: 'SF Mono, Monaco, Inconsolata, "Roboto Mono", "Source Code Pro", monospace',
      serif: '"New York", "Times New Roman", Georgia, serif'
    },
    
    weights: {
      thin: '100',
      extraLight: '200', 
      light: '300',
      regular: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      extraBold: '800',
      black: '900'
    },
    
    // Fluid typography scale - responsive to screen size
    sizes: {
      xs: { mobile: 10, tablet: 11, desktop: 12 },
      sm: { mobile: 12, tablet: 13, desktop: 14 },
      base: { mobile: 14, tablet: 15, desktop: 16 },
      md: { mobile: 16, tablet: 17, desktop: 18 },
      lg: { mobile: 18, tablet: 20, desktop: 22 },
      xl: { mobile: 20, tablet: 24, desktop: 28 },
      '2xl': { mobile: 24, tablet: 30, desktop: 36 },
      '3xl': { mobile: 30, tablet: 36, desktop: 48 },
      '4xl': { mobile: 36, tablet: 48, desktop: 64 }
    },
    
    lineHeights: {
      none: 1,
      tight: 1.25,
      snug: 1.375,
      normal: 1.5,
      relaxed: 1.625,
      loose: 2
    },
    
    letterSpacing: {
      tighter: '-0.05em',
      tight: '-0.025em', 
      normal: '0',
      wide: '0.025em',
      wider: '0.05em',
      widest: '0.1em'
    }
  },

  // Advanced Border Radius System
  borderRadius: {
    none: 0,
    xs: 2,
    sm: 4,
    md: 6,
    lg: 8,
    xl: 12,
    '2xl': 16,
    '3xl': 24,
    full: 9999,
    
    // Contextual radii
    input: 8,
    button: 12,
    card: 16,
    modal: 20,
    sheet: 28,
    fab: 28,
    pill: 50
  },

  // Sophisticated Elevation System - Multi-layer shadows
  elevation: {
    none: {
      shadowColor: 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0
    },
    
    // Subtle elevations
    xs: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 1,
      elevation: 1
    },
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 3,
      elevation: 2
    },
    
    // Standard elevations
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
      elevation: 4
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 12,
      elevation: 8
    },
    xl: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.15,
      shadowRadius: 20,
      elevation: 12
    },
    
    // Special elevations
    fab: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.25,
      shadowRadius: 12,
      elevation: 16
    },
    modal: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 20 },
      shadowOpacity: 0.25,
      shadowRadius: 40,
      elevation: 24
    }
  },

  // Advanced Animation System
  animations: {
    durations: {
      instant: 0,
      micro: 75,
      fast: 150,
      normal: 200,
      medium: 300,
      slow: 400,
      slower: 600,
      glacial: 1000
    },
    
    // Refined easing curves
    easings: {
      linear: [0.0, 0.0, 1.0, 1.0],
      easeIn: [0.4, 0.0, 1.0, 1.0],
      easeOut: [0.0, 0.0, 0.2, 1.0],
      easeInOut: [0.4, 0.0, 0.2, 1.0],
      
      // Apple-inspired curves
      easeInQuint: [0.64, 0, 0.78, 0],
      easeOutQuint: [0.22, 1, 0.36, 1],
      easeInOutQuint: [0.83, 0, 0.17, 1],
      
      // Custom branded curves
      brand: [0.25, 0.46, 0.45, 0.94],
      bounce: [0.68, -0.55, 0.265, 1.55],
      backOut: [0.34, 1.56, 0.64, 1],
      anticipate: [0.25, 0.46, 0.45, 0.94]
    },
    
    spring: {
      gentle: { tension: 120, friction: 14, mass: 1 },
      wobbly: { tension: 180, friction: 12, mass: 1 },
      stiff: { tension: 210, friction: 20, mass: 1 },
      slow: { tension: 280, friction: 60, mass: 1 },
      bouncy: { tension: 300, friction: 10, mass: 1 }
    },
    
    // Micro-interaction presets
    interactions: {
      tap: {
        scale: 0.96,
        duration: 100,
        easing: 'easeOut'
      },
      press: {
        scale: 0.94,
        duration: 60,
        easing: 'easeInOut'
      },
      hover: {
        scale: 1.02,
        duration: 200,
        easing: 'easeOut'
      }
    }
  }
};

// Extended Color Palette with Accessibility Focus
export const COLOR_PALETTE = {
  // Primary Brand Colors - More sophisticated palette
  primary: {
    50: '#eff6ff',
    100: '#dbeafe', 
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
    950: '#172554'
  },

  // Enhanced Semantic Colors
  success: {
    50: '#ecfdf5',
    100: '#d1fae5',
    200: '#a7f3d0',
    300: '#6ee7b7',
    400: '#34d399',
    500: '#10b981',
    600: '#059669',
    700: '#047857',
    800: '#065f46',
    900: '#064e3b',
    950: '#022c22'
  },
  
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a', 
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
    950: '#451a03'
  },
  
  danger: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
    950: '#450a0a'
  },

  info: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9',
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e',
    950: '#082f49'
  },

  // Sophisticated Neutrals
  neutral: {
    0: '#ffffff',
    25: '#fdfdfd',
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
    950: '#0a0a0a'
  },

  // Warm and Cool Variants
  warmGray: {
    50: '#fafaf9',
    100: '#f5f5f4',
    500: '#78716c',
    900: '#1c1917'
  },

  coolGray: {
    50: '#f8fafc',
    100: '#f1f5f9', 
    500: '#64748b',
    900: '#0f172a'
  }
};

// Enhanced Theme System with Better Contrast
export const THEMES = {
  light: {
    name: 'Light Mode',
    colors: {
      // Backgrounds - Layered approach
      background: COLOR_PALETTE.neutral[0],
      backgroundSecondary: COLOR_PALETTE.neutral[25],
      backgroundTertiary: COLOR_PALETTE.neutral[50],
      backgroundQuaternary: COLOR_PALETTE.neutral[100],
      
      // Surfaces with proper elevation
      surface: COLOR_PALETTE.neutral[0],
      surfaceElevated: COLOR_PALETTE.neutral[25],
      surfaceHighlight: COLOR_PALETTE.neutral[50],
      surfacePressed: COLOR_PALETTE.neutral[100],
      
      // Interactive surfaces
      interactive: COLOR_PALETTE.primary[500],
      interactiveHover: COLOR_PALETTE.primary[600],
      interactivePressed: COLOR_PALETTE.primary[700],
      interactiveDisabled: COLOR_PALETTE.neutral[200],
      
      // Borders - Multiple weights
      border: COLOR_PALETTE.neutral[200],
      borderLight: COLOR_PALETTE.neutral[100],
      borderMedium: COLOR_PALETTE.neutral[300],
      borderStrong: COLOR_PALETTE.neutral[400],
      borderFocus: COLOR_PALETTE.primary[500],
      
      // Text - Improved hierarchy
      text: COLOR_PALETTE.neutral[900],
      textSecondary: COLOR_PALETTE.neutral[700],
      textTertiary: COLOR_PALETTE.neutral[500],
      textQuaternary: COLOR_PALETTE.neutral[400],
      textInverse: COLOR_PALETTE.neutral[0],
      textPlaceholder: COLOR_PALETTE.neutral[400],
      
      // Brand colors
      primary: COLOR_PALETTE.primary[500],
      primarySubtle: COLOR_PALETTE.primary[50],
      primaryMuted: COLOR_PALETTE.primary[100],
      
      // Semantic colors
      success: COLOR_PALETTE.success[500],
      successSubtle: COLOR_PALETTE.success[50],
      successMuted: COLOR_PALETTE.success[100],
      
      warning: COLOR_PALETTE.warning[500],
      warningSubtle: COLOR_PALETTE.warning[50],
      warningMuted: COLOR_PALETTE.warning[100],
      
      danger: COLOR_PALETTE.danger[500],
      dangerSubtle: COLOR_PALETTE.danger[50],
      dangerMuted: COLOR_PALETTE.danger[100],
      
      info: COLOR_PALETTE.info[500],
      infoSubtle: COLOR_PALETTE.info[50],
      infoMuted: COLOR_PALETTE.info[100],
      
      // Overlay system
      overlay: 'rgba(0, 0, 0, 0.5)',
      overlayLight: 'rgba(0, 0, 0, 0.25)',
      overlayStrong: 'rgba(0, 0, 0, 0.75)',
      scrim: 'rgba(0, 0, 0, 0.6)',
      backdrop: 'rgba(0, 0, 0, 0.4)'
    }
  },
  
  dark: {
    name: 'Dark Mode',
    colors: {
      // Dark backgrounds
      background: COLOR_PALETTE.neutral[950],
      backgroundSecondary: COLOR_PALETTE.neutral[900],
      backgroundTertiary: COLOR_PALETTE.neutral[800],
      backgroundQuaternary: COLOR_PALETTE.neutral[700],
      
      // Dark surfaces
      surface: COLOR_PALETTE.neutral[900],
      surfaceElevated: COLOR_PALETTE.neutral[800],
      surfaceHighlight: COLOR_PALETTE.neutral[700],
      surfacePressed: COLOR_PALETTE.neutral[600],
      
      // Interactive surfaces in dark
      interactive: COLOR_PALETTE.primary[400],
      interactiveHover: COLOR_PALETTE.primary[300],
      interactivePressed: COLOR_PALETTE.primary[200],
      interactiveDisabled: COLOR_PALETTE.neutral[700],
      
      // Dark borders
      border: COLOR_PALETTE.neutral[700],
      borderLight: COLOR_PALETTE.neutral[800],
      borderMedium: COLOR_PALETTE.neutral[600],
      borderStrong: COLOR_PALETTE.neutral[500],
      borderFocus: COLOR_PALETTE.primary[400],
      
      // Dark text
      text: COLOR_PALETTE.neutral[0],
      textSecondary: COLOR_PALETTE.neutral[200],
      textTertiary: COLOR_PALETTE.neutral[400],
      textQuaternary: COLOR_PALETTE.neutral[500],
      textInverse: COLOR_PALETTE.neutral[900],
      textPlaceholder: COLOR_PALETTE.neutral[500],
      
      // Dark brand
      primary: COLOR_PALETTE.primary[400],
      primarySubtle: COLOR_PALETTE.primary[950],
      primaryMuted: COLOR_PALETTE.primary[900],
      
      // Dark semantic
      success: COLOR_PALETTE.success[400],
      successSubtle: COLOR_PALETTE.success[950],
      successMuted: COLOR_PALETTE.success[900],
      
      warning: COLOR_PALETTE.warning[400],
      warningSubtle: COLOR_PALETTE.warning[950],
      warningMuted: COLOR_PALETTE.warning[900],
      
      danger: COLOR_PALETTE.danger[400],
      dangerSubtle: COLOR_PALETTE.danger[950],
      dangerMuted: COLOR_PALETTE.danger[900],
      
      info: COLOR_PALETTE.info[400],
      infoSubtle: COLOR_PALETTE.info[950],
      infoMuted: COLOR_PALETTE.info[900],
      
      // Dark overlays
      overlay: 'rgba(0, 0, 0, 0.8)',
      overlayLight: 'rgba(0, 0, 0, 0.5)',
      overlayStrong: 'rgba(0, 0, 0, 0.9)',
      scrim: 'rgba(0, 0, 0, 0.8)',
      backdrop: 'rgba(0, 0, 0, 0.6)'
    }
  }
};

// Enhanced Component Configurations
export const COMPONENTS = {
  // Advanced Button System
  button: {
    base: {
      minHeight: 44,
      borderRadius: DESIGN_TOKENS.borderRadius.button,
      paddingHorizontal: DESIGN_TOKENS.spacing.lg,
      paddingVertical: DESIGN_TOKENS.spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row'
    },
    
    sizes: {
      xs: { 
        minHeight: 28, 
        paddingHorizontal: DESIGN_TOKENS.spacing.sm,
        paddingVertical: DESIGN_TOKENS.spacing.xs,
        fontSize: DESIGN_TOKENS.typography.sizes.sm
      },
      sm: { 
        minHeight: 36,
        paddingHorizontal: DESIGN_TOKENS.spacing.md,
        paddingVertical: DESIGN_TOKENS.spacing.sm,
        fontSize: DESIGN_TOKENS.typography.sizes.sm
      },
      md: { 
        minHeight: 44,
        paddingHorizontal: DESIGN_TOKENS.spacing.lg,
        paddingVertical: DESIGN_TOKENS.spacing.md,
        fontSize: DESIGN_TOKENS.typography.sizes.base
      },
      lg: { 
        minHeight: 52,
        paddingHorizontal: DESIGN_TOKENS.spacing.xl,
        paddingVertical: DESIGN_TOKENS.spacing.lg,
        fontSize: DESIGN_TOKENS.typography.sizes.md
      }
    },
    
    variants: {
      primary: {
        ...DESIGN_TOKENS.elevation.sm
      },
      secondary: {
        borderWidth: 1,
        backgroundColor: 'transparent'
      },
      tertiary: {
        backgroundColor: 'transparent'
      },
      ghost: {
        backgroundColor: 'transparent',
        borderWidth: 0
      },
      destructive: {
        ...DESIGN_TOKENS.elevation.sm
      }
    },
    
    states: {
      default: { transform: [{ scale: 1 }], opacity: 1 },
      pressed: { transform: [{ scale: 0.96 }], opacity: 0.9 },
      disabled: { opacity: 0.4, transform: [{ scale: 1 }] },
      loading: { opacity: 0.7, transform: [{ scale: 1 }] }
    }
  },

  // Enhanced FAB System
  fab: {
    base: {
      ...DESIGN_TOKENS.elevation.fab,
      position: 'absolute',
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: DESIGN_TOKENS.borderRadius.fab
    },
    
    sizes: {
      small: { width: 40, height: 40 },
      regular: { width: 56, height: 56 },
      large: { width: 72, height: 72 },
      extended: {
        height: 48,
        minWidth: 80,
        paddingHorizontal: DESIGN_TOKENS.spacing.lg,
        borderRadius: DESIGN_TOKENS.borderRadius['2xl']
      }
    },

    positions: {
      'bottom-right': { 
        bottom: DESIGN_TOKENS.spacing.xl, 
        right: DESIGN_TOKENS.spacing.xl 
      },
      'bottom-left': { 
        bottom: DESIGN_TOKENS.spacing.xl, 
        left: DESIGN_TOKENS.spacing.xl 
      },
      'bottom-center': { 
        bottom: DESIGN_TOKENS.spacing.xl,
        left: '50%',
        marginLeft: -28
      }
    },

    states: {
      default: { transform: [{ scale: 1 }], opacity: 1 },
      pressed: { transform: [{ scale: 0.9 }], opacity: 0.9 },
      expanded: { transform: [{ rotate: '45deg' }] },
      collapsed: { transform: [{ rotate: '0deg' }] }
    }
  },

  // Card Component Enhancement  
  card: {
    base: {
      borderRadius: DESIGN_TOKENS.borderRadius.card,
      padding: DESIGN_TOKENS.spacing.lg,
      ...DESIGN_TOKENS.elevation.sm
    },
    
    variants: {
      elevated: { ...DESIGN_TOKENS.elevation.md },
      outlined: { borderWidth: 1, ...DESIGN_TOKENS.elevation.none },
      filled: { ...DESIGN_TOKENS.elevation.none },
      interactive: { 
        ...DESIGN_TOKENS.elevation.sm,
        transform: [{ scale: 1 }]
      }
    },
    
    states: {
      pressed: { 
        ...DESIGN_TOKENS.elevation.xs,
        transform: [{ scale: 0.98 }]
      }
    }
  },

  // Enhanced Notification System
  notification: {
    base: {
      borderRadius: DESIGN_TOKENS.borderRadius.xl,
      padding: DESIGN_TOKENS.spacing.lg,
      margin: DESIGN_TOKENS.spacing.md,
      minHeight: 64,
      ...DESIGN_TOKENS.elevation.lg
    },
    
    positions: {
      top: { 
        position: 'absolute', 
        top: DESIGN_TOKENS.spacing.xl,
        left: DESIGN_TOKENS.spacing.md,
        right: DESIGN_TOKENS.spacing.md
      },
      bottom: { 
        position: 'absolute', 
        bottom: DESIGN_TOKENS.spacing.xl,
        left: DESIGN_TOKENS.spacing.md,
        right: DESIGN_TOKENS.spacing.md
      }
    },
    
    variants: {
      info: { borderLeftWidth: 4 },
      success: { borderLeftWidth: 4 },
      warning: { borderLeftWidth: 4 },
      error: { borderLeftWidth: 4 }
    }
  },

  // Location Marker Enhancements
  locationMarker: {
    base: {
      borderRadius: DESIGN_TOKENS.borderRadius.full,
      borderWidth: 3,
      justifyContent: 'center',
      alignItems: 'center',
      ...DESIGN_TOKENS.elevation.lg
    },
    
    accuracy: {
      excellent: { 
        size: 48,
        fontSize: 22,
        pulseScale: 1.1,
        glowRadius: 20
      },
      high: { 
        size: 42,
        fontSize: 20,
        pulseScale: 1.08,
        glowRadius: 16
      },
      good: { 
        size: 36,
        fontSize: 18,
        pulseScale: 1.06,
        glowRadius: 12
      },
      fair: { 
        size: 32,
        fontSize: 16,
        pulseScale: 1.04,
        glowRadius: 8
      },
      poor: { 
        size: 28,
        fontSize: 14,
        pulseScale: 1.02,
        glowRadius: 4
      }
    }
  },

  // Input Enhancement
  input: {
    base: {
      borderRadius: DESIGN_TOKENS.borderRadius.input,
      borderWidth: 1,
      paddingHorizontal: DESIGN_TOKENS.spacing.md,
      paddingVertical: DESIGN_TOKENS.spacing.md,
      minHeight: 44,
      fontSize: DESIGN_TOKENS.typography.sizes.base
    },
    
    states: {
      focused: { borderWidth: 2 },
      error: { borderWidth: 2 },
      disabled: { opacity: 0.6 }
    }
  }
};

// Enhanced Layout System
export const LAYOUT = {
  container: {
    maxWidth: 1200,
    paddingHorizontal: DESIGN_TOKENS.spacing.lg,
    marginHorizontal: 'auto'
  },
  
  grid: {
    columns: 12,
    gutter: DESIGN_TOKENS.spacing.lg,
    margin: DESIGN_TOKENS.spacing.xl
  },

  breakpoints: {
    xs: 0,
    sm: 576,
    md: 768,
    lg: 992,
    xl: 1200,
    xxl: 1400
  },

  zIndex: {
    hide: -1,
    base: 0,
    docked: 10,
    dropdown: 100,
    sticky: 200,
    banner: 300,
    overlay: 400,
    modal: 500,
    popover: 600,
    skipLink: 700,
    toast: 800,
    tooltip: 900,
    notification: 950,
    max: 999
  },

  // Safe areas and spacing
  safeArea: {
    top: 44,    // iOS status bar
    bottom: 34  // iOS home indicator
  }
};

// Enhanced Accessibility
export const ACCESSIBILITY = {
  // Touch targets
  minTouchTarget: 44,
  recommendedTouchTarget: 48,
  
  // Focus management
  focusRing: {
    width: 2,
    offset: 2,
    style: 'solid'
  },
  
  // Contrast requirements
  contrast: {
    minimum: 3.0,   // WCAG AA Large Text
    enhanced: 4.5,  // WCAG AA Normal Text
    maximum: 7.0    // WCAG AAA
  },
  
  // Motion preferences
  motion: {
    respectReduceMotion: true,
    fallbackDuration: 0,
    alternativeIndicators: true
  },
  
  // Screen reader support
  screenReader: {
    announceChanges: true,
    describeFocus: true,
    labelInteractiveElements: true
  }
};

// Performance Optimizations
export const PERFORMANCE = {
  animations: {
    useNativeDriver: true,
    shouldRasterizeIOS: true,
    removeClippedSubviews: true
  },
  
  rendering: {
    initialNumToRender: 10,
    maxToRenderPerBatch: 5,
    updateCellsBatchingPeriod: 50,
    windowSize: 10,
    getItemLayout: true // When possible
  },
  
  images: {
    defaultResizeMode: 'cover',
    cache: 'memory',
    progressive: true,
    blurRadius: 0
  },
  
  // Memory management
  memory: {
    maxCacheSize: 50,
    cleanupInterval: 60000,
    lowMemoryWarningThreshold: 0.8
  }
};

// Haptic Feedback System
export const HAPTICS = {
  patterns: {
    selection: 'impactLight',
    success: 'notificationSuccess', 
    warning: 'notificationWarning',
    error: 'notificationError',
    buttonPress: 'impactMedium',
    longPress: 'impactHeavy'
  },
  
  enabled: true,
  respectSystemSettings: true
};

// Consolidated Export
export const UI_CONFIG = {
  designTokens: DESIGN_TOKENS,
  colors: COLOR_PALETTE,
  themes: THEMES,
  components: COMPONENTS,
  layout: LAYOUT,
  accessibility: ACCESSIBILITY,
  performance: PERFORMANCE,
  haptics: HAPTICS,
  
  // Utility functions
  utils: {
    // Get responsive value based on screen size
    getResponsiveValue: (values, screenSize) => {
      return values[screenSize] || values.mobile || values;
    },
    
    // Generate component styles
    createComponentStyle: (component, variant = 'base', state = 'default') => {
      const comp = COMPONENTS[component];
      if (!comp) return {};
      
      return {
        ...comp.base,
        ...(comp.variants?.[variant] || {}),
        ...(comp.states?.[state] || {})
      };
    },
    
    // Theme color getter
    getThemeColor: (colorPath, theme = 'light') => {
      const keys = colorPath.split('.');
      let color = THEMES[theme].colors;
      
      for (const key of keys) {
        color = color[key];
        if (!color) break;
      }
      
      return color;
    }
  }
};

export default UI_CONFIG;