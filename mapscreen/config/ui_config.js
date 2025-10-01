// config/ui_config.js - Modern UI/UX Design System v2.0

// ============================================================================
// DESIGN TOKENS - Base del sistema de diseño
// ============================================================================

export const DESIGN_TOKENS = {
  // Sistema de espaciado - Grid de 8pt con progresión refinada
  spacing: {
    xs: 4,      // 0.25rem - Padding mínimo
    sm: 8,      // 0.5rem  - Spacing interno pequeño
    md: 12,     // 0.75rem - Spacing interno medio
    lg: 16,     // 1rem    - Spacing estándar
    xl: 24,     // 1.5rem  - Spacing entre secciones
    xxl: 32,    // 2rem    - Spacing grande
    xxxl: 48,   // 3rem    - Spacing muy grande
    mega: 64,   // 4rem    - Headers, heros
    ultra: 96,  // 6rem    - Secciones principales
  },

  // Sistema tipográfico - Escala modular refinada
  typography: {
    fontFamilies: {
      system: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", "SF Pro Display", sans-serif',
      mono: 'SF Mono, Monaco, "Roboto Mono", "Source Code Pro", monospace',
      serif: '"New York", "Times New Roman", Georgia, serif'
    },
    
    weights: {
      light: '300',
      regular: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      extrabold: '800',
    },
    
    // Escala tipográfica moderna
    sizes: {
      xs: 12,     // Captions, labels pequeños
      sm: 14,     // Body pequeño, secondary text
      base: 16,   // Body principal
      md: 18,     // Body destacado
      lg: 20,     // Subtítulos
      xl: 24,     // Títulos de sección
      '2xl': 28,  // Títulos principales
      '3xl': 32,  // Headers
      '4xl': 40,  // Hero text
    },
    
    lineHeights: {
      tight: 1.25,    // Headlines
      snug: 1.375,    // Subheaders
      normal: 1.5,    // Body text
      relaxed: 1.625, // Long-form content
      loose: 2,       // Espaciado amplio
    },
    
    letterSpacing: {
      tighter: -0.5,   // Headlines grandes
      tight: -0.3,     // Headlines
      normal: 0,       // Body
      wide: 0.3,       // Captions
      wider: 0.5,      // Labels uppercase
    }
  },

  // Sistema de Border Radius - Más moderno y consistente
  borderRadius: {
    none: 0,
    xs: 4,      // Elementos muy pequeños
    sm: 8,      // Inputs, pequeños botones
    md: 12,     // Botones estándar
    lg: 16,     // Cards, containers
    xl: 20,     // Cards destacadas
    '2xl': 24,  // Modals, sheets
    '3xl': 28,  // FABs, elementos destacados
    full: 9999, // Circular
    
    // Contextuales
    input: 10,
    button: 12,
    card: 16,
    modal: 20,
    fab: 28,
  },

  // Sistema de Elevación - Sombras más sutiles y modernas
  elevation: {
    none: {
      shadowColor: 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
    
    // Elevaciones sutiles
    xs: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 2,
      elevation: 1,
    },
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 2,
    },
    
    // Elevaciones estándar
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 4,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.10,
      shadowRadius: 16,
      elevation: 6,
    },
    xl: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.12,
      shadowRadius: 24,
      elevation: 8,
    },
    
    // Elevaciones especiales
    fab: {
      shadowColor: '#4F46E5',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.24,
      shadowRadius: 16,
      elevation: 12,
    },
    modal: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 20 },
      shadowOpacity: 0.20,
      shadowRadius: 40,
      elevation: 20,
    },
  },

  // Sistema de Animación - Transiciones fluidas y modernas
  animations: {
    durations: {
      instant: 0,
      micro: 100,    // Micro-interacciones
      fast: 150,     // Hover, tap feedback
      normal: 200,   // Transiciones estándar
      medium: 300,   // Modals, sheets
      slow: 400,     // Navegación
      slower: 600,   // Transiciones complejas
    },
    
    // Curvas de easing modernas
    easings: {
      // Estándar
      linear: [0.0, 0.0, 1.0, 1.0],
      easeIn: [0.4, 0.0, 1.0, 1.0],
      easeOut: [0.0, 0.0, 0.2, 1.0],
      easeInOut: [0.4, 0.0, 0.2, 1.0],
      
      // Modernas (Apple-inspired)
      smooth: [0.25, 0.1, 0.25, 1.0],
      snappy: [0.4, 0.0, 0.2, 1.0],
      gentle: [0.25, 0.46, 0.45, 0.94],
      bounce: [0.68, -0.55, 0.265, 1.55],
    },
    
    // Presets de interacción
    interactions: {
      tap: {
        scale: 0.98,
        duration: 120,
        easing: 'easeOut',
      },
      press: {
        scale: 0.96,
        duration: 100,
        easing: 'easeInOut',
      },
      hover: {
        scale: 1.02,
        duration: 180,
        easing: 'smooth',
      },
      subtle: {
        scale: 0.99,
        duration: 150,
        easing: 'gentle',
      },
    },
  },
};

