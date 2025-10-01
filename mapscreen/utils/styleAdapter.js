// mapscreen/utils/styleAdapter.js
// Purpose: Bridge between ui_config and React Native StyleSheet
import { StyleSheet } from 'react-native';
import { UI_CONFIG } from '../config/ui_config';

const { designTokens, themes, components } = UI_CONFIG;

/**
 * Get theme-aware colors
 */
export const getThemeColors = (theme = 'light') => {
  return themes[theme]?.colors || themes.light.colors;
};

/**
 * Get themed component styles
 */
export const getComponentStyle = (component, variant = 'base', theme = 'light') => {
  const comp = components[component];
  if (!comp) return {};

  const colors = getThemeColors(theme);
  
  return {
    ...comp.base,
    ...(comp.variants?.[variant] || {}),
  };
};

/**
 * Apply theme colors to a style object
 */
const applyThemeColors = (style, colors) => {
  const themed = { ...style };
  
  Object.keys(themed).forEach(key => {
    const value = themed[key];
    
    if (typeof value === 'string' && value.startsWith('$')) {
      const colorKey = value.substring(1);
      themed[key] = colors[colorKey] || value;
    }
  });
  
  return themed;
};

// ============================================================================
// FLOATING BUTTONS STYLES
// ============================================================================

export const createFloatingButtonStyles = (theme = 'light') => {
  const colors = getThemeColors(theme);
  const { spacing, borderRadius, elevation, typography } = designTokens;

  return StyleSheet.create({
    backdrop: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: colors.overlay,
      zIndex: 998,
    },
    backdropTouch: {
      flex: 1,
    },
    searchRipple: {
      position: 'absolute',
      bottom: 115,
      right: 58,
      width: 70,
      height: 70,
      borderRadius: 35,
      borderWidth: 2,
      zIndex: 999,
    },
    speedDialContainer: {
      position: 'absolute',
      bottom: spacing.xl,
      right: spacing.lg,
      alignItems: 'center',
      zIndex: 1000,
    },
    speedDialButton: {
      position: 'absolute',
      bottom: 0,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'flex-end',
    },
    speedDialLabel: {
      position: 'absolute',
      backgroundColor: colors.surface,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.xl,
      ...elevation.md,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    labelText: {
      color: colors.text,
      fontSize: typography.sizes.sm,
      fontWeight: typography.weights.semibold,
      textAlign: 'center',
      minWidth: 100,
      letterSpacing: typography.letterSpacing.normal,
    },
    actionButton: {
      width: 60,
      height: 60,
      borderRadius: borderRadius.fab,
      justifyContent: 'center',
      alignItems: 'center',
      ...elevation.lg,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.2)',
    },
    actionIcon: {
      fontSize: 24,
      textAlign: 'center',
    },
    mainButtonContainer: {
      marginBottom: spacing.md,
    },
    mainButton: {
      width: 75,
      height: 75,
      borderRadius: borderRadius['3xl'],
      justifyContent: 'center',
      alignItems: 'center',
      ...elevation.fab,
      borderWidth: 1.5,
      borderColor: 'rgba(255,255,255,0.25)',
      position: 'relative',
    },
    mainIcon: {
      fontSize: 30,
      textAlign: 'center',
      zIndex: 2,
    },
    menuButton: {
      width: 48,
      height: 48,
      borderRadius: borderRadius.xl,
      backgroundColor: colors.danger,
      justifyContent: 'center',
      alignItems: 'center',
      ...elevation.md,
      borderWidth: 1.5,
      borderColor: 'rgba(255,255,255,0.2)',
    },
    menuButtonExpanded: {
      backgroundColor: colors.danger,
      ...elevation.lg,
    },
    menuIcon: {
      fontSize: 22,
      color: '#fff',
      fontWeight: typography.weights.bold,
      textAlign: 'center',
    },
    buttonGlow: {
      position: 'absolute',
      width: 75,
      height: 75,
      borderRadius: borderRadius['3xl'],
    },
    pulseRing: {
      position: 'absolute',
      width: 75,
      height: 75,
      borderRadius: borderRadius['3xl'],
      borderWidth: 2.5,
      backgroundColor: 'transparent',
    },
    statusBar: {
      position: 'absolute',
      top: 70,
      left: spacing.md,
      right: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.lg,
      borderRadius: borderRadius.xl,
      ...elevation.xl,
      zIndex: 1005,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.15)',
    },
    statusText: {
      color: '#fff',
      fontSize: typography.sizes.base,
      fontWeight: typography.weights.semibold,
      textAlign: 'center',
      lineHeight: typography.lineHeights.normal * typography.sizes.base,
      letterSpacing: typography.letterSpacing.normal,
    },
    locationInfo: {
      marginTop: spacing.sm,
      alignItems: 'center',
      width: '100%',
    },
    accuracyText: {
      color: 'rgba(255,255,255,0.95)',
      fontSize: typography.sizes.sm,
      fontWeight: typography.weights.medium,
      textAlign: 'center',
      letterSpacing: typography.letterSpacing.normal,
    },
    detailText: {
      color: 'rgba(255,255,255,0.9)',
      fontSize: typography.sizes.xs,
      fontWeight: typography.weights.regular,
      marginTop: spacing.xs,
      textAlign: 'center',
    },
    methodText: {
      color: 'rgba(255,255,255,0.85)',
      fontSize: 11,
      fontWeight: typography.weights.regular,
      marginTop: spacing.xs,
      textAlign: 'center',
      fontStyle: 'italic',
    },
    debugPanel: {
      position: 'absolute',
      top: 200,
      left: spacing.sm,
      backgroundColor: colors.surfaceElevated,
      padding: spacing.md,
      borderRadius: borderRadius.md,
      zIndex: 1010,
      maxWidth: 300,
      borderWidth: 1,
      borderColor: colors.border,
      ...elevation.md,
    },
    debugTitle: {
      color: colors.text,
      fontSize: typography.sizes.xs,
      fontWeight: typography.weights.bold,
      marginBottom: spacing.xs,
      letterSpacing: typography.letterSpacing.wider,
    },
    debugMessage: {
      fontSize: 10,
      fontFamily: typography.fontFamilies.mono,
      lineHeight: 14,
    },
  });
};