// ============================================================================
// COLOR PALETTE - Paleta moderna con enfoque en accesibilidad
// ============================================================================

export const COLOR_PALETTE = {
  // Primary - Indigo sofisticado
  primary: {
    50: '#EEF2FF',
    100: '#E0E7FF',
    200: '#C7D2FE',
    300: '#A5B4FC',
    400: '#818CF8',
    500: '#6366F1',  // Base
    600: '#4F46E5',  // Hover
    700: '#4338CA',  // Pressed
    800: '#3730A3',
    900: '#312E81',
    950: '#1E1B4B',
  },

  // Accent - Ámbar cálido
  accent: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    200: '#FDE68A',
    300: '#FCD34D',
    400: '#FBBF24',  // Base
    500: '#F59E0B',  // Hover
    600: '#D97706',  // Pressed
    700: '#B45309',
    800: '#92400E',
    900: '#78350F',
  },

  // Success - Verde esmeralda
  success: {
    50: '#ECFDF5',
    100: '#D1FAE5',
    200: '#A7F3D0',
    300: '#6EE7B7',
    400: '#34D399',
    500: '#10B981',  // Base
    600: '#059669',
    700: '#047857',
    800: '#065F46',
    900: '#064E3B',
  },
  
  // Warning - Naranja
  warning: {
    50: '#FFF7ED',
    100: '#FFEDD5',
    200: '#FED7AA',
    300: '#FDBA74',
    400: '#FB923C',
    500: '#F97316',  // Base
    600: '#EA580C',
    700: '#C2410C',
    800: '#9A3412',
    900: '#7C2D12',
  },
  
  // Danger - Rojo
  danger: {
    50: '#FEF2F2',
    100: '#FEE2E2',
    200: '#FECACA',
    300: '#FCA5A5',
    400: '#F87171',
    500: '#EF4444',  // Base
    600: '#DC2626',
    700: '#B91C1C',
    800: '#991B1B',
    900: '#7F1D1D',
  },

  // Info - Azul cielo
  info: {
    50: '#F0F9FF',
    100: '#E0F2FE',
    200: '#BAE6FD',
    300: '#7DD3FC',
    400: '#38BDF8',
    500: '#0EA5E9',  // Base
    600: '#0284C7',
    700: '#0369A1',
    800: '#075985',
    900: '#0C4A6E',
  },

  // Neutrals - Grises modernos con matices fríos
  neutral: {
    0: '#FFFFFF',
    25: '#FDFDFD',
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#E5E5E5',
    300: '#D4D4D4',
    400: '#A3A3A3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
    950: '#0A0A0A',
  },

  // Slate - Para dark mode
  slate: {
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
    950: '#020617',
  },
};

// ============================================================================
// THEMES - Light y Dark mode modernos
// ============================================================================

export const THEMES = {
  light: {
    name: 'Light Mode',
    colors: {
      // Backgrounds - Capas sutiles
      background: COLOR_PALETTE.neutral[0],
      backgroundSecondary: COLOR_PALETTE.neutral[50],
      backgroundTertiary: COLOR_PALETTE.neutral[100],
      
      // Surfaces - Elementos elevados
      surface: COLOR_PALETTE.neutral[0],
      surfaceElevated: COLOR_PALETTE.neutral[25],
      surfaceHighlight: COLOR_PALETTE.neutral[50],
      surfacePressed: COLOR_PALETTE.neutral[100],
      
      // Interactive - Estados de interacción
      interactive: COLOR_PALETTE.primary[600],
      interactiveHover: COLOR_PALETTE.primary[700],
      interactivePressed: COLOR_PALETTE.primary[800],
      interactiveDisabled: COLOR_PALETTE.neutral[300],
      interactiveSubtle: COLOR_PALETTE.primary[50],
      
      // Borders - Diferentes pesos
      border: COLOR_PALETTE.neutral[200],
      borderLight: COLOR_PALETTE.neutral[100],
      borderMedium: COLOR_PALETTE.neutral[300],
      borderStrong: COLOR_PALETTE.neutral[400],
      borderFocus: COLOR_PALETTE.primary[500],
      
      // Text - Jerarquía clara
      text: COLOR_PALETTE.neutral[900],
      textSecondary: COLOR_PALETTE.neutral[600],
      textTertiary: COLOR_PALETTE.neutral[500],
      textQuaternary: COLOR_PALETTE.neutral[400],
      textInverse: COLOR_PALETTE.neutral[0],
      textPlaceholder: COLOR_PALETTE.neutral[400],
      textDisabled: COLOR_PALETTE.neutral[300],
      
      // Brand
      primary: COLOR_PALETTE.primary[600],
      primarySubtle: COLOR_PALETTE.primary[50],
      primaryMuted: COLOR_PALETTE.primary[100],
      
      accent: COLOR_PALETTE.accent[500],
      accentSubtle: COLOR_PALETTE.accent[50],
      accentMuted: COLOR_PALETTE.accent[100],
      
      // Semantic
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
      
      // Overlays
      overlay: 'rgba(0, 0, 0, 0.40)',
      overlayLight: 'rgba(0, 0, 0, 0.20)',
      overlayStrong: 'rgba(0, 0, 0, 0.60)',
      scrim: 'rgba(0, 0, 0, 0.50)',
      backdrop: 'rgba(15, 23, 42, 0.40)',
    },
  },
  
  dark: {
    name: 'Dark Mode',
    colors: {
      // Backgrounds - Tonos slate profundos
      background: COLOR_PALETTE.slate[950],
      backgroundSecondary: COLOR_PALETTE.slate[900],
      backgroundTertiary: COLOR_PALETTE.slate[800],
      
      // Surfaces - Elevación con overlay de blanco
      surface: COLOR_PALETTE.slate[900],
      surfaceElevated: '#1A2332',  // slate-900 + 5% white overlay
      surfaceHighlight: '#242F40',  // slate-800 + 8% white overlay
      surfacePressed: COLOR_PALETTE.slate[700],
      
      // Interactive
      interactive: COLOR_PALETTE.primary[400],
      interactiveHover: COLOR_PALETTE.primary[300],
      interactivePressed: COLOR_PALETTE.primary[200],
      interactiveDisabled: COLOR_PALETTE.slate[700],
      interactiveSubtle: COLOR_PALETTE.primary[950],
      
      // Borders - Más sutiles en dark
      border: 'rgba(255, 255, 255, 0.08)',
      borderLight: 'rgba(255, 255, 255, 0.04)',
      borderMedium: 'rgba(255, 255, 255, 0.12)',
      borderStrong: 'rgba(255, 255, 255, 0.16)',
      borderFocus: COLOR_PALETTE.primary[400],
      
      // Text - Alto contraste pero no puro
      text: COLOR_PALETTE.neutral[50],
      textSecondary: 'rgba(255, 255, 255, 0.70)',
      textTertiary: 'rgba(255, 255, 255, 0.50)',
      textQuaternary: 'rgba(255, 255, 255, 0.35)',
      textInverse: COLOR_PALETTE.slate[900],
      textPlaceholder: 'rgba(255, 255, 255, 0.40)',
      textDisabled: 'rgba(255, 255, 255, 0.25)',
      
      // Brand
      primary: COLOR_PALETTE.primary[400],
      primarySubtle: COLOR_PALETTE.primary[950],
      primaryMuted: COLOR_PALETTE.primary[900],
      
      accent: COLOR_PALETTE.accent[400],
      accentSubtle: COLOR_PALETTE.accent[950],
      accentMuted: COLOR_PALETTE.accent[900],
      
      // Semantic
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
      
      // Overlays
      overlay: 'rgba(0, 0, 0, 0.70)',
      overlayLight: 'rgba(0, 0, 0, 0.40)',
      overlayStrong: 'rgba(0, 0, 0, 0.85)',
      scrim: 'rgba(0, 0, 0, 0.75)',
      backdrop: 'rgba(0, 0, 0, 0.60)',
    },
  },
};

// ============================================================================
// COMPONENTS - Configuraciones de componentes modernizadas
// ============================================================================

export const COMPONENTS = {
  // Sistema de Botones moderno
  button: {
    base: {
      minHeight: 44,
      borderRadius: DESIGN_TOKENS.borderRadius.button,
      paddingHorizontal: DESIGN_TOKENS.spacing.lg,
      paddingVertical: DESIGN_TOKENS.spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
    },
    
    sizes: {
      xs: { 
        minHeight: 32, 
        paddingHorizontal: DESIGN_TOKENS.spacing.md,
        paddingVertical: DESIGN_TOKENS.spacing.xs,
        fontSize: DESIGN_TOKENS.typography.sizes.xs,
      },
      sm: { 
        minHeight: 36,
        paddingHorizontal: DESIGN_TOKENS.spacing.md,
        paddingVertical: DESIGN_TOKENS.spacing.sm,
        fontSize: DESIGN_TOKENS.typography.sizes.sm,
      },
      md: { 
        minHeight: 44,
        paddingHorizontal: DESIGN_TOKENS.spacing.lg,
        paddingVertical: DESIGN_TOKENS.spacing.md,
        fontSize: DESIGN_TOKENS.typography.sizes.base,
      },
      lg: { 
        minHeight: 52,
        paddingHorizontal: DESIGN_TOKENS.spacing.xl,
        paddingVertical: DESIGN_TOKENS.spacing.lg,
        fontSize: DESIGN_TOKENS.typography.sizes.md,
      },
    },
    
    variants: {
      primary: {
        ...DESIGN_TOKENS.elevation.sm,
      },
      secondary: {
        borderWidth: 1.5,
        backgroundColor: 'transparent',
      },
      tertiary: {
        backgroundColor: 'transparent',
      },
      ghost: {
        backgroundColor: 'transparent',
        borderWidth: 0,
      },
    },
    
    states: {
      default: { transform: [{ scale: 1 }], opacity: 1 },
      pressed: { transform: [{ scale: 0.98 }], opacity: 0.92 },
      disabled: { opacity: 0.40, transform: [{ scale: 1 }] },
      loading: { opacity: 0.70, transform: [{ scale: 1 }] },
    },
  },

  // FAB modernizado
  fab: {
    base: {
      ...DESIGN_TOKENS.elevation.fab,
      position: 'absolute',
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: DESIGN_TOKENS.borderRadius.fab,
    },
    
    sizes: {
      small: { width: 48, height: 48 },
      regular: { width: 56, height: 56 },
      large: { width: 64, height: 64 },
      extended: {
        height: 56,
        minWidth: 96,
        paddingHorizontal: DESIGN_TOKENS.spacing.lg,
        borderRadius: DESIGN_TOKENS.borderRadius.xl,
      },
    },

    positions: {
      'bottom-right': { 
        bottom: DESIGN_TOKENS.spacing.xl, 
        right: DESIGN_TOKENS.spacing.xl,
      },
      'bottom-left': { 
        bottom: DESIGN_TOKENS.spacing.xl, 
        left: DESIGN_TOKENS.spacing.xl,
      },
      'bottom-center': { 
        bottom: DESIGN_TOKENS.spacing.xl,
        alignSelf: 'center',
      },
    },

    states: {
      default: { transform: [{ scale: 1 }], opacity: 1 },
      pressed: { transform: [{ scale: 0.92 }], opacity: 0.90 },
      expanded: { transform: [{ rotate: '45deg' }] },
    },
  },

  // Cards modernizadas
  card: {
    base: {
      borderRadius: DESIGN_TOKENS.borderRadius.card,
      padding: DESIGN_TOKENS.spacing.lg,
      marginBottom: DESIGN_TOKENS.spacing.md,
      ...DESIGN_TOKENS.elevation.xs,
    },
    
    variants: {
      elevated: { ...DESIGN_TOKENS.elevation.sm },
      outlined: { 
        borderWidth: 1.5,
        ...DESIGN_TOKENS.elevation.none,
      },
      filled: { 
        ...DESIGN_TOKENS.elevation.none,
      },
      interactive: { 
        ...DESIGN_TOKENS.elevation.xs,
        transform: [{ scale: 1 }],
      },
    },
    
    states: {
      default: { 
        transform: [{ scale: 1 }],
        ...DESIGN_TOKENS.elevation.xs,
      },
      pressed: { 
        transform: [{ scale: 0.99 }],
        ...DESIGN_TOKENS.elevation.none,
      },
      hover: {
        transform: [{ scale: 1.01 }],
        ...DESIGN_TOKENS.elevation.sm,
      },
    },
  },

  // Package Cards específicas
  packageCard: {
    base: {
      borderRadius: DESIGN_TOKENS.borderRadius.card,
      padding: DESIGN_TOKENS.spacing.lg,
      marginBottom: DESIGN_TOKENS.spacing.md,
      borderLeftWidth: 4,
      ...DESIGN_TOKENS.elevation.xs,
    },
    
    statusIndicator: {
      width: 48,
      height: 48,
      borderRadius: DESIGN_TOKENS.borderRadius.md,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: DESIGN_TOKENS.spacing.md,
    },
    
    states: {
      default: {
        transform: [{ scale: 1 }],
        ...DESIGN_TOKENS.elevation.xs,
      },
      active: {
        borderLeftWidth: 6,
        transform: [{ translateX: -2 }],
        ...DESIGN_TOKENS.elevation.sm,
      },
      pressed: {
        transform: [{ scale: 0.98 }],
        ...DESIGN_TOKENS.elevation.none,
      },
    },
  },

  // Notifications modernizadas
  notification: {
    base: {
      borderRadius: DESIGN_TOKENS.borderRadius.lg,
      padding: DESIGN_TOKENS.spacing.lg,
      marginHorizontal: DESIGN_TOKENS.spacing.md,
      marginVertical: DESIGN_TOKENS.spacing.sm,
      minHeight: 64,
      borderLeftWidth: 4,
      ...DESIGN_TOKENS.elevation.md,
    },
    
    positions: {
      top: { 
        position: 'absolute', 
        top: DESIGN_TOKENS.spacing.xl,
        left: DESIGN_TOKENS.spacing.md,
        right: DESIGN_TOKENS.spacing.md,
      },
      bottom: { 
        position: 'absolute', 
        bottom: DESIGN_TOKENS.spacing.xl,
        left: DESIGN_TOKENS.spacing.md,
        right: DESIGN_TOKENS.spacing.md,
      },
    },
  },

  // Location Markers mejorados
  locationMarker: {
    base: {
      borderRadius: DESIGN_TOKENS.borderRadius.full,
      borderWidth: 3,
      justifyContent: 'center',
      alignItems: 'center',
      ...DESIGN_TOKENS.elevation.lg,
    },
    
    accuracy: {
      excellent: { 
        size: 48,
        fontSize: 24,
        pulseScale: 1.12,
        glowRadius: 24,
        borderWidth: 3,
      },
      high: { 
        size: 44,
        fontSize: 22,
        pulseScale: 1.10,
        glowRadius: 20,
        borderWidth: 3,
      },
      good: { 
        size: 40,
        fontSize: 20,
        pulseScale: 1.08,
        glowRadius: 16,
        borderWidth: 2.5,
      },
      fair: { 
        size: 36,
        fontSize: 18,
        pulseScale: 1.06,
        glowRadius: 12,
        borderWidth: 2.5,
      },
      poor: { 
        size: 32,
        fontSize: 16,
        pulseScale: 1.04,
        glowRadius: 8,
        borderWidth: 2,
      },
    },
  },

  // Inputs modernizados
  input: {
    base: {
      borderRadius: DESIGN_TOKENS.borderRadius.input,
      borderWidth: 1.5,
      paddingHorizontal: DESIGN_TOKENS.spacing.md,
      paddingVertical: DESIGN_TOKENS.spacing.md,
      minHeight: 48,
      fontSize: DESIGN_TOKENS.typography.sizes.base,
    },
    
    states: {
      default: {
        borderWidth: 1.5,
      },
      focused: { 
        borderWidth: 2,
        ...DESIGN_TOKENS.elevation.xs,
      },
      error: { 
        borderWidth: 2,
      },
      disabled: { 
        opacity: 0.50,
      },
    },
  },

  // Skeleton loader
  skeleton: {
    base: {
      borderRadius: DESIGN_TOKENS.borderRadius.md,
      overflow: 'hidden',
    },
    animation: {
      duration: 1500,
      shimmerColors: ['#E5E5E5', '#F5F5F5', '#E5E5E5'],
    },
  },
};

// ============================================================================
// LAYOUT - Sistema de layout y spacing
// ============================================================================

export const LAYOUT = {
  container: {
    maxWidth: 1200,
    paddingHorizontal: DESIGN_TOKENS.spacing.lg,
    marginHorizontal: 'auto',
  },
  
  grid: {
    columns: 12,
    gutter: DESIGN_TOKENS.spacing.lg,
    margin: DESIGN_TOKENS.spacing.lg,
  },

  breakpoints: {
    xs: 0,
    sm: 576,
    md: 768,
    lg: 992,
    xl: 1200,
    xxl: 1400,
  },

  zIndex: {
    hide: -1,
    base: 0,
    docked: 10,
    dropdown: 100,
    sticky: 200,
    overlay: 400,
    modal: 500,
    popover: 600,
    toast: 700,
    notification: 800,
    tooltip: 900,
    max: 999,
  },

  safeArea: {
    top: 44,
    bottom: 34,
  },
};

// ============================================================================
// ACCESSIBILITY
// ============================================================================

export const ACCESSIBILITY = {
  minTouchTarget: 44,
  recommendedTouchTarget: 48,
  
  focusRing: {
    width: 2,
    offset: 2,
    style: 'solid',
  },
  
  contrast: {
    minimum: 3.0,
    enhanced: 4.5,
    maximum: 7.0,
  },
  
  motion: {
    respectReduceMotion: true,
    fallbackDuration: 0,
  },
};

// ============================================================================
// PERFORMANCE
// ============================================================================

export const PERFORMANCE = {
  animations: {
    useNativeDriver: true,
    shouldRasterizeIOS: true,
  },
  
  rendering: {
    initialNumToRender: 10,
    maxToRenderPerBatch: 5,
    windowSize: 10,
  },
};

// ============================================================================
// HAPTICS
// ============================================================================

export const HAPTICS = {
  patterns: {
    selection: 'impactLight',
    success: 'notificationSuccess',
    warning: 'notificationWarning',
    error: 'notificationError',
    buttonPress: 'impactMedium',
    longPress: 'impactHeavy',
  },
  
  enabled: true,
  respectSystemSettings: true,
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export const UI_UTILS = {
  // Obtener valor responsivo basado en tamaño de pantalla
  getResponsiveValue: (values, screenSize = 'mobile') => {
    if (typeof values !== 'object') return values;
    return values[screenSize] || values.mobile || values.base || values;
  },
  
  // Generar estilos de componente
  createComponentStyle: (component, variant = 'base', state = 'default', theme = 'light') => {
    const comp = COMPONENTS[component];
    if (!comp) return {};
    
    return {
      ...comp.base,
      ...(comp.variants?.[variant] || {}),
      ...(comp.states?.[state] || {}),
    };
  },
  
  // Obtener color del tema
  getThemeColor: (colorPath, theme = 'light') => {
    const keys = colorPath.split('.');
    let color = THEMES[theme].colors;
    
    for (const key of keys) {
      color = color?.[key];
      if (!color) break;
    }
    
    return color || '#000000';
  },
  
  // Obtener color con opacidad
  getColorWithOpacity: (color, opacity) => {
    if (color.startsWith('rgba')) return color;
    if (color.startsWith('#')) {
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
    return color;
  },
  
  // Calcular contraste entre dos colores
  getContrastRatio: (color1, color2) => {
    // Implementación simplificada
    // En producción, usar una librería como chroma-js
    return 4.5;
  },
  
  // Verificar si un color es claro u oscuro
  isColorLight: (color) => {
    if (!color || !color.startsWith('#')) return false;
    
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    
    // Fórmula de luminancia relativa
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5;
  },
};

// ============================================================================
// CONSOLIDATED EXPORT
// ============================================================================

export const UI_CONFIG = {
  designTokens: DESIGN_TOKENS,
  colors: COLOR_PALETTE,
  themes: THEMES,
  components: COMPONENTS,
  layout: LAYOUT,
  accessibility: ACCESSIBILITY,
  performance: PERFORMANCE,
  haptics: HAPTICS,
  utils: UI_UTILS,
  
  // Constantes de conveniencia
  VERSION: '2.0.0',
  UPDATED: '2025-01-01',
};

export default UI_CONFIG