// ============================================================================
// MAP SCREEN STYLES
// ============================================================================

export const createMapScreenStyles = (theme = 'light') => {
  const colors = getThemeColors(theme);
  const { spacing, borderRadius, elevation, typography } = designTokens;

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    webview: {
      flex: 1,
    },
    notification: {
      position: 'absolute',
      top: 60,
      left: spacing.lg,
      right: spacing.lg,
      backgroundColor: colors.info,
      padding: spacing.md,
      borderRadius: borderRadius.lg,
      zIndex: 1000,
      ...elevation.lg,
    },
    notificationError: {
      backgroundColor: colors.danger,
    },
    notificationWarning: {
      backgroundColor: colors.warning,
    },
    notificationSuccess: {
      backgroundColor: colors.success,
    },
    notificationText: {
      color: colors.textInverse,
      textAlign: 'center',
      fontSize: typography.sizes.sm,
      fontWeight: typography.weights.medium,
    },
    debugInfo: {
      position: 'absolute',
      top: 100,
      left: spacing.sm,
      backgroundColor: colors.surfaceElevated,
      padding: spacing.sm,
      borderRadius: borderRadius.sm,
      zIndex: 1000,
      maxWidth: 300,
      ...elevation.sm,
    },
    debugText: {
      color: colors.text,
      fontSize: 11,
      fontFamily: typography.fontFamilies.mono,
      marginBottom: 2,
    },
  });
};

// ============================================================================
// DYNAMIC BUTTON STATE COLORS
// ============================================================================

export const getButtonStateColor = (state, type = 'location', theme = 'light') => {
  const colors = getThemeColors(theme);
  
  const locationStates = {
    checking_permissions: { bg: colors.primary, shadow: colors.primary },
    requesting_permissions: { bg: colors.primaryMuted, shadow: colors.primaryMuted },
    checking_services: { bg: colors.warning, shadow: colors.warning },
    locating: { bg: colors.info, shadow: colors.info },
    processing: { bg: colors.primary, shadow: colors.primary },
    adding_marker: { bg: colors.accent, shadow: colors.accent },
    centering: { bg: colors.primaryMuted, shadow: colors.primaryMuted },
    success: { bg: colors.success, shadow: colors.success },
    error: { bg: colors.danger, shadow: colors.danger },
    timeout: { bg: colors.warning, shadow: colors.warning },
    idle: { bg: colors.interactive, shadow: colors.interactive },
  };

  const syncStates = {
    preparing: { bg: colors.primary, shadow: colors.primary },
    syncing: { bg: colors.info, shadow: colors.info },
    requesting: { bg: colors.warning, shadow: colors.warning },
    processing: { bg: colors.primaryMuted, shadow: colors.primaryMuted },
    success: { bg: colors.success, shadow: colors.success },
    error: { bg: colors.danger, shadow: colors.danger },
    timeout: { bg: colors.warning, shadow: colors.warning },
    idle: { bg: colors.primary, shadow: colors.primary },
  };

  const states = type === 'location' ? locationStates : syncStates;
  return states[state] || states.idle;
};

// Export designTokens, themes, and components for direct access
export { designTokens, themes, components